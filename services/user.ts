/**
 * User Management Service for VidFab AI Video Platform
 */
import { supabaseAdmin, TABLES, handleSupabaseError, type DatabaseUser } from '@/lib/supabase';
import { User, CreateUserData, UpdateUserData, UserProfile } from '@/types/user';
import { getIsoTimestr } from '@/lib/time';
import { getUuid, getUserUuidFromEmail } from '@/lib/hash';
import { normalizeEmail, isDuplicateNormalizedEmail } from '@/lib/fraud/email-normalizer'
import { getAntifraudIp, checkIpCreditLimit, recordIpGrant } from '@/lib/fraud/ip-checker'
import { deductUserCredits } from '@/lib/simple-credits-check'
import { isMissingColumnError, omitCreditBucketFields } from '@/lib/supabase-schema-compat'

function mapDatabaseUser(data: any): User {
  return {
    uuid: data.uuid,
    email: data.email,
    nickname: data.nickname,
    avatar_url: data.avatar_url ?? undefined,
    signin_type: data.signin_type,
    signin_provider: data.signin_provider,
    signin_openid: data.signin_openid ?? undefined,
    created_at: data.created_at,
    updated_at: data.updated_at ?? undefined,
    signin_ip: data.signin_ip ?? undefined,
    email_verified: data.email_verified,
    last_login: data.last_login ?? undefined,
    is_active: data.is_active,
    subscription_status: data.subscription_status ?? undefined,
    subscription_plan: data.subscription_plan ?? undefined,
    credits_remaining: data.credits_remaining ?? undefined,
    credits_monthly_total: data.credits_monthly_total ?? undefined,
    credits_monthly_balance: data.credits_monthly_balance ?? undefined,
    credits_other_balance: data.credits_other_balance ?? undefined,
    credits_last_reset_date: data.credits_last_reset_date ?? undefined,
    credits_next_reset_at: data.credits_next_reset_at ?? undefined,
    total_videos_processed: data.total_videos_processed ?? undefined,
  };
}

/**
 * Save or update a user in the database
 * ✅ 修复：区分新用户和已存在用户，避免登录时覆盖积分和订阅信息
 */
export async function saveUser(userData: CreateUserData & { uuid?: string }): Promise<{ user: User; isNewUser: boolean }> {
  try {
    const now = getIsoTimestr();
    const userUuid = userData.uuid || getUserUuidFromEmail(userData.email);

    // ✅ 关键修复：先检查用户是否已存在
    let hasCreditBucketColumns = true;
    let { data: existingUser, error: existingUserError } = await supabaseAdmin
      .from(TABLES.USERS)
      .select('uuid, subscription_plan, subscription_status, credits_remaining, credits_monthly_total, credits_monthly_balance, credits_other_balance, credits_last_reset_date, credits_next_reset_at, total_videos_processed, storage_used_mb')
      .eq('uuid', userUuid)
      .single();

    if (isMissingColumnError(existingUserError)) {
      hasCreditBucketColumns = false;
      const legacyResult = await supabaseAdmin
        .from(TABLES.USERS)
        .select('uuid, subscription_plan, subscription_status, credits_remaining, credits_monthly_total, credits_last_reset_date, total_videos_processed, storage_used_mb')
        .eq('uuid', userUuid)
        .single();

      existingUser = legacyResult.data as any;
      existingUserError = legacyResult.error;
    }

    if (existingUserError && existingUserError.code !== 'PGRST116') {
      console.error('Fetch existing user error:', existingUserError);
      handleSupabaseError(existingUserError);
    }

    let userToSave: Partial<DatabaseUser>;
    let pendingCreditIdsToProcess: string[] = []; // 🔧 用独立变量存储
    // 🛡️ 防欺诈：IP 记录参数（upsert 成功后写入，避免非原子性问题）
    let ipGrantArgs: { ip: string; granted: boolean } | null = null;

    if (existingUser) {
      // ✅ 已存在用户：只更新登录相关字段，不覆盖积分和订阅
      console.log(`🔄 更新已存在用户: ${userUuid}`);
      userToSave = {
        uuid: userUuid,
        email: userData.email.toLowerCase().trim(),
        nickname: userData.nickname || userData.email.split('@')[0],
        avatar_url: userData.avatar_url || '',
        signin_type: userData.signin_type,
        signin_provider: userData.signin_provider,
        signin_openid: userData.signin_openid,
        signin_ip: userData.signin_ip,
        email_verified: userData.email_verified ?? false,
        last_login: now,
        updated_at: now,
        is_active: true,
        // ✅ 保留现有的订阅和积分信息（不覆盖）
        subscription_plan: existingUser.subscription_plan || 'free',
        subscription_status: existingUser.subscription_status || 'active',
        credits_remaining: existingUser.credits_remaining ?? 0,
        credits_monthly_total: existingUser.credits_monthly_total,
        credits_monthly_balance: existingUser.credits_monthly_balance,
        credits_other_balance: existingUser.credits_other_balance,
        credits_last_reset_date: existingUser.credits_last_reset_date,
        credits_next_reset_at: existingUser.credits_next_reset_at,
        total_videos_processed: existingUser.total_videos_processed ?? 0,
        storage_used_mb: existingUser.storage_used_mb ?? 0,
      };

      if (!hasCreditBucketColumns) {
        userToSave = omitCreditBucketFields(userToSave as Record<string, unknown>) as Partial<DatabaseUser>;
      }
    } else {
      // ✅ 新用户：使用默认值
      console.log(`✨ 创建新用户: ${userUuid}`);

      // 🛡️ 防欺诈检查 Layer 1 + Layer 2
      const normalizedMail = normalizeEmail(userData.email)
      const [isEmailDup, clientIp] = await Promise.all([
        isDuplicateNormalizedEmail(normalizedMail),
        getAntifraudIp(),
      ])
      const isIpLimited = await checkIpCreditLimit(clientIp)

      const isFraud = isEmailDup || isIpLimited
      if (isFraud) {
        console.warn(
          `[fraud] 新用户积分被限制: ${userData.email}`,
          { isEmailDup, isIpLimited, ip: clientIp }
        )
      }

      // 🎁 检查是否有待领取的积分
      const { data: pendingCredits } = await (supabaseAdmin as any)
        .from('pending_credits')
        .select('id, credits_amount, source')
        .eq('email', userData.email.toLowerCase().trim())
        .eq('is_claimed', false);

      let totalCredits = 100; // 默认初始积分
      const pendingCreditIds: string[] = [];

      const pendingCreditRows = (pendingCredits || []) as Array<{ id: string; credits_amount: number }>

      if (pendingCreditRows.length > 0) {
        // 累加所有待领取积分
        const bonusCredits = pendingCreditRows.reduce((sum, pc) => sum + pc.credits_amount, 0);
        totalCredits += bonusCredits;
        pendingCreditIds.push(...pendingCreditRows.map(pc => pc.id));
        console.log(`🎁 检测到 ${pendingCreditRows.length} 条待领取积分，额外获得: ${bonusCredits} 积分`);
      }

      userToSave = {
        uuid: userUuid,
        email: userData.email.toLowerCase().trim(),
        nickname: userData.nickname || userData.email.split('@')[0],
        avatar_url: userData.avatar_url || '',
        signin_type: userData.signin_type,
        signin_provider: userData.signin_provider,
        signin_openid: userData.signin_openid,
        signin_ip: userData.signin_ip,
        email_verified: userData.email_verified ?? false,
        last_login: now,
        created_at: now,
        updated_at: now,
        is_active: true,
        // Set default AI Video platform values for new users
        subscription_status: 'active',
        subscription_plan: 'free',
        credits_remaining: isFraud ? 0 : totalCredits, // 🛡️ 强制覆盖，pending_credits 加成无法绕过
        credits_monthly_total: 0,
        credits_monthly_balance: 0,
        credits_other_balance: isFraud ? 0 : totalCredits,
        credits_last_reset_date: null,
        credits_next_reset_at: null,
        total_videos_processed: 0,
        storage_used_mb: 0,
        max_storage_mb: 1024, // 1GB default
        normalized_email: normalizedMail,
        is_credit_limited: isFraud,
        fraud_reason: isFraud
          ? (isEmailDup && isIpLimited ? 'email_duplicate_and_ip_limit'
            : isEmailDup ? 'email_duplicate' : 'ip_limit')
          : null,
      };

      if (!hasCreditBucketColumns) {
        userToSave = omitCreditBucketFields(userToSave as Record<string, unknown>) as Partial<DatabaseUser>;
      }

      // 🎁 用户创建成功后，标记 pending_credits 为已领取
      // 🛡️ 仅在非欺诈用户时消费 pending_credits：
      //   - isEmailDup=true 时消费可接受（同一人多账号尝试）
      //   - isIpLimited=true && isEmailDup=false 时是合法新用户被 IP 限制，
      //     不应消费其 pending_credits（否则积分永久丢失）
      if (!isFraud && pendingCreditIds.length > 0) {
        // 🔧 使用独立变量存储，避免污染 userToSave 对象
        pendingCreditIdsToProcess = pendingCreditIds;
      }

      // 🛡️ 暂存 IP 记录参数，等 upsert 成功后再写入（避免 upsert 失败导致 IP 配额被错误消耗）
      ipGrantArgs = { ip: clientIp, granted: !isFraud }
    }

    // 使用upsert操作
    const { data, error } = await supabaseAdmin
      .from(TABLES.USERS)
      .upsert(userToSave as any, {
        onConflict: 'uuid',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (error) {
      console.error('Save user error:', error);

      // 🔥 特殊处理：如果是唯一性约束冲突(用户已存在),直接查询返回现有用户
      if (error.code === '23505') {
        console.warn(`⚠️ Constraint conflict for email ${userData.email}, attempting to fetch existing user...`);

        // 🔥 关键修复：先尝试用 UUID 查询，如果失败则用 email 查询
        // 这样可以处理不同登录方式导致的 UUID 不一致问题
        let existingData = null;
        let fetchError = null;

        // 尝试 1: 用 UUID 查询（适用于同一登录方式）
        const uuidResult = await supabaseAdmin
          .from(TABLES.USERS)
          .select('*')
          .eq('uuid', userUuid)
          .maybeSingle();

        if (uuidResult.data) {
          existingData = uuidResult.data;
          console.log(`✅ Found existing user by UUID: ${userUuid}`);
        } else {
          // 尝试 2: 用 email 查询（适用于跨登录方式）
          console.log(`🔍 UUID not found, trying email: ${userData.email}`);
          const emailResult = await supabaseAdmin
            .from(TABLES.USERS)
            .select('*')
            .eq('email', userData.email.toLowerCase().trim())
            .maybeSingle();

          if (emailResult.data) {
            existingData = emailResult.data;
            fetchError = emailResult.error;
            console.log(`✅ Found existing user by email with different UUID: ${emailResult.data.uuid}`);
          } else {
            fetchError = emailResult.error;
          }
        }

        if (fetchError || !existingData) {
          console.error('Failed to fetch existing user after conflict:', fetchError);
          handleSupabaseError(error); // 如果查询失败,抛出原始错误
        }

        // 成功获取现有用户,返回
        console.log(`✅ Successfully resolved constraint conflict for email: ${userData.email}`);
        return {
          user: mapDatabaseUser(existingData),
          isNewUser: false, // 约束冲突说明用户已存在
        };
      }

      // 其他错误正常抛出
      handleSupabaseError(error);
    }

    if (!data) {
      throw new Error('No user data returned from database');
    }

    // 🛡️ upsert 成功后记录 IP 积分发放情况（新用户才有 ipGrantArgs）
    if (ipGrantArgs) {
      await recordIpGrant(ipGrantArgs.ip, data.uuid, userData.email, ipGrantArgs.granted)
    }

    // 🎁 标记 pending_credits 为已领取
    if (pendingCreditIdsToProcess && pendingCreditIdsToProcess.length > 0) {
      const { error: claimError } = await (supabaseAdmin as any)
        .from('pending_credits')
        .update({
          is_claimed: true,
          claimed_by_uuid: data.uuid,
          claimed_at: now,
        })
        .in('id', pendingCreditIdsToProcess);

      if (claimError) {
        console.error('⚠️ 标记 pending_credits 失败:', claimError);
        // 不抛出错误，避免影响用户注册流程
      } else {
        console.log(`✅ 成功领取 ${pendingCreditIdsToProcess.length} 条积分记录`);
      }
    }

    return {
      user: mapDatabaseUser(data),
      isNewUser: !existingUser,
    };
  } catch (error: any) {
    console.error('Error in saveUser:', error);
    throw error;
  }
}

/**
 * Get user by UUID
 */
export async function getUserByUuid(uuid: string): Promise<User | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from(TABLES.USERS)
      .select('*')
      .eq('uuid', uuid)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // User not found
      }
      handleSupabaseError(error);
    }

    return data ? mapDatabaseUser(data) : null;
  } catch (error: any) {
    console.error('Error in getUserByUuid:', error);
    throw error;
  }
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from(TABLES.USERS)
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // User not found
      }
      handleSupabaseError(error);
    }

    return data ? mapDatabaseUser(data) : null;
  } catch (error: any) {
    console.error('Error in getUserByEmail:', error);
    throw error;
  }
}

/**
 * Update user data
 */
export async function updateUser(uuid: string, updateData: UpdateUserData): Promise<User> {
  try {
    const updates = {
      ...updateData,
      updated_at: getIsoTimestr(),
    };

    let { data, error } = await supabaseAdmin
      .from(TABLES.USERS)
      .update(updates as any)
      .eq('uuid', uuid)
      .select()
      .single();

    if (isMissingColumnError(error)) {
      const legacyResult = await supabaseAdmin
        .from(TABLES.USERS)
        .update(omitCreditBucketFields(updates as Record<string, unknown>) as any)
        .eq('uuid', uuid)
        .select()
        .single();

      data = legacyResult.data;
      error = legacyResult.error;
    }

    if (error) {
      console.error('Update user error:', error);
      handleSupabaseError(error);
    }

    if (!data) {
      throw new Error('No user data returned from update');
    }

    
    return mapDatabaseUser(data);
  } catch (error: any) {
    console.error('Error in updateUser:', error);
    throw error;
  }
}

/**
 * Update user's last login timestamp
 */
export async function updateLastLogin(uuid: string, ip?: string): Promise<void> {
  try {
    const updates: any = {
      last_login: getIsoTimestr(),
      updated_at: getIsoTimestr(),
    };

    if (ip) {
      updates.signin_ip = ip;
    }

    const { error } = await supabaseAdmin
      .from(TABLES.USERS)
      .update(updates)
      .eq('uuid', uuid);

    if (error) {
      console.error('Update last login error:', error);
      // Don't throw error for last login update failures
    }
  } catch (error: any) {
    console.error('Error in updateLastLogin:', error);
    // Don't throw error for last login update failures
  }
}

/**
 * Get user profile (public information)
 */
export async function getUserProfile(uuid: string): Promise<UserProfile | null> {
  try {
    // 🔥 安全查询，避免406错误
    const { data, error } = await supabaseAdmin
      .from(TABLES.USERS)
      .select('*')  // 使用通配符避免字段约束问题
      .eq('uuid', uuid)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      handleSupabaseError(error);
    }

    if (!data) return null;

    // 🔥 安全地读取订阅字段
    let subscription_plan: string = data.subscription_plan || 'free'; // 🔥 修复：默认为free套餐
    const subscription_status = data.subscription_status || 'active';
    const credits_remaining = data.credits_remaining ?? 0;

    // 🔥 将旧套餐类型映射到新类型（确保兼容性）
    if (subscription_plan === 'basic') {
      subscription_plan = 'free';  // 修复：basic映射为free
    } else if (subscription_plan === 'enterprise') {
      subscription_plan = 'premium';
    }

    return {
      uuid: data.uuid,
      email: data.email,
      nickname: data.nickname,
      avatar_url: data.avatar_url ?? undefined,
      created_at: data.created_at,
      subscription_status,
      subscription_plan,
      credits_remaining,
    };
  } catch (error: any) {
    console.error('Error in getUserProfile:', error);
    throw error;
  }
}

/**
 * Deactivate user account
 */
export async function deactivateUser(uuid: string): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from(TABLES.USERS)
      .update({ 
        is_active: false,
        updated_at: getIsoTimestr() 
      })
      .eq('uuid', uuid);

    if (error) {
      handleSupabaseError(error);
    }

  } catch (error: any) {
    console.error('Error in deactivateUser:', error);
    throw error;
  }
}

/**
 * Update user credits (for AI video processing)
 */
export async function updateUserCredits(uuid: string, creditsUsed: number): Promise<number> {
  try {
    const result = await deductUserCredits(uuid, creditsUsed);
    if (!result.success || typeof result.newBalance !== 'number') {
      throw new Error(result.error || 'Failed to update user credits');
    }

    return result.newBalance;
  } catch (error: any) {
    console.error('Error in updateUserCredits:', error);
    throw error;
  }
}

/**
 * Add credits to user account
 */
export async function addUserCredits(uuid: string, creditsToAdd: number): Promise<number> {
  try {
    const { data: newBalance, error } = await supabaseAdmin.rpc('update_user_credits_balance', {
      p_user_uuid: uuid,
      p_credits_change: creditsToAdd,
      p_transaction_type: 'bonus',
      p_description: 'Credits added to user account',
      p_metadata: {},
    });

    if (error) {
      handleSupabaseError(error);
    }

    return typeof newBalance === 'number' ? newBalance : 0;
  } catch (error: any) {
    console.error('Error in addUserCredits:', error);
    throw error;
  }
}

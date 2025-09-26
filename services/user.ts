/**
 * User Management Service for VidFab AI Video Platform
 */
import { supabaseAdmin, TABLES, handleSupabaseError, type DatabaseUser } from '@/lib/supabase';
import { User, CreateUserData, UpdateUserData, UserProfile } from '@/types/user';
import { getIsoTimestr } from '@/lib/time';
import { getUuid, getUserUuidFromEmail } from '@/lib/hash';

/**
 * Save or update a user in the database
 */
export async function saveUser(userData: CreateUserData & { uuid?: string }): Promise<User> {
  try {
    const now = getIsoTimestr();
    
    // Prepare user data with defaults
    const userToSave: Partial<DatabaseUser> = {
      uuid: userData.uuid || getUserUuidFromEmail(userData.email),
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
      // Set default AI Video platform values
      subscription_status: 'inactive',
      subscription_plan: 'basic',
      credits_remaining: 10, // Free credits for new users
      total_videos_processed: 0,
      storage_used_mb: 0,
      max_storage_mb: 1024, // 1GB default
    };

    // 🔥 修复：使用UUID作为冲突键，避免email冲突问题
    const { data, error } = await supabaseAdmin
      .from(TABLES.USERS)
      .upsert(userToSave, {
        onConflict: 'uuid',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (error) {
      console.error('Save user error:', error);
      handleSupabaseError(error);
    }

    if (!data) {
      throw new Error('No user data returned from database');
    }

    
    return {
      uuid: data.uuid,
      email: data.email,
      nickname: data.nickname,
      avatar_url: data.avatar_url,
      signin_type: data.signin_type,
      signin_provider: data.signin_provider,
      signin_openid: data.signin_openid,
      created_at: data.created_at,
      updated_at: data.updated_at,
      signin_ip: data.signin_ip,
      email_verified: data.email_verified,
      last_login: data.last_login,
      is_active: data.is_active,
      subscription_status: data.subscription_status,
      subscription_plan: data.subscription_plan,
      credits_remaining: data.credits_remaining,
      total_videos_processed: data.total_videos_processed,
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

    return data ? {
      uuid: data.uuid,
      email: data.email,
      nickname: data.nickname,
      avatar_url: data.avatar_url,
      signin_type: data.signin_type,
      signin_provider: data.signin_provider,
      signin_openid: data.signin_openid,
      created_at: data.created_at,
      updated_at: data.updated_at,
      signin_ip: data.signin_ip,
      email_verified: data.email_verified,
      last_login: data.last_login,
      is_active: data.is_active,
      subscription_status: data.subscription_status,
      subscription_plan: data.subscription_plan,
      credits_remaining: data.credits_remaining,
      total_videos_processed: data.total_videos_processed,
    } : null;
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

    return data ? {
      uuid: data.uuid,
      email: data.email,
      nickname: data.nickname,
      avatar_url: data.avatar_url,
      signin_type: data.signin_type,
      signin_provider: data.signin_provider,
      signin_openid: data.signin_openid,
      created_at: data.created_at,
      updated_at: data.updated_at,
      signin_ip: data.signin_ip,
      email_verified: data.email_verified,
      last_login: data.last_login,
      is_active: data.is_active,
      subscription_status: data.subscription_status,
      subscription_plan: data.subscription_plan,
      credits_remaining: data.credits_remaining,
      total_videos_processed: data.total_videos_processed,
    } : null;
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

    const { data, error } = await supabaseAdmin
      .from(TABLES.USERS)
      .update(updates)
      .eq('uuid', uuid)
      .select()
      .single();

    if (error) {
      console.error('Update user error:', error);
      handleSupabaseError(error);
    }

    if (!data) {
      throw new Error('No user data returned from update');
    }

    
    return {
      uuid: data.uuid,
      email: data.email,
      nickname: data.nickname,
      avatar_url: data.avatar_url,
      signin_type: data.signin_type,
      signin_provider: data.signin_provider,
      signin_openid: data.signin_openid,
      created_at: data.created_at,
      updated_at: data.updated_at,
      signin_ip: data.signin_ip,
      email_verified: data.email_verified,
      last_login: data.last_login,
      is_active: data.is_active,
      subscription_status: data.subscription_status,
      subscription_plan: data.subscription_plan,
      credits_remaining: data.credits_remaining,
      total_videos_processed: data.total_videos_processed,
    };
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
    const { data, error } = await supabaseAdmin
      .from(TABLES.USERS)
      .select('uuid, email, nickname, avatar_url, created_at, subscription_status, subscription_plan, credits_remaining')
      .eq('uuid', uuid)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      handleSupabaseError(error);
    }

    return data ? {
      uuid: data.uuid,
      email: data.email,
      nickname: data.nickname,
      avatar_url: data.avatar_url,
      created_at: data.created_at,
      subscription_status: data.subscription_status,
      subscription_plan: data.subscription_plan,
      credits_remaining: data.credits_remaining,
    } : null;
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
    const { data, error } = await supabaseAdmin
      .from(TABLES.USERS)
      .select('credits_remaining')
      .eq('uuid', uuid)
      .single();

    if (error) {
      handleSupabaseError(error);
    }

    const currentCredits = data.credits_remaining || 0;
    const newCredits = Math.max(0, currentCredits - creditsUsed);

    const { error: updateError } = await supabaseAdmin
      .from(TABLES.USERS)
      .update({
        credits_remaining: newCredits,
        updated_at: getIsoTimestr(),
      })
      .eq('uuid', uuid);

    if (updateError) {
      handleSupabaseError(updateError);
    }

    return newCredits;
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
    const { data, error } = await supabaseAdmin
      .from(TABLES.USERS)
      .select('credits_remaining')
      .eq('uuid', uuid)
      .single();

    if (error) {
      handleSupabaseError(error);
    }

    const currentCredits = data.credits_remaining || 0;
    const newCredits = currentCredits + creditsToAdd;

    const { error: updateError } = await supabaseAdmin
      .from(TABLES.USERS)
      .update({
        credits_remaining: newCredits,
        updated_at: getIsoTimestr(),
      })
      .eq('uuid', uuid);

    if (updateError) {
      handleSupabaseError(updateError);
    }

    return newCredits;
  } catch (error: any) {
    console.error('Error in addUserCredits:', error);
    throw error;
  }
}
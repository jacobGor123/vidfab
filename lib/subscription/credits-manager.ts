/**
 * VidFab Credits管理核心服务
 * 负责积分的预扣、消费、返还和余额管理
 */

import { supabaseAdmin, TABLES, handleSupabaseError } from '@/lib/supabase';
import { calculateCreditsRequired, CONCURRENT_LIMITS } from './pricing-config';
import { ensureMonthlyCreditsCurrent } from './credit-buckets';
import { checkGenerationAccess, getUserEntitlements } from './entitlements';
import type {
  CreditsReservation,
  CreditsTransaction,
  CreditsBudgetInfo,
  CreditsUsageRequest,
  CreditsUsageResponse,
  ModelAccessCheck,
  ConcurrentJobsCheck
} from './types';

export class CreditsManager {
  /**
   * 预扣积分 - 在任务开始前锁定积分
   */
  async reserveCredits(
    userUuid: string,
    model: string,
    resolution: string,
    duration: string,
    videoJobId?: string,
    userEmail?: string // 🔥 添加邮箱参数作为备用查找方式
  ): Promise<string> {
    const requiredCredits = calculateCreditsRequired(model, resolution, duration);

    if (requiredCredits <= 0) {
      throw new Error(`Invalid credits calculation for model: ${model}`);
    }

    let { data: user, error: userError } = await supabaseAdmin
      .from(TABLES.USERS)
      .select('uuid, email, credits_remaining, concurrent_jobs_running, subscription_plan')
      .eq('uuid', userUuid)
      .single();

    if (userError) {
      if (userError.code === 'PGRST116' && userEmail) {
        // 用户UUID不存在，尝试通过邮箱查找
        const { data: userByEmail, error: emailError } = await supabaseAdmin
          .from(TABLES.USERS)
          .select('uuid, email, credits_remaining, concurrent_jobs_running, subscription_plan')
          .eq('email', userEmail.toLowerCase().trim())
          .single();

        if (!emailError && userByEmail) {
          // 使用数据库中的真实UUID继续操作
          const actualUser = userByEmail;
          userUuid = actualUser.uuid;
          user = actualUser;
        } else {
          throw new Error(`User not found with UUID: ${userUuid} or email: ${userEmail}`);
        }
      } else {
        throw new Error(`Database error: ${userError.message}`);
      }
    }

    if (!user) {
      throw new Error(`User not found with UUID: ${userUuid}`);
    }

    const refreshedCredits = await ensureMonthlyCreditsCurrent(userUuid);
    const currentBalance = refreshedCredits?.total ?? (user.credits_remaining || 0);

    // 检查积分余额
    if (currentBalance < requiredCredits) {
      throw new Error(`Insufficient credits. Required: ${requiredCredits}, Available: ${currentBalance}`);
    }

    const entitlements = await getUserEntitlements(userUuid);
    const accessCheck = checkGenerationAccess(entitlements, model, resolution);
    if (!accessCheck.canAccess) {
      throw new Error(accessCheck.reason || 'Subscription required');
    }

    // 检查并发限制
    const maxConcurrent = entitlements.effectivePlan === 'free' ? 1 : 4;
    const currentRunning = user.concurrent_jobs_running || 0;

    if (currentRunning >= maxConcurrent) {
      throw new Error(`Concurrent job limit exceeded. Max: ${maxConcurrent}, Current: ${currentRunning}`);
    }

    // 🔥 尝试调用RPC函数，如果失败则使用简化方案
    try {
      const { data: reservationId, error } = await supabaseAdmin.rpc('reserve_user_credits', {
        p_user_uuid: userUuid,
        p_required_credits: requiredCredits,
        p_model_name: model,
        p_video_job_id: videoJobId,
        p_metadata: {
          resolution,
          duration,
          estimated_cost: requiredCredits
        }
      });

      if (!error && reservationId) {
        return reservationId;
      }
    } catch (rpcError) {
      console.warn('RPC reserve_user_credits failed, using direct method:', rpcError);
    }

    // 🔥 简化方案：直接更新用户余额
    const { error: updateError } = await supabaseAdmin
      .from(TABLES.USERS)
      .update({
        credits_remaining: currentBalance - requiredCredits,
        concurrent_jobs_running: currentRunning + 1,
        updated_at: new Date().toISOString()
      })
      .eq('uuid', userUuid);

    if (updateError) {
      throw new Error('Failed to deduct credits');
    }

    // 生成简单的预扣ID
    const reservationId = `simple_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return reservationId;
  }

  /**
   * 消费积分 - 任务成功完成后实际扣除积分
   */
  async consumeCredits(
    reservationId: string,
    actualCreditsUsed?: number
  ): Promise<CreditsUsageResponse> {
    try {
      // 获取预扣记录
      const { data: reservation, error } = await supabaseAdmin
        .from('credits_reservations')
        .select('*')
        .eq('id', reservationId)
        .eq('status', 'active')
        .single();

      if (error || !reservation) {
        throw new Error('Reservation not found or already consumed');
      }

      const creditsToConsume = actualCreditsUsed || reservation.reserved_credits;

      // 执行积分消费
      const result = await supabaseAdmin.rpc('consume_reserved_credits', {
        p_reservation_id: reservationId,
        p_actual_credits: creditsToConsume,
        p_consumed_by: reservation.model_name,
        p_video_job_id: reservation.video_job_id
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      // 获取用户最新余额
      const { data: user, error: userError } = await supabaseAdmin
        .from(TABLES.USERS)
        .select('credits_remaining')
        .eq('uuid', reservation.user_uuid)
        .single();

      if (userError) {
        throw new Error('Failed to get updated balance');
      }

      return {
        success: true,
        credits_consumed: creditsToConsume,
        credits_remaining: user.credits_remaining ?? undefined
      };

    } catch (error: any) {
      console.error('Error consuming credits:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 释放积分 - 任务失败时返还预扣的积分
   */
  async releaseCredits(reservationId: string, reason?: string): Promise<boolean> {
    try {
      // 获取预扣记录
      const { data: reservation, error } = await supabaseAdmin
        .from('credits_reservations')
        .select('*')
        .eq('id', reservationId)
        .eq('status', 'active')
        .single();

      if (error || !reservation) {
        console.warn('Reservation not found for release:', reservationId);
        return false;
      }

      // 返还积分到用户账户
      await supabaseAdmin.rpc('update_user_credits_balance', {
        p_user_uuid: reservation.user_uuid,
        p_credits_change: reservation.reserved_credits,
        p_transaction_type: 'refunded',
        p_description: `Credits refunded for failed task: ${reason || 'Task failed'}`,
        p_metadata: {
          reservation_id: reservationId,
          model: reservation.model_name,
          reason: reason || 'task_failed'
        }
      });

      // 标记预扣记录为已释放
      const { error: updateError } = await supabaseAdmin
        .from('credits_reservations')
        .update({
          status: 'released',
          metadata: {
            ...(reservation.metadata && typeof reservation.metadata === 'object' && !Array.isArray(reservation.metadata)
              ? reservation.metadata
              : {}),
            release_reason: reason || 'task_failed',
            released_at: new Date().toISOString()
          }
        })
        .eq('id', reservationId);

      if (updateError) {
        console.error('Error updating reservation status:', updateError);
        return false;
      }

      return true;

    } catch (error: any) {
      console.error('Error releasing credits:', error);
      return false;
    }
  }

  /**
   * 检查用户是否有足够积分
   */
  async checkCreditsAvailability(
    userUuid: string,
    model: string,
    resolution: string,
    duration: string,
    userEmail?: string
  ): Promise<CreditsBudgetInfo> {
    const requiredCredits = calculateCreditsRequired(model, resolution, duration);

    if (requiredCredits <= 0) {
      throw new Error(`Invalid credits calculation for model: ${model}`);
    }

    // 安全获取用户当前余额，支持邮箱备用查找
    let { data: user, error } = await supabaseAdmin
      .from(TABLES.USERS)
      .select('uuid, email, credits_remaining, subscription_plan')
      .eq('uuid', userUuid)
      .single();

    if (error) {
      if (error.code === 'PGRST116' && userEmail) {
        // 用户UUID不存在，尝试通过邮箱查找
        const { data: userByEmail, error: emailError } = await supabaseAdmin
          .from(TABLES.USERS)
          .select('uuid, email, credits_remaining, subscription_plan')
          .eq('email', userEmail.toLowerCase().trim())
          .single();

        if (!emailError && userByEmail) {
          user = userByEmail;
          userUuid = userByEmail.uuid;
        } else {
          throw new Error(`User not found with UUID: ${userUuid} or email: ${userEmail}`);
        }
      } else {
        throw new Error(`Database error: ${error.message}`);
      }
    }

    if (!user) {
      throw new Error('User not found');
    }

    const refreshedCredits = await ensureMonthlyCreditsCurrent(userUuid);
    const currentBalance = refreshedCredits?.total ?? (user.credits_remaining || 0);
    const canAfford = currentBalance >= requiredCredits;

    // 计算警告级别
    let warningLevel: 'none' | 'low' | 'critical' = 'none';
    const balanceRatio = currentBalance / Math.max(requiredCredits, 1);

    if (balanceRatio < 0.1) {
      warningLevel = 'critical';
    } else if (balanceRatio < 0.2) {
      warningLevel = 'low';
    }

    // 计算还能生成多少个同样的视频
    const remainingJobs = Math.floor(currentBalance / Math.max(requiredCredits, 1));

    return {
      current_balance: currentBalance,
      required_credits: requiredCredits,
      can_afford: canAfford,
      warning_level: warningLevel,
      remaining_jobs: Math.max(0, remainingJobs)
    };
  }

  /**
   * 检查模型访问权限
   */
  async checkModelAccess(
    userUuid: string,
    model: string,
    resolution?: string,
    userEmail?: string
  ): Promise<ModelAccessCheck> {
    try {
      let { data: user, error } = await supabaseAdmin
        .from(TABLES.USERS)
        .select('uuid, email, subscription_plan')
        .eq('uuid', userUuid)
        .single();

      if (error) {
        if (error.code === 'PGRST116' && userEmail) {
          // 用户UUID不存在，尝试通过邮箱查找
          const { data: userByEmail, error: emailError } = await supabaseAdmin
            .from(TABLES.USERS)
            .select('uuid, email, subscription_plan')
            .eq('email', userEmail.toLowerCase().trim())
            .single();

          if (!emailError && userByEmail) {
            user = userByEmail;
            userUuid = userByEmail.uuid;
          } else {
            return {
              model,
              user_plan: 'free',
              resolution,
              can_access: false,
              reason: `User not found with UUID: ${userUuid} or email: ${userEmail}`
            };
          }
        } else {
          return {
            model,
            user_plan: 'free',
            resolution,
            can_access: false,
            reason: `Database error: ${error.message}`
          };
        }
      }

      if (!user) {
        return {
          model,
          user_plan: 'free',
          resolution,
          can_access: false,
          reason: 'User not found'
        };
      }

      const entitlements = await getUserEntitlements(user.uuid);
      const access = checkGenerationAccess(entitlements, model, resolution);

      return {
        model,
        user_plan: entitlements.effectivePlan,
        resolution,
        can_access: access.canAccess,
        reason: access.reason || ''
      };

    } catch (error: any) {
      return {
        model,
        user_plan: 'free',
        resolution,
        can_access: false,
        reason: `Access check failed: ${error.message}`
      };
    }
  }

  /**
   * 检查并发任务限制
   */
  async checkConcurrentJobs(
    userUuid: string,
    userEmail?: string
  ): Promise<ConcurrentJobsCheck> {
    try {
      let { data: user, error } = await supabaseAdmin
        .from(TABLES.USERS)
        .select('uuid, email, subscription_plan, concurrent_jobs_running')
        .eq('uuid', userUuid)
        .single();

      if (error) {
        if (error.code === 'PGRST116' && userEmail) {
          // 用户UUID不存在，尝试通过邮箱查找
          const { data: userByEmail, error: emailError } = await supabaseAdmin
            .from(TABLES.USERS)
            .select('uuid, email, subscription_plan, concurrent_jobs_running')
            .eq('email', userEmail.toLowerCase().trim())
            .single();

          if (!emailError && userByEmail) {
            user = userByEmail;
            userUuid = userByEmail.uuid;
          } else {
            throw new Error(`User not found with UUID: ${userUuid} or email: ${userEmail}`);
          }
        } else {
          throw new Error(`Database error: ${error.message}`);
        }
      }

      if (!user) {
        throw new Error('User not found');
      }

      const entitlements = await getUserEntitlements(user.uuid);
      const userPlan = entitlements.effectivePlan;
      const currentRunning = user.concurrent_jobs_running || 0;
      const maxAllowed = CONCURRENT_LIMITS[userPlan];

      // 防护：如果maxAllowed是undefined，使用free计划的限制
      const safeMaxAllowed = maxAllowed ?? CONCURRENT_LIMITS.free;

      return {
        user_plan: userPlan,
        current_running: currentRunning,
        max_allowed: safeMaxAllowed,
        can_start: currentRunning < safeMaxAllowed
      };

    } catch (error: any) {
      throw new Error(`Concurrent jobs check failed: ${error.message}`);
    }
  }

  /**
   * 更新用户并发任务计数
   */
  async updateConcurrentJobsCount(
    userUuid: string,
    increment: number
  ): Promise<number> {
    const { data, error } = await supabaseAdmin.rpc('update_concurrent_jobs', {
      p_user_uuid: userUuid,
      p_increment: increment
    });

    if (error) {
      console.error('Error updating concurrent jobs count:', error);
      throw new Error('Failed to update concurrent jobs count');
    }

    return data;
  }

  /**
   * 获取用户积分交易历史
   */
  async getCreditsHistory(
    userUuid: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<CreditsTransaction[]> {
    const { data, error } = await supabaseAdmin
      .from('credits_transactions')
      .select('*')
      .eq('user_uuid', userUuid)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching credits history:', error);
      throw new Error('Failed to fetch credits history');
    }

    return (data || []) as CreditsTransaction[];
  }

  /**
   * 获取用户当前的预扣记录
   */
  async getActiveReservations(userUuid: string): Promise<CreditsReservation[]> {
    const { data, error } = await supabaseAdmin
      .from('credits_reservations')
      .select('*')
      .eq('user_uuid', userUuid)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching active reservations:', error);
      throw new Error('Failed to fetch active reservations');
    }

    return (data || []) as CreditsReservation[];
  }

  /**
   * 清理过期的预扣记录
   */
  async cleanupExpiredReservations(): Promise<number> {
    const { error } = await supabaseAdmin.rpc('cleanup_expired_reservations');

    if (error) {
      console.error('Error cleaning up expired reservations:', error);
      return 0;
    }

    return 0;
  }

  /**
   * 手动给用户添加积分（管理员功能）
   */
  async addBonusCredits(
    userUuid: string,
    credits: number,
    reason: string,
    adminUuid?: string
  ): Promise<number> {
    if (credits <= 0) {
      throw new Error('Bonus credits must be positive');
    }

    const { data: newBalance, error } = await supabaseAdmin.rpc('update_user_credits_balance', {
      p_user_uuid: userUuid,
      p_credits_change: credits,
      p_transaction_type: 'bonus',
      p_description: reason,
      p_metadata: {
        admin_uuid: adminUuid,
        bonus_reason: reason,
        granted_at: new Date().toISOString()
      }
    });

    if (error) {
      console.error('Error adding bonus credits:', error);
      throw new Error('Failed to add bonus credits');
    }

    return newBalance;
  }

  /**
   * 批量处理积分操作（事务）
   */
  async batchCreditsOperation(
    operations: Array<{
      userUuid: string;
      creditsChange: number;
      transactionType: 'earned' | 'spent' | 'bonus' | 'refunded';
      description: string;
      metadata?: Record<string, any>;
    }>
  ): Promise<boolean> {
    try {
      // 使用Supabase事务处理批量操作
      await supabaseAdmin.rpc('batch_credits_update', {
        operations: operations
      });

      return true;
    } catch (error: any) {
      console.error('Error in batch credits operation:', error);
      return false;
    }
  }
}

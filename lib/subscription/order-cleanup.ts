/**
 * 订单清理服务
 * 自动清理过期的 pending 订单
 */

import { supabaseAdmin, TABLES } from '@/lib/supabase';
import { getIsoTimestr } from '@/lib/time';

/**
 * 清理过期的 pending 订单
 * @param hoursThreshold 超过多少小时未支付视为过期 (默认 24 小时)
 * @returns 清理的订单数量
 */
export async function cleanupExpiredPendingOrders(
  hoursThreshold: number = 24
): Promise<{ success: boolean; cleanedCount: number; error?: string }> {
  try {
    const thresholdDate = new Date(Date.now() - hoursThreshold * 60 * 60 * 1000);

    console.log(`[ORDER_CLEANUP] 开始清理过期的 pending 订单 (超过 ${hoursThreshold} 小时)`);
    console.log(`[ORDER_CLEANUP] 截止时间: ${thresholdDate.toISOString()}`);

    // 查询过期的 pending 订单
    const { data: expiredOrders, error: queryError } = await supabaseAdmin
      .from('subscription_orders')
      .select('id, user_uuid, plan_id, billing_cycle, amount_cents, created_at')
      .eq('status', 'pending')
      .lt('created_at', thresholdDate.toISOString());

    if (queryError) {
      console.error('[ORDER_CLEANUP] 查询订单失败:', queryError);
      return { success: false, cleanedCount: 0, error: queryError.message };
    }

    if (!expiredOrders || expiredOrders.length === 0) {
      console.log('[ORDER_CLEANUP] 没有需要清理的订单');
      return { success: true, cleanedCount: 0 };
    }

    console.log(`[ORDER_CLEANUP] 找到 ${expiredOrders.length} 个过期订单`);

    // 批量更新订单状态为 cancelled
    const { error: updateError } = await supabaseAdmin
      .from('subscription_orders')
      .update({
        status: 'cancelled',
        notes: `Auto-cancelled: Payment not completed within ${hoursThreshold} hours`,
      })
      .eq('status', 'pending')
      .lt('created_at', thresholdDate.toISOString());

    if (updateError) {
      console.error('[ORDER_CLEANUP] 更新订单失败:', updateError);
      return { success: false, cleanedCount: 0, error: updateError.message };
    }

    console.log(`[ORDER_CLEANUP] ✅ 成功清理 ${expiredOrders.length} 个过期订单`);

    // 记录清理日志
    expiredOrders.forEach((order) => {
      console.log(
        `[ORDER_CLEANUP]   - 订单 ${order.id}: ${order.plan_id} ${order.billing_cycle}, ` +
          `金额 $${(order.amount_cents / 100).toFixed(2)}, ` +
          `创建于 ${order.created_at}`
      );
    });

    return {
      success: true,
      cleanedCount: expiredOrders.length,
    };
  } catch (error: any) {
    console.error('[ORDER_CLEANUP] 清理过程出错:', error);
    return {
      success: false,
      cleanedCount: 0,
      error: error.message,
    };
  }
}

/**
 * 清理指定用户的过期 pending 订单
 * @param userUuid 用户 UUID
 * @param hoursThreshold 超过多少小时未支付视为过期
 * @returns 清理结果
 */
export async function cleanupUserExpiredOrders(
  userUuid: string,
  hoursThreshold: number = 24
): Promise<{ success: boolean; cleanedCount: number; error?: string }> {
  try {
    const thresholdDate = new Date(Date.now() - hoursThreshold * 60 * 60 * 1000);

    console.log(`[ORDER_CLEANUP] 清理用户 ${userUuid} 的过期订单`);

    const { data: expiredOrders, error: queryError } = await supabaseAdmin
      .from('subscription_orders')
      .select('id, plan_id, billing_cycle, amount_cents, created_at')
      .eq('user_uuid', userUuid)
      .eq('status', 'pending')
      .lt('created_at', thresholdDate.toISOString());

    if (queryError) {
      console.error('[ORDER_CLEANUP] 查询订单失败:', queryError);
      return { success: false, cleanedCount: 0, error: queryError.message };
    }

    if (!expiredOrders || expiredOrders.length === 0) {
      console.log('[ORDER_CLEANUP] 该用户没有需要清理的订单');
      return { success: true, cleanedCount: 0 };
    }

    const { error: updateError } = await supabaseAdmin
      .from('subscription_orders')
      .update({
        status: 'cancelled',
        notes: `Auto-cancelled: Payment not completed within ${hoursThreshold} hours`,
      })
      .eq('user_uuid', userUuid)
      .eq('status', 'pending')
      .lt('created_at', thresholdDate.toISOString());

    if (updateError) {
      console.error('[ORDER_CLEANUP] 更新订单失败:', updateError);
      return { success: false, cleanedCount: 0, error: updateError.message };
    }

    console.log(`[ORDER_CLEANUP] ✅ 成功清理 ${expiredOrders.length} 个订单`);

    return {
      success: true,
      cleanedCount: expiredOrders.length,
    };
  } catch (error: any) {
    console.error('[ORDER_CLEANUP] 清理过程出错:', error);
    return {
      success: false,
      cleanedCount: 0,
      error: error.message,
    };
  }
}

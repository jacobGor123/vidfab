/**
 * Order Model - Data Access Layer
 * Handles all order-related database operations
 * NOTE: actual order data is stored in `subscription_orders` table
 */

import { getSupabaseAdminClient } from './db';
import { Order, OrderStatus, OrderInterval } from '@/types/admin/order';

// ── Field mapping ────────────────────────────────────────────────────────────

function billingCycleToInterval(cycle: string | null): OrderInterval | null {
  if (cycle === 'annual') return 'year';
  if (cycle === 'monthly') return 'month';
  return null;
}

interface OrderUserInfo {
  email: string | null;
  created_at: string | null;
  credits_remaining: number | null;
  subscription_status: string | null;
}

function mapRow(row: any, userInfoMap: Map<string, OrderUserInfo> = new Map()): Order {
  const userInfo = userInfoMap.get(row.user_uuid);
  const email = userInfo?.email ?? null;

  return {
    id: row.id,
    order_no: row.stripe_checkout_session_id || row.id,
    user_uuid: row.user_uuid ?? null,
    user_email: email,
    user_created_at: userInfo?.created_at ?? null,
    user_credits_remaining: userInfo?.credits_remaining ?? null,
    user_subscription_status: userInfo?.subscription_status ?? null,
    paid_email: email,
    product_name: row.metadata?.plan_name || row.plan_id || null,
    product_id: row.plan_id ?? null,
    amount: typeof row.amount_cents === 'number' ? row.amount_cents / 100 : null,
    status: 'paid' as OrderStatus,
    interval: billingCycleToInterval(row.billing_cycle ?? null),
    stripe_session_id: row.stripe_checkout_session_id ?? null,
    order_detail: row.metadata ?? null,
    paid_detail: null,
    paid_at: row.completed_at ?? null,
    created_at: row.created_at,
    updated_at: row.created_at,
  };
}

function applyPaidOrderFilters(query: any) {
  return query
    .eq('status', 'completed')
    .not('completed_at', 'is', null)
    .like('stripe_checkout_session_id', 'cs_live_%');
}

async function fetchUserInfoMap(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  rows: any[]
): Promise<Map<string, OrderUserInfo>> {
  const uuids = [...new Set(rows.map((r) => r.user_uuid).filter(Boolean))];
  if (uuids.length === 0) return new Map();

  const { data: users } = await supabase
    .from('users')
    .select('uuid, email, created_at, credits_remaining, subscription_status')
    .in('uuid', uuids);

  return new Map(
    (users ?? []).map((u: any) => [
      u.uuid,
      {
        email: u.email ?? null,
        created_at: u.created_at ?? null,
        credits_remaining: typeof u.credits_remaining === 'number' ? u.credits_remaining : null,
        subscription_status: u.subscription_status ?? null,
      },
    ])
  );
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Get paginated list of paid orders
 */
export async function getPaidOrders(
  page: number = 1,
  limit: number = 50
): Promise<Order[] | undefined> {
  const supabase = getSupabaseAdminClient();
  const offset = (page - 1) * limit;

  const { data, error } = await applyPaidOrderFilters(
    supabase.from('subscription_orders').select('*')
  )
    .order('completed_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching paid orders:', error);
    return undefined;
  }

  if (!data || data.length === 0) return [];

  const userInfoMap = await fetchUserInfoMap(supabase, data);
  return data.map((row: any) => mapRow(row, userInfoMap));
}

/**
 * Get all orders (regardless of status)
 */
export async function getOrders(
  page: number = 1,
  limit: number = 50
): Promise<Order[] | undefined> {
  const supabase = getSupabaseAdminClient();
  const offset = (page - 1) * limit;

  const { data, error } = await supabase
    .from('subscription_orders')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching orders:', error);
    return undefined;
  }

  if (!data || data.length === 0) return [];

  const userInfoMap = await fetchUserInfoMap(supabase, data);
  return data.map((row) => mapRow(row, userInfoMap));
}

/**
 * Find order by Stripe checkout session ID
 */
export async function findOrderByOrderNo(orderNo: string): Promise<Order | undefined> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from('subscription_orders')
    .select('*')
    .eq('stripe_checkout_session_id', orderNo)
    .single();

  if (error) {
    console.error('Error finding order by order_no:', error);
    return undefined;
  }

  const userInfoMap = await fetchUserInfoMap(supabase, [data]);
  return mapRow(data, userInfoMap);
}

/**
 * Get orders by user UUID
 */
export async function getOrdersByUserUuid(userUuid: string): Promise<Order[] | undefined> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from('subscription_orders')
    .select('*')
    .eq('user_uuid', userUuid)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching orders by user UUID:', error);
    return undefined;
  }

  if (!data || data.length === 0) return [];

  const userInfoMap = await fetchUserInfoMap(supabase, data);
  return data.map((row) => mapRow(row, userInfoMap));
}

/**
 * Get orders by paid email (looks up user UUID first)
 */
export async function getOrdersByPaidEmail(paidEmail: string): Promise<Order[] | undefined> {
  const supabase = getSupabaseAdminClient();

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('uuid, email')
    .eq('email', paidEmail)
    .single() as unknown as { data: { uuid: string; email: string } | null; error: any };

  if (userError || !user) {
    console.error('Error finding user by email:', userError);
    return [];
  }

  const { data, error } = await supabase
    .from('subscription_orders')
    .select('*')
    .eq('user_uuid', user.uuid)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching orders by paid email:', error);
    return undefined;
  }

  if (!data || data.length === 0) return [];

  const userInfoMap = new Map([
    [
      user.uuid,
      {
        email: user.email,
        created_at: null,
        credits_remaining: null,
        subscription_status: null,
      },
    ],
  ]);
  return data.map((row) => mapRow(row, userInfoMap));
}

/**
 * Get user's active subscription (most recent completed subscription order)
 */
export async function getUserActiveSubscription(userUuid: string): Promise<Order | undefined> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from('subscription_orders')
    .select('*')
    .eq('user_uuid', userUuid)
    .eq('status', 'completed')
    .in('billing_cycle', ['monthly', 'annual'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('Error fetching active subscription:', error);
    return undefined;
  }

  return mapRow(data);
}

/**
 * Get user's current plan name
 */
export async function getUserCurrentPlan(userUuid: string): Promise<string | undefined> {
  const subscription = await getUserActiveSubscription(userUuid);
  return subscription?.product_id ?? undefined;
}

/**
 * Get total count of paid orders
 */
export async function getPaidOrdersCount(): Promise<number> {
  const supabase = getSupabaseAdminClient();

  const { count, error } = await applyPaidOrderFilters(
    supabase.from('subscription_orders').select('*', { count: 'exact', head: true })
  );

  if (error) {
    console.error('Error getting paid orders count:', error);
    return 0;
  }

  return count ?? 0;
}

/**
 * Get total paid order count and revenue across all completed orders.
 */
export async function getPaidOrdersSummary(): Promise<{
  count: number;
  totalRevenue: number;
}> {
  const supabase = getSupabaseAdminClient();
  const pageSize = 1000;
  let offset = 0;
  let totalCents = 0;
  let totalCount = 0;

  while (true) {
    const { data, error, count } = await applyPaidOrderFilters(
      supabase
        .from('subscription_orders')
        .select('amount_cents', { count: offset === 0 ? 'exact' : undefined })
    )
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error('Error getting paid orders summary:', error);
      return {
        count: totalCount,
        totalRevenue: totalCents / 100,
      };
    }

    if (offset === 0) {
      totalCount = count ?? 0;
    }

    const rows = data ?? [];
    totalCents += rows.reduce(
      (sum: number, order: any) => sum + (typeof order.amount_cents === 'number' ? order.amount_cents : 0),
      0
    );

    if (rows.length < pageSize) {
      break;
    }

    offset += pageSize;
  }

  return {
    count: totalCount,
    totalRevenue: totalCents / 100,
  };
}

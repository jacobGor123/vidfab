/**
 * Order Model - Data Access Layer
 * Handles all order-related database operations
 */

import { getSupabaseAdminClient } from './db';
import { Order, OrderStatus } from '@/types/admin/order';

/**
 * Get paginated list of paid orders
 * @param page - Page number (1-indexed)
 * @param limit - Number of orders per page
 * @returns Array of paid orders or undefined on error
 */
export async function getPaidOrders(
  page: number = 1,
  limit: number = 50
): Promise<Order[] | undefined> {
  const supabase = getSupabaseAdminClient();
  const offset = (page - 1) * limit;

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('status', 'paid')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching paid orders:', error);
    return undefined;
  }

  return data as Order[];
}

/**
 * Get all orders (regardless of status)
 * @param page - Page number (1-indexed)
 * @param limit - Number of orders per page
 * @returns Array of orders or undefined on error
 */
export async function getOrders(
  page: number = 1,
  limit: number = 50
): Promise<Order[] | undefined> {
  const supabase = getSupabaseAdminClient();
  const offset = (page - 1) * limit;

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching orders:', error);
    return undefined;
  }

  return data as Order[];
}

/**
 * Find order by order number
 * @param orderNo - Order number
 * @returns Order object or undefined
 */
export async function findOrderByOrderNo(orderNo: string): Promise<Order | undefined> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('order_no', orderNo)
    .single();

  if (error) {
    console.error('Error finding order by order_no:', error);
    return undefined;
  }

  return data as Order;
}

/**
 * Get orders by user UUID
 * @param userUuid - User UUID
 * @returns Array of orders or undefined
 */
export async function getOrdersByUserUuid(userUuid: string): Promise<Order[] | undefined> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('user_uuid', userUuid)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching orders by user UUID:', error);
    return undefined;
  }

  return data as Order[];
}

/**
 * Get orders by paid email
 * @param paidEmail - Email used for payment
 * @returns Array of orders or undefined
 */
export async function getOrdersByPaidEmail(paidEmail: string): Promise<Order[] | undefined> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('paid_email', paidEmail)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching orders by paid email:', error);
    return undefined;
  }

  return data as Order[];
}

/**
 * Get user's active subscription
 * @param userUuid - User UUID
 * @returns Active subscription order or undefined
 */
export async function getUserActiveSubscription(userUuid: string): Promise<Order | undefined> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('user_uuid', userUuid)
    .eq('status', 'paid')
    .in('interval', ['month', 'year'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('Error fetching active subscription:', error);
    return undefined;
  }

  return data as Order;
}

/**
 * Get user's current plan
 * @param userUuid - User UUID
 * @returns Product name of the current plan or undefined
 */
export async function getUserCurrentPlan(userUuid: string): Promise<string | undefined> {
  const subscription = await getUserActiveSubscription(userUuid);
  return subscription?.product_name || undefined;
}

/**
 * Get total count of paid orders
 * @returns Total number of paid orders
 */
export async function getPaidOrdersCount(): Promise<number> {
  const supabase = getSupabaseAdminClient();

  const { count, error } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'paid');

  if (error) {
    console.error('Error getting paid orders count:', error);
    return 0;
  }

  return count || 0;
}

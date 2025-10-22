/**
 * Admin Order Type Definitions
 */

export type OrderStatus = 'created' | 'paid' | 'deleted';
export type OrderInterval = 'one-time' | 'month' | 'year';

export interface Order {
  id: number;
  order_no: string;
  user_uuid: string | null;
  user_email: string | null;
  paid_email: string | null;
  product_name: string | null;
  product_id: string | null;
  amount: number | null;
  status: OrderStatus;
  interval: OrderInterval | null;
  stripe_session_id: string | null;
  order_detail: any | null;  // JSONB
  paid_detail: any | null;   // JSONB
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

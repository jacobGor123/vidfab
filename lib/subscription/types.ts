/**
 * VidFab订阅系统类型定义
 */

import { SUBSCRIPTION_PLANS } from './pricing-config';

// 基础类型
export type PlanId = keyof typeof SUBSCRIPTION_PLANS;
export type BillingCycle = 'monthly' | 'annual';
export type SubscriptionStatus = 'active' | 'inactive' | 'cancelled' | 'past_due' | 'trialing';
export type OrderStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type TransactionType = 'earned' | 'spent' | 'refunded' | 'expired' | 'bonus';
export type ReservationStatus = 'active' | 'consumed' | 'released' | 'expired';

// 订阅计划
export interface SubscriptionPlan {
  id: PlanId;
  name: string;
  credits: number;
  price: {
    monthly: number;
    annual: number;
  };
  features: string[];
  limits: {
    models: string[];
    concurrent_jobs: number;
    storage_days: number;
    max_resolution: string;
  };
}

// 用户订阅信息
export interface UserSubscription {
  uuid: string;
  plan_id: PlanId;
  status: SubscriptionStatus;
  billing_cycle: BillingCycle;
  credits_remaining: number;
  credits_total: number;
  credits_monthly_total?: number; // 本月可用总积分（包含上月剩余）
  period_start: string;
  period_end: string;
  stripe_subscription_id?: string;
  stripe_customer_id?: string;
  auto_renew: boolean;
  created_at: string;
  updated_at: string;
}

// 订阅订单
export interface SubscriptionOrder {
  id: string;
  user_uuid: string;
  order_type: 'subscription' | 'upgrade' | 'downgrade' | 'renewal';
  plan_id: PlanId;
  billing_cycle: BillingCycle;
  amount_cents: number;
  currency: string;
  credits_included: number;
  status: OrderStatus;
  stripe_payment_intent_id?: string;
  stripe_subscription_id?: string;
  stripe_customer_id?: string;
  stripe_checkout_session_id?: string;
  period_start?: string;
  period_end?: string;
  created_at: string;
  completed_at?: string;
  metadata: Record<string, any>;
  notes?: string;
}

// Credits交易记录
export interface CreditsTransaction {
  id: string;
  user_uuid: string;
  order_id?: string;
  transaction_type: TransactionType;
  credits_amount: number;
  balance_before: number;
  balance_after: number;
  consumed_by?: string;
  video_job_id?: string;
  model_used?: string;
  resolution?: string;
  duration?: string;
  created_at: string;
  metadata: Record<string, any>;
  description?: string;
}

// Credits预扣记录
export interface CreditsReservation {
  id: string;
  user_uuid: string;
  video_job_id?: string;
  reserved_credits: number;
  model_name: string;
  estimated_cost: number;
  status: ReservationStatus;
  created_at: string;
  expires_at: string;
  consumed_at?: string;
  metadata: Record<string, any>;
}

// 套餐变更记录
export interface SubscriptionChange {
  id: string;
  user_uuid: string;
  from_plan?: PlanId;
  to_plan: PlanId;
  change_type: 'upgrade' | 'downgrade' | 'new_subscription' | 'cancellation' | 'renewal';
  order_id?: string;
  credits_before: number;
  credits_after: number;
  credits_adjustment: number;
  effective_date: string;
  created_at: string;
  reason?: string;
  metadata: Record<string, any>;
}

// Stripe相关类型
export interface StripeCheckoutSession {
  sessionId: string;
  url: string;
  customer_id?: string;
  subscription_id?: string;
}

export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: any;
  };
  created: number;
}

// API请求/响应类型
export interface CreateCheckoutSessionRequest {
  plan_id: PlanId;
  billing_cycle: BillingCycle;
  success_url?: string;
  cancel_url?: string;
}

export interface CreateCheckoutSessionResponse {
  success: boolean;
  checkout_url?: string;
  session_id?: string;
  error?: string;
}

export interface SubscriptionStatusResponse {
  success: boolean;
  subscription?: UserSubscription;
  credits_remaining?: number;
  plan_limits?: SubscriptionPlan['limits'];
  error?: string;
}

export interface CreditsUsageRequest {
  model: string;
  resolution: string;
  duration: string;
  video_job_id?: string;
}

export interface CreditsUsageResponse {
  success: boolean;
  credits_consumed?: number;
  credits_remaining?: number;
  reservation_id?: string;
  error?: string;
}

// 权限检查相关
export interface ModelAccessCheck {
  model: string;
  user_plan: PlanId;
  resolution?: string;
  can_access: boolean;
  reason?: string;
}

export interface ConcurrentJobsCheck {
  user_plan: PlanId;
  current_running: number;
  max_allowed: number;
  can_start: boolean;
}

// Credits预算提示
export interface CreditsBudgetInfo {
  current_balance: number;
  required_credits: number;
  can_afford: boolean;
  warning_level: 'none' | 'low' | 'critical';
  remaining_jobs: number;
}

// 用户升级建议
export interface UpgradeRecommendation {
  current_plan: PlanId;
  recommended_plan: PlanId;
  reasons: string[];
  savings_annual?: number;
  additional_credits?: number;
}

// 系统配置
export interface SubscriptionConfig {
  enabled: boolean;
  default_plan: PlanId;
  trial_period_days: number;
  grace_period_days: number;
  max_concurrent_jobs: Record<PlanId, number>;
  storage_retention_days: Record<PlanId, number>;
  credits_expiry_days: number;
  webhook_retry_attempts: number;
}

// 分析和统计类型
export interface SubscriptionAnalytics {
  total_subscribers: number;
  plan_distribution: Record<PlanId, number>;
  monthly_recurring_revenue: number;
  annual_recurring_revenue: number;
  churn_rate: number;
  conversion_rate: Record<string, number>;
  credits_usage_stats: {
    total_consumed: number;
    avg_per_user: number;
    popular_models: Array<{ model: string; usage_count: number }>;
  };
}

// 导出常用的联合类型
export type DatabaseUser = {
  uuid: string;
  email: string;
  nickname: string;
  subscription_plan: PlanId;
  subscription_status: SubscriptionStatus;
  credits_remaining: number;
  concurrent_jobs_running: number;
  created_at: string;
  updated_at: string;
};

export type PaymentMethod = {
  id: string;
  type: 'card';
  card: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
  is_default: boolean;
};
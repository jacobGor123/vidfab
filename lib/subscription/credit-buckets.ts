import { supabaseAdmin, TABLES } from '@/lib/supabase';
import { getIsoTimestr } from '@/lib/time';
import { SUBSCRIPTION_PLANS } from './pricing-config';
import { isPeriodCurrent, normalizePlanId } from './entitlements';
import type { PlanId } from './types';

const PAID_ACCESS_STATUSES = new Set(['active', 'cancelled']);

interface CreditBucketUser {
  uuid: string;
  subscription_plan?: string | null;
  subscription_status?: string | null;
  subscription_period_end?: string | null;
  credits_remaining?: number | null;
  credits_monthly_total?: number | null;
  credits_monthly_balance?: number | null;
  credits_other_balance?: number | null;
  credits_last_reset_date?: string | null;
  credits_next_reset_at?: string | null;
}

export interface CreditBucketSnapshot {
  total: number;
  monthlyBalance: number;
  monthlyTotal: number;
  monthlyUsed: number;
  otherBalance: number;
  lastResetAt: string | null;
  nextResetAt: string | null;
  planId: PlanId;
  hasPaidAccess: boolean;
}

interface ResetMonthlyCreditsInput {
  userUuid: string;
  planId: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  description: string;
  metadata?: Record<string, unknown>;
}

export function getPlanMonthlyCredits(planId?: string | null): number {
  const normalizedPlan = normalizePlanId(planId);
  return normalizedPlan === 'free' ? 0 : SUBSCRIPTION_PLANS[normalizedPlan].credits;
}

function addMonthsClamped(date: Date, months: number): Date {
  const result = new Date(date);
  const targetMonth = result.getMonth() + months;
  const originalDate = result.getDate();

  result.setDate(1);
  result.setMonth(targetMonth);

  const daysInTargetMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(originalDate, daysInTargetMonth));

  return result;
}

function getNextMonthlyReset(from: Date, periodEnd?: string | null): string {
  const nextReset = addMonthsClamped(from, 1);
  const periodEndDate = periodEnd ? new Date(periodEnd) : null;

  if (
    periodEndDate &&
    Number.isFinite(periodEndDate.getTime()) &&
    periodEndDate.getTime() < nextReset.getTime()
  ) {
    return periodEndDate.toISOString();
  }

  return nextReset.toISOString();
}

function hasPaidCreditAccess(user: CreditBucketUser): boolean {
  const planId = normalizePlanId(user.subscription_plan);
  const status = user.subscription_status || 'inactive';

  return (
    planId !== 'free' &&
    PAID_ACCESS_STATUSES.has(status) &&
    isPeriodCurrent(user.subscription_period_end)
  );
}

function toSnapshot(user: CreditBucketUser, paidAccess = hasPaidCreditAccess(user)): CreditBucketSnapshot {
  const planId = normalizePlanId(user.subscription_plan);
  const monthlyTotal = paidAccess ? getPlanMonthlyCredits(planId) : 0;
  const rawTotal = Math.max(0, user.credits_remaining || 0);
  const monthlyBalance = Math.max(
    0,
    user.credits_monthly_balance ?? (paidAccess ? Math.min(rawTotal, monthlyTotal) : 0)
  );
  const otherBalance = Math.max(
    0,
    user.credits_other_balance ?? Math.max(rawTotal - monthlyBalance, 0)
  );
  const total = monthlyBalance + otherBalance;

  return {
    total,
    monthlyBalance,
    monthlyTotal,
    monthlyUsed: Math.max(0, monthlyTotal - monthlyBalance),
    otherBalance,
    lastResetAt: paidAccess ? user.credits_last_reset_date || null : null,
    nextResetAt: paidAccess ? user.credits_next_reset_at || null : null,
    planId,
    hasPaidAccess: paidAccess,
  };
}

async function fetchCreditUser(userUuid: string): Promise<CreditBucketUser | null> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.USERS)
    .select(
      'uuid, subscription_plan, subscription_status, subscription_period_end, credits_remaining, credits_monthly_total, credits_monthly_balance, credits_other_balance, credits_last_reset_date, credits_next_reset_at'
    )
    .eq('uuid', userUuid)
    .single();

  if (error || !data) {
    if (error?.code !== 'PGRST116') {
      console.error('[credits] Failed to fetch user credit buckets:', error);
    }
    return null;
  }

  return data;
}

export async function ensureMonthlyCreditsCurrent(userUuid: string): Promise<CreditBucketSnapshot | null> {
  const user = await fetchCreditUser(userUuid);
  if (!user) return null;

  const paidAccess = hasPaidCreditAccess(user);
  const currentSnapshot = toSnapshot(user, paidAccess);

  if (!paidAccess) {
    if (
      currentSnapshot.monthlyBalance === 0 &&
      (user.credits_monthly_total || 0) === 0 &&
      user.credits_next_reset_at === null &&
      user.credits_remaining === currentSnapshot.otherBalance
    ) {
      return currentSnapshot;
    }

    const updatedAt = getIsoTimestr();
    const { data: updatedUser, error } = await supabaseAdmin
      .from(TABLES.USERS)
      .update({
        credits_monthly_balance: 0,
        credits_monthly_total: 0,
        credits_other_balance: currentSnapshot.otherBalance,
        credits_remaining: currentSnapshot.otherBalance,
        credits_next_reset_at: null,
        updated_at: updatedAt,
      })
      .eq('uuid', userUuid)
      .select(
        'uuid, subscription_plan, subscription_status, subscription_period_end, credits_remaining, credits_monthly_total, credits_monthly_balance, credits_other_balance, credits_last_reset_date, credits_next_reset_at'
      )
      .single();

    if (error || !updatedUser) {
      console.error('[credits] Failed to expire monthly credits for non-paid user:', error);
      return currentSnapshot;
    }

    return toSnapshot(updatedUser, false);
  }

  const monthlyTotal = getPlanMonthlyCredits(currentSnapshot.planId);
  const nextResetAt = user.credits_next_reset_at ? new Date(user.credits_next_reset_at) : null;
  const resetDue =
    !nextResetAt ||
    !Number.isFinite(nextResetAt.getTime()) ||
    nextResetAt.getTime() <= Date.now() ||
    (user.credits_monthly_total || 0) !== monthlyTotal;

  if (!resetDue) {
    return {
      ...currentSnapshot,
      monthlyTotal,
      monthlyUsed: Math.max(0, monthlyTotal - currentSnapshot.monthlyBalance),
    };
  }

  const now = new Date();
  const updatedAt = now.toISOString();
  const nextReset = getNextMonthlyReset(now, user.subscription_period_end);
  const newMonthlyBalance = monthlyTotal;
  const newTotal = newMonthlyBalance + currentSnapshot.otherBalance;

  const { data: updatedUser, error } = await supabaseAdmin
    .from(TABLES.USERS)
    .update({
      credits_monthly_balance: newMonthlyBalance,
      credits_monthly_total: monthlyTotal,
      credits_other_balance: currentSnapshot.otherBalance,
      credits_remaining: newTotal,
      credits_last_reset_date: updatedAt,
      credits_next_reset_at: nextReset,
      updated_at: updatedAt,
    })
    .eq('uuid', userUuid)
    .select(
      'uuid, subscription_plan, subscription_status, subscription_period_end, credits_remaining, credits_monthly_total, credits_monthly_balance, credits_other_balance, credits_last_reset_date, credits_next_reset_at'
    )
    .single();

  if (error || !updatedUser) {
    console.error('[credits] Failed to reset monthly credits:', error);
    return currentSnapshot;
  }

  await supabaseAdmin.from('credits_transactions').insert({
    user_uuid: userUuid,
    transaction_type: 'earned',
    credits_amount: monthlyTotal,
    balance_before: currentSnapshot.total,
    balance_after: newTotal,
    description: `Monthly ${currentSnapshot.planId} credits reset`,
    metadata: {
      source: 'monthly_reset',
      plan_id: currentSnapshot.planId,
      expired_monthly_balance: currentSnapshot.monthlyBalance,
      other_balance: currentSnapshot.otherBalance,
      next_reset_at: nextReset,
    },
  });

  return toSnapshot(updatedUser, true);
}

export async function resetSubscriptionMonthlyCredits({
  userUuid,
  planId,
  periodStart,
  periodEnd,
  description,
  metadata = {},
}: ResetMonthlyCreditsInput): Promise<CreditBucketSnapshot> {
  const user = await fetchCreditUser(userUuid);
  if (!user) {
    throw new Error(`User not found: ${userUuid}`);
  }

  const normalizedPlan = normalizePlanId(planId);
  const monthlyTotal = getPlanMonthlyCredits(normalizedPlan);
  if (monthlyTotal <= 0) {
    throw new Error(`Cannot reset subscription credits for free plan: ${planId}`);
  }

  const previousSnapshot = toSnapshot(user, hasPaidCreditAccess(user));
  const resetBase = periodStart ? new Date(periodStart) : new Date();
  const resetAt = Number.isFinite(resetBase.getTime()) ? resetBase.toISOString() : getIsoTimestr();
  const nextResetAt = getNextMonthlyReset(new Date(resetAt), periodEnd || user.subscription_period_end);
  const newTotal = monthlyTotal + previousSnapshot.otherBalance;

  const { data: updatedUser, error } = await supabaseAdmin
    .from(TABLES.USERS)
    .update({
      credits_monthly_balance: monthlyTotal,
      credits_monthly_total: monthlyTotal,
      credits_other_balance: previousSnapshot.otherBalance,
      credits_remaining: newTotal,
      credits_last_reset_date: resetAt,
      credits_next_reset_at: nextResetAt,
      updated_at: getIsoTimestr(),
    })
    .eq('uuid', userUuid)
    .select(
      'uuid, subscription_plan, subscription_status, subscription_period_end, credits_remaining, credits_monthly_total, credits_monthly_balance, credits_other_balance, credits_last_reset_date, credits_next_reset_at'
    )
    .single();

  if (error || !updatedUser) {
    console.error('[credits] Failed to grant subscription monthly credits:', error);
    throw error || new Error('Failed to grant subscription monthly credits');
  }

  await supabaseAdmin.from('credits_transactions').insert({
    user_uuid: userUuid,
    transaction_type: 'earned',
    credits_amount: monthlyTotal,
    balance_before: previousSnapshot.total,
    balance_after: newTotal,
    description,
    metadata: {
      ...metadata,
      source: 'subscription_monthly_reset',
      plan_id: normalizedPlan,
      monthly_credits_granted: monthlyTotal,
      expired_monthly_balance: previousSnapshot.monthlyBalance,
      other_balance: previousSnapshot.otherBalance,
      next_reset_at: nextResetAt,
    },
  });

  return {
    ...toSnapshot(updatedUser, true),
    planId: normalizedPlan,
    monthlyTotal,
    monthlyBalance: monthlyTotal,
    monthlyUsed: 0,
    otherBalance: previousSnapshot.otherBalance,
    total: newTotal,
    lastResetAt: resetAt,
    nextResetAt,
    hasPaidAccess: true,
  };
}

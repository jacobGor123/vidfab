import { supabaseAdmin, TABLES } from '@/lib/supabase'
import type { PlanId, SubscriptionStatus } from './types'

const PAID_STATUSES_WITH_ACCESS = new Set(['active', 'cancelled'])

export interface UserEntitlements {
  rawPlan: string
  effectivePlan: PlanId
  status: SubscriptionStatus | 'expired'
  hasPaidAccess: boolean
  autoRenew: boolean
  periodEnd?: string | null
  creditsRemaining: number
}

export function normalizePlanId(planId?: string | null): PlanId {
  const planMapping: Record<string, PlanId> = {
    basic: 'free',
    lite: 'pro',
    enterprise: 'premium',
    free: 'free',
    pro: 'pro',
    premium: 'premium',
  }

  return planMapping[planId || 'free'] || 'free'
}

export function isPeriodCurrent(periodEnd?: string | null): boolean {
  if (!periodEnd) {
    return true
  }

  const timestamp = new Date(periodEnd).getTime()
  return Number.isFinite(timestamp) && timestamp > Date.now()
}

export function getEffectiveEntitlements(user: {
  subscription_plan?: string | null
  subscription_status?: string | null
  subscription_stripe_id?: string | null
  subscription_period_end?: string | null
  credits_remaining?: number | null
}): UserEntitlements {
  const rawPlan = user.subscription_plan || 'free'
  const normalizedPlan = normalizePlanId(rawPlan)
  const rawStatus = user.subscription_status || 'inactive'
  const periodCurrent = isPeriodCurrent(user.subscription_period_end)
  const canUsePaidAccess =
    normalizedPlan !== 'free' &&
    PAID_STATUSES_WITH_ACCESS.has(rawStatus) &&
    periodCurrent
  const effectiveStatus: SubscriptionStatus | 'expired' =
    normalizedPlan !== 'free' && !periodCurrent
      ? 'expired'
      : (rawStatus as SubscriptionStatus)

  return {
    rawPlan,
    effectivePlan: canUsePaidAccess ? normalizedPlan : 'free',
    status: effectiveStatus,
    hasPaidAccess: canUsePaidAccess,
    autoRenew: Boolean(user.subscription_stripe_id && rawStatus === 'active' && periodCurrent),
    periodEnd: user.subscription_period_end,
    creditsRemaining: user.credits_remaining || 0,
  }
}

export async function getUserEntitlements(userUuid: string): Promise<UserEntitlements> {
  const { data: user, error } = await supabaseAdmin
    .from(TABLES.USERS)
    .select('subscription_plan, subscription_status, subscription_stripe_id, subscription_period_end, credits_remaining')
    .eq('uuid', userUuid)
    .single()

  if (error || !user) {
    return getEffectiveEntitlements({
      subscription_plan: 'free',
      subscription_status: 'inactive',
      credits_remaining: 0,
    })
  }

  return getEffectiveEntitlements(user)
}

export function checkGenerationAccess(
  entitlements: UserEntitlements,
  model: string,
  resolution?: string
): { canAccess: boolean; reason?: string } {
  const normalizedModel = model === 'vidfab-q1'
    ? 'seedance-v1-pro-t2v'
    : model === 'vidfab-pro'
      ? 'veo3-fast'
      : model

  if (normalizedModel === 'video-effects') {
    return { canAccess: true }
  }

  if (entitlements.hasPaidAccess) {
    return { canAccess: true }
  }

  const isFreeSeedance =
    normalizedModel === 'seedance-v1-pro-t2v' ||
    normalizedModel === 'seedance-v1-pro-t2v-480p' ||
    normalizedModel === 'seedance-v1-pro-t2v-720p'

  if (!isFreeSeedance) {
    return {
      canAccess: false,
      reason: 'This model requires an active paid subscription',
    }
  }

  if (resolution === '1080p') {
    return {
      canAccess: false,
      reason: '1080p resolution requires an active paid subscription',
    }
  }

  return { canAccess: true }
}

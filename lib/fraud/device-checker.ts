/**
 * 设备指纹检测 - Layer 3 防欺诈（事后追缴）
 * 检查同一设备是否已在其他账号领取过积分
 */
import { supabaseAdmin } from '@/lib/supabase'
import { getIsoTimestr } from '@/lib/time'

interface CheckResult {
  isFraud: boolean
  reason?: string
}

/**
 * 检查设备指纹并记录，若发现欺诈则追缴当前账号积分
 * 幂等：同一 user_uuid 只处理一次
 */
export async function checkAndRecordDevice(
  fingerprintHash: string,
  userUuid: string,
  ip: string
): Promise<CheckResult> {
  // 1. 幂等检查：该 user_uuid 是否已处理过
  const { data: existing } = await supabaseAdmin
    .from('device_fingerprints')
    .select('id')
    .eq('user_uuid', userUuid)
    .maybeSingle()

  if (existing) {
    return { isFraud: false } // 已处理，幂等返回
  }

  // 2. 检查同一指纹是否关联了其他合法账号
  const { data: sameDevice } = await supabaseAdmin
    .from('device_fingerprints')
    .select('user_uuid')
    .eq('fingerprint', fingerprintHash)
    .neq('user_uuid', userUuid)  // 显式排除当前用户（防守性编程）
    .limit(10)

  let isFraud = false

  if (sameDevice && sameDevice.length > 0) {
    const historicUuids = Array.from(new Set(sameDevice.map(r => r.user_uuid)))

    // 检查历史账号中是否有付费账号（付费用户不触发追缴）
    const { data: paidUsers } = await supabaseAdmin
      .from('users')
      .select('uuid')
      .in('uuid', historicUuids)
      .neq('subscription_plan', 'free')

    const hasPaidAccount = (paidUsers?.length ?? 0) > 0

    if (!hasPaidAccount) {
      // 没有付费账号 → 同一设备的所有账号（无论 limited 与否）都算欺诈证据
      // 覆盖 Spec 条件 2（历史有正常免费账号）和条件 3（历史账号全是 limited）
      isFraud = true
    }
    // 若有付费账号 → 不触发（付费证明了真实性，Spec 条件 4）
  }

  // 3. 写入设备指纹记录（无论是否欺诈都记录，供后续分析）
  const { error: insertError } = await supabaseAdmin
    .from('device_fingerprints')
    .insert({
      fingerprint: fingerprintHash,
      user_uuid: userUuid,
      ip_address: ip,
    })

  if (insertError && insertError.code !== '23505') {
    // 23505 = 唯一约束冲突（并发），忽略；其他错误记录日志
    console.error('[fraud/device] 写入 device_fingerprints 失败:', insertError)
  }

  // 4. 若欺诈，追缴积分
  if (isFraud) {
    const { data: currentUser } = await supabaseAdmin
      .from('users')
      .select('credits_remaining')
      .eq('uuid', userUuid)
      .maybeSingle()

    const consumed = currentUser
      ? 200 - (currentUser.credits_remaining ?? 200)
      : 0

    const fraudReason = consumed > 0
      ? `device_fingerprint:consumed:${consumed}`
      : 'device_fingerprint'

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        credits_remaining: 0,
        is_credit_limited: true,
        fraud_reason: fraudReason,
        updated_at: getIsoTimestr(),
      })
      .eq('uuid', userUuid)

    if (updateError) {
      console.error('[fraud/device] 追缴积分失败:', updateError)
    } else {
      console.log(`[fraud/device] 追缴成功: ${userUuid}, reason: ${fraudReason}`)
    }
  }

  return { isFraud }
}

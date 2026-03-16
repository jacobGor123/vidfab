/**
 * IP 频率限制 - Layer 2 防欺诈
 * 使用 cf-connecting-ip 优先策略，防止攻击者伪造 x-forwarded-for 绕过
 */
import { headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'

const IP_WINDOW_DAYS = 7
const IP_GRANT_LIMIT = 2 // 同一 IP N 天内最多发放 N 次积分

/**
 * 读取客户端真实 IP，优先使用 Cloudflare 设置的 cf-connecting-ip
 * 注意：不使用 lib/ip.ts 的 getClientIp()，因为它优先读取可伪造的 x-forwarded-for
 */
export async function getAntifraudIp(): Promise<string> {
  try {
    const headersList = await headers()

    // 1. cf-connecting-ip（Cloudflare 设置，用户无法伪造）
    const cfIp = headersList.get('cf-connecting-ip')
    if (cfIp) return cfIp.trim()

    // 2. x-real-ip
    const realIp = headersList.get('x-real-ip')
    if (realIp) return realIp.trim()

    // 3. x-forwarded-for 的最后一个 IP（最接近真实来源）
    const forwarded = headersList.get('x-forwarded-for')
    if (forwarded) {
      const parts = forwarded.split(',')
      return parts[parts.length - 1].trim()
    }

    return 'unknown'
  } catch {
    return 'unknown'
  }
}

/**
 * 检查 IP 是否已超过积分发放限额
 * @returns true 表示已超限，应拒绝发放积分
 */
export async function checkIpCreditLimit(ip: string): Promise<boolean> {
  if (!ip || ip === 'unknown') return false // 未知 IP 时放行

  const windowStart = new Date()
  windowStart.setDate(windowStart.getDate() - IP_WINDOW_DAYS)

  const { count, error } = await supabaseAdmin
    .from('new_user_ip_grants')
    .select('*', { count: 'exact', head: true })
    .eq('ip_address', ip)
    .eq('granted', true)
    .gte('granted_at', windowStart.toISOString())

  if (error) {
    console.error('[fraud/ip] 查询 new_user_ip_grants 失败:', error)
    return false // 查询失败时放行
  }

  return (count ?? 0) >= IP_GRANT_LIMIT
}

/**
 * 记录本次新用户 IP 积分发放情况
 */
export async function recordIpGrant(
  ip: string,
  userUuid: string,
  userEmail: string,
  granted: boolean
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('new_user_ip_grants')
    .insert({
      ip_address: ip,
      user_uuid: userUuid,
      user_email: userEmail,
      granted,
      granted_at: new Date().toISOString(),
    })

  if (error) {
    // 记录失败不阻断主流程，只记录日志
    console.error('[fraud/ip] 写入 new_user_ip_grants 失败:', error)
  }
}

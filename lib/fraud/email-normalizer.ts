/**
 * 邮箱规范化工具 - Layer 1 防欺诈
 * 去除 Gmail 点号、去除 +alias 后缀，用于检测重复账号
 */
import { supabaseAdmin } from '@/lib/supabase'

// 支持去除 +alias 的邮件域名
const ALIAS_DOMAINS = new Set([
  'gmail.com',
  'yandex.com', 'yandex.ru',
  'outlook.com', 'hotmail.com', 'live.com',
  'icloud.com', 'me.com', 'mac.com',
])

/**
 * 将邮箱规范化为去除点号和别名后的形式
 * 例：J.Ohn+test@gmail.com → john@gmail.com
 */
export function normalizeEmail(email: string): string {
  const lower = email.toLowerCase().trim()
  const atIdx = lower.lastIndexOf('@')
  if (atIdx === -1) return lower

  let local = lower.slice(0, atIdx)
  const domain = lower.slice(atIdx + 1)

  // 去除 +alias 部分（所有支持的域名）
  if (ALIAS_DOMAINS.has(domain)) {
    const plusIdx = local.indexOf('+')
    if (plusIdx !== -1) local = local.slice(0, plusIdx)
  }

  // Gmail：去除本地部分所有点号
  if (domain === 'gmail.com') {
    local = local.replace(/\./g, '')
  }

  return `${local}@${domain}`
}

/**
 * 检查规范化邮箱是否已在数据库中存在
 * @returns true 表示已存在（重复），应触发限制
 */
export async function isDuplicateNormalizedEmail(
  normalizedEmail: string
): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('uuid')
    .eq('normalized_email', normalizedEmail)
    .maybeSingle()

  if (error) {
    console.error('[fraud/email] 查询 normalized_email 失败:', error)
    return false // 查询失败时放行，避免误杀
  }

  return data !== null
}

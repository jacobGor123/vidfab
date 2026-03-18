/**
 * 修复孤儿 Stripe 订阅用户的 subscription_period_end
 * 这些用户有 stripe_id 但 Stripe 上已不存在，按注册日期推算月周期
 */

import dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })
dotenv.config()

async function main() {
  const { supabaseAdmin } = await import('../lib/supabase')

  // 找出有 Stripe ID 但 period_end 仍为 null 的用户
  const { data: users, error } = await supabaseAdmin
    .from('users')
    .select('uuid, email, created_at, subscription_period_end')
    .not('subscription_stripe_id', 'is', null)
    .is('subscription_period_end', null)

  if (error) {
    console.error('❌ 查询失败:', error)
    process.exit(1)
  }

  console.log(`📊 找到 ${users?.length ?? 0} 个待修复用户`)

  const now = new Date()
  for (const user of users ?? []) {
    const created = new Date(user.created_at)
    const periodEnd = new Date(created)
    while (periodEnd <= now) {
      periodEnd.setMonth(periodEnd.getMonth() + 1)
    }

    const { error: updateErr } = await supabaseAdmin
      .from('users')
      .update({ subscription_period_end: periodEnd.toISOString() })
      .eq('uuid', user.uuid)

    if (updateErr) {
      console.error(`❌ ${user.email} 更新失败:`, updateErr)
    } else {
      console.log(`✅ ${user.email} → ${periodEnd.toISOString().split('T')[0]}`)
    }
  }

  console.log('\n🎉 完成')
}

main().catch(console.error)

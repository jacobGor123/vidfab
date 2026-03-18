/**
 * 同步所有有 Stripe 订阅的用户的 subscription_period_end
 * 从 Stripe 拉取真实的 current_period_end 写入 DB
 */

import dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })
dotenv.config()

async function main() {
  const { supabaseAdmin } = await import('../lib/supabase')
  const Stripe = (await import('stripe')).default
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

  // 查出所有有 Stripe 订阅 ID 的活跃用户
  const { data: users, error } = await supabaseAdmin
    .from('users')
    .select('uuid, email, subscription_stripe_id, subscription_period_end')
    .not('subscription_stripe_id', 'is', null)
    .neq('subscription_stripe_id', '')

  if (error) {
    console.error('❌ 查询失败:', error)
    process.exit(1)
  }

  console.log(`📊 找到 ${users?.length ?? 0} 个有 Stripe 订阅的用户`)

  let fixedCount = 0
  for (const user of users ?? []) {
    try {
      const sub = await stripe.subscriptions.retrieve(user.subscription_stripe_id!)
      const periodEnd = new Date(sub.current_period_end * 1000).toISOString()

      const { error: updateErr } = await supabaseAdmin
        .from('users')
        .update({ subscription_period_end: periodEnd })
        .eq('uuid', user.uuid)

      if (updateErr) {
        console.error(`❌ ${user.email} 更新失败:`, updateErr)
      } else {
        console.log(`✅ ${user.email} → ${periodEnd.split('T')[0]} (Stripe: ${sub.status})`)
        fixedCount++
      }
    } catch (err: any) {
      console.error(`⚠️  ${user.email} Stripe 查询失败: ${err.message}`)
    }
  }

  console.log(`\n🎉 完成！共同步 ${fixedCount} 个用户的账单日期`)
}

main().catch(console.error)

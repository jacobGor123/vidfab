/**
 * 迁移：users 表新增 subscription_period_end 字段
 * 并修复现有手动赋权用户（无 Stripe 订阅）的账单日期
 */

import dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })
dotenv.config()

async function main() {
  const { supabaseAdmin } = await import('../lib/supabase')

  console.log('🚀 开始迁移：添加 subscription_period_end 字段')

  // Step 1: 添加字段（通过 RPC 执行 DDL）
  // Supabase REST API 不支持直接 DDL，用 postgres_changes 方式写入
  // 先检查字段是否已存在
  const { data: testUser, error: testErr } = await supabaseAdmin
    .from('users')
    .select('subscription_period_end')
    .limit(1)

  if (testErr && testErr.message.includes('column')) {
    console.error('❌ subscription_period_end 字段不存在，请先在 Supabase Dashboard 执行以下 SQL：')
    console.log(`
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_period_end TIMESTAMPTZ;
`)
    console.log('执行后重新运行此脚本。')
    process.exit(1)
  }

  console.log('✅ subscription_period_end 字段已存在，开始修复现有数据...')

  // Step 2: 查出所有 pro/premium 且无 Stripe ID 的用户（手动赋权）
  const { data: manualUsers, error: fetchErr } = await supabaseAdmin
    .from('users')
    .select('uuid, email, created_at, subscription_plan, subscription_status, subscription_stripe_id, subscription_period_end')
    .in('subscription_plan', ['pro', 'premium', 'lite'])
    .is('subscription_stripe_id', null)
    .neq('subscription_status', 'cancelled')

  if (fetchErr) {
    console.error('❌ 查询用户失败:', fetchErr)
    process.exit(1)
  }

  console.log(`📊 找到 ${manualUsers?.length ?? 0} 个手动赋权用户（无 Stripe 订阅）`)

  // Step 3: 为每个用户设置 period_end（创建时间 + 1个月，若已过期则设为今天 + 1个月）
  let fixedCount = 0
  for (const user of manualUsers ?? []) {
    if (user.subscription_period_end) {
      console.log(`⏭️  ${user.email} 已有 period_end，跳过`)
      continue
    }

    const createdAt = new Date(user.created_at)
    const now = new Date()

    // 从注册日期算起，找到下一个月周期
    const periodEnd = new Date(createdAt)
    while (periodEnd <= now) {
      periodEnd.setMonth(periodEnd.getMonth() + 1)
    }

    const { error: updateErr } = await supabaseAdmin
      .from('users')
      .update({ subscription_period_end: periodEnd.toISOString() })
      .eq('uuid', user.uuid)

    if (updateErr) {
      console.error(`❌ 更新 ${user.email} 失败:`, updateErr)
    } else {
      console.log(`✅ ${user.email} → period_end 设为 ${periodEnd.toISOString().split('T')[0]}`)
      fixedCount++
    }
  }

  console.log(`\n🎉 完成！共修复 ${fixedCount} 个用户的账单日期`)
}

main().catch(console.error)

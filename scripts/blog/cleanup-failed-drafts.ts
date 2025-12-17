#!/usr/bin/env tsx

/**
 * 清理失败的占位符草稿
 * 只删除内容为 "(内容生成中...)" 的草稿
 */

// 🔥 关键:在导入任何模块之前加载环境变量
import { config } from 'dotenv'
import path from 'path'
config({ path: path.join(process.cwd(), '.env.local') })

async function main() {
  console.log('\n🧹 清理失败的占位符草稿...\n')

  // 动态导入确保环境变量已加载
  const { supabaseAdmin, TABLES } = await import('@/lib/supabase')

  // 1. 查询所有占位符草稿
  const { data: drafts, error: queryError } = await supabaseAdmin
    .from(TABLES.BLOG_POSTS)
    .select('id, title, slug, content, created_at')
    .eq('status', 'draft')
    .like('content', '(内容生成中%)')
    .order('created_at', { ascending: false })

  if (queryError) {
    console.error('❌ 查询失败:', queryError)
    process.exit(1)
  }

  if (!drafts || drafts.length === 0) {
    console.log('✅ 没有失败的占位符草稿需要清理')
    return
  }

  console.log(`找到 ${drafts.length} 篇失败的占位符草稿:\n`)

  // 2. 显示草稿列表
  for (const draft of drafts) {
    console.log(`📄 ${draft.title}`)
    console.log(`   Slug: ${draft.slug}`)
    console.log(`   ID: ${draft.id}`)
    console.log(`   创建: ${new Date(draft.created_at).toLocaleString('zh-CN')}`)
    console.log()
  }

  // 3. 询问是否删除
  console.log(`\n⚠️  即将删除以上 ${drafts.length} 篇失败的占位符草稿`)
  console.log('按 Ctrl+C 取消,或等待 3 秒自动继续...\n')

  // 等待 3 秒
  await new Promise(resolve => setTimeout(resolve, 3000))

  // 4. 批量删除
  console.log('开始删除...\n')

  let successCount = 0
  let failCount = 0

  for (const draft of drafts) {
    const { error: deleteError } = await supabaseAdmin
      .from(TABLES.BLOG_POSTS)
      .delete()
      .eq('id', draft.id)

    if (deleteError) {
      console.error(`❌ 删除失败: ${draft.title}`, deleteError)
      failCount++
    } else {
      console.log(`✅ 已删除: ${draft.title}`)
      successCount++
    }
  }

  console.log(`\n✅ 清理完成!`)
  console.log(`   成功: ${successCount} 篇`)
  console.log(`   失败: ${failCount} 篇`)
}

main().catch(console.error)

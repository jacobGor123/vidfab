#!/usr/bin/env tsx

/**
 * 删除所有草稿状态的文章
 * 用于清理失败的占位记录
 */

// 🔥 关键:在导入任何模块之前加载环境变量
import { config } from 'dotenv'
import path from 'path'
config({ path: path.join(process.cwd(), '.env.local') })

import { supabaseAdmin, TABLES } from '@/lib/supabase'

async function main() {
  console.log('\n🗑️  删除所有草稿文章...')

  // 1. 查询所有草稿
  const { data: drafts, error: queryError } = await supabaseAdmin
    .from(TABLES.BLOG_POSTS)
    .select('id, title, slug, content, created_at')
    .eq('status', 'draft')
    .order('created_at', { ascending: false })

  if (queryError) {
    console.error('❌ 查询失败:', queryError)
    process.exit(1)
  }

  if (!drafts || drafts.length === 0) {
    console.log('✅ 没有草稿需要删除')
    return
  }

  console.log(`\n找到 ${drafts.length} 篇草稿:\n`)

  // 2. 显示草稿列表
  for (const draft of drafts) {
    const isPlaceholder = draft.content.includes('(内容生成中...)')
    const status = isPlaceholder ? '❌ 占位符' : '✅ 有内容'

    console.log(`${status} | ${draft.title}`)
    console.log(`  → Slug: ${draft.slug}`)
    console.log(`  → ID: ${draft.id}`)
    console.log(`  → 内容长度: ${draft.content.length} 字符`)
    console.log(`  → 创建时间: ${new Date(draft.created_at).toLocaleString('zh-CN')}`)
    console.log()
  }

  // 3. 询问是否删除
  console.log(`\n⚠️  即将删除以上 ${drafts.length} 篇草稿`)
  console.log('请确认是否继续 (Ctrl+C 取消)')

  // 等待 3 秒
  await new Promise(resolve => setTimeout(resolve, 3000))

  // 4. 批量删除
  console.log('\n开始删除...')

  for (const draft of drafts) {
    const { error: deleteError } = await supabaseAdmin
      .from(TABLES.BLOG_POSTS)
      .delete()
      .eq('id', draft.id)

    if (deleteError) {
      console.error(`❌ 删除失败: ${draft.title}`, deleteError)
    } else {
      console.log(`✅ 已删除: ${draft.title}`)
    }
  }

  console.log(`\n✅ 完成! 共删除 ${drafts.length} 篇草稿`)
}

main().catch(console.error)

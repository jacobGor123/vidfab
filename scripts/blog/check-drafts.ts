#!/usr/bin/env tsx

/**
 * 查询所有草稿状态的文章
 * 用于检查失败的生成任务
 */

// 🔥 关键:在导入任何模块之前加载环境变量
import { config } from 'dotenv'
import path from 'path'
config({ path: path.join(process.cwd(), '.env.local') })

async function main() {
  console.log('\n📋 查询所有草稿文章...\n')

  // 动态导入确保环境变量已加载
  const { supabaseAdmin, TABLES } = await import('@/lib/supabase')

  // 1. 查询所有草稿
  const { data: drafts, error: queryError } = await supabaseAdmin
    .from(TABLES.BLOG_POSTS)
    .select('id, title, slug, content, excerpt, created_at, updated_at, author_uuid')
    .eq('status', 'draft')
    .order('created_at', { ascending: false })

  if (queryError) {
    console.error('❌ 查询失败:', queryError)
    process.exit(1)
  }

  if (!drafts || drafts.length === 0) {
    console.log('✅ 没有草稿文章')
    return
  }

  console.log(`找到 ${drafts.length} 篇草稿:\n`)
  console.log('='.repeat(80))

  // 2. 显示草稿列表
  for (const draft of drafts) {
    const isPlaceholder = draft.content.includes('(内容生成中...)')
    const status = isPlaceholder ? '❌ 占位符(生成失败)' : '✅ 有完整内容'

    console.log(`\n${status}`)
    console.log(`标题: ${draft.title}`)
    console.log(`Slug: ${draft.slug}`)
    console.log(`ID: ${draft.id}`)
    console.log(`作者UUID: ${draft.author_uuid || '(无)'}`)
    console.log(`摘要: ${draft.excerpt || '(无)'}`)
    console.log(`内容长度: ${draft.content.length} 字符`)
    console.log(`创建时间: ${new Date(draft.created_at).toLocaleString('zh-CN')}`)
    console.log(`更新时间: ${new Date(draft.updated_at).toLocaleString('zh-CN')}`)

    if (isPlaceholder) {
      console.log(`\n⚠️  这是一个占位符草稿,可能是因为:`)
      console.log(`   1. AI 内容生成步骤失败`)
      console.log(`   2. 文章发布步骤失败`)
      console.log(`   3. 生成任务被中断`)
    }

    console.log('\n' + '-'.repeat(80))
  }

  console.log(`\n总计: ${drafts.length} 篇草稿`)

  const placeholders = drafts.filter(d => d.content.includes('(内容生成中...)'))
  if (placeholders.length > 0) {
    console.log(`\n⚠️  其中 ${placeholders.length} 篇是占位符(需要清理或重新生成)`)
  }
}

main().catch(console.error)

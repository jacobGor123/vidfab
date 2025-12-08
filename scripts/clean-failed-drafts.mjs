#!/usr/bin/env node

/**
 * 清理失败的草稿文章
 * 删除所有状态为 draft 的文章
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import readline from 'readline'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 加载环境变量
const envPath = path.join(__dirname, '..', '.env.local')
dotenv.config({ path: envPath })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少 Supabase 配置')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// 创建确认提示
function askConfirmation(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes')
    })
  })
}

async function cleanDrafts() {
  console.log('🧹 清理草稿文章...\n')

  // 查询所有草稿
  const { data: drafts, error: queryError } = await supabase
    .from('blog_posts')
    .select('id, title, slug, created_at')
    .eq('status', 'draft')
    .order('created_at', { ascending: false })

  if (queryError) {
    console.error('❌ 查询失败:', queryError.message)
    return
  }

  if (!drafts || drafts.length === 0) {
    console.log('✅ 没有找到草稿文章，数据库很干净！')
    return
  }

  console.log(`📝 找到 ${drafts.length} 个草稿文章:\n`)
  drafts.forEach((draft, index) => {
    console.log(
      `${index + 1}. [${draft.id}]\n   标题: ${draft.title || '(无标题)'}\n   Slug: ${draft.slug}\n   创建时间: ${new Date(draft.created_at).toLocaleString()}\n`
    )
  })

  // 确认删除
  const confirmed = await askConfirmation(
    `⚠️  确定要删除这 ${drafts.length} 个草稿吗？(y/n): `
  )

  if (!confirmed) {
    console.log('❌ 操作已取消')
    return
  }

  console.log('\n🗑️  开始删除...\n')

  // 逐个删除
  let successCount = 0
  let failCount = 0

  for (const draft of drafts) {
    const { error: deleteError } = await supabase
      .from('blog_posts')
      .delete()
      .eq('id', draft.id)

    if (deleteError) {
      console.log(`❌ 删除失败 [${draft.id}]: ${deleteError.message}`)
      failCount++
    } else {
      console.log(`✅ 已删除: ${draft.title || '(无标题)'}`)
      successCount++
    }
  }

  console.log('\n📊 清理结果:')
  console.log(`  - 成功删除: ${successCount}`)
  console.log(`  - 删除失败: ${failCount}`)
  console.log('')

  if (successCount > 0) {
    console.log('✨ 数据库已清理干净！')
  }
}

cleanDrafts()

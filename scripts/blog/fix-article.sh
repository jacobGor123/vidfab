#!/bin/bash

# 修复 Best AI Video Generator 文章

SLUG="best-ai-video-generator-complete-comparison-guide-2025"

echo "🔧 修复文章: $SLUG"
echo ""

# 使用 tsx 并手动加载环境变量
NODE_OPTIONS="--require dotenv/config" \
DOTENV_CONFIG_PATH=.env.local \
tsx -e "
import { supabaseAdmin, TABLES } from './lib/supabase.ts'

const slug = '$SLUG'

// 1. 查询文章
const { data: post, error: queryError } = await supabaseAdmin
  .from(TABLES.BLOG_POSTS)
  .select('*')
  .eq('slug', slug)
  .single()

if (queryError || !post) {
  console.error('❌ 文章不存在')
  process.exit(1)
}

console.log(\`  → 当前状态: \${post.status}\`)
console.log(\`  → 内容长度: \${post.content.length} 字符\`)

// 2. 移除失效的图片标签
console.log('\\n  → 移除失效的图片标签...')
let fixedContent = post.content

// 移除相对路径的图片
const beforeLength = fixedContent.length
fixedContent = fixedContent.replace(
  /<img\\s+src=\"\\/blog\\/images\\/[^\"]+\"\\s+alt=\"[^\"]*\"\\s*\\/>/g,
  ''
)
const removedCount = beforeLength - fixedContent.length

console.log(\`  ✓ 移除了 \${removedCount} 字符\`)

// 3. 更新文章
console.log('\\n  → 更新文章...')
const { error: updateError } = await supabaseAdmin
  .from(TABLES.BLOG_POSTS)
  .update({
    content: fixedContent,
    updated_at: new Date().toISOString(),
  })
  .eq('id', post.id)

if (updateError) {
  console.error('❌ 更新失败:', updateError)
  process.exit(1)
}

console.log('  ✓ 文章已更新')
console.log('\\n✅ 修复完成!')
"

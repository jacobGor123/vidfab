/**
 * 修复 "Best AI Video Generator" 文章的图片和内链问题
 */

// 🔥 关键:在导入任何模块之前加载环境变量
import { config } from 'dotenv'
import path from 'path'
config({ path: path.join(process.cwd(), '.env.local') })

import { supabaseAdmin, TABLES } from '@/lib/supabase'
import { getBlogPosts } from '@/models/blog'

async function main() {
  const slug = 'best-ai-video-generator-complete-comparison-guide-2025'

  console.log(`\n🔧 修复文章: ${slug}`)

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

  console.log(`  → 当前状态: ${post.status}`)
  console.log(`  → 内容长度: ${post.content.length} 字符`)

  // 2. 移除失效的图片标签
  console.log('\n  → 移除失效的图片标签...')
  let fixedContent = post.content

  // 移除相对路径的图片
  fixedContent = fixedContent.replace(
    /<img\s+src="\/blog\/images\/[^"]+"\s+alt="[^"]*"\s*\/>/g,
    ''
  )

  const removedImages = post.content.length - fixedContent.length
  console.log(`  ✓ 已移除 ${removedImages > 0 ? '失效图片标签' : '0 个图片'}`)

  // 3. 查询已发布文章用于添加内链
  console.log('\n  → 查询已发布文章...')
  const publishedPosts = await getBlogPosts({
    status: 'published',
    limit: 10,
  })

  const otherPosts = (publishedPosts || []).filter(p => p.slug !== slug)
  console.log(`  ✓ 找到 ${otherPosts.length} 篇可用于内链的文章`)

  if (otherPosts.length > 0) {
    // 4. 在文章中添加 2-3 个内链
    console.log('\n  → 添加内链...')

    // 选择前 3 篇文章
    const linksToAdd = otherPosts.slice(0, 3)

    // 在文章的不同位置添加内链
    // 策略:找到提到相关主题的地方,添加描述性链接

    for (const linkedPost of linksToAdd) {
      // 构建内链 HTML
      const linkHtml = `<a href="/blog/${linkedPost.slug}" class="text-primary hover:underline">${linkedPost.title}</a>`

      // 查找合适的插入位置(简化策略:在段落中提到相关关键词的地方)
      // 这里我们用简单策略:在文章中间部分的段落结尾添加
      const paragraphs = fixedContent.match(/<p>[^<]+<\/p>/g) || []
      if (paragraphs.length > 3) {
        const targetIndex = Math.floor(paragraphs.length / 3) + linksToAdd.indexOf(linkedPost)
        const targetParagraph = paragraphs[targetIndex]

        if (targetParagraph) {
          // 在段落末尾添加"Learn more"链接
          const modifiedParagraph = targetParagraph.replace(
            '</p>',
            ` For more insights, check out our guide on ${linkHtml}.</p>`
          )

          fixedContent = fixedContent.replace(targetParagraph, modifiedParagraph)
          console.log(`  ✓ 已添加内链: ${linkedPost.title}`)
        }
      }
    }
  }

  // 5. 更新文章
  console.log('\n  → 更新文章...')
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
  console.log(`\n✅ 修复完成!`)
  console.log(`  → 移除失效图片: ${removedImages > 0 ? '是' : '否'}`)
  console.log(`  → 添加内链数量: ${otherPosts.length > 0 ? linksToAdd.length : 0}`)
}

main().catch(console.error)

#!/usr/bin/env tsx

/**
 * 为已发布的文章添加内链
 * 根据内容相关性自动在文章中插入指向其他文章的链接
 */

import { config } from 'dotenv'
import path from 'path'
config({ path: path.join(process.cwd(), '.env.local') })

import { supabaseAdmin, TABLES } from '@/lib/supabase'
import { updateBlogPost } from '@/models/blog'

/**
 * 在文本中查找关键词并替换为内链
 */
function addInternalLink(
  content: string,
  keyword: string,
  url: string,
  title: string
): string {
  // 避免重复链接
  if (content.includes(`href="${url}"`)) {
    return content
  }

  // 查找第一个出现的关键词（不在标签内）
  // 使用更宽松的匹配,允许关键词被其他标签包围
  const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(?<!<a[^>]*>)([^<]*)(${escapedKeyword})([^>]*?)(?=<)`, 'i')
  const match = content.match(regex)

  if (match) {
    const before = match[1]
    const keywordText = match[2]
    const after = match[3]
    const replacement = `${before}<a href="${url}" class="text-primary hover:underline">${keywordText}</a>${after}`
    return content.replace(regex, replacement)
  }

  return content
}

async function main() {
  console.log('\n🔗 为已发布文章添加内链...\n')

  // 1. 获取所有已发布的文章
  const { data: posts, error } = await supabaseAdmin
    .from(TABLES.BLOG_POSTS)
    .select('id, title, slug, content')
    .eq('status', 'published')
    .order('created_at', { ascending: false })

  if (error || !posts || posts.length === 0) {
    console.error('❌ 查询文章失败:', error)
    return
  }

  console.log(`找到 ${posts.length} 篇已发布文章:\n`)
  posts.forEach((post, i) => {
    console.log(`${i + 1}. ${post.title}`)
    console.log(`   → /blog/${post.slug}`)
  })

  // 2. 定义内链规则（每篇文章应该链接到其他相关文章）
  const linkRules = [
    {
      slug: 'ai-video-ad-maker-create-product-ads-without-filming',
      links: [
        {
          keyword: 'video generators',
          targetSlug: 'best-ai-video-generator-complete-comparison-guide-2025',
        },
        {
          keyword: 'free credits',
          targetSlug: 'ai-video-generator-free-online-top-tools-2025',
        },
      ],
    },
    {
      slug: 'best-ai-video-generator-complete-comparison-guide-2025',
      links: [
        {
          keyword: 'video ads',
          targetSlug: 'ai-video-ad-maker-create-product-ads-without-filming',
        },
        {
          keyword: 'free credits',
          targetSlug: 'ai-video-generator-free-online-top-tools-2025',
        },
      ],
    },
    {
      slug: 'ai-video-generator-free-online-top-tools-2025',
      links: [
        {
          keyword: 'video ads',
          targetSlug: 'ai-video-ad-maker-create-product-ads-without-filming',
        },
        {
          keyword: 'comparison guide',
          targetSlug: 'best-ai-video-generator-complete-comparison-guide-2025',
        },
      ],
    },
  ]

  // 3. 为每篇文章添加内链
  for (const rule of linkRules) {
    const post = posts.find(p => p.slug === rule.slug)
    if (!post) {
      console.warn(`\n⚠️  未找到文章: ${rule.slug}`)
      continue
    }

    console.log(`\n📝 处理文章: ${post.title}`)

    let updatedContent = post.content

    for (const link of rule.links) {
      const targetPost = posts.find(p => p.slug === link.targetSlug)
      if (!targetPost) {
        console.warn(`  ⚠️  未找到目标文章: ${link.targetSlug}`)
        continue
      }

      const beforeLength = updatedContent.length
      updatedContent = addInternalLink(
        updatedContent,
        link.keyword,
        `/blog/${link.targetSlug}`,
        targetPost.title
      )
      const afterLength = updatedContent.length

      if (afterLength > beforeLength) {
        console.log(`  ✓ 添加内链: "${link.keyword}" → ${targetPost.title}`)
      } else {
        console.log(`  - 未找到关键词或已存在: "${link.keyword}"`)
      }
    }

    // 4. 更新文章
    if (updatedContent !== post.content) {
      const updated = await updateBlogPost(post.id, { content: updatedContent })
      if (updated) {
        console.log(`  ✅ 文章已更新`)
      } else {
        console.error(`  ❌ 更新失败`)
      }
    } else {
      console.log(`  - 无需更新`)
    }
  }

  console.log(`\n✅ 内链添加完成!`)
}

main().catch(console.error)

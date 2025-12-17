#!/usr/bin/env tsx

import { config } from 'dotenv'
import path from 'path'
config({ path: path.join(process.cwd(), '.env.local') })

import { supabaseAdmin, TABLES } from '@/lib/supabase'
import { updateBlogPost } from '@/models/blog'

async function main() {
  console.log('\n🔗 为已发布文章手动添加自然内链...\n')

  // 定义每篇文章的内链插入规则
  const linkRules = [
    {
      slug: 'ai-video-ad-maker-create-product-ads-without-filming',
      insertions: [
        {
          searchText: 'AI video ad generators',
          replaceWith: '<a href="/blog/best-ai-video-generator-complete-comparison-guide-2025" class="text-primary hover:underline">AI video generators</a>',
        },
        {
          searchText: 'AI video generation landscape',
          replaceWith: '<a href="/blog/best-ai-video-generator-complete-comparison-guide-2025" class="text-primary hover:underline">AI video generation landscape</a>',
        },
      ],
    },
    {
      slug: 'best-ai-video-generator-complete-comparison-guide-2025',
      insertions: [
        {
          searchText: 'professional-grade content',
          replaceWith: '<a href="/blog/ai-video-ad-maker-create-product-ads-without-filming" class="text-primary hover:underline">professional-grade content</a>',
        },
        {
          searchText: 'Free tier available',
          replaceWith: '<a href="/blog/ai-video-generator-free-online-top-tools-2025" class="text-primary hover:underline">Free tier available</a>',
        },
      ],
    },
    {
      slug: 'ai-video-generator-free-online-top-tools-2025',
      insertions: [
        {
          searchText: 'studio-quality videos',
          replaceWith: '<a href="/blog/ai-video-ad-maker-create-product-ads-without-filming" class="text-primary hover:underline">studio-quality videos</a>',
        },
        {
          searchText: 'Feature comparison matrix',
          replaceWith: '<a href="/blog/best-ai-video-generator-complete-comparison-guide-2025" class="text-primary hover:underline">Feature comparison</a> matrix',
        },
      ],
    },
    {
      slug: 'text-to-video-ai-complete-guide-2025',
      insertions: [
        {
          searchText: 'create visual content',
          replaceWith: '<a href="/blog/ai-video-ad-maker-create-product-ads-without-filming" class="text-primary hover:underline">create visual content</a>',
        },
        {
          searchText: 'free platforms offering basic animations',
          replaceWith: '<a href="/blog/ai-video-generator-free-online-top-tools-2025" class="text-primary hover:underline">free platforms</a> offering basic animations',
        },
        {
          searchText: 'enterprise-grade solutions',
          replaceWith: '<a href="/blog/best-ai-video-generator-complete-comparison-guide-2025" class="text-primary hover:underline">enterprise-grade solutions</a>',
        },
      ],
    },
  ]

  for (const rule of linkRules) {
    console.log(`\n📝 处理文章: ${rule.slug}`)

    const { data: post, error } = await supabaseAdmin
      .from(TABLES.BLOG_POSTS)
      .select('id, title, content')
      .eq('slug', rule.slug)
      .eq('status', 'published')
      .single()

    if (error || !post) {
      console.warn(`  ⚠️  未找到文章: ${rule.slug}`)
      continue
    }

    console.log(`  → 文章标题: ${post.title}`)

    let updatedContent = post.content
    let changesCount = 0

    for (const insertion of rule.insertions) {
      // 检查是否已存在该链接
      if (updatedContent.includes(insertion.replaceWith)) {
        console.log(`  - 已存在链接: "${insertion.searchText}"`)
        continue
      }

      // 查找并替换第一个出现的位置
      const index = updatedContent.indexOf(insertion.searchText)
      if (index !== -1) {
        updatedContent =
          updatedContent.substring(0, index) +
          insertion.replaceWith +
          updatedContent.substring(index + insertion.searchText.length)
        changesCount++
        console.log(`  ✓ 添加链接: "${insertion.searchText}"`)
      } else {
        console.log(`  - 未找到文本: "${insertion.searchText}"`)
      }
    }

    if (changesCount > 0) {
      const updated = await updateBlogPost(post.id, { content: updatedContent })
      if (updated) {
        console.log(`  ✅ 已更新 ${changesCount} 个内链`)
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

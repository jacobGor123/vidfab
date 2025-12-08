#!/usr/bin/env tsx

// 🔥 关键：在导入任何模块之前加载环境变量
import { config } from 'dotenv'
import path from 'path'
config({ path: path.join(process.cwd(), '.env.local') })

async function main() {
  // 使用动态导入确保环境变量已加载
  const { getBlogPostBySlug } = await import('@/models/blog')
  const slug = process.argv[2] || 'ai-video-generator-free-online-tools-2025'

  const post = await getBlogPostBySlug(slug)

  if (post) {
    console.log('\n📝 文章详情:')
    console.log('  ID:', post.id)
    console.log('  标题:', post.title)
    console.log('  Slug:', post.slug)
    console.log('  状态:', post.status)
    console.log('  分类:', post.category)
    console.log('  标签:', post.tags?.join(', '))
    console.log('  封面图:', post.featured_image_url)
    console.log('  发布时间:', post.published_at)
    console.log('  作者 UUID:', post.author_uuid)
    console.log('  阅读量:', post.view_count)
    console.log('')
    console.log('🌐 访问链接:')
    console.log('  本地开发: http://localhost:3000/blog/' + post.slug)
    console.log('  生产环境: https://vidfab.ai/blog/' + post.slug)
    console.log('')
    console.log('🖼️ 图片链接:')
    console.log('  封面图:', post.featured_image_url)
    console.log('')
  } else {
    console.log('\n❌ 文章未找到\n')
  }
}

main().catch(console.error)

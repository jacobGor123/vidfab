#!/usr/bin/env tsx

/**
 * 博客文章一键发布脚本
 * 自动生成图片 → 压缩 → 上传 → 更新文章 → 发布
 *
 * 使用方法:
 *   tsx scripts/blog/publish-article.ts --id <uuid> --publish
 *   tsx scripts/blog/publish-article.ts --slug <slug> --draft
 *   tsx scripts/blog/publish-article.ts --id <uuid> --schedule "2025-12-10T10:00:00Z"
 */

import { getBlogPostById, getBlogPostBySlug, updateBlogPost } from '@/models/blog'
import { generateBlogImage, generateImagePrompt } from '@/lib/blog/image-generator'
import { optimizeBlogImage } from '@/lib/blog/image-optimizer'
import { uploadBlogImages } from '@/lib/blog/s3-uploader'

interface Args {
  id?: string
  slug?: string
  publish?: boolean
  draft?: boolean
  schedule?: string
}

function parseArgs(): Args {
  const args = process.argv.slice(2)
  const result: Args = {}

  if (args[0] === '--help' || args[0] === '-h') {
    showHelp()
    process.exit(0)
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    if (arg === '--id' && args[i + 1]) {
      result.id = args[i + 1]
      i++
    } else if (arg === '--slug' && args[i + 1]) {
      result.slug = args[i + 1]
      i++
    } else if (arg === '--publish') {
      result.publish = true
    } else if (arg === '--draft') {
      result.draft = true
    } else if (arg === '--schedule' && args[i + 1]) {
      result.schedule = args[i + 1]
      i++
    }
  }

  return result
}

function showHelp() {
  console.log(`
博客文章一键发布脚本

使用方法:
  tsx scripts/blog/publish-article.ts --id <uuid> [options]
  tsx scripts/blog/publish-article.ts --slug <slug> [options]

参数:
  --id               文章 UUID
  --slug             文章 slug
  --publish          立即发布文章
  --draft            保持草稿状态 (仅生成图片)
  --schedule <time>  定时发布 (ISO 8601 格式)
  --help, -h         显示此帮助信息

示例:
  # 为草稿文章生成图片并保持草稿状态
  tsx scripts/blog/publish-article.ts --id "abc123" --draft

  # 生成图片并立即发布
  tsx scripts/blog/publish-article.ts --slug "my-article" --publish

  # 生成图片并定时发布
  tsx scripts/blog/publish-article.ts --id "abc123" --schedule "2025-12-10T10:00:00Z"

流程:
  1. 读取文章数据
  2. 如果没有 featured_image_url，则:
     a. 根据标题生成图片提示词
     b. 调用 BytePlus API 生成图片
     c. 压缩图片 (原图 + 缩略图 + WebP)
     d. 上传到 S3
     e. 更新文章的 featured_image_url
  3. 根据参数更新文章状态:
     --publish: status = 'published', published_at = NOW()
     --draft: status = 'draft'
     --schedule: status = 'scheduled', scheduled_at = 指定时间
`)
}

async function main() {
  const args = parseArgs()

  // 验证参数
  if (!args.id && !args.slug) {
    console.error('❌ Error: Please provide --id or --slug')
    console.log('\nUse --help for usage information')
    process.exit(1)
  }

  if ([args.publish, args.draft, args.schedule].filter(Boolean).length > 1) {
    console.error('❌ Error: Please use only one of --publish, --draft, or --schedule')
    process.exit(1)
  }

  console.log('\n📰 Starting blog article publishing process...\n')

  try {
    // 1. 读取文章数据
    console.log('📖 Fetching article...')
    const post = args.id
      ? await getBlogPostById(args.id)
      : await getBlogPostBySlug(args.slug!)

    if (!post) {
      console.error('❌ Error: Article not found')
      process.exit(1)
    }

    console.log(`✅ Found article: "${post.title}"`)
    console.log(`   ID: ${post.id}`)
    console.log(`   Slug: ${post.slug}`)
    console.log(`   Status: ${post.status}`)
    console.log(`   Has image: ${post.featured_image_url ? 'Yes' : 'No'}`)

    // 2. 如果没有图片，生成图片
    let featuredImageUrl = post.featured_image_url

    if (!featuredImageUrl) {
      console.log('\n🎨 No featured image found. Generating...\n')

      // 2a. 生成提示词
      const prompt = generateImagePrompt(post.title, post.category || undefined)
      console.log('📝 Image prompt:', prompt)

      // 2b. 生成图片
      console.log('\n⏳ Generating image with BytePlus API...')
      const generatedImage = await generateBlogImage({
        prompt,
        category: post.category || undefined,
        watermark: false, // 博客图片不加水印
      })

      console.log('✅ Image generated:', generatedImage.localPath)

      // 2c. 压缩图片
      console.log('\n🔧 Compressing image...')
      const optimizedImages = await optimizeBlogImage(generatedImage.localPath)

      console.log('✅ Image compressed:')
      console.log('   Original:', optimizedImages.original)
      console.log('   Thumbnail:', optimizedImages.thumbnail)
      console.log('   WebP:', optimizedImages.webp)

      // 2d. 上传到 S3
      console.log('\n📤 Uploading to S3...')
      const uploadedImages = await uploadBlogImages(
        optimizedImages.original,
        optimizedImages.thumbnail,
        optimizedImages.webp,
        post.slug
      )

      console.log('✅ Images uploaded:')
      console.log('   Original:', uploadedImages.original)
      console.log('   Thumbnail:', uploadedImages.thumbnail)
      console.log('   WebP:', uploadedImages.webp)

      // 使用原图 URL 作为 featured_image_url
      featuredImageUrl = uploadedImages.original || null
    } else {
      console.log('\n✓ Article already has a featured image')
    }

    // 3. 更新文章状态
    const updates: any = {
      featured_image_url: featuredImageUrl,
      updated_at: new Date().toISOString(),
    }

    if (args.publish) {
      updates.status = 'published'
      updates.published_at = new Date().toISOString()
      console.log('\n📢 Publishing article...')
    } else if (args.draft) {
      updates.status = 'draft'
      console.log('\n📝 Keeping as draft...')
    } else if (args.schedule) {
      try {
        const scheduledDate = new Date(args.schedule)
        updates.status = 'scheduled'
        updates.scheduled_at = scheduledDate.toISOString()
        console.log(`\n⏰ Scheduling for: ${scheduledDate.toLocaleString()}`)
      } catch (error) {
        console.error('❌ Error: Invalid schedule date format')
        console.log('Please use ISO 8601 format (e.g., "2025-12-10T10:00:00Z")')
        process.exit(1)
      }
    }

    // 4. 保存到数据库
    const updatedPost = await updateBlogPost(post.id, updates)

    if (!updatedPost) {
      throw new Error('Failed to update blog post')
    }

    console.log('\n✅ Article updated successfully!\n')
    console.log('📊 Final status:')
    console.log('   Title:', updatedPost.title)
    console.log('   Slug:', updatedPost.slug)
    console.log('   Status:', updatedPost.status)
    console.log('   Featured Image:', updatedPost.featured_image_url || 'None')
    if (updatedPost.published_at) {
      console.log('   Published At:', new Date(updatedPost.published_at).toLocaleString())
    }
    if (updatedPost.scheduled_at) {
      console.log('   Scheduled At:', new Date(updatedPost.scheduled_at).toLocaleString())
    }

    console.log('\n🎉 Done!\n')

  } catch (error) {
    console.error('\n❌ Publishing failed:', error)
    process.exit(1)
  }
}

main()

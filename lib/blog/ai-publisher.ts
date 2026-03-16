/**
 * AI 文章发布服务
 * 将 AI 生成的文章内容发布到数据库
 * 包含图片生成、压缩、上传到 Supabase Storage
 */

import { createBlogPost } from '@/models/blog'
import { generateBlogImage } from './wavespeed-image-generator'
import { uploadBlogImage } from './supabase-storage-uploader'
import type { ArticleContent, ImageConfig } from './ai-content-generator'
import { supabaseAdmin, TABLES } from '@/lib/supabase'
import { addHeadingIds } from './toc'
import fs from 'fs/promises'

export interface PublishResult {
  success: boolean
  postId?: string
  slug: string
  error?: string
}

/**
 * 发布 AI 生成的文章
 * - 生成封面图片
 * - 压缩并上传到 S3
 * - 创建文章记录
 */
export async function publishAIArticle(
  article: ArticleContent,
  options: {
    status?: 'draft' | 'published' | 'scheduled'
    scheduledAt?: string
    authorEmail: string
    existingPostId?: string  // 如果提供,则更新已有文章而不是新建
    skipBottomCTA?: boolean  // 文章内容已有结尾 CTA 时，跳过自动追加
  }
): Promise<PublishResult> {
  try {
    console.log(`\n🚀 开始发布文章: ${article.title}`)

    // 1. 生成并上传所有图片
    const coverImage = article.images.find(img => img.usage === 'cover')
    const inlineImages = article.images.filter(img => img.usage === 'inline')

    let featuredImageUrl: string | null = null
    const uploadedInlineImages: { url: string; insertAfter?: string; alt: string; caption?: string }[] = []

    // 1.1 生成封面图
    if (coverImage) {
      console.log(`\n  📸 [1/${article.images.length}] 生成封面图...`)

      const generatedImage = await generateBlogImage({
        prompt: coverImage.prompt,
        aspectRatio: '16:9',
      })

      console.log(`  ✓ 图片已生成: ${generatedImage.localPath}`)

      // 上传到 Supabase Storage
      console.log('  → 上传到 Supabase Storage...')
      const uploadedImage = await uploadBlogImage({
        localPath: generatedImage.localPath,
        filename: generatedImage.filename,
        slug: article.slug,
      })

      featuredImageUrl = uploadedImage.url
      console.log(`  ✓ 封面图已上传: ${featuredImageUrl}`)

      // 清理临时文件
      try {
        await fs.unlink(generatedImage.localPath)
      } catch (cleanupError) {
        console.warn('  ⚠️  清理临时文件失败:', cleanupError)
      }
    }

    // 1.2 生成内文图
    if (inlineImages.length > 0) {
      console.log(`\n  🖼️  生成 ${inlineImages.length} 张内文图...`)

      for (let i = 0; i < inlineImages.length; i++) {
        const inlineImg = inlineImages[i]
        console.log(`\n  📸 [${i + 2}/${article.images.length}] 生成内文图 ${i + 1}...`)

        try {
          const generatedImage = await generateBlogImage({
            prompt: inlineImg.prompt,
            aspectRatio: (inlineImg.aspect_ratio === '4:3' ? '4:3' : '16:9') as '16:9' | '4:3',
          })

          console.log(`  ✓ 图片已生成: ${generatedImage.localPath}`)

          // 上传到 Supabase Storage
          console.log('  → 上传到 Supabase Storage...')
          const uploadedImage = await uploadBlogImage({
            localPath: generatedImage.localPath,
            filename: generatedImage.filename,
            slug: article.slug,
          })

          uploadedInlineImages.push({
            url: uploadedImage.url,
            insertAfter: inlineImg.insertAfter,
            alt: inlineImg.alt,
            caption: inlineImg.caption,
          })

          console.log(`  ✓ 内文图 ${i + 1} 已上传: ${uploadedImage.url}`)

          // 清理临时文件
          try {
            await fs.unlink(generatedImage.localPath)
          } catch (cleanupError) {
            console.warn('  ⚠️  清理临时文件失败:', cleanupError)
          }
        } catch (error) {
          console.error(`  ❌ 内文图 ${i + 1} 生成失败:`, error)
          // 继续处理下一张图片
        }
      }
    }

    // 2. 为 H2 标题添加 ID（用于 TOC 锚点）
    console.log('\n  → 为 H2 标题添加 ID...')
    let finalContent = addHeadingIds(article.htmlContent)
    console.log('  ✓ H2 标题 ID 已添加')

    // 3. 将内文图插入到 HTML 内容中
    if (uploadedInlineImages.length > 0) {
      console.log(`\n  → 插入 ${uploadedInlineImages.length} 张内文图到内容中...`)

      // 找到所有 </section> 标签的位置
      const sectionEnds: number[] = []
      let searchFrom = 0
      while (true) {
        const pos = finalContent.indexOf('</section>', searchFrom)
        if (pos === -1) break
        sectionEnds.push(pos)
        searchFrom = pos + 10 // '</section>'.length
      }

      console.log(`  → 找到 ${sectionEnds.length} 个 section 结束标签`)

      if (sectionEnds.length < uploadedInlineImages.length) {
        console.warn(`  ⚠️  section 数量不足,无法分散插入图片`)
      }

      // 为每张图片分配不同的 section
      for (let i = 0; i < uploadedInlineImages.length; i++) {
        const img = uploadedInlineImages[i]

        if (!img.insertAfter) continue

        // 计算插入位置: 均匀分布
        // 第1张图: 1/3 位置, 第2张图: 2/3 位置
        const targetSectionIndex = Math.floor(
          ((i + 1) * sectionEnds.length) / (uploadedInlineImages.length + 1)
        )

        if (targetSectionIndex >= sectionEnds.length) {
          console.warn(`  ⚠️  图片 ${i + 1} 超出 section 范围`)
          continue
        }

        const insertPosition = sectionEnds[targetSectionIndex]
        const insertAfterEnd = insertPosition + 10 // '</section>'.length

        // 构建图片 HTML
        const imgHtml = img.caption
          ? `\n<figure class="my-8">
  <img src="${img.url}" alt="${img.alt}" class="w-full rounded-lg shadow-lg" />
  <figcaption class="text-center text-sm text-gray-400 mt-2">${img.caption}</figcaption>
</figure>\n`
          : `\n<img src="${img.url}" alt="${img.alt}" class="w-full rounded-lg shadow-lg my-8" />\n`

        // 插入图片
        finalContent =
          finalContent.slice(0, insertAfterEnd) +
          imgHtml +
          finalContent.slice(insertAfterEnd)

        console.log(`  ✓ 已插入图片 ${i + 1} 到第 ${targetSectionIndex + 1} 个 section 后`)

        // 更新后续 section 的位置(因为内容增加了)
        const insertedLength = imgHtml.length
        for (let j = targetSectionIndex + 1; j < sectionEnds.length; j++) {
          sectionEnds[j] += insertedLength
        }
      }
    }

    // 3. 在文章底部添加 CTA（文章内容已有结尾 CTA 时跳过）
    if (options.skipBottomCTA) {
      console.log('\n  → 文章已含结尾 CTA，跳过自动追加')
    } else {
      console.log('\n  → 在文章底部添加 CTA...')
      const ctaHtml = `
<div class="cta-box">
  <h3>🎁 Try Text-to-Video for Free</h3>
  <p>Create your first AI video from text in minutes – no credit card required!</p>
  <a href="/text-to-video" class="cta-button">Start Creating Free →</a>
</div>
`
      finalContent = finalContent + ctaHtml
      console.log('  ✓ CTA 已添加到文章底部')
    }

    // 4. 查询作者 UUID
    console.log('  → 查询作者信息...')
    const { data: author, error: authorError } = await supabaseAdmin
      .from(TABLES.USERS)
      .select('uuid')
      .eq('email', options.authorEmail)
      .single()

    if (authorError || !author) {
      console.warn(`  ⚠️  作者不存在: ${options.authorEmail}`)
      console.warn('  → 文章将不关联作者')
    } else {
      console.log(`  ✓ 作者 UUID: ${author.uuid}`)
    }

    // 5. 创建或更新文章记录
    let createdPost
    if (options.existingPostId) {
      console.log('\n  → 更新已有文章记录...')
      const { updateBlogPost } = await import('@/models/blog')

      const postData = {
        title: article.title,
        slug: article.slug,
        content: finalContent,
        excerpt: article.excerpt,
        featured_image_url: featuredImageUrl,
        meta_title: article.metaTitle,
        meta_description: article.metaDescription,
        category: article.category,
        tags: article.tags,
        faq_schema: article.faqSchema,
        status: options.status || 'published',
        author_uuid: author?.uuid || null,
        published_at:
          options.status === 'published' ? new Date().toISOString() : null,
        scheduled_at: options.scheduledAt || null,
      }

      createdPost = await updateBlogPost(options.existingPostId, postData)

      if (!createdPost) {
        throw new Error('Failed to update blog post in database')
      }

      console.log('  ✓ 文章已更新')
    } else {
      console.log('\n  → 创建文章记录...')

      const postData = {
        title: article.title,
        slug: article.slug,
        content: finalContent,
        excerpt: article.excerpt,
        featured_image_url: featuredImageUrl,
        meta_title: article.metaTitle,
        meta_description: article.metaDescription,
        category: article.category,
        tags: article.tags,
        faq_schema: article.faqSchema,
        status: options.status || 'published',
        author_uuid: author?.uuid || null,
        published_at:
          options.status === 'published' ? new Date().toISOString() : null,
        scheduled_at: options.scheduledAt || null,
      }

      createdPost = await createBlogPost(postData)

      if (!createdPost) {
        throw new Error('Failed to create blog post in database')
      }

      console.log('  ✓ 文章已创建')
    }

    console.log(`  → Post ID: ${createdPost.id}`)
    console.log(`  → Slug: ${createdPost.slug}`)
    console.log(`  → Status: ${createdPost.status}`)

    return {
      success: true,
      postId: createdPost.id,
      slug: createdPost.slug,
    }
  } catch (error) {
    console.error('❌ 发布失败:', error)

    return {
      success: false,
      slug: article.slug,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * 批量发布多篇文章（用于测试或批量导入）
 */
export async function publishMultipleArticles(
  articles: ArticleContent[],
  options: {
    status?: 'draft' | 'published' | 'scheduled'
    authorEmail: string
    delayBetween?: number // 每篇文章之间的延迟（毫秒）
  }
): Promise<PublishResult[]> {
  const results: PublishResult[] = []

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i]

    console.log(
      `\n📝 发布第 ${i + 1}/${articles.length} 篇: ${article.title}`
    )

    const result = await publishAIArticle(article, options)
    results.push(result)

    // 延迟（避免 API 限流）
    if (options.delayBetween && i < articles.length - 1) {
      console.log(`  ⏳ 等待 ${options.delayBetween / 1000} 秒...`)
      await new Promise(resolve => setTimeout(resolve, options.delayBetween))
    }
  }

  const successCount = results.filter(r => r.success).length
  const failureCount = results.length - successCount

  console.log(`\n✅ 批量发布完成:`)
  console.log(`  → 成功: ${successCount} 篇`)
  console.log(`  → 失败: ${failureCount} 篇`)

  return results
}

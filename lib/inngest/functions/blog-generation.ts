/**
 * Inngest Blog Generation Function
 * Replaces node-cron for scheduled blog article generation
 */

import { inngest } from '../client'
import { logger } from '@/lib/logger'

/**
 * Generate Blog Article Function
 * Automatically generates and publishes blog articles
 */
export const generateBlogArticle = inngest.createFunction(
  {
    id: 'generate-blog-article',
    name: 'Generate and Publish Blog Article',
    retries: 2,
    timeout: '5m',
  },
  { event: 'blog/generate.requested' },
  async ({ event, step }) => {
    const { force = false } = event.data

    logger.info('Blog generation started', { force })

    try {
      // Step 1: AI Topic Selection
      const topic = await step.run('select-topic', async () => {
        const { selectNextTopic, validateTopic } = await import(
          '@/lib/blog/ai-topic-selector'
        )

        const selectedTopic = await selectNextTopic()

        logger.info('Topic selected', {
          title: selectedTopic.title,
          slug: selectedTopic.slug,
          priority: selectedTopic.priority,
        })

        // Validate topic
        const validation = await validateTopic(selectedTopic)
        if (!validation.valid) {
          throw new Error(`Topic validation failed: ${validation.reason}`)
        }

        return selectedTopic
      })

      // Step 1.5: Create Draft Placeholder (防止并发时重复选题)
      const placeholderPost = await step.run('create-draft-placeholder', async () => {
        const { createBlogPost } = await import('@/models/blog')

        const placeholder = await createBlogPost({
          title: topic.title,
          slug: topic.slug,
          content: '(内容生成中...)',
          excerpt: topic.reason,
          status: 'draft',
          category: topic.category || 'guide',
          tags: topic.targetKeywords,
        })

        if (!placeholder) {
          throw new Error('Failed to create draft placeholder')
        }

        logger.info('Draft placeholder created', {
          postId: placeholder.id,
          slug: placeholder.slug,
        })

        return placeholder
      })

      // Step 2: Generate Article Content
      const article = await step.run('generate-content', async () => {
        const {
          generateArticleContent,
          validateArticleContent,
        } = await import('@/lib/blog/ai-content-generator')

        const generatedArticle = await generateArticleContent(topic)

        logger.info('Content generated', {
          title: generatedArticle.title,
          contentLength: generatedArticle.htmlContent.length,
          images: generatedArticle.images.length,
          tags: generatedArticle.tags,
        })

        // Validate content quality
        const contentValidation = validateArticleContent(generatedArticle)
        if (!contentValidation.valid) {
          // 记录验证失败的详细信息
          logger.warn('Content validation failed', {
            errors: contentValidation.errors,
            title: generatedArticle.title,
          })
          throw new Error(
            `Content validation failed: ${contentValidation.errors.join(', ')}`
          )
        }

        logger.info('Content validation passed')
        return generatedArticle
      })

      // Step 3: Publish Article (更新已有草稿)
      const publishResult = await step.run('publish-article', async () => {
        const { publishAIArticle } = await import('@/lib/blog/ai-publisher')

        const adminEmail = process.env.ADMIN_EMAILS?.split(',')[0]?.trim() || 'auto@vidfab.ai'

        const result = await publishAIArticle(article, {
          status: 'published',
          authorEmail: adminEmail,
          existingPostId: placeholderPost.id, // 更新已创建的草稿
        })

        if (!result.success) {
          throw new Error(result.error || 'Failed to publish article')
        }

        logger.info('Article published successfully', {
          postId: result.postId,
          slug: result.slug,
        })

        return result
      })

      // Step 4: Revalidate cache
      await step.run('revalidate-cache', async () => {
        const { revalidatePath } = await import('next/cache')

        try {
          revalidatePath('/blog')
          revalidatePath(`/blog/${publishResult.slug}`)

          logger.debug('Cache revalidated', { slug: publishResult.slug })
        } catch (cacheError) {
          logger.warn('Cache revalidation failed', cacheError, {
            slug: publishResult.slug,
          })
          // Don't fail the entire task for cache errors
        }
      })

      logger.blogGenerated({
        slug: publishResult.slug!,
        title: article.title,
        wordCount: article.htmlContent.length,
      })

      return {
        success: true,
        postId: publishResult.postId,
        slug: publishResult.slug,
        url: `https://vidfab.ai/blog/${publishResult.slug}`,
      }
    } catch (error) {
      logger.error('Blog generation failed', error)
      throw error
    }
  }
)

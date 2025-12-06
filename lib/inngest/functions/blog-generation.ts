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
          throw new Error(
            `Content validation failed: ${contentValidation.errors.join(', ')}`
          )
        }

        return generatedArticle
      })

      // Step 3: Publish Article
      const publishResult = await step.run('publish-article', async () => {
        const { publishAIArticle } = await import('@/lib/blog/ai-publisher')

        const result = await publishAIArticle(article, {
          status: 'published',
          authorEmail:
            process.env.ADMIN_EMAILS?.split(',')[0] || 'auto@vidfab.ai',
        })

        if (!result.success) {
          throw new Error(result.error || 'Failed to publish article')
        }

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

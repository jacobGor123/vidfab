/**
 * Inngest Blog Generation Function
 * Replaces node-cron for scheduled blog article generation
 */

import { inngest } from '../client'
import { logger } from '@/lib/logger'
import {
  sendBlogSuccessNotification,
  sendBlogFailureNotification,
} from '@/lib/blog/email-notifier'

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
    // 🔒 并发控制：同一时间只允许一个任务运行
    concurrency: {
      limit: 1,
    },
    // 🔒 去重控制：相同的事件在24小时内只执行一次（配合数据库检查，双重保护）
    idempotency: '24h',
  },
  { event: 'blog/generate.requested' },
  async ({ event, step }) => {
    const { force = false, source } = event.data
    const startTime = Date.now()

    // 🔒 安全检查：必须明确指定触发源
    // 防止在部署、同步等非预期场景下执行
    const validSources = ['cron', 'manual']
    if (!source || !validSources.includes(source)) {
      logger.warn('Blog generation skipped: missing or invalid source', {
        receivedSource: source,
        validSources,
        eventData: event.data,
      })
      return {
        success: false,
        skipped: true,
        reason: `Invalid or missing source. Must be one of: ${validSources.join(', ')}`,
      }
    }

    logger.info('Blog generation started', { force, source, eventData: event.data })

    // 🔒 数据库检查：防止同一天重复发布（除非强制模式）
    if (!force) {
      const alreadyPublishedToday = await step.run('check-already-published-today', async () => {
        const { supabaseAdmin } = await import('@/lib/supabase')

        // 获取当前 UTC 日期的起止时间
        const now = new Date()
        const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0))
        const todayEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999))

        const { data: existingPost, error } = await supabaseAdmin
          .from('blog_posts')
          .select('id, title, slug, published_at')
          .eq('status', 'published')
          .gte('published_at', todayStart.toISOString())
          .lte('published_at', todayEnd.toISOString())
          .limit(1)
          .single()

        if (error && error.code !== 'PGRST116') {
          // PGRST116 = no rows found, 这是正常情况
          logger.warn('Error checking published posts', error)
        }

        if (existingPost) {
          logger.info('Already published today, skipping generation', {
            postId: existingPost.id,
            title: existingPost.title,
            slug: existingPost.slug,
            publishedAt: existingPost.published_at,
            todayStart: todayStart.toISOString(),
            todayEnd: todayEnd.toISOString(),
          })
          return {
            alreadyPublished: true,
            existingPost,
          }
        }

        logger.info('No article published today, proceeding with generation', {
          todayStart: todayStart.toISOString(),
          todayEnd: todayEnd.toISOString(),
        })
        return {
          alreadyPublished: false,
        }
      })

      // 如果今天已发布，直接返回
      if (alreadyPublishedToday.alreadyPublished) {
        return {
          success: false,
          skipped: true,
          reason: 'Already published an article today',
          existingPost: alreadyPublishedToday.existingPost,
        }
      }
    } else {
      logger.info('Force mode enabled, skip duplicate check')
    }

    // 在 try 外声明 topic，以便在 catch 中访问
    let topic: any = undefined

    try {
      // Step 1: AI Topic Selection
      topic = await step.run('select-topic', async () => {
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

      const result = {
        success: true,
        postId: publishResult.postId,
        slug: publishResult.slug,
        url: `https://vidfab.ai/blog/${publishResult.slug}`,
      }

      // 发送成功通知邮件
      await step.run('send-success-notification', async () => {
        const endTime = Date.now()
        await sendBlogSuccessNotification({
          postId: publishResult.postId!,
          title: article.title,
          slug: publishResult.slug!,
          url: result.url,
          duration: endTime - startTime,
          topic,
        })
      })

      return result
    } catch (error) {
      logger.error('Blog generation failed', error)

      // 发送失败通知邮件
      try {
        // 确定失败阶段
        let stage: 'select-topic' | 'create-draft' | 'generate-content' | 'publish-article' | 'revalidate-cache' = 'select-topic'

        // 尝试从错误消息推断阶段
        const errorMsg = error instanceof Error ? error.message : String(error)
        if (errorMsg.includes('draft') || errorMsg.includes('placeholder')) {
          stage = 'create-draft'
        } else if (errorMsg.includes('content') || errorMsg.includes('generate') || errorMsg.includes('validation')) {
          stage = 'generate-content'
        } else if (errorMsg.includes('publish')) {
          stage = 'publish-article'
        } else if (errorMsg.includes('cache') || errorMsg.includes('revalidate')) {
          stage = 'revalidate-cache'
        }

        await sendBlogFailureNotification({
          stage,
          error: errorMsg,
          errorStack: error instanceof Error ? error.stack : undefined,
          topic, // topic 可能为 undefined（在 select-topic 阶段失败）
        })
      } catch (emailError) {
        logger.error('Failed to send failure notification email', emailError)
      }

      throw error
    }
  }
)

/**
 * Blog Cron Service
 * 使用 node-cron 实现定时任务
 *
 * 用法:
 * 1. 在应用启动时调用 startBlogCronJobs()
 * 2. 在应用关闭时调用 stopBlogCronJobs()
 */

import cron from 'node-cron'
import { selectNextTopic, validateTopic } from './ai-topic-selector'
import { generateArticleContent, validateArticleContent } from './ai-content-generator'
import { publishAIArticle } from './ai-publisher'
import { revalidatePath } from 'next/cache'

// 存储 cron 任务实例
let autoGenerateTask: cron.ScheduledTask | null = null

/**
 * 自动生成和发布文章的任务
 */
async function autoGenerateAndPublishArticle() {
  const startTime = Date.now()

  console.log('\n' + '='.repeat(60))
  console.log('🤖 AI 自动生成文章任务开始')
  console.log('执行时间:', new Date().toISOString())
  console.log('='.repeat(60))

  try {
    // ==================== Step 1: AI 选题 ====================
    console.log('\n📋 Step 1: AI 智能选题')
    console.log('-'.repeat(60))

    const topic = await selectNextTopic()

    console.log('\n✅ 选题完成:')
    console.log(`  → 标题: ${topic.title}`)
    console.log(`  → Slug: ${topic.slug}`)
    console.log(`  → 优先级: ${topic.priority}`)
    console.log(`  → 关键词: ${topic.targetKeywords.join(', ')}`)
    console.log(`  → 理由: ${topic.reason}`)

    // 验证选题是否重复
    const validation = await validateTopic(topic)
    if (!validation.valid) {
      console.error(`❌ 选题验证失败: ${validation.reason}`)
      return
    }

    // ==================== Step 2: AI 生成内容 ====================
    console.log('\n✍️  Step 2: AI 生成文章内容')
    console.log('-'.repeat(60))

    const article = await generateArticleContent(topic)

    console.log('\n✅ 内容生成完成:')
    console.log(`  → 标题: ${article.title}`)
    console.log(`  → 内容长度: ${article.htmlContent.length} 字符`)
    console.log(`  → 图片数量: ${article.images.length}`)
    console.log(`  → 标签: ${article.tags.join(', ')}`)
    console.log(`  → 分类: ${article.category}`)

    // 验证内容质量
    const contentValidation = validateArticleContent(article)
    if (!contentValidation.valid) {
      console.error('❌ 内容验证失败:')
      contentValidation.errors.forEach(err => console.error(`  - ${err}`))
      return
    }

    // ==================== Step 3: 发布文章 ====================
    console.log('\n🚀 Step 3: 发布文章')
    console.log('-'.repeat(60))

    const publishResult = await publishAIArticle(article, {
      status: 'published',
      authorEmail: process.env.ADMIN_EMAILS?.split(',')[0] || 'auto@vidfab.ai',
    })

    if (!publishResult.success) {
      throw new Error(publishResult.error || 'Failed to publish article')
    }

    console.log('\n✅ 文章已发布:')
    console.log(`  → Post ID: ${publishResult.postId}`)
    console.log(`  → Slug: ${publishResult.slug}`)
    console.log(`  → URL: https://vidfab.ai/blog/${publishResult.slug}`)

    // ==================== Step 4: 清除缓存 ====================
    console.log('\n🔄 Step 4: 清除 ISR 缓存')
    console.log('-'.repeat(60))

    try {
      revalidatePath('/blog')
      console.log('  ✓ 博客列表页缓存已清除: /blog')

      revalidatePath(`/blog/${publishResult.slug}`)
      console.log(`  ✓ 文章详情页缓存已清除: /blog/${publishResult.slug}`)
    } catch (cacheError: any) {
      console.warn('⚠️  清除缓存失败 (不影响发布):', cacheError.message)
    }

    // ==================== 完成 ====================
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)

    console.log('\n' + '='.repeat(60))
    console.log('🎉 AI 自动生成文章任务完成!')
    console.log(`⏱️  总耗时: ${duration} 秒`)
    console.log('='.repeat(60) + '\n')

  } catch (error: any) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)

    console.error('\n' + '='.repeat(60))
    console.error('❌ AI 自动生成文章任务失败')
    console.error('='.repeat(60))
    console.error('\nError:', error.message)
    console.error(`⏱️  耗时: ${duration} 秒`)
    console.error('='.repeat(60) + '\n')

    // TODO: 发送错误通知邮件
    // await sendErrorNotification(error)
  }
}

/**
 * 启动所有博客定时任务
 */
export function startBlogCronJobs() {
  console.log('\n🚀 启动博客定时任务...')

  // 每天早上 10:00 (北京时间) 自动生成和发布文章
  // Dockerfile 已设置 TZ=Asia/Shanghai,使用系统时区
  autoGenerateTask = cron.schedule('0 10 * * *', async () => {
    console.log('\n⏰ 定时任务触发: 自动生成文章')
    await autoGenerateAndPublishArticle()
  }, {
    timezone: 'Asia/Shanghai'
  })

  console.log('✅ 定时任务已启动:')
  console.log('  → 自动生成文章: 每天 10:00 Asia/Shanghai (北京时间)')
  console.log()
}

/**
 * 停止所有博客定时任务
 */
export function stopBlogCronJobs() {
  console.log('\n🛑 停止博客定时任务...')

  if (autoGenerateTask) {
    autoGenerateTask.stop()
    autoGenerateTask = null
    console.log('✅ 定时任务已停止')
  }

  console.log()
}

/**
 * 手动触发文章生成任务（用于测试）
 */
export async function triggerManualGeneration() {
  console.log('\n🔧 手动触发文章生成任务...')
  await autoGenerateAndPublishArticle()
}

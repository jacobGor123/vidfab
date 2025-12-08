/**
 * 博客生成邮件通知服务
 * 在文章发布成功或任务失败时发送邮件通知
 */

import { EmailService } from '@/lib/email-service'
import type { TopicSelection } from './ai-topic-selector'

const NOTIFICATION_EMAIL = 'tech.teamr@gmail.com'

interface BlogSuccessNotification {
  type: 'success'
  postId: string
  title: string
  slug: string
  url: string
  duration: number
  topic: TopicSelection
}

interface BlogFailureNotification {
  type: 'failure'
  stage: 'select-topic' | 'create-draft' | 'generate-content' | 'publish-article' | 'revalidate-cache'
  error: string
  errorStack?: string
  topic?: TopicSelection
}

type BlogNotification = BlogSuccessNotification | BlogFailureNotification

/**
 * 发送博客生成成功通知
 */
export async function sendBlogSuccessNotification(
  data: Omit<BlogSuccessNotification, 'type'>
): Promise<void> {
  try {
    const emailService = new EmailService()

    const subject = `✅ 博客文章发布成功: ${data.title}`

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .info-box { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #10b981; }
    .info-row { margin: 10px 0; }
    .label { font-weight: bold; color: #666; }
    .value { color: #111; }
    .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 15px 0; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ 博客文章发布成功</h1>
    </div>
    <div class="content">
      <p>新的博客文章已成功生成并发布到网站！</p>

      <div class="info-box">
        <div class="info-row">
          <span class="label">📝 文章标题:</span>
          <div class="value">${data.title}</div>
        </div>

        <div class="info-row">
          <span class="label">🔗 文章 URL:</span>
          <div class="value"><a href="${data.url}">${data.url}</a></div>
        </div>

        <div class="info-row">
          <span class="label">🏷️ Slug:</span>
          <div class="value">${data.slug}</div>
        </div>

        <div class="info-row">
          <span class="label">📂 分类:</span>
          <div class="value">${data.topic.category || 'guide'}</div>
        </div>

        <div class="info-row">
          <span class="label">🎯 优先级:</span>
          <div class="value">${data.topic.priority}</div>
        </div>

        <div class="info-row">
          <span class="label">🏷️ 目标关键词:</span>
          <div class="value">${data.topic.targetKeywords.join(', ')}</div>
        </div>

        <div class="info-row">
          <span class="label">⏱️ 生成耗时:</span>
          <div class="value">${Math.round(data.duration / 1000)} 秒</div>
        </div>

        <div class="info-row">
          <span class="label">🆔 文章 ID:</span>
          <div class="value">${data.postId}</div>
        </div>
      </div>

      <a href="${data.url}" class="button">📖 查看文章</a>

      <p style="margin-top: 20px; color: #666;">
        文章已自动发布到博客，并触发了缓存重新验证。
      </p>
    </div>

    <div class="footer">
      <p>这是一封自动发送的邮件，来自 VidFab AI 博客生成系统</p>
      <p>📊 <a href="https://www.inngest.com/dashboard">查看 Inngest Dashboard</a></p>
    </div>
  </div>
</body>
</html>
    `

    const text = `
✅ 博客文章发布成功

新的博客文章已成功生成并发布到网站！

文章信息:
- 标题: ${data.title}
- URL: ${data.url}
- Slug: ${data.slug}
- 分类: ${data.topic.category || 'guide'}
- 优先级: ${data.topic.priority}
- 目标关键词: ${data.topic.targetKeywords.join(', ')}
- 生成耗时: ${Math.round(data.duration / 1000)} 秒
- 文章 ID: ${data.postId}

查看文章: ${data.url}

---
这是一封自动发送的邮件，来自 VidFab AI 博客生成系统
查看 Inngest Dashboard: https://www.inngest.com/dashboard
    `

    await emailService.sendEmail({
      to: NOTIFICATION_EMAIL,
      subject,
      html,
      text,
    })

    console.log('✉️ 成功通知邮件已发送')
  } catch (error) {
    // 邮件发送失败不影响主流程
    console.error('⚠️ 发送成功通知邮件失败:', error)
  }
}

/**
 * 发送博客生成失败通知
 */
export async function sendBlogFailureNotification(
  data: Omit<BlogFailureNotification, 'type'>
): Promise<void> {
  try {
    const emailService = new EmailService()

    const stageNames = {
      'select-topic': '📋 AI 选题',
      'create-draft': '📝 创建草稿',
      'generate-content': '✍️ 生成内容',
      'publish-article': '🚀 发布文章',
      'revalidate-cache': '🔄 缓存重新验证',
    }

    const subject = `❌ 博客生成失败 - ${stageNames[data.stage]}`

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .error-box { background: #fee; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #ef4444; }
    .info-box { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #f59e0b; }
    .info-row { margin: 10px 0; }
    .label { font-weight: bold; color: #666; }
    .value { color: #111; }
    .error-message { color: #dc2626; font-family: monospace; background: #fef2f2; padding: 10px; border-radius: 4px; }
    .stack-trace { color: #666; font-family: monospace; font-size: 12px; background: #f9fafb; padding: 10px; border-radius: 4px; max-height: 200px; overflow-y: auto; }
    .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 15px 0; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>❌ 博客生成失败</h1>
    </div>
    <div class="content">
      <p>博客自动生成任务在执行过程中遇到错误。</p>

      <div class="error-box">
        <div class="info-row">
          <span class="label">🚫 失败阶段:</span>
          <div class="value">${stageNames[data.stage]}</div>
        </div>

        <div class="info-row">
          <span class="label">⚠️ 错误信息:</span>
          <div class="error-message">${data.error}</div>
        </div>
      </div>

      ${
        data.topic
          ? `
      <div class="info-box">
        <div class="info-row">
          <span class="label">📝 选中的主题:</span>
          <div class="value">${data.topic.title}</div>
        </div>

        <div class="info-row">
          <span class="label">🔗 Slug:</span>
          <div class="value">${data.topic.slug}</div>
        </div>

        <div class="info-row">
          <span class="label">🎯 优先级:</span>
          <div class="value">${data.topic.priority}</div>
        </div>
      </div>
      `
          : ''
      }

      ${
        data.errorStack
          ? `
      <div class="info-row">
        <span class="label">🔍 错误堆栈:</span>
        <div class="stack-trace">${data.errorStack}</div>
      </div>
      `
          : ''
      }

      <a href="https://www.inngest.com/dashboard" class="button">📊 查看 Inngest Dashboard</a>

      <p style="margin-top: 20px; color: #666;">
        请检查 Inngest Dashboard 获取详细的执行日志。
      </p>
    </div>

    <div class="footer">
      <p>这是一封自动发送的邮件，来自 VidFab AI 博客生成系统</p>
    </div>
  </div>
</body>
</html>
    `

    const text = `
❌ 博客生成失败

博客自动生成任务在执行过程中遇到错误。

失败信息:
- 失败阶段: ${stageNames[data.stage]}
- 错误信息: ${data.error}

${
  data.topic
    ? `
选中的主题:
- 标题: ${data.topic.title}
- Slug: ${data.topic.slug}
- 优先级: ${data.topic.priority}
`
    : ''
}

${data.errorStack ? `\n错误堆栈:\n${data.errorStack}\n` : ''}

查看详细日志: https://www.inngest.com/dashboard

---
这是一封自动发送的邮件，来自 VidFab AI 博客生成系统
    `

    await emailService.sendEmail({
      to: NOTIFICATION_EMAIL,
      subject,
      html,
      text,
    })

    console.log('✉️ 失败通知邮件已发送')
  } catch (error) {
    // 邮件发送失败不影响主流程
    console.error('⚠️ 发送失败通知邮件失败:', error)
  }
}

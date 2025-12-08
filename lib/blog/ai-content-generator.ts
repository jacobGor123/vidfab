/**
 * AI 内容生成服务
 * 使用 Claude API 生成完整的博客文章内容
 */

import Anthropic from '@anthropic-ai/sdk'
import { getBlogPosts } from '@/models/blog'
import fsPromises from 'fs/promises'
import path from 'path'
import type { TopicSelection } from './ai-topic-selector'
import { articleCreationGuide, productConstraints } from './embedded-docs'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  baseURL: process.env.ANTHROPIC_BASE_URL,
})

export interface ImageConfig {
  filename: string
  prompt: string
  aspect_ratio: '16:9' | '4:3'
  output_format: 'jpg' | 'png'
  usage: 'cover' | 'inline'
  insertAfter?: string
  alt: string
  caption?: string
}

export interface ArticleContent {
  title: string
  slug: string
  htmlContent: string
  excerpt: string
  metaTitle: string
  metaDescription: string
  canonicalUrl: string
  tags: string[]
  category: string
  images: ImageConfig[]
  faqSchema: any
}

/**
 * 生成文章内容
 * - 根据主题和创作规范生成 2000-2500 字文章
 * - 包含 SEO 优化、FAQ Schema、内链
 * - 生成图片配置（封面 + 内文图）
 */
export async function generateArticleContent(
  topic: TopicSelection
): Promise<ArticleContent> {
  console.log('\n✍️  开始 AI 内容生成...')
  console.log(`  → 主题: ${topic.title}`)

  // 1. 读取创作规范（从嵌入的文档中读取）
  console.log('  → 读取创作规范...')
  const guideDoc = articleCreationGuide.content
  console.log(`  ✓ 创作规范已读取 (${guideDoc.length} 字符) - 来自: ${articleCreationGuide.path}`)

  // 1.5. 读取产品约束文档（从嵌入的文档中读取）
  console.log('  → 读取产品约束文档...')
  const constraintsDoc = productConstraints.content
  console.log(`  ✓ 产品约束已读取 (${constraintsDoc.length} 字符) - 来自: ${productConstraints.path}`)

  // 2. 获取已发布文章（用于生成内链）
  console.log('  → 查询已发布文章（用于内链）...')
  const allPosts = await getBlogPosts({
    status: 'published',
    limit: 1000,
  })

  if (!allPosts) {
    console.warn('  ⚠️  查询已发布文章失败，可能是数据库连接问题')
  }

  const recentPosts = (allPosts || [])
    .slice(0, 10)
    .map(post => ({
      title: post.title,
      slug: post.slug,
      category: post.category,
      excerpt: post.excerpt,
    }))

  console.log(`  ✓ 找到 ${recentPosts.length} 篇可供内链的文章`)

  // 3. 调用 Claude API 生成内容
  console.log('  → 调用 Claude API 生成内容（需要 30-60 秒）...')

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 12000,
    temperature: 0.7,
    messages: [
      {
        role: 'user',
        content: `你是一个专业的 SEO 内容创作者，专注于 AI 视频生成领域。

## 任务
根据以下主题和创作规范，生成一篇完整的博客文章。

## 主题信息
${JSON.stringify(topic, null, 2)}

## 创作规范（必须严格遵守）
${guideDoc}

## 产品功能约束（极其重要！必须严格遵守！）
${constraintsDoc}

**⚠️ 关键要求**:
1. 只提及实际存在的功能，严禁捏造功能
2. 特效数量: 说"60+ AI effects"或"62 AI effects"，不要说"65+"
3. 最高分辨率: 1080p，不要提2K/4K
4. 最长时长: 10秒，不要提15秒以上
5. 不要提及视频编辑、字幕生成、API等不存在的功能

## 已发布文章（用于生成内链）
${JSON.stringify(recentPosts, null, 2)}

## 生成要求

### 1. 文章结构（2000-2500 字）
- 引言（Introduction）：100-150 字
- 主体内容：分 4-6 个 H2 章节，每章节 300-400 字
- 结论（Conclusion）：100-150 字
- FAQ：5 个问答

### 2. SEO 优化
- Meta Title: 50-60 字符，包含主关键词和年份 "2025"
- Meta Description: 150-160 字符，包含主关键词，带 CTA
- 正文关键词密度: 1-2%
- 标签: 5-8 个相关标签

### 3. HTML 格式要求
- 所有 H2 标签必须有 id 属性（kebab-case）
- 使用语义化 HTML: <section>, <article>, <p>, <ul>, <strong>
- 内链: 添加 2-3 个内链到已发布文章（使用描述性锚文本）
- CTA 按钮: 插入 2-3 个 CTA（sign-up、demo、pro-upgrade）
- **重要**: htmlContent 中不要包含任何 <img> 标签!图片将由系统自动插入

### 4. 图片配置
- **封面图**: 16:9, JPG, 人物或场景，prompt 简洁（<20 词）
- **内文图 1**: 16:9, JPG
  - 放在内容上**最相关**的位置 (如对比图放在对比章节)
  - 使用 insertAfter 指定插入位置 (section 结束标签)
- **内文图 2**: 4:3, JPG
  - 与图1**分散开**,避免连续出现
  - 同样使用 insertAfter 指定位置

**指导原则**:
- 图片应该自然融入内容,不要机械地固定位置
- 两张图片之间至少间隔 1-2 个 section
- insertAfter 使用 section 结束标签

### 5. FAQ Schema
- 5 个 FAQ 问答
- 符合 Google FAQ Schema 格式

## CTA 按钮模板

**Free Sign-up CTA**:
\`\`\`html
<div class="cta-box">
  <h3>🎁 Try VidFab AI for Free</h3>
  <p>Create your first AI video in minutes – no credit card required!</p>
  <a href="/signup" class="cta-button">Start Creating Free →</a>
</div>
\`\`\`

**Demo Request CTA**:
\`\`\`html
<div class="cta-box">
  <h3>🎬 See VidFab AI in Action</h3>
  <p>Watch a live demo and discover how VidFab AI transforms your ideas into videos.</p>
  <a href="/demo" class="cta-button">Book a Demo →</a>
</div>
\`\`\`

**Pro Upgrade CTA**:
\`\`\`html
<div class="cta-box">
  <h3>⚡ Unlock VidFab AI Pro</h3>
  <p>Get unlimited videos, advanced features, and priority support.</p>
  <a href="/pricing" class="cta-button">Upgrade to Pro →</a>
</div>
\`\`\`

## 输出格式（JSON）

{
  "title": "${topic.title}",
  "slug": "${topic.slug}",
  "htmlContent": "<section><h2 id=\\"introduction\\">Introduction</h2><p>...</p></section>...",
  "excerpt": "150-160 字符的摘要",
  "metaTitle": "SEO 标题（50-60 字符，包含2025）",
  "metaDescription": "SEO 描述（150-160 字符）",
  "canonicalUrl": "https://vidfab.ai/blog/${topic.slug}",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "category": "${topic.category || 'guide'}",
  "images": [
    {
      "filename": "${topic.slug}-cover.jpg",
      "prompt": "图片生成 prompt（简洁，<20词，英文）",
      "aspect_ratio": "16:9",
      "output_format": "jpg",
      "usage": "cover",
      "alt": "描述性 alt 文本"
    },
    {
      "filename": "${topic.slug}-inline-1.jpg",
      "prompt": "内文图1 prompt（简洁，<20词，英文）",
      "aspect_ratio": "16:9",
      "output_format": "jpg",
      "usage": "inline",
      "insertAfter": "</section>",
      "alt": "描述性 alt 文本",
      "caption": "可选图片说明"
    },
    {
      "filename": "${topic.slug}-inline-2.jpg",
      "prompt": "内文图2 prompt（简洁，<20词，英文）",
      "aspect_ratio": "4:3",
      "output_format": "jpg",
      "usage": "inline",
      "insertAfter": "</section>",
      "alt": "描述性 alt 文本",
      "caption": "可选图片说明"
    }
  ],
  "faqSchema": {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "问题1",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "答案1"
        }
      }
    ]
  }
}

**关键要求**:
1. 只输出 JSON，不要有其他文字
2. htmlContent 必须是完整的 HTML 字符串
3. htmlContent 中**绝对不要包含 <img> 标签**,图片通过 images 数组配置
4. 所有 H2 都必须有 id 属性
5. 必须包含 2-3 个内链到已发布文章
6. 必须包含 2-3 个 CTA 按钮
7. **图片根据内容选择最佳插入位置**,两张图片之间至少间隔 1-2 个 section
8. insertAfter 使用 section 结束标签
9. JSON 字符串中的双引号必须正确转义`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude API')
  }

  // 提取 JSON
  const jsonMatch = content.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    console.error('Claude API 响应:', content.text)
    throw new Error('Claude API 响应中未找到 JSON 格式数据')
  }

  let article: ArticleContent
  try {
    article = JSON.parse(jsonMatch[0]) as ArticleContent
  } catch (parseError) {
    // 保存原始响应以便调试
    const debugPath = `/tmp/claude-response-${Date.now()}.json`
    await fsPromises.writeFile(debugPath, jsonMatch[0], 'utf-8')
    console.error('  ❌ JSON 解析失败!')
    console.error(`  → 原始响应已保存到: ${debugPath}`)
    console.error(`  → 错误: ${parseError}`)
    console.error(`  → 响应前 500 字符:`, jsonMatch[0].substring(0, 500))
    throw parseError
  }

  console.log('  ✓ 内容生成完成!')
  console.log(`  → 标题: ${article.title}`)
  console.log(`  → 内容长度: ${article.htmlContent.length} 字符`)
  console.log(`  → 图片数量: ${article.images.length}`)
  console.log(`  → 标签: ${article.tags.join(', ')}`)

  return article
}

/**
 * 验证生成的内容是否符合规范
 */
export function validateArticleContent(
  article: ArticleContent
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // 检查必填字段
  if (!article.title) errors.push('缺少标题')
  if (!article.slug) errors.push('缺少 slug')
  if (!article.htmlContent) errors.push('缺少 HTML 内容')
  if (!article.metaTitle) errors.push('缺少 Meta Title')
  if (!article.metaDescription) errors.push('缺少 Meta Description')

  // 检查内容长度
  if (article.htmlContent.length < 1500) {
    errors.push(`内容过短: ${article.htmlContent.length} 字符`)
  }

  // 检查 Meta Title 长度 (Google 最多显示 60-70 字符)
  if (article.metaTitle.length < 50 || article.metaTitle.length > 70) {
    errors.push(
      `Meta Title 长度不符: ${article.metaTitle.length} 字符 (要求 50-70)`
    )
  }

  // 检查 Meta Description 长度 (允许稍微超出，Google 会自动截断)
  if (
    article.metaDescription.length < 140 ||
    article.metaDescription.length > 175
  ) {
    errors.push(
      `Meta Description 长度不符: ${article.metaDescription.length} 字符 (要求 140-175)`
    )
  }

  // 检查标签数量
  if (article.tags.length < 5 || article.tags.length > 8) {
    errors.push(`标签数量不符: ${article.tags.length} 个`)
  }

  // 检查图片配置
  if (!article.images || article.images.length === 0) {
    errors.push('缺少图片配置')
  }

  // 检查 FAQ Schema
  if (!article.faqSchema || !article.faqSchema.mainEntity) {
    errors.push('缺少 FAQ Schema')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

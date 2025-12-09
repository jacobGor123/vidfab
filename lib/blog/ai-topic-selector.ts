/**
 * AI 选题服务
 * 使用 Claude API 智能选择下一个博客主题
 */

import Anthropic from '@anthropic-ai/sdk'
import { getBlogPosts } from '@/models/blog'
import { blogContentStrategy } from './embedded-docs'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  baseURL: process.env.ANTHROPIC_BASE_URL,
})

export interface TopicSelection {
  title: string
  slug: string
  targetKeywords: string[]
  titleFormula: string
  priority: 'P0' | 'P1' | 'P2'
  reason: string
  estimatedSearchVolume: string
  category?: string
}

/**
 * 选择下一个博客主题
 * - 查询已发布文章避免重复
 * - 读取选题策略文档
 * - 使用 Claude AI 智能选择
 */
export async function selectNextTopic(): Promise<TopicSelection> {
  console.log('📋 开始 AI 选题...')

  // 1. 获取所有文章 (包括草稿和已发布)
  console.log('  → 查询已有文章 (包括草稿)...')
  const publishedPosts = await getBlogPosts({
    status: 'all',  // 改为 'all',避免重复选择草稿主题
    limit: 1000,
  })

  const publishedData = (publishedPosts || []).map(post => ({
    title: post.title,
    slug: post.slug,
    category: post.category,
    excerpt: post.excerpt,
  }))

  console.log(`  ✓ 找到 ${publishedData.length} 篇已有文章 (包括草稿)`)

  // 提取已有的 slug 和标题列表（用于 AI 快速检查）
  const existingSlugs = publishedData.map(p => p.slug)
  const existingTitles = publishedData.map(p => p.title)

  // 打印已有文章的 slug 列表，便于调试
  if (publishedData.length > 0) {
    const slugsPreview = existingSlugs.join(', ')
    console.log(`  → 已有 Slug: ${slugsPreview.substring(0, 200)}${slugsPreview.length > 200 ? '...' : ''}`)
  }

  // 2. 读取选题策略文档（从嵌入的文档中读取）
  console.log('  → 读取选题策略文档...')
  const strategyDoc = blogContentStrategy.content
  console.log(`  ✓ 策略文档已读取 (${strategyDoc.length} 字符) - 来自: ${blogContentStrategy.path}`)

  // 3. 调用 Claude API 选题
  console.log('  → 调用 Claude API 分析选题...')

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 2000,
    temperature: 0.7,
    messages: [
      {
        role: 'user',
        content: `你是一个专业的 SEO 内容策划师。

## 🚨 关键任务：避免选择重复主题

### 已使用的 Slug（绝对不能重复！）
${existingSlugs.length > 0 ? existingSlugs.map((slug, i) => `${i + 1}. ${slug}`).join('\n') : '暂无'}

### 已有文章标题（绝对不能重复！）
${existingTitles.length > 0 ? existingTitles.map((title, i) => `${i + 1}. ${title}`).join('\n') : '暂无'}

**⚠️ 严重警告**: 你选择的 slug 和标题必须与上面列出的 ${existingSlugs.length} 个完全不同！

---

## 任务
从选题策略文档中选择下一个最佳文章主题。

## 选题策略文档
${strategyDoc}

## 已有文章详细信息（参考）
${publishedData.length > 0 ? JSON.stringify(publishedData, null, 2) : '暂无文章'}

## 严格的选择规则

### 1. 🚨 第一优先级 - 避免重复（最重要！）
- 你的选择**必须不在**上面的"已使用的 Slug"列表中
- 你的选择**必须不在**上面的"已有文章标题"列表中
- 仔细检查每一个已有 slug，确保你的 slug 完全不同
- 仔细检查每一个已有标题，确保你的标题完全不同
- **如果有任何疑问，选择完全不同的主题领域**

### 2. 优先级
在不重复的前提下，优先选择 P0（🔥）优先级的主题

### 3. 搜索价值
选择搜索量适中、竞争度合理的主题

### 4. 标题公式
确保使用正确的标题公式（How to、Best、vs、Ultimate Guide、Top X 等）

### 5. 年份
标题中包含年份 "2025"

### 6. 多样性
如果已有很多文章，尝试选择不同类型或不同角度的主题

## 输出格式（JSON）
{
  "title": "完整文章标题（包含2025年份）",
  "slug": "url-slug-in-kebab-case",
  "targetKeywords": ["主关键词", "次要关键词1", "次要关键词2"],
  "titleFormula": "使用的标题公式（如 How to、Best、vs）",
  "priority": "P0",
  "reason": "选择理由（说明为什么这个主题不与已有 ${existingSlugs.length} 篇文章重复，100字以内）",
  "estimatedSearchVolume": "高/中/低",
  "category": "tutorial/guide/tips/news/feature"
}

**最后检查**:
1. 只输出 JSON，不要有其他文字
2. 你选择的 slug 是否在"已使用的 Slug"列表中？如果是，立即更换！
3. 你选择的标题是否在"已有文章标题"列表中？如果是，立即更换！
4. 当前已有 ${existingSlugs.length} 篇文章，你的选题应该是第 ${existingSlugs.length + 1} 个完全不同的主题`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude API')
  }

  // 提取 JSON (使用更鲁棒的方式)
  let jsonText = content.text.trim()

  // 尝试提取 JSON 代码块
  const codeBlockMatch = jsonText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
  if (codeBlockMatch) {
    jsonText = codeBlockMatch[1]
  } else {
    // 尝试直接匹配 JSON 对象
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      jsonText = jsonMatch[0]
    }
  }

  let selection: TopicSelection
  try {
    selection = JSON.parse(jsonText) as TopicSelection
  } catch (error) {
    console.error('❌ JSON 解析失败')
    console.error('Claude API 原始响应:', content.text)
    console.error('提取的 JSON 文本:', jsonText)
    throw new Error(`Failed to parse JSON from Claude API: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  console.log('  ✓ 选题完成!')
  console.log(`  → 标题: ${selection.title}`)
  console.log(`  → Slug: ${selection.slug}`)
  console.log(`  → 优先级: ${selection.priority}`)
  console.log(`  → 理由: ${selection.reason}`)

  return selection
}

/**
 * 验证选题是否与已发布文章重复
 */
export async function validateTopic(
  topic: TopicSelection
): Promise<{ valid: boolean; reason?: string }> {
  // 🔒 确保查询参数与 selectNextTopic() 完全一致
  const publishedPosts = await getBlogPosts({
    status: 'all',  // ✅ 明确指定查询所有文章（包括草稿）
    limit: 1000,
  })

  console.log(`  → 验证选题: ${topic.slug}`)
  console.log(`  → 数据库中共有 ${publishedPosts?.length || 0} 篇文章`)

  // 检查 slug 重复
  const slugExists = (publishedPosts || []).some(post => post.slug === topic.slug)
  if (slugExists) {
    const existingPost = (publishedPosts || []).find(post => post.slug === topic.slug)
    console.error(`  ❌ Slug 重复: "${topic.slug}"`)
    console.error(`  → 已存在文章: ${existingPost?.title} (状态: ${existingPost?.status})`)
    return {
      valid: false,
      reason: `Slug "${topic.slug}" 已存在 (状态: ${existingPost?.status})`,
    }
  }

  // 检查标题相似度（简单检查）
  const titleExists = (publishedPosts || []).some(
    post => post.title.toLowerCase() === topic.title.toLowerCase()
  )
  if (titleExists) {
    const existingPost = (publishedPosts || []).find(
      post => post.title.toLowerCase() === topic.title.toLowerCase()
    )
    console.error(`  ❌ 标题重复: "${topic.title}"`)
    console.error(`  → 已存在文章: ${existingPost?.title} (slug: ${existingPost?.slug})`)
    return {
      valid: false,
      reason: `标题 "${topic.title}" 已存在 (slug: ${existingPost?.slug})`,
    }
  }

  console.log(`  ✅ 验证通过: 选题不重复`)
  return { valid: true }
}

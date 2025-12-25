/**
 * Video Agent - AI 灵感生成服务
 * 使用 Brave Search 搜索热门短视频趋势 + Gemini 3 Pro 分析生成创意脚本
 */

import { GoogleGenerativeAI } from '@google/generative-ai'

// 初始化 Gemini AI client
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '')

const GEMINI_MODEL = 'gemini-2.0-flash-exp'

/**
 * 脚本创意类型
 */
export interface ScriptInspiration {
  title: string
  description: string
  script: string
  style: string  // 推荐的剧情风格
  duration: number  // 推荐的时长
  hashtags: string[]  // 推荐的话题标签
}

/**
 * 使用 Brave Search 搜索热门短视频趋势
 */
async function searchTrendingTopics(): Promise<string> {
  try {
    const BRAVE_API_KEY = process.env.BRAVE_API_KEY
    if (!BRAVE_API_KEY) {
      console.warn('[Inspiration Generator] BRAVE_API_KEY not configured, skipping search')
      return ''
    }

    // 直接调用 Brave Search API
    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent('viral short video trends 2025 TikTok YouTube Shorts Instagram Reels')}&count=10`,
      {
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': BRAVE_API_KEY
        }
      }
    )

    if (!response.ok) {
      console.warn('[Inspiration Generator] Brave Search API returned error:', response.status)
      return ''
    }

    const data = await response.json()

    // 提取搜索结果的标题和描述
    const searchResults = data.web?.results
      ?.slice(0, 10)
      .map((r: any) => `${r.title}: ${r.description}`)
      .join('\n\n') || ''

    console.log('[Inspiration Generator] Brave Search results:', {
      resultCount: data.web?.results?.length || 0,
      preview: searchResults.substring(0, 200)
    })

    return searchResults
  } catch (error) {
    console.error('[Inspiration Generator] Brave Search failed:', error)
    // 如果搜索失败，返回空字符串，让 Gemini 基于内置知识生成
    return ''
  }
}

/**
 * 构建灵感生成 Prompt
 */
function buildInspirationPrompt(trendingTopics: string): string {
  const trendContext = trendingTopics
    ? `\n\n## 当前热门趋势（来自互联网搜索）\n${trendingTopics}\n`
    : '\n\n## 创意来源\n基于你对 2025 年短视频平台（TikTok, YouTube Shorts, Instagram Reels）流行趋势的理解。\n'

  return `# 任务: 生成 5 个热门短视频创意脚本

你是一位资深的短视频内容策划师和编剧。请基于当前短视频平台的热门趋势，生成 5 个高质量的原创视频脚本创意。
${trendContext}

## 要求

### 1. 多样性
- 5 个脚本必须涵盖不同的主题和风格
- 推荐的剧情风格包括: comedy（搞笑）, mystery（猎奇）, moral（警世）, twist（反转）, suspense（悬疑）, warmth（温情）, inspiration（励志）
- 时长建议: 15s, 30s, 45s, 或 60s

### 2. 创意脚本结构
每个脚本应该包含:
- **title**: 吸引人的标题（英文，8-15 个词）
- **description**: 一句话概括（英文，20-30 个词）
- **script**: 完整的故事脚本（英文，100-200 个词）
  - 开头：设置场景和人物
  - 中间：展开冲突或核心内容
  - 结尾：高潮或转折点
- **style**: 推荐的剧情风格（从上述 7 种中选择）
- **duration**: 推荐的视频时长（15/30/45/60 秒）
- **hashtags**: 3-5 个相关话题标签（英文，如 "#LifeHack", "#PlotTwist"）

### 3. 内容质量标准
- ✅ 适合短视频格式（快节奏、强视觉冲击）
- ✅ 有明确的故事弧线或核心信息
- ✅ 适合 AI 视频生成（避免过于复杂的场景切换）
- ✅ 符合主流价值观（积极向上、无争议）
- ❌ 避免敏感话题（政治、宗教、暴力、色情）

### 4. 创意方向参考
- 情节反转类: 前后对比强烈的故事
- 生活启示类: 小故事大道理
- 幽默搞笑类: 轻松娱乐的桥段
- 温情治愈类: 感人的人际互动
- 悬疑猎奇类: 吸引好奇心的设定
- 励志成长类: 克服困难、实现目标
- 生活技巧类: 实用的知识分享

## 输出格式

**严格的 JSON 格式，不要包含任何 markdown 标记或代码块符号：**

{
  "inspirations": [
    {
      "title": "The Coffee Shop Stranger",
      "description": "A man helps a stranger, only to discover she's actually an angel testing humanity.",
      "script": "A young man sits in a busy coffee shop, typing on his laptop. An elderly woman approaches, struggling with her heavy bags. Without hesitation, he offers to help carry them to her car. As they walk outside, she smiles warmly and suddenly vanishes into thin air, leaving behind a glowing feather. The man picks it up, stunned, as the screen fades to white with text: 'Kindness is always watched.'",
      "style": "warmth",
      "duration": 30,
      "hashtags": ["#ActsOfKindness", "#PlotTwist", "#Inspirational", "#ShortFilm"]
    }
  ]
}

**重要提示:**
- 直接输出纯 JSON，不要用 \\\`\\\`\\\`json 包裹
- 确保 JSON 格式正确，可以被直接解析
- 所有内容必须是英文
- 必须包含恰好 5 个脚本创意`
}

/**
 * 生成 AI 灵感脚本
 * @returns 5 个脚本创意
 */
export async function generateInspirations(): Promise<ScriptInspiration[]> {
  console.log('[Inspiration Generator] Starting inspiration generation')

  // 步骤 1: 搜索热门话题（可选）
  // TODO: 配置 BRAVE_API_KEY 后启用
  const trendingTopics = '' // await searchTrendingTopics()

  // 步骤 2: 构建 Prompt
  const prompt = buildInspirationPrompt(trendingTopics)

  try {
    // 步骤 3: 调用 Gemini API
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: {
        temperature: 0.9,  // 更高的创造性
        maxOutputTokens: 8192,
        responseMimeType: 'application/json'
      }
    })

    const result = await model.generateContent(prompt)
    const response = await result.response
    const content = response.text()

    if (!content) {
      throw new Error('Empty response from Gemini 3 Pro')
    }

    console.log('[Inspiration Generator] Received response from Gemini:', {
      contentLength: content.length,
      preview: content.substring(0, 200)
    })

    // 清理响应内容
    let cleanContent = content.trim()
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.replace(/^```json\s*/, '')
    }
    if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.replace(/^```\s*/, '')
    }
    if (cleanContent.endsWith('```')) {
      cleanContent = cleanContent.replace(/\s*```$/, '')
    }

    // 解析 JSON
    let parsedResult: { inspirations: ScriptInspiration[] }
    try {
      parsedResult = JSON.parse(cleanContent)
    } catch (parseError) {
      console.error('[Inspiration Generator] JSON parse error:', parseError)
      console.error('[Inspiration Generator] Raw content:', content)
      throw new Error('Invalid JSON response from Gemini 3 Pro')
    }

    // 验证结果
    if (!parsedResult.inspirations || !Array.isArray(parsedResult.inspirations)) {
      throw new Error('Invalid inspirations format')
    }

    if (parsedResult.inspirations.length !== 5) {
      console.warn('[Inspiration Generator] Expected 5 inspirations, got:', parsedResult.inspirations.length)
    }

    console.log('[Inspiration Generator] Generation completed successfully:', {
      count: parsedResult.inspirations.length
    })

    return parsedResult.inspirations

  } catch (error) {
    console.error('[Inspiration Generator] Generation failed:', error)
    throw error
  }
}

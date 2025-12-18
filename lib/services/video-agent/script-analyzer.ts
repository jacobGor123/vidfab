/**
 * Video Agent - 脚本分析服务
 * 使用 GPT-4o-mini (via Replicate) 分析用户脚本并生成结构化分镜数据
 */

import Replicate from 'replicate'
import { Agent } from 'undici'

// 创建自定义 Agent，增加连接和请求超时时间
const agent = new Agent({
  connect: {
    timeout: 60000  // 连接超时：60 秒（从 10 秒增加到 60 秒）
  },
  bodyTimeout: 120000,  // 请求体超时：120 秒
  headersTimeout: 60000  // 响应头超时：60 秒
})

// 自定义 fetch 函数，使用配置好的 Agent
const customFetch = (url: RequestInfo | URL, init?: RequestInit) => {
  return fetch(url, {
    ...init,
    // @ts-ignore - undici Agent 类型兼容性
    dispatcher: agent
  })
}

// 初始化 Replicate client，使用自定义 fetch
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || '',
  fetch: customFetch as any
})

// GPT-4o-mini 模型（通过 Replicate）
const GPT_MODEL = 'openai/gpt-4o-mini'

// 🔥 统一分镜时长（秒）
const UNIFIED_SEGMENT_DURATION = 5

/**
 * 脚本分析结果类型
 */
export interface ScriptAnalysisResult {
  duration: number
  shot_count: number
  story_style: string
  characters: string[]
  shots: Shot[]
  music_generation_prompt?: string  // 🔥 新增：Suno 音乐生成 prompt
}

export interface Shot {
  shot_number: number
  time_range: string
  description: string
  camera_angle: string
  character_action: string
  characters: string[]
  mood: string
  duration_seconds: number
}

/**
 * 脚本分析 Prompt 模板 (优化版 - 针对 GPT-4o-mini)
 */
function buildScriptAnalysisPrompt(
  userScript: string,
  duration: number,
  storyStyle: string
): string {
  // 🔥 基于统一 5 秒时长计算分镜数量
  const shotCountMap: Record<number, number> = {
    15: 3,   // 15s = 3 个分镜（3 × 5s）
    30: 6,   // 30s = 6 个分镜（6 × 5s）
    45: 9,   // 45s = 9 个分镜（9 × 5s）
    60: 12   // 60s = 12 个分镜（12 × 5s）
  }

  const shotCount = shotCountMap[duration] || Math.ceil(duration / UNIFIED_SEGMENT_DURATION)

  // 🔥 每个分镜固定为 5 秒
  const avgShotDuration = UNIFIED_SEGMENT_DURATION

  return `# 任务: 专业视频分镜脚本生成

你是一位经验丰富的视频导演和分镜师。请根据用户提供的脚本，生成专业的视频分镜脚本。

## 用户输入
- **原始脚本**: "${userScript}"
- **视频总时长**: ${duration} 秒
- **剧情风格**: ${storyStyle}
- **分镜数量**: ${shotCount} 个

## 任务要求

### 1. 脚本分析与优化
根据剧情风格 "${storyStyle}" 优化和延伸脚本内容:

${getStyleGuide(storyStyle)}

### 2. 人物角色提取
- 识别脚本中所有出现的主要人物角色
- 使用简洁明确的英文名称（如 "Young Man", "Elderly Woman", "Robot"）
- 如果没有明确的人物，可以省略

### 3. 分镜拆分规则
- 将脚本拆分为 **恰好 ${shotCount} 个分镜**
- 每个分镜时长约 ${avgShotDuration} 秒（可根据剧情需要微调，但总时长必须为 ${duration} 秒）
- 确保时间范围连续且不重叠（如 "0-5s", "5-10s"）
- 每个分镜应该是一个独立的视觉单元，避免过于复杂的场景切换

### 4. 分镜描述要求
为每个分镜提供以下详细信息：

**a) description (场景视觉描述)**
- 用英文描述场景的核心视觉元素
- 包含环境、人物位置、主要物体
- 具体且可视化（避免抽象概念）
- 示例: "A young woman standing at a bus stop in the rain, holding a red umbrella"

**b) camera_angle (镜头角度)**
- 镜头类型: Wide shot / Medium shot / Close-up / Extreme close-up / Over-the-shoulder
- 摄像机角度: Eye level / High angle / Low angle / Bird's eye view / Dutch angle
- 示例: "Medium shot, eye level"

**c) character_action (角色动作)**
- 描述角色的具体动作和行为
- 用英文，动词清晰
- 示例: "Looking at her watch nervously, then glancing down the street"

**d) characters (出现的角色)**
- 列出该分镜中出现的所有角色名称
- 使用与人物提取一致的名称
- 如果没有角色，返回空数组

**e) mood (情绪氛围)**
- 用 2-4 个英文形容词描述场景的情绪基调
- 示例: "Anxious and hopeful" / "Mysterious and tense" / "Warm and nostalgic"

**f) duration_seconds (分镜时长)**
- 该分镜的持续时间（秒）
- 所有分镜时长之和必须等于 ${duration} 秒

## 输出格式

**严格的 JSON 格式，不要包含任何 markdown 标记、代码块符号或额外说明文字：**

{
  "duration": ${duration},
  "shot_count": ${shotCount},
  "story_style": "${storyStyle}",
  "characters": ["Character1", "Character2"],
  "shots": [
    {
      "shot_number": 1,
      "time_range": "0-${avgShotDuration}s",
      "description": "Detailed visual description in English",
      "camera_angle": "Shot type and camera angle",
      "character_action": "Specific character action in English",
      "characters": ["Character1"],
      "mood": "Emotional tone",
      "duration_seconds": ${avgShotDuration}
    }
  ]
}

**重要提示:**
- 直接输出纯 JSON，不要用 \\\`\\\`\\\`json 包裹
- 确保 JSON 格式正确，可以被直接解析
- 所有描述字段必须是英文
- 时间范围必须连续且总和为 ${duration} 秒`
}

/**
 * 获取剧情风格指南
 */
function getStyleGuide(storyStyle: string): string {
  const styleGuides: Record<string, string> = {
    auto: '- 根据脚本内容自然延伸，保持原有风格\n- 不刻意强化特定类型，让故事自然发展',
    comedy: '- 增加幽默元素和笑点\n- 可适当夸张表现和喜剧冲突\n- 注重节奏感和反差效果',
    mystery: '- 加入不寻常元素和反常规设定\n- 营造好奇心和探索欲\n- 设置谜题或未解之谜',
    moral: '- 强化道德寓意和社会意义\n- 展现价值观和人生哲理\n- 可包含适度的批判或反思',
    twist: '- 设置悬念和伏笔\n- 安排情节反转或意外结局\n- 前后呼应，制造惊喜',
    suspense: '- 营造紧张氛围和悬念感\n- 设置谜团或未知威胁\n- 逐步揭示真相，保持观众好奇',
    warmth: '- 强化情感连接和人物关系\n- 营造温馨、治愈的氛围\n- 展现人性美好的一面',
    inspiration: '- 突出挑战和成长过程\n- 展现积极向上的价值观\n- 激励和鼓舞观众'
  }

  return styleGuides[storyStyle] || styleGuides.auto
}

/**
 * 分析脚本
 * @param script 用户输入的脚本
 * @param duration 视频时长 (15/30/45/60)
 * @param storyStyle 剧情风格
 * @returns 结构化分镜数据
 */
/**
 * 延迟函数
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function analyzeScript(
  script: string,
  duration: number,
  storyStyle: string
): Promise<ScriptAnalysisResult> {
  console.log('[Script Analyzer] Starting analysis with GPT-4o-mini (via Replicate)', {
    scriptLength: script.length,
    duration,
    storyStyle
  })

  const prompt = buildScriptAnalysisPrompt(script, duration, storyStyle)

  // 最多重试 3 次（遇到 429 时）
  let retries = 0
  const maxRetries = 3

  while (retries <= maxRetries) {
    try {
      // 调用 Replicate API (GPT-4o-mini)
      const input = {
        prompt: prompt,
        temperature: 0.7,
        top_p: 0.95,
        max_completion_tokens: 4096,
        frequency_penalty: 0,
        presence_penalty: 0
      }

      // 收集流式响应
      let content = ''
      for await (const event of replicate.stream(GPT_MODEL, { input })) {
        content += event.toString()
      }

      if (!content) {
        throw new Error('Empty response from GPT-4o-mini')
      }

      console.log('[Script Analyzer] Received response from GPT-4o-mini:', {
        contentLength: content.length,
        preview: content.substring(0, 200)
      })

      // 清理响应内容（移除可能的 markdown 标记）
      let cleanContent = content.trim()

      // 移除可能的 markdown 代码块标记
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
      let analysis: ScriptAnalysisResult
      try {
        analysis = JSON.parse(cleanContent)
      } catch (parseError) {
        console.error('[Script Analyzer] JSON parse error:', parseError)
        console.error('[Script Analyzer] Raw content:', content)
        console.error('[Script Analyzer] Cleaned content:', cleanContent)
        throw new Error('Invalid JSON response from GPT-4o-mini')
      }

      // 验证结果
      if (!analysis.shots || analysis.shots.length === 0) {
        throw new Error('No shots generated in analysis result')
      }

      // 🔥 强制统一所有分镜时长为 5 秒
      analysis.shots = analysis.shots.map((shot, index) => ({
        ...shot,
        duration_seconds: UNIFIED_SEGMENT_DURATION,
        time_range: `${index * UNIFIED_SEGMENT_DURATION}-${(index + 1) * UNIFIED_SEGMENT_DURATION}s`
      }))

      // 🔥 重新计算总时长
      const actualTotalDuration = analysis.shots.length * UNIFIED_SEGMENT_DURATION

      console.log('[Script Analyzer] Analysis completed successfully', {
        shotCount: analysis.shots.length,
        characters: analysis.characters,
        requestedDuration: analysis.duration,
        actualTotalDuration,
        segmentDuration: UNIFIED_SEGMENT_DURATION
      })

      // 更新实际总时长
      analysis.duration = actualTotalDuration

      return analysis

    } catch (error: any) {
      // 检查是否是 429 限流错误
      if (error.response?.status === 429 || error.message?.includes('429') || error.message?.includes('throttled')) {
        const retryAfter = error.response?.headers?.['retry-after'] || 10
        const waitTime = typeof retryAfter === 'string' ? parseInt(retryAfter) : retryAfter

        console.warn(`[Script Analyzer] Rate limited (429). Retry ${retries + 1}/${maxRetries} after ${waitTime}s`, {
          retries,
          waitTime,
          error: error.message
        })

        if (retries < maxRetries) {
          retries++
          console.log(`[Script Analyzer] Waiting ${waitTime}s before retry...`)
          await sleep(waitTime * 1000)
          continue // 重试
        } else {
          console.error('[Script Analyzer] Max retries reached for 429 error')
          throw new Error(`Rate limit exceeded. Please wait a moment and try again. (Retried ${maxRetries} times)`)
        }
      }

      // 其他错误直接抛出
      console.error('[Script Analyzer] Analysis failed:', error)
      throw error
    }
  }

  // 如果所有重试都失败了
  throw new Error('Script analysis failed after multiple retries')
}

/**
 * 🔥 生成 Suno 音乐 prompt
 * 基于脚本分析结果，生成适合的背景音乐描述
 */
export async function generateMusicPrompt(
  script: string,
  storyStyle: string,
  shots: Shot[]
): Promise<string> {
  console.log('[Script Analyzer] 生成 Suno 音乐 prompt', {
    storyStyle,
    shotCount: shots.length
  })

  // 提取所有场景描述和情绪
  const sceneDescriptions = shots.map(s => s.description).join('. ')
  const moods = [...new Set(shots.map(s => s.mood))].join(', ')

  const prompt = `Generate a background music description for a ${storyStyle} video story.

Story context:
${script}

Scene descriptions: ${sceneDescriptions}

Emotional tones: ${moods}

Create a concise music prompt (max 200 characters) that describes:
1. Musical genre and style
2. Tempo and energy level
3. Instruments or sound characteristics
4. Emotional atmosphere

Output only the music prompt in English, without any explanation or additional text.`

  try {
    // 调用 Replicate API (GPT-4o-mini)
    const input = {
      prompt: prompt,
      temperature: 0.8,
      top_p: 0.95,
      max_completion_tokens: 100
    }

    let musicPrompt = ''
    for await (const event of replicate.stream(GPT_MODEL, { input })) {
      musicPrompt += event.toString()
    }

    musicPrompt = musicPrompt.trim()

    // 限制长度（Suno 推荐 200 字符以内）
    if (musicPrompt.length > 200) {
      musicPrompt = musicPrompt.substring(0, 197) + '...'
    }

    console.log('[Script Analyzer] 音乐 prompt 生成完成:', musicPrompt)

    return musicPrompt

  } catch (error: any) {
    console.error('[Script Analyzer] 音乐 prompt 生成失败:', error)
    // 返回默认 prompt
    return `Cinematic ${storyStyle} music, emotional and atmospheric`
  }
}

/**
 * 验证分析结果
 */
export function validateAnalysisResult(analysis: ScriptAnalysisResult): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!analysis.duration || ![15, 30, 45, 60].includes(analysis.duration)) {
    errors.push('Invalid duration')
  }

  if (!analysis.shots || !Array.isArray(analysis.shots)) {
    errors.push('Shots must be an array')
  }

  if (analysis.shots && analysis.shots.length === 0) {
    errors.push('At least one shot is required')
  }

  if (analysis.shots) {
    analysis.shots.forEach((shot, index) => {
      if (!shot.shot_number || shot.shot_number !== index + 1) {
        errors.push(`Shot ${index + 1}: Invalid shot number`)
      }
      if (!shot.description || shot.description.trim() === '') {
        errors.push(`Shot ${index + 1}: Description is required`)
      }
      if (!shot.duration_seconds || shot.duration_seconds <= 0) {
        errors.push(`Shot ${index + 1}: Invalid duration`)
      }
    })
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

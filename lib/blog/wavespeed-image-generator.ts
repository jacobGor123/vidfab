/**
 * 博客图片生成服务 - Wavespeed API
 * 使用 Wavespeed nano-banana-pro 模型生成博客文章头图
 */

import fs from 'fs/promises'
import path from 'path'

const WAVESPEED_API_KEY = process.env.WAVESPEED_API_KEY || ''
const WAVESPEED_BASE_URL = 'https://api.wavespeed.ai/api/v3'

// Vercel Serverless Functions 只能写入 /tmp 目录
const TMP_DIR =
  process.env.VERCEL || process.env.NODE_ENV === 'production'
    ? '/tmp/blog-images'
    : path.join(process.cwd(), 'tmp', 'blog-images')

export interface BlogImageOptions {
  prompt: string
  aspectRatio?: '16:9' | '4:3'
}

export interface GeneratedImage {
  url: string
  localPath: string
  filename: string
}

interface WavespeedResponse {
  data: {
    id: string
    model: string
  }
}

interface StatusResponse {
  data: {
    id: string
    status: 'created' | 'processing' | 'completed' | 'failed'
    outputs?: string[]
    error?: string
    progress?: number
  }
}

/**
 * 根据文章标题和分类生成图片提示词
 */
export function generateImagePrompt(
  title: string,
  category?: string
): string {
  const categoryPrompts: Record<string, string> = {
    tutorial: 'modern content creator workspace, laptop displaying video editing interface',
    guide: 'professional digital content creation setup, multiple screens',
    tips: 'creative workspace with video production equipment',
    news: 'futuristic tech news scene with glowing displays',
    feature: 'innovative AI technology visualization',
  }

  const basePrompt = categoryPrompts[category || 'guide'] || categoryPrompts.guide

  return `${basePrompt}, professional lighting, clean modern aesthetic, high quality, trending on artstation`
}

/**
 * 创建图片生成任务
 */
async function createTask(prompt: string, aspectRatio: string = '16:9'): Promise<string> {
  console.log(`  → Wavespeed API: Creating task...`)
  console.log(`  → Model: nano-banana-pro, Aspect: ${aspectRatio}`)

  const response = await fetch(`${WAVESPEED_BASE_URL}/google/nano-banana-pro/text-to-image-ultra`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${WAVESPEED_API_KEY}`,
    },
    body: JSON.stringify({
      prompt: prompt,
      aspect_ratio: aspectRatio,
      enable_sync_mode: false,
      enable_base64_output: false,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to create task: ${response.status} ${response.statusText}\n${errorText}`)
  }

  const data: WavespeedResponse = await response.json()
  console.log(`  → API Response:`, { requestId: data.data.id, model: data.data.model })

  if (!data.data?.id) {
    throw new Error(`No request ID returned from API`)
  }

  return data.data.id
}

/**
 * 查询任务状态
 */
async function checkTaskStatus(requestId: string): Promise<StatusResponse> {
  const response = await fetch(`${WAVESPEED_BASE_URL}/predictions/${requestId}/result`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${WAVESPEED_API_KEY}`,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to check task: ${response.status} ${response.statusText}\n${errorText}`)
  }

  const data: StatusResponse = await response.json()
  return data
}

/**
 * 等待任务完成
 */
async function waitForTaskCompletion(requestId: string, maxAttempts: number = 60): Promise<string> {
  console.log(`  → Polling task status (max ${maxAttempts} attempts)...`)

  for (let i = 0; i < maxAttempts; i++) {
    const response = await checkTaskStatus(requestId)
    const result = response.data

    if (i === 0 || i % 5 === 0 || result.status === 'completed' || result.status === 'failed') {
      console.log(`  → Attempt ${i + 1}/${maxAttempts}: status = ${result.status}${result.progress ? ` (${result.progress}%)` : ''}`)
    }

    if (result.status === 'completed') {
      if (!result.outputs || result.outputs.length === 0) {
        throw new Error('No outputs in completed task')
      }

      console.log(`  ✓ Image generated: ${result.outputs[0].substring(0, 80)}...`)
      return result.outputs[0]
    }

    if (result.status === 'failed') {
      throw new Error(`Task failed: ${result.error || 'Unknown error'}`)
    }

    // 等待 2 秒后重试
    await new Promise(resolve => setTimeout(resolve, 2000))
  }

  throw new Error('Task timeout: exceeded maximum attempts')
}

/**
 * 生成博客文章头图
 * @param options 图片生成选项
 * @returns 生成的图片 URL 和本地路径
 */
export async function generateBlogImage(
  options: BlogImageOptions
): Promise<GeneratedImage> {
  try {
    // 确保临时目录存在
    await fs.mkdir(TMP_DIR, { recursive: true })

    console.log('🎨 Generating blog image with Wavespeed:', {
      model: 'nano-banana-pro',
      aspectRatio: options.aspectRatio || '16:9',
      prompt: options.prompt.substring(0, 100) + '...',
    })

    // 1. 创建任务
    const requestId = await createTask(options.prompt, options.aspectRatio || '16:9')
    console.log(`  ✓ Task created: ${requestId}`)

    // 2. 等待任务完成
    const imageUrl = await waitForTaskCompletion(requestId)
    console.log(`  ✓ Image URL: ${imageUrl}`)

    // 3. 下载图片到本地
    console.log('  → Downloading image...')
    const response = await fetch(imageUrl)
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`)
    }

    const buffer = Buffer.from(await response.arrayBuffer())
    const filename = `blog-${Date.now()}.jpg`
    const localPath = path.join(TMP_DIR, filename)

    await fs.writeFile(localPath, buffer)
    console.log(`  ✓ Image downloaded to: ${localPath}`)
    console.log(`  → File size: ${(buffer.length / 1024).toFixed(2)} KB`)

    return {
      url: imageUrl,
      localPath,
      filename,
    }
  } catch (error: any) {
    console.error('❌ Blog image generation failed:', error)
    throw error
  }
}

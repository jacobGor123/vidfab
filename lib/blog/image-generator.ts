/**
 * 博客图片生成服务
 * 使用 kie.ai nano-banana-pro API 生成博客文章头图
 */

import fs from 'fs/promises'
import path from 'path'

const KIE_API_KEY = process.env.KIE_API_KEY || ''
const KIE_API_URL = 'https://api.kie.ai/api/v1/jobs'

const TMP_DIR = path.join(process.cwd(), 'tmp', 'blog-images')

export interface BlogImageOptions {
  prompt: string
  category?: string
  watermark?: boolean
}

export interface GeneratedImage {
  url: string
  localPath: string
  filename: string
}

interface KieTaskResponse {
  code: number
  message?: string
  msg?: string
  data: {
    taskId: string
    state: 'pending' | 'running' | 'success' | 'failed'
    resultJson?: string
    completeTime?: number
    errorMessage?: string
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
async function createTask(prompt: string): Promise<string> {
  const response = await fetch(`${KIE_API_URL}/createTask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${KIE_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'nano-banana-pro',
      input: {
        prompt: prompt,
        image_urls: [],  // 必须参数，即使是空数组
        output_format: 'jpg',
        image_size: '1024x768',  // 16:9 比例
      },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to create task: ${response.status} ${response.statusText}\n${errorText}`)
  }

  const data = await response.json()

  // 打印完整响应用于调试
  console.log('  → API Response:', JSON.stringify(data, null, 2))

  // kie.ai 响应格式: {code, message, data: {taskId}}
  if (data.code !== 200 && data.code !== 0) {
    throw new Error(`API error: ${data.message || data.msg || 'Unknown error'}`)
  }

  if (!data.data?.taskId) {
    throw new Error(`No taskId returned from API. Response: ${JSON.stringify(data)}`)
  }

  return data.data.taskId
}

/**
 * 查询任务状态
 */
async function checkTaskStatus(taskId: string): Promise<KieTaskResponse> {
  const response = await fetch(`${KIE_API_URL}/recordInfo?taskId=${taskId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${KIE_API_KEY}`,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to check task: ${response.status} ${response.statusText}\n${errorText}`)
  }

  const data = await response.json()

  // kie.ai 响应格式验证
  if (data.code !== 200 && data.code !== 0) {
    throw new Error(`API error: ${data.message || data.msg || 'Unknown error'}`)
  }

  return data
}

/**
 * 等待任务完成
 */
async function waitForTaskCompletion(taskId: string, maxAttempts: number = 120): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const response = await checkTaskStatus(taskId)
    const result = response.data

    console.log(`  → Attempt ${i + 1}/${maxAttempts}: state = ${result.state}`)

    if (result.state === 'success') {
      if (!result.resultJson) {
        throw new Error('No resultJson in completed task')
      }

      // 解析 resultJson
      console.log('  → ResultJson:', result.resultJson)
      const resultData = JSON.parse(result.resultJson)
      console.log('  → Parsed result:', JSON.stringify(resultData, null, 2))

      // kie.ai 返回格式: {resultUrls: [...]}
      if (!resultData.resultUrls || resultData.resultUrls.length === 0) {
        throw new Error(`No images in result. ResultData: ${JSON.stringify(resultData)}`)
      }

      return resultData.resultUrls[0]
    }

    if (result.state === 'failed') {
      throw new Error(`Task failed: ${result.errorMessage || 'Unknown error'}`)
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

    console.log('🎨 Generating blog image with kie.ai:', {
      model: 'nano-banana-pro',
      prompt: options.prompt.substring(0, 100) + '...',
    })

    // 1. 创建任务
    console.log('  → Creating task...')
    const taskId = await createTask(options.prompt)
    console.log(`  ✓ Task created: ${taskId}`)

    // 2. 等待任务完成
    console.log('  → Waiting for completion...')
    const imageUrl = await waitForTaskCompletion(taskId)
    console.log(`  ✓ Image generated: ${imageUrl}`)

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

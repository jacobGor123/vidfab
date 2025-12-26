/**
 * BytePlus Seedream 4.5 Image API
 * 升级说明: 支持角色一致性 (6-10张参考图)
 */

import { BytePlusClient } from '../core/client'
import { ImageGenerationRequest, ImageGenerationResponse } from '@/lib/types/image'
import { convertAspectRatioToSize } from './utils'
import { BytePlusImageRequest, BytePlusImageResponse } from './types'

// 创建 client，图片生成需要更长的超时时间
// 🔥 关键配置说明：
// - 线上环境 (Vercel Pro) 最大函数超时 60 秒
// - 为避免 Lambda 超时，图片生成超时设置为 50 秒
// - 如果 50 秒内未完成，会触发重试机制
// - 总共最多 3 次尝试（1 次初始 + 2 次重试）
const TIMEOUT_MS = parseInt(process.env.BYTEPLUS_IMAGE_TIMEOUT_MS || '50000', 10)
const MAX_RETRIES = parseInt(process.env.BYTEPLUS_IMAGE_MAX_RETRIES || '2', 10)

const client = new BytePlusClient({
  timeoutMs: TIMEOUT_MS, // 默认 50 秒，避免 Vercel Lambda 60秒超时
  maxRetries: MAX_RETRIES, // 最多重试2次，总共3次尝试
  enableRetry: true
})

// 使用 Seedream 4.5 模型 (支持角色一致性)
const DEFAULT_IMAGE_MODEL = 'seedream-4-5-251128'

/**
 * 提交图片生成任务
 * 注意: BytePlus Image API 是同步返回的，直接返回图片 URL
 *
 * Seedream 4.5 新特性:
 * - 支持多张参考图（至少 10 张以上），用于角色一致性
 * - 参考图通过 request.images 传递
 * - Video Agent 业务规则：每个角色 1 张参考图，多个角色的分镜会传递多张
 * - 例如：Prince + Dragon 的分镜会传递 2 张参考图
 */
export async function submitImageGeneration(
  request: ImageGenerationRequest
): Promise<ImageGenerationResponse & { imageUrl?: string }> {
  const byteplusRequest: BytePlusImageRequest = {
    model: DEFAULT_IMAGE_MODEL,
    prompt: request.prompt,
    size: convertAspectRatioToSize(request.aspectRatio),
    sequential_image_generation: 'disabled',  // 单张生成
    response_format: 'url',
    stream: false,
    watermark: request.watermark ?? false  // 使用请求中的水印设置，默认 false
  }

  // Image-to-Image 或 参考图 (用于角色一致性)
  // Seedream 4.5: 支持多张参考图（至少 10 张以上）
  if (request.images && request.images.length > 0) {
    byteplusRequest.image = request.images.length === 1
      ? request.images[0]
      : request.images
  }

  // 添加负面提示词
  if (request.negativePrompt) {
    byteplusRequest.negative_prompt = request.negativePrompt
  }

  console.log('🚀 Submitting image generation to BytePlus:', {
    model: byteplusRequest.model,
    size: byteplusRequest.size,
    hasInputImages: !!byteplusRequest.image,
    inputImageCount: Array.isArray(byteplusRequest.image) ? byteplusRequest.image.length : (byteplusRequest.image ? 1 : 0),
    inputImages: byteplusRequest.image,  // 完整的参考图 URL
    hasNegativePrompt: !!byteplusRequest.negative_prompt,
    negativePrompt: byteplusRequest.negative_prompt
  })

  // BytePlus Image API 是同步返回的
  const response = await client.request<BytePlusImageResponse>(
    '/images/generations',
    {
      method: 'POST',
      body: JSON.stringify(byteplusRequest)
    }
  )

  console.log('✅ Image generation completed:', {
    generatedImages: response.usage.generated_images,
    imageUrl: response.data[0]?.url
  })

  // 生成一个临时 ID（因为是同步返回，不需要真正的 request ID）
  const tempId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  // 返回格式兼容现有代码
  return {
    data: {
      id: tempId,
      model: response.model
    },
    imageUrl: response.data[0]?.url  // 直接返回图片 URL
  }
}

/**
 * 查询图片生成状态
 * 注意: BytePlus Image API 是同步的，不需要状态查询
 * 这个函数保留是为了兼容现有代码
 */
export async function checkImageStatus(requestId: string): Promise<any> {
  // BytePlus Image API 是同步返回的，不需要轮询
  throw new Error('BytePlus Image API returns results synchronously, no need to poll status')
}

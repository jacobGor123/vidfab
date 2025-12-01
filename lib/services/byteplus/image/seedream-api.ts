/**
 * BytePlus Seedream 4.0 Image API
 */

import { BytePlusClient } from '../core/client'
import { ImageGenerationRequest, ImageGenerationResponse } from '@/lib/types/image'
import { convertAspectRatioToSize } from './utils'
import { BytePlusImageRequest, BytePlusImageResponse } from './types'

const client = new BytePlusClient()

// 使用 Seedream 4.0 模型
const DEFAULT_IMAGE_MODEL = 'seedream-4-0-250828'

/**
 * 提交图片生成任务
 * 注意: BytePlus Image API 是同步返回的，直接返回图片 URL
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

  // Image-to-Image: 添加输入图片
  if (request.images && request.images.length > 0) {
    byteplusRequest.image = request.images.length === 1
      ? request.images[0]
      : request.images
  }

  console.log('🚀 Submitting image generation to BytePlus:', {
    model: byteplusRequest.model,
    size: byteplusRequest.size,
    hasInputImages: !!byteplusRequest.image,
    inputImageCount: Array.isArray(byteplusRequest.image) ? byteplusRequest.image.length : (byteplusRequest.image ? 1 : 0)
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

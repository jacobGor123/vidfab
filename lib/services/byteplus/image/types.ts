/**
 * BytePlus Seedream 4.0 Image API Types
 */

export interface BytePlusImageRequest {
  model: string
  prompt: string
  negative_prompt?: string  // 负面提示词
  size?: string  // "2048x2048" 或 "2K"
  sequential_image_generation?: 'auto' | 'disabled'
  response_format?: 'url' | 'b64_json'
  stream?: boolean
  watermark?: boolean
  image?: string | string[]  // I2I 需要
}

export interface BytePlusImageData {
  url?: string
  b64_json?: string
  size?: string
}

export interface BytePlusImageResponse {
  model: string
  created: number
  data: BytePlusImageData[]
  usage: {
    generated_images: number
    output_tokens: number
    total_tokens: number
  }
}

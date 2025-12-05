/**
 * 统一的生成功能事件追踪服务
 *
 * 包含以下事件:
 * - click_generate: 点击生成按钮
 * - generation_started: 后端开始生成 (API返回requestId时)
 * - generation_success: 生成成功
 * - generation_failed: 生成失败
 * - upload_image: 上传图片成功
 * - input_prompt: 用户输入提示词
 * - change_model: 切换模型
 * - change_duration: 修改时长
 * - change_ratio: 修改宽高比
 */

export type GenerationType =
  | 'text-to-video'
  | 'image-to-video'
  | 'video-effects'
  | 'text-to-image'
  | 'image-to-image'

export interface GenerationEventParams {
  // 功能类别
  generationType: GenerationType

  // 任务标识
  jobId?: string
  requestId?: string

  // 模型参数
  modelType?: string
  duration?: string
  resolution?: string
  aspectRatio?: string

  // 图片上传相关
  uploadMode?: 'local' | 'url'
  imageCount?: number

  // 提示词相关
  promptLength?: number
  hasPrompt?: boolean

  // 特效相关 (仅video-effects)
  effectId?: string
  effectName?: string

  // 积分相关
  creditsRequired?: number
  userCredits?: number

  // 错误相关
  errorType?: string
  errorMessage?: string

  // 参数修改相关
  oldValue?: string
  newValue?: string
}

export class GenerationAnalytics {
  /**
   * 检查 gtag 是否可用
   */
  private static isGtagAvailable(): boolean {
    return typeof window !== 'undefined' && typeof window.gtag === 'function'
  }

  /**
   * 1. 点击生成按钮
   */
  static trackClickGenerate(params: GenerationEventParams): void {
    if (!this.isGtagAvailable()) return

    window.gtag('event', 'click_generate', {
      generation_type: params.generationType,
      model_type: params.modelType,
      duration: params.duration,
      ratio: params.aspectRatio,
      resolution: params.resolution,
      has_prompt: params.hasPrompt,
      prompt_length: params.promptLength,
      upload_mode: params.uploadMode,
      effect_id: params.effectId,
      effect_name: params.effectName,
      credits_required: params.creditsRequired,
    })
  }

  /**
   * 2. 后端开始生成 (API返回requestId时触发)
   */
  static trackGenerationStarted(params: GenerationEventParams): void {
    if (!this.isGtagAvailable()) return

    window.gtag('event', 'generation_started', {
      generation_type: params.generationType,
      job_id: params.jobId,
      request_id: params.requestId,
      model_type: params.modelType,
      duration: params.duration,
      ratio: params.aspectRatio,
      resolution: params.resolution,
      credits_required: params.creditsRequired,
    })
  }

  /**
   * 3. 生成成功
   */
  static trackGenerationSuccess(params: GenerationEventParams): void {
    if (!this.isGtagAvailable()) return

    window.gtag('event', 'generation_success', {
      generation_type: params.generationType,
      job_id: params.jobId,
      request_id: params.requestId,
      model_type: params.modelType,
    })
  }

  /**
   * 4. 生成失败
   */
  static trackGenerationFailed(params: GenerationEventParams): void {
    if (!this.isGtagAvailable()) return

    window.gtag('event', 'generation_failed', {
      generation_type: params.generationType,
      job_id: params.jobId,
      request_id: params.requestId,
      error_type: params.errorType,
      error_message: params.errorMessage,
      model_type: params.modelType,
    })
  }

  /**
   * 5. 上传图片成功
   */
  static trackUploadImage(params: GenerationEventParams): void {
    if (!this.isGtagAvailable()) return

    window.gtag('event', 'upload_image', {
      generation_type: params.generationType,
      upload_mode: params.uploadMode,
      image_count: params.imageCount,
    })
  }

  /**
   * 6. 用户输入提示词
   *
   * 注意: 此方法应该配合防抖使用
   * 建议: 防抖延迟 2秒, 最小长度 > 5
   */
  static trackInputPrompt(params: GenerationEventParams): void {
    if (!this.isGtagAvailable()) return

    // 只追踪长度 > 5 的提示词
    if (params.promptLength && params.promptLength <= 5) {
      return
    }

    window.gtag('event', 'input_prompt', {
      generation_type: params.generationType,
      prompt_length: params.promptLength,
    })
  }

  /**
   * 7. 切换模型
   */
  static trackChangeModel(params: GenerationEventParams): void {
    if (!this.isGtagAvailable()) return

    window.gtag('event', 'change_model', {
      generation_type: params.generationType,
      old_value: params.oldValue,
      new_value: params.newValue,
    })
  }

  /**
   * 8. 修改时长
   */
  static trackChangeDuration(params: GenerationEventParams): void {
    if (!this.isGtagAvailable()) return

    window.gtag('event', 'change_duration', {
      generation_type: params.generationType,
      old_value: params.oldValue,
      new_value: params.newValue,
      model_type: params.modelType,
    })
  }

  /**
   * 9. 修改宽高比
   */
  static trackChangeRatio(params: GenerationEventParams): void {
    if (!this.isGtagAvailable()) return

    window.gtag('event', 'change_ratio', {
      generation_type: params.generationType,
      old_value: params.oldValue,
      new_value: params.newValue,
      model_type: params.modelType,
    })
  }
}

/**
 * 防抖工具函数
 * 用于 input_prompt 事件的防抖处理
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null

  return function (this: any, ...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      func.apply(this, args)
      timeoutId = null
    }, delay)
  }
}

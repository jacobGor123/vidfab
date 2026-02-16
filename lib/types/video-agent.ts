/**
 * Video Agent 统一类型定义
 * 集中管理所有 Video Agent 相关的 TypeScript 类型
 * 避免跨文件重复定义，确保类型一致性
 */

// ==================== 核心数据类型 ====================

/**
 * 镜头数据（分镜脚本）
 * 整合自 script-analyzer-google.ts、storyboard-generator.ts、video-generator.ts
 */
export interface Shot {
  shot_number: number
  time_range: string           // 时间范围，如 "00:00-00:05"
  description: string           // 场景描述
  character_action: string      // 角色动作描述
  characters: string[]          // 出现的角色列表
  duration_seconds: number      // 时长（秒）
  resolution?: string           // 可选：视频分辨率 ('480p' | '720p' | '1080p')
  seed?: number                 // 可选：生成视频时的随机种子
  video_prompt?: string         // 可选：视频生成提示词

  // Deprecated: no longer used for storyboard image prompts in the unified flow.
  // Keep optional for backward compatibility with existing DB records.
  camera_angle?: string
  mood?: string
}

/**
 * 人物角色配置
 */
export interface CharacterConfig {
  id?: string                    // 人物 ID（可选，用于记录实际使用的人物）
  name: string
  reference_images: string[]    // 参考图 URL 列表
}

/**
 * 视频片段
 * 整合自 video-composer.ts
 */
export interface VideoClip {
  shot_number: number
  video_url: string
  duration: number              // 时长（秒）
  local_path?: string           // 可选：本地临时文件路径
  duration_seconds?: number     // 兼容字段（与 duration 同义）
}

/**
 * 分镜图数据
 */
export interface Storyboard {
  id: string
  shot_number: number
  image_url: string
  status: 'generating' | 'success' | 'failed'
}

/**
 * 视频片段生成结果
 */
export interface VideoClipResult {
  shot_number: number
  task_id?: string              // Kling AI 任务 ID
  video_url?: string            // 生成的视频 URL
  lastFrameUrl?: string         // 末尾帧 URL（用于下一片段的首帧）
  status: 'pending' | 'generating' | 'completed' | 'failed'
  error?: string                // 错误信息
  retry_count?: number          // 重试次数
}

// ==================== 配置类型 ====================

/**
 * 转场效果配置
 */
export interface TransitionConfig {
  type: 'none' | 'fade' | 'crossfade' | 'slide' | 'zoom'
  duration: number              // 转场时长（秒），type='none' 时此字段无效
}

/**
 * 背景音乐配置
 */
export interface MusicConfig {
  url: string
  volume?: number               // 音量 0.0-1.0
  fadeIn?: number               // 淡入时长（秒）
  fadeOut?: number              // 淡出时长（秒）
}

/**
 * 图片风格配置
 */
export interface ImageStyle {
  name: string
  style_prompt: string
  negative_prompt: string[]
}

// ==================== 批处理选项 ====================

/**
 * 视频合成选项
 */
export interface VideoCompositionOptions {
  clips: VideoClip[]
  music?: MusicConfig
  transition?: TransitionConfig
  outputPath: string
  resolution?: '480p' | '720p' | '1080p'
  fps?: number
}

/**
 * 批量视频生成选项
 */
export interface BatchVideoGenerationOptions {
  userId: string
  watermark?: boolean
  resolution?: '480p' | '720p' | '1080p'
  model?: string
  maxRetries?: number
  aspectRatio?: '16:9' | '9:16'
}

// ==================== 分析结果类型 ====================

/**
 * 脚本分析结果
 */
export interface ScriptAnalysisResult {
  duration: number              // 总时长（秒）
  shot_count: number            // 分镜数量
  story_style: string           // 故事风格
  characters: string[]          // 角色列表
  shots: Shot[]                 // 分镜列表
  music_generation_prompt?: string  // Suno 音乐生成 prompt
}

/**
 * 分镜图生成结果
 */
export interface StoryboardResult {
  shot_number: number
  image_url?: string
  status: 'success' | 'failed'
  error?: string
  used_character_ids?: string[]  // 🔥 实际使用的人物 IDs
}

// ==================== 类型守卫 ====================

/**
 * 类型守卫：检查是否为有效的 Shot 对象
 */
export function isShot(obj: any): obj is Shot {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.shot_number === 'number' &&
    typeof obj.description === 'string' &&
    typeof obj.duration_seconds === 'number'
  )
}

/**
 * 类型守卫：检查是否为有效的 VideoClip 对象
 */
export function isVideoClip(obj: any): obj is VideoClip {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.shot_number === 'number' &&
    typeof obj.video_url === 'string' &&
    typeof obj.duration === 'number'
  )
}

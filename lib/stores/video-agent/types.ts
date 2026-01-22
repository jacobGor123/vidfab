/**
 * Video Agent - 类型定义
 * 所有共享的类型接口
 */

export interface Character {
  id: string
  name: string
  source: 'template' | 'upload' | 'ai_generate'
  template_id?: string
  generation_prompt?: string
  reference_images: Array<{
    url: string
    order: number
  }>
}

export interface Shot {
  shot_number: number
  time_range: string
  description: string
  camera_angle: string
  character_action?: string  // ✅ 改为可选，向后兼容老数据。新数据由 AI 直接融入 description
  mood: string
  duration_seconds: number
  characters: string[]
  seed?: number
  video_prompt?: string  // 视频生成提示词
}

export interface ScriptAnalysis {
  duration: number
  shot_count: number
  story_style: string
  characters: string[]
  shots: Shot[]
}

export interface Storyboard {
  id: string
  shot_number: number
  image_url?: string
  image_url_external?: string | null
  cdn_url?: string | null
  storage_status?: 'pending' | 'completed' | 'failed' | null
  status: 'generating' | 'success' | 'failed' | 'outdated'
  error_message?: string
  generation_attempts: number
  updated_at?: string  // 🔥 用于缓存清除
}

export interface VideoClip {
  id: string
  shot_number: number
  video_url?: string
  status: 'generating' | 'success' | 'failed' | 'outdated'
  error_message?: string
  retry_count: number
  duration?: number
}

export interface Music {
  source: 'template' | 'suno_ai' | 'preset'
  url?: string
  template_id?: string
  generation_prompt?: string
  volume?: number
  fadeIn?: number
  fadeOut?: number
}

export interface Transition {
  type: 'fade' | 'crossfade' | 'slide' | 'zoom'
  duration: number
}

export interface FinalVideo {
  url: string
  storage_path: string
  file_size: number
  resolution: string
  duration: number
}

export interface VideoAgentProject {
  id: string
  user_id: string
  status: 'draft' | 'processing' | 'completed' | 'failed'
  current_step: number

  // 步骤状态
  step_1_status?: 'pending' | 'processing' | 'completed' | 'failed'
  step_2_status?: 'pending' | 'processing' | 'completed' | 'failed'
  step_3_status?: 'pending' | 'processing' | 'completed' | 'failed'
  step_4_status?: 'pending' | 'processing' | 'completed' | 'failed'
  step_5_status?: 'pending' | 'processing' | 'completed' | 'failed'
  step_6_status?: 'pending' | 'processing' | 'completed' | 'failed'
  step_7_status?: 'pending' | 'processing' | 'completed' | 'failed'

  // 用户输入
  duration: number
  story_style: string
  original_script: string
  aspect_ratio?: '16:9' | '9:16'
  enable_narration?: boolean
  mute_bgm?: boolean

  // 步骤数据
  script_analysis?: ScriptAnalysis
  characters?: Character[]
  image_style_id?: string
  storyboards?: Storyboard[]
  video_clips?: VideoClip[]

  // 音乐和转场（扁平结构，匹配数据库 schema）
  music_source?: 'template' | 'suno_ai' | 'none' | 'preset'
  music_url?: string
  music_storage_path?: string
  music_generation_prompt?: string
  suno_task_id?: string
  transition_effect?: 'fade' | 'crossfade' | 'slide' | 'zoom'
  transition_duration?: number

  // 向后兼容的嵌套对象（已废弃，但保留以避免破坏现有代码）
  music?: Music
  transition?: Transition

  final_video?: FinalVideo

  // 配额
  regenerate_quota_remaining: number

  // 积分
  credits_used: number

  // 时间戳
  created_at: string
  updated_at: string
  completed_at?: string
}

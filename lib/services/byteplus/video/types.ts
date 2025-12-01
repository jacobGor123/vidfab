import { VideoStatusResponse } from '@/lib/types/video'

export type BytePlusVideoTaskStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled'

export interface BytePlusContentText {
  type: 'text'
  text: string
}

export interface BytePlusContentImageUrl {
  type: 'image_url'
  image_url: {
    url: string
    role?: 'first_frame' | 'last_frame'
  }
}

export type BytePlusContent = BytePlusContentText | BytePlusContentImageUrl

export interface BytePlusVideoRequest {
  model: string
  content: BytePlusContent[]
  callback_url?: string
  return_last_frame?: boolean
}

export interface BytePlusVideoResponse {
  id: string
  model: string
  status: BytePlusVideoTaskStatus
  content?: {
    video_url?: string
    last_frame_url?: string
  }
  error?: {
    code: string
    message: string
  }
  created_at: number
  updated_at: number
  seed?: number
  resolution?: string
  ratio?: string
  duration?: number
  frames?: number
  framespersecond?: number
  usage?: {
    completion_tokens: number
    total_tokens: number
  }
}

export interface SubmitVideoResponse {
  id: string
}

export interface BytePlusVideoStatusMapped extends VideoStatusResponse {
  data: Required<VideoStatusResponse['data']>
}

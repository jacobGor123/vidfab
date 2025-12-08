/**
 * Inngest Client Configuration for VidFab AI Video Platform
 * Serverless task queue and workflow orchestration
 */

import { Inngest } from 'inngest'

// Create Inngest client
export const inngest = new Inngest({
  id: 'vidfab',
  name: 'VidFab AI Video Platform',
  eventKey: process.env.INNGEST_EVENT_KEY!,
})

// Event type definitions for type safety
export type InngestEvents = {
  // Video processing events
  'video/download.requested': {
    data: {
      videoId: string
      url: string
      userId: string
    }
  }
  'video/thumbnail.requested': {
    data: {
      videoId: string
      videoUrl: string
    }
  }
  'video/cleanup.scheduled': {
    data: {
      videoId: string
    }
  }
  // User quota events
  'user/quota.update': {
    data: {
      userId: string
      operation: 'add' | 'subtract'
      amount: number
    }
  }
  // Blog generation events
  'blog/generate.requested': {
    data: {
      force?: boolean
      source: 'cron' | 'manual' // 🔒 Required: 必须明确指定触发源
      triggeredBy?: string // Optional: 手动触发时的用户邮箱
    }
  }
}

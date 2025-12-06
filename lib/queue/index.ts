/**
 * Video Processing Queue System
 * VidFab AI Video Platform - Main Export File
 *
 * 🔄 CLOUD NATIVE MIGRATION: Now using Inngest instead of BullMQ
 */

export * from './types'

// 🔄 MIGRATION: Export Inngest adapter instead of BullMQ
// Old: export * from './queue-manager'
export * from './inngest-adapter'

import type {
  DownloadVideoJobData,
  GenerateThumbnailJobData,
  CleanupTempJobData,
  UpdateQuotaJobData,
  JobConfig
} from './types'

// 🔄 MIGRATION: Functions are now exported from inngest-adapter.ts
// The functions below are re-exported for backward compatibility

export {
  addDownloadVideoJob,
  addGenerateThumbnailJob,
  addCleanupTempJob,
  addUpdateQuotaJob,
  checkQueueHealth,
  initializeQueueSystem,
  shutdownQueueSystem,
  queueManager,
} from './inngest-adapter'
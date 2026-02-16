/**
 * Feature Flags 配置
 *
 * 集中管理所有功能开关，便于：
 * - 快速启用/禁用功能
 * - A/B 测试
 * - 灰度发布
 * - 清理过时功能
 *
 * 使用方式：
 * import { features } from '@/lib/config/features'
 * if (features.storyToVideo.enabled) { ... }
 */

// ==================== Feature Flag 接口 ====================

export interface Feature {
  enabled: boolean
  description: string
  releaseDate?: string  // 功能发布日期
  deprecatedDate?: string  // 功能废弃日期
}

export interface FeatureFlags {
  // AI 视频功能
  storyToVideo: Feature
  textToVideo: Feature
  imageToVideo: Feature
  videoEffects: Feature

  // AI 图片功能
  textToImage: Feature
  imageToImage: Feature

  // 营销活动
  blackFridaySale: Feature
  specialPromotion: Feature

  // 实验性功能
  advancedSettings: Feature
  batchGeneration: Feature

  // 废弃功能（已关闭）
  deprecated: {
    videoAgent: Feature  // 已被 story-to-video 替代
  }
}

// ==================== Feature Flags 配置 ====================

export const features: FeatureFlags = {
  // ==================== AI Video 功能 ====================
  storyToVideo: {
    enabled: true,
    description: "Story to Video - 智能视频生成代理（原 Video Agent）",
    releaseDate: "2025-02-16"
  },

  textToVideo: {
    enabled: true,
    description: "Text to Video - 文本生成视频",
    releaseDate: "2024-09-01"
  },

  imageToVideo: {
    enabled: true,
    description: "Image to Video - 图片生成视频",
    releaseDate: "2024-09-01"
  },

  videoEffects: {
    enabled: true,
    description: "Video Effects - AI 视频特效",
    releaseDate: "2024-10-01"
  },

  // ==================== AI Image 功能 ====================
  textToImage: {
    enabled: true,
    description: "Text to Image - 文本生成图片",
    releaseDate: "2024-11-01"
  },

  imageToImage: {
    enabled: true,
    description: "Image to Image - 图片变换",
    releaseDate: "2024-11-01"
  },

  // ==================== 营销活动 ====================
  blackFridaySale: {
    enabled: false,
    description: "黑五促销活动",
    releaseDate: "2024-11-29",
    deprecatedDate: "2025-01-01"
  },

  specialPromotion: {
    enabled: false,
    description: "特殊促销活动（备用）"
  },

  // ==================== 实验性功能 ====================
  advancedSettings: {
    enabled: false,
    description: "高级设置面板"
  },

  batchGeneration: {
    enabled: false,
    description: "批量生成功能"
  },

  // ==================== 废弃功能 ====================
  deprecated: {
    videoAgent: {
      enabled: false,
      description: "原 Video Agent 入口（已迁移到 Story to Video）",
      deprecatedDate: "2025-02-16"
    }
  }
}

// ==================== 辅助函数 ====================

/**
 * 检查功能是否启用
 */
export function isFeatureEnabled(featurePath: string): boolean {
  const parts = featurePath.split('.')
  let current: any = features

  for (const part of parts) {
    current = current?.[part]
    if (current === undefined) return false
  }

  return current?.enabled === true
}

/**
 * 获取所有启用的功能列表
 */
export function getEnabledFeatures(): string[] {
  const enabled: string[] = []

  function traverse(obj: any, prefix: string = '') {
    for (const key in obj) {
      const value = obj[key]
      const path = prefix ? `${prefix}.${key}` : key

      if (value?.enabled === true) {
        enabled.push(path)
      } else if (typeof value === 'object' && value !== null && !value.enabled) {
        traverse(value, path)
      }
    }
  }

  traverse(features)
  return enabled
}

/**
 * 获取所有废弃的功能列表
 */
export function getDeprecatedFeatures(): string[] {
  const deprecated: string[] = []

  function traverse(obj: any, prefix: string = '') {
    for (const key in obj) {
      const value = obj[key]
      const path = prefix ? `${prefix}.${key}` : key

      if (value?.deprecatedDate) {
        deprecated.push(path)
      } else if (typeof value === 'object' && value !== null && !value.enabled) {
        traverse(value, path)
      }
    }
  }

  traverse(features)
  return deprecated
}

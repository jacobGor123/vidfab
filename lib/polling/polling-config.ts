/**
 * 统一轮询配置系统
 * 为所有类型的轮询任务提供统一、类型安全的配置
 */

export interface PollingConfig {
  // ===== 基础配置 =====
  /** 轮询间隔 (毫秒) */
  interval: number
  /** 最大轮询时长 (毫秒) */
  maxDuration: number
  /** 最大连续错误次数 */
  maxConsecutiveErrors: number

  // ===== 并发控制 =====
  /** 最大并发轮询数 */
  maxConcurrentPolls: number

  // ===== 存储配置 =====
  /** 存储重试次数 */
  storageRetries: number
  /** 存储重试延迟 (毫秒) */
  storageRetryDelay: number
  /** 存储策略: immediate=立即保存, delayed=延迟保存 */
  storageStrategy: 'immediate' | 'delayed'
  /** 延迟存储时间 (毫秒), 仅当 storageStrategy='delayed' 时有效 */
  storageDelay?: number

  // ===== 健康检查 =====
  /** 健康检查间隔 (毫秒) */
  healthCheckInterval: number
  /** 任务最大年龄 (毫秒), 超过此时间的任务将被强制清理 */
  maxTaskAge: number
  /** generating状态最大等待时间 (毫秒) */
  maxGeneratingDuration: number

  // ===== 智能调度 (可选) =====
  /** 是否启用自适应间隔 */
  adaptiveInterval?: boolean
  /** 间隔策略: fixed=固定, exponential=指数退避, adaptive=自适应 */
  intervalStrategy?: 'fixed' | 'exponential' | 'adaptive'

  // ===== API配置 =====
  /** 状态查询API路径模板, 如: /api/video/status */
  statusApiPath: string
  /** 存储API路径 */
  storeApiPath: string

  // ===== 超时控制 =====
  /** 单次请求超时 (毫秒) */
  requestTimeout: number
}

/**
 * 预设配置 - 视频生成
 */
export const VIDEO_POLLING_CONFIG: PollingConfig = {
  // 基础配置
  interval: 3000,                    // 3秒轮询一次
  maxDuration: 30 * 60 * 1000,      // 最多轮询30分钟
  maxConsecutiveErrors: 5,           // 最多5次连续错误

  // 并发控制
  maxConcurrentPolls: 3,             // 最多3个并发请求

  // 存储配置
  storageRetries: 3,                 // 最多重试3次
  storageRetryDelay: 2000,           // 2秒后重试
  storageStrategy: 'immediate',      // 立即保存

  // 健康检查
  healthCheckInterval: 30000,        // 30秒检查一次
  maxTaskAge: 60 * 60 * 1000,       // 1小时后强制清理
  maxGeneratingDuration: 5 * 60 * 1000,  // generating状态最多等待5分钟

  // 智能调度
  adaptiveInterval: false,           // 暂不启用自适应
  intervalStrategy: 'fixed',         // 固定间隔

  // API配置
  statusApiPath: '/api/video/status',
  storeApiPath: '/api/video/store',

  // 超时控制
  requestTimeout: 30000              // 30秒请求超时
}

/**
 * 预设配置 - 图片生成
 */
export const IMAGE_POLLING_CONFIG: PollingConfig = {
  // 基础配置
  interval: 2000,                    // 2秒轮询一次 (图片生成更快)
  maxDuration: 5 * 60 * 1000,       // 最多轮询5分钟
  maxConsecutiveErrors: 3,           // 最多3次连续错误

  // 并发控制 🔥 新增
  maxConcurrentPolls: 3,             // 最多3个并发请求

  // 存储配置
  storageRetries: 3,                 // 最多重试3次
  storageRetryDelay: 2000,           // 2秒后重试
  storageStrategy: 'delayed',        // 延迟保存
  storageDelay: 100,                 // 延迟100ms

  // 健康检查 🔥 新增
  healthCheckInterval: 30000,        // 30秒检查一次
  maxTaskAge: 10 * 60 * 1000,       // 10分钟后强制清理
  maxGeneratingDuration: 2 * 60 * 1000,  // generating状态最多等待2分钟

  // 智能调度
  adaptiveInterval: false,           // 暂不启用自适应
  intervalStrategy: 'fixed',         // 固定间隔

  // API配置
  statusApiPath: '/api/image/status',
  storeApiPath: '/api/image/store',

  // 超时控制
  requestTimeout: 30000              // 30秒请求超时
}

/**
 * 所有预设配置的集合
 */
export const POLLING_PRESETS = {
  video: VIDEO_POLLING_CONFIG,
  image: IMAGE_POLLING_CONFIG
} as const

/**
 * 配置验证函数
 */
export function validatePollingConfig(config: PollingConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // 验证基础配置
  if (config.interval < 100) {
    errors.push('interval 不能小于 100ms')
  }
  if (config.interval > 60000) {
    errors.push('interval 不能大于 60秒')
  }
  if (config.maxDuration < config.interval) {
    errors.push('maxDuration 必须大于 interval')
  }
  if (config.maxConsecutiveErrors < 1) {
    errors.push('maxConsecutiveErrors 至少为 1')
  }

  // 验证并发控制
  if (config.maxConcurrentPolls < 1) {
    errors.push('maxConcurrentPolls 至少为 1')
  }
  if (config.maxConcurrentPolls > 10) {
    errors.push('maxConcurrentPolls 不建议超过 10')
  }

  // 验证存储配置
  if (config.storageRetries < 0) {
    errors.push('storageRetries 不能为负数')
  }
  if (config.storageStrategy === 'delayed' && !config.storageDelay) {
    errors.push('storageStrategy 为 delayed 时必须提供 storageDelay')
  }

  // 验证健康检查
  if (config.healthCheckInterval < 1000) {
    errors.push('healthCheckInterval 不能小于 1秒')
  }
  if (config.maxTaskAge < config.maxDuration) {
    errors.push('maxTaskAge 应该大于或等于 maxDuration')
  }

  // 验证API配置
  if (!config.statusApiPath) {
    errors.push('statusApiPath 不能为空')
  }
  if (!config.storeApiPath) {
    errors.push('storeApiPath 不能为空')
  }

  // 验证超时控制
  if (config.requestTimeout < 1000) {
    errors.push('requestTimeout 不能小于 1秒')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * 创建自定义配置 (基于预设配置修改)
 */
export function createPollingConfig(
  baseConfig: PollingConfig,
  overrides: Partial<PollingConfig>
): PollingConfig {
  const config = { ...baseConfig, ...overrides }

  const validation = validatePollingConfig(config)
  if (!validation.valid) {
    console.warn('⚠️ 轮询配置验证失败:', validation.errors)
  }

  return config
}

/**
 * 获取推荐配置 (根据任务类型)
 */
export function getRecommendedConfig(taskType: 'video' | 'image'): PollingConfig {
  return POLLING_PRESETS[taskType]
}

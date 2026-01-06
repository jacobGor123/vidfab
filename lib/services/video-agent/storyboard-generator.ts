/**
 * Video Agent - 分镜图生成服务
 * 使用 Seedream 4.5 批量生成分镜图 (支持角色一致性)
 *
 * 🔥 v4.0 更新：
 * - 重构为模块化架构，拆分为多个职责单一的文件
 * - 每个文件不超过 300 行，提高可维护性
 */

// 导出风格定义
export { IMAGE_STYLES } from './processors/storyboard/storyboard-styles'

// 导出 Prompt 构建工具
export {
  buildStoryboardPrompt,
  buildNegativePrompt
} from './processors/storyboard/storyboard-prompt-builder'

// 导出核心生成功能
export {
  generateSingleStoryboard,
  regenerateStoryboard
} from './processors/storyboard/storyboard-core'

// 导出批量生成功能
export {
  batchGenerateStoryboards,
  batchGenerateStoryboardsWithProgress,
  type ProgressCallback,
  type BatchGenerationResult
} from './processors/storyboard/storyboard-batch-generator'

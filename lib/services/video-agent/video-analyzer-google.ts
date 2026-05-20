/**
 * Video Agent - 视频分析服务（使用 Google Generative AI 官方 SDK）
 * 使用 Gemini 2.0 Flash 分析 YouTube 或本地视频，生成脚本和分镜
 *
 * 🔥 v4.0 更新：
 * - 重构为模块化架构，拆分为多个职责单一的文件
 * - 每个文件不超过 300 行，提高可维护性
 *
 * 核心功能：
 * - 从 YouTube URL 直接分析视频（Google 官方支持）
 * - 从本地上传的视频 URL 分析
 * - 生成与文本脚本分析相同格式的结果
 */

// 导出核心分析功能
export { analyzeVideoToScript } from './processors/video/video-analyzer-core'

// 导出 Prompt 构建工具
export { buildVideoAnalysisPrompt } from './processors/video/video-prompt-builder'

// 导出 YouTube 工具函数
export {
  isValidYouTubeUrl,
  isValidTikTokUrl,
  extractYouTubeVideoId,
  normalizeYouTubeUrl,
  convertToStandardYouTubeUrl,
  type VideoSource
} from './processors/video/youtube-utils'

// 导出 YouTube 时长获取函数
export { getYouTubeDuration } from './processors/video/youtube-duration'

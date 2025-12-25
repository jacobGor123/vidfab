/**
 * Video Agent - 脚本分析服务（使用 Google Generative AI 官方 SDK）
 * 使用 Gemini 2.0 Flash 分析用户脚本并生成结构化分镜数据
 *
 * 🔥 v4.0 更新：
 * - 重构为模块化架构，拆分为多个职责单一的文件
 * - 每个文件不超过 300 行，提高可维护性
 */

// 导出核心分析功能
export { analyzeScript } from './processors/script/analyzer-core'

// 导出音乐 prompt 生成
export { generateMusicPrompt } from './processors/script/music-prompt-generator'

// 导出结果验证
export { validateAnalysisResult } from './processors/script/result-validator'

// 导出 Prompt 构建工具
export { buildScriptAnalysisPrompt, getStyleGuide } from './processors/script/prompt-builder'

// 导出常量
export { MODEL_NAME, UNIFIED_SEGMENT_DURATION, SHOT_COUNT_MAP, STYLE_GUIDES, sleep } from './processors/script/constants'

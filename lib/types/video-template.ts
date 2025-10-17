/**
 * Video Template Types
 * 视频模板数据的类型定义
 */

// 视频模板数据接口
export interface VideoTemplate {
  id: string              // 唯一标识符
  prompt: string          // 视频生成提示词
  imageUrl: string        // 预览图片URL
  videoUrl: string        // 视频文件URL
  duration: number        // 视频时长（秒）
  resolution: string      // 视频分辨率
  aspectRatio: string     // 视频宽高比
  createdAt: string       // 创建时间
}

// 原始数据解析接口
export interface RawVideoData {
  prompt: string
  uselessTag: string      // 需要移除的无用标签
  imageUrl: string
  videoUrl: string
}

// 解析配置
export interface ParseConfig {
  defaultDuration: number
  defaultResolution: string
  defaultAspectRatio: string
}

// 默认配置
export const DEFAULT_PARSE_CONFIG: ParseConfig = {
  defaultDuration: 10,
  defaultResolution: "1024x576",
  defaultAspectRatio: "16:9"
}

// 工具函数：生成唯一ID
export function generateTemplateId(): string {
  return `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// 工具函数：解析原始数据行
export function parseRawDataLine(line: string): RawVideoData | null {
  const parts = line.split('\t').map(part => part.trim())

  if (parts.length !== 4) {
    console.warn(`Invalid line format: ${line}`)
    return null
  }

  const [prompt, uselessTag, imageUrl, videoUrl] = parts

  if (!prompt || !imageUrl || !videoUrl) {
    console.warn(`Missing required fields in line: ${line}`)
    return null
  }

  return {
    prompt,
    uselessTag,
    imageUrl,
    videoUrl
  }
}

// 工具函数：转换为视频模板
export function convertToVideoTemplate(
  rawData: RawVideoData,
  config: ParseConfig = DEFAULT_PARSE_CONFIG
): VideoTemplate {
  return {
    id: generateTemplateId(),
    prompt: rawData.prompt,
    imageUrl: rawData.imageUrl,
    videoUrl: rawData.videoUrl,
    duration: config.defaultDuration,
    resolution: config.defaultResolution,
    aspectRatio: config.defaultAspectRatio,
    createdAt: new Date().toISOString()
  }
}

// 工具函数：批量解析原始数据
export function parseRawVideoData(
  rawDataText: string,
  config: ParseConfig = DEFAULT_PARSE_CONFIG
): VideoTemplate[] {
  const lines = rawDataText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)

  const templates: VideoTemplate[] = []

  for (const line of lines) {
    const rawData = parseRawDataLine(line)
    if (rawData) {
      const template = convertToVideoTemplate(rawData, config)
      templates.push(template)
    }
  }

  return templates
}
/**
 * Parse Video Data Script
 * 解析原始视频数据的脚本
 */

import { parseRawVideoData, VideoTemplate } from '../lib/types/video-template'

// 示例原始数据（用户需要提供完整的75条数据）
const rawDataText = `animate the image	文生图	https://static.vidfab.ai/user-image/vidfab-2910ad47-9d15-4ab4-8a59-aea9cf2500d8.png	https://static.vidfab.ai/user-video/vidfab-2910ad47-9d15-4ab4-8a59-aea9cf2500d8.mp4
一位金髮女子站在微暗水中，周圍漂浮著多朵紅玫瑰，她緩慢地將手深入水中，拾起一朵漂浮的紅玫瑰，水波隨著手的動作溫柔晃動。背景為柔和的光線，映照出鮮豔玫瑰的色彩。鏡頭從正面微下方角度拍攝，聚焦於動作和水波細節。	文生图	https://static.vidfab.ai/user-image/vidfab-cc5fedd1-507a-4415-bef7-7bfe1d3e8c49.png	https://static.vidfab.ai/user-video/vidfab-cc5fedd1-507a-4415-bef7-7bfe1d3e8c49.mp4
A young boy with blond hair and a yellow scarf, wearing a blue robe, is holding a vividly colored rose in his hand. He naturally floats up and down in the air, his scarf gently waving as if blown by the wind. Rose petals detach from the rose and softly float around him. The environment features a mystical, space-like background with colorful ribbons of light gracefully floating around, and stars in the background gently twinkling. The camera is fixed in place, capturing the entire scene from a medium distance.	文生图	https://static.vidfab.ai/user-image/vidfab-18f88fc8-b716-4766-9d99-19cadea0a78c.png	https://static.vidfab.ai/user-video/vidfab-18f88fc8-b716-4766-9d99-19cadea0a78c.mp4`

// 用于处理用户提供的完整数据的函数
export function parseUserData(userRawData: string): VideoTemplate[] {
  return parseRawVideoData(userRawData)
}

// 解析数据
function parseAndGenerateTemplates(): VideoTemplate[] {
  console.log('开始解析原始视频数据...')

  const templates = parseRawVideoData(rawDataText)

  console.log(`成功解析 ${templates.length} 条视频模板数据`)

  return templates
}

// 生成JSON输出
function generateJSON(): void {
  const templates = parseAndGenerateTemplates()

  const jsonOutput = JSON.stringify(templates, null, 2)

  console.log('\n生成的JSON数据：')
  console.log(jsonOutput)

  // 输出统计信息
  console.log('\n\n数据统计：')
  console.log(`- 总条目数: ${templates.length}`)
  console.log(`- 英文提示词: ${templates.filter(t => /^[a-zA-Z]/.test(t.prompt)).length}`)
  console.log(`- 中文提示词: ${templates.filter(t => /^[\u4e00-\u9fff]/.test(t.prompt)).length}`)
  console.log(`- 默认时长: ${templates[0]?.duration}秒`)
  console.log(`- 默认分辨率: ${templates[0]?.resolution}`)
  console.log(`- 默认宽高比: ${templates[0]?.aspectRatio}`)
}

// 执行解析
if (require.main === module) {
  generateJSON()
}

export { parseAndGenerateTemplates, generateJSON }
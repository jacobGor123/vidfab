/**
 * Video Agent - 字幕生成服务
 * 生成 SRT 格式字幕文件
 */

export interface SubtitleSegment {
  shot_number: number
  text: string
  start_time: number  // 秒
  end_time: number    // 秒
}

/**
 * 将秒数转换为 SRT 时间格式 (HH:MM:SS,mmm)
 * @param seconds 秒数
 * @returns SRT 格式时间字符串
 */
function formatSRTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 1000)

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`
}

/**
 * 生成 SRT 字幕内容
 * @param segments 字幕片段列表
 * @returns SRT 格式字幕内容
 */
export function generateSRTContent(segments: SubtitleSegment[]): string {
  let srtContent = ''

  segments.forEach((segment, index) => {
    const sequenceNumber = index + 1
    const startTime = formatSRTTime(segment.start_time)
    const endTime = formatSRTTime(segment.end_time)

    srtContent += `${sequenceNumber}\n`
    srtContent += `${startTime} --> ${endTime}\n`
    srtContent += `${segment.text}\n\n`
  })

  return srtContent.trim()
}

/**
 * 从分镜列表生成字幕片段
 * @param shots 分镜列表
 * @param useCharacterAction 是否使用角色动作作为字幕（默认 true）
 * @returns 字幕片段列表
 */
export function generateSubtitleSegmentsFromShots(
  shots: Array<{
    shot_number: number
    description?: string
    character_action?: string
    duration_seconds: number
  }>,
  useCharacterAction: boolean = true
): SubtitleSegment[] {
  let currentTime = 0
  const segments: SubtitleSegment[] = []

  for (const shot of shots) {
    const text = useCharacterAction
      ? (shot.character_action || shot.description || '')
      : (shot.description || shot.character_action || '')

    if (text) {
      segments.push({
        shot_number: shot.shot_number,
        text,
        start_time: currentTime,
        end_time: currentTime + shot.duration_seconds
      })
    }

    currentTime += shot.duration_seconds
  }

  return segments
}

/**
 * 🔥 完整的字幕生成流程（从分镜到 SRT 内容）
 * @param shots 分镜列表
 * @param options 配置选项
 * @returns SRT 格式字幕内容
 */
export function generateSRTFromShots(
  shots: Array<{
    shot_number: number
    description?: string
    character_action?: string
    duration_seconds: number
  }>,
  options: {
    useCharacterAction?: boolean
  } = {}
): string {
  const segments = generateSubtitleSegmentsFromShots(
    shots,
    options.useCharacterAction ?? true
  )

  return generateSRTContent(segments)
}

/**
 * 验证 SRT 内容格式
 * @param srtContent SRT 内容
 * @returns 是否有效
 */
export function validateSRTContent(srtContent: string): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!srtContent || srtContent.trim() === '') {
    errors.push('SRT content is empty')
    return { valid: false, errors }
  }

  // 简单验证：检查是否包含时间戳格式
  const timeRegex = /\d{2}:\d{2}:\d{2},\d{3}\s+-->\s+\d{2}:\d{2}:\d{2},\d{3}/
  if (!timeRegex.test(srtContent)) {
    errors.push('SRT content does not contain valid timestamps')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

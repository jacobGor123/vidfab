/**
 * SRT 字幕解析器
 * 解析 SRT 格式字幕文件
 */

export interface SubtitleEntry {
  index: number
  startTime: number // 秒
  endTime: number   // 秒
  text: string
}

/**
 * 解析 SRT 时间码为秒数
 * 格式: 00:00:01,000 --> 00:00:05,000
 */
function parseTimeToSeconds(timeString: string): number {
  const [time, ms] = timeString.split(',')
  const [hours, minutes, seconds] = time.split(':').map(Number)
  return hours * 3600 + minutes * 60 + seconds + Number(ms) / 1000
}

/**
 * 从 URL 获取 SRT 内容
 */
async function fetchSRT(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch SRT file: ${response.statusText}`)
  }
  return await response.text()
}

/**
 * 解析 SRT 文件内容
 */
export function parseSRT(srtContent: string): SubtitleEntry[] {
  const entries: SubtitleEntry[] = []
  const blocks = srtContent.trim().split(/\n\s*\n/) // 用空行分隔

  for (const block of blocks) {
    const lines = block.trim().split('\n')
    if (lines.length < 3) continue

    const index = parseInt(lines[0], 10)
    const timeLine = lines[1]
    const [startStr, endStr] = timeLine.split(' --> ')
    const text = lines.slice(2).join('\n').trim()

    if (!startStr || !endStr || !text) continue

    entries.push({
      index,
      startTime: parseTimeToSeconds(startStr.trim()),
      endTime: parseTimeToSeconds(endStr.trim()),
      text
    })
  }

  return entries
}

/**
 * 从 URL 解析 SRT 字幕
 */
export async function parseSRTFromURL(url: string): Promise<SubtitleEntry[]> {
  console.log('[SRTParser] 📥 获取 SRT 文件:', url)
  const srtContent = await fetchSRT(url)

  console.log('[SRTParser] 🔄 解析 SRT 内容')
  const subtitles = parseSRT(srtContent)

  console.log('[SRTParser] ✅ 解析完成，共', subtitles.length, '条字幕')
  return subtitles
}

/**
 * TOC (Table of Contents) 相关工具函数
 */

export interface TocHeading {
  id: string
  text: string
  level: number
}

/**
 * 从 HTML 内容中提取 h2 标题
 * 用于生成文章目录
 */
export function extractHeadings(htmlContent: string): TocHeading[] {
  const headings: TocHeading[] = []

  // 匹配 <h2 id="xxx">标题内容</h2>
  const h2Regex = /<h2\s+id="([^"]+)"[^>]*>(.*?)<\/h2>/gi

  let match
  while ((match = h2Regex.exec(htmlContent)) !== null) {
    const id = match[1]
    const rawText = match[2]

    // 移除 HTML 标签，提取纯文本
    const text = rawText.replace(/<[^>]+>/g, '').trim()

    if (id && text) {
      headings.push({
        id,
        text,
        level: 2,
      })
    }
  }

  return headings
}

/**
 * 为 HTML 内容中的 h2 标题添加 ID（如果没有）
 * 基于标题文本生成 slug 格式的 ID
 */
export function addHeadingIds(htmlContent: string): string {
  let result = htmlContent

  // 匹配没有 id 的 h2 标签: <h2>xxx</h2> 或 <h2 class="xxx">xxx</h2>
  const h2WithoutIdRegex = /<h2(?:\s+(?!id=)[^>]*)?>(.+?)<\/h2>/gi

  result = result.replace(h2WithoutIdRegex, (match, content) => {
    // 提取纯文本（移除 HTML 标签）
    const text = content.replace(/<[^>]+>/g, '').trim()

    // 生成 slug ID
    const id = generateSlugId(text)

    // 保留原有的属性（如 class）
    const openTagMatch = match.match(/<h2(\s+[^>]*?)?>/)
    const existingAttrs = openTagMatch?.[1] || ''

    return `<h2${existingAttrs} id="${id}">${content}</h2>`
  })

  return result
}

/**
 * 从文本生成 slug ID
 * 例如: "What is AI?" => "what-is-ai"
 */
function generateSlugId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // 移除特殊字符
    .replace(/\s+/g, '-')      // 空格转为连字符
    .replace(/-+/g, '-')       // 多个连字符合并
    .replace(/^-|-$/g, '')     // 移除首尾连字符
}

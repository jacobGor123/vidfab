/**
 * Script Analyzer - 常量定义
 */

// Gemini model name (keep centralized to avoid drifting across call sites)
export const MODEL_NAME = 'gemini-3-flash-preview'

// 🔥 统一分镜时长（秒）
export const UNIFIED_SEGMENT_DURATION = 5

/**
 * 基于时长计算分镜数量的映射表
 */
export const SHOT_COUNT_MAP: Record<number, number> = {
  15: 3,   // 15s = 3 个分镜（3 × 5s）
  30: 6,   // 30s = 6 个分镜（6 × 5s）
  45: 9,   // 45s = 9 个分镜（9 × 5s）
  60: 12   // 60s = 12 个分镜（12 × 5s）
}

/**
 * 延迟函数
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 剧情风格指南
 */
export const STYLE_GUIDES: Record<string, string> = {
  auto: '- 根据脚本内容自然延伸，保持原有风格\n- 不刻意强化特定类型，让故事自然发展',
  comedy: '- 增加幽默元素和笑点\n- 可适当夸张表现和喜剧冲突\n- 注重节奏感和反差效果',
  mystery: '- 加入不寻常元素和反常规设定\n- 营造好奇心和探索欲\n- 设置谜题或未解之谜',
  moral: '- 强化道德寓意和社会意义\n- 展现价值观和人生哲理\n- 可包含适度的批判或反思',
  twist: '- 设置悬念和伏笔\n- 安排情节反转或意外结局\n- 前后呼应，制造惊喜',
  suspense: '- 营造紧张氛围和悬念感\n- 设置谜团或未知威胁\n- 逐步揭示真相，保持观众好奇',
  warmth: '- 强化情感连接和人物关系\n- 营造温馨、治愈的氛围\n- 展现人性美好的一面',
  inspiration: '- 突出挑战和成长过程\n- 展现积极向上的价值观\n- 激励和鼓舞观众'
}

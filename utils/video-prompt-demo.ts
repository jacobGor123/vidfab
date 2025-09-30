/**
 * 视频提示词分类系统演示和测试数据
 */

import { VideoPrompt, VideoPromptCategory, CategoryStats } from '@/types/video-prompts'
import { promptClassifier } from './video-prompt-classifier'

// 基于用户提供的示例和常见AI视频生成用途的模拟数据
export const DEMO_PROMPTS: string[] = [
  // 用户提供的示例
  "animate the image",
  "一位金髮女子站在微暗水中，周圍漂浮著多朵紅玫瑰",
  "A young boy with blond hair and a yellow scarf, wearing a blue robe",
  "Mermaid sheds tears, tears turn into pearls",
  "金吉拉猫低头，看着锅里的土豆丝",
  "Butterflies flying",

  // Portrait 类别示例
  "Beautiful woman with long flowing hair",
  "Old man with wrinkled face telling stories",
  "Child laughing in the garden",
  "Portrait of a mysterious woman in shadows",
  "男子微笑着看向镜头",
  "年轻女孩戴着花环",
  "商务人士的专业肖像",
  "艺术家的创意人物肖像",

  // Nature 类别示例
  "Eagle soaring through mountain peaks",
  "Cherry blossoms falling in spring breeze",
  "Ocean waves crashing on rocky shore",
  "Forest animals gathering around a stream",
  "小鸟在枝头歌唱",
  "花朵在风中摇摆",
  "野生动物在草原上奔跑",
  "阳光穿过茂密的森林",

  // Fantasy 类别示例
  "Dragon breathing fire in ancient castle",
  "Fairy dancing among glowing mushrooms",
  "Wizard casting magical spells",
  "Unicorn running through enchanted forest",
  "魔法师施展咒语",
  "仙女在月光下飞舞",
  "神话生物在古老的神殿",
  "水晶球中的魔法世界",

  // Lifestyle 类别示例
  "Chef preparing delicious pasta",
  "Family enjoying dinner together",
  "Coffee brewing in modern kitchen",
  "Cozy reading corner with warm lighting",
  "妈妈在厨房做饭",
  "朋友们一起品茶聊天",
  "温馨的家庭聚餐时光",
  "舒适的卧室布置",

  // Animation 类别示例
  "Smooth transition between scenes",
  "Object morphing into different shapes",
  "Particles flowing in abstract patterns",
  "Text appearing with elegant animation",
  "图形元素的流畅变换",
  "色彩渐变的动态效果",
  "几何形状的变形动画",
  "光影效果的动态展示",

  // Abstract 类别示例
  "Colorful geometric patterns moving",
  "Abstract liquid shapes flowing",
  "Minimalist design with bold colors",
  "Surreal artistic composition",
  "抽象的色彩组合",
  "现代艺术风格的视觉",
  "超现实主义的创意表达",
  "概念性的艺术作品",

  // Cinematic 类别示例
  "Epic battle scene with dramatic lighting",
  "Mysterious figure walking in foggy street",
  "Dramatic close-up with cinematic mood",
  "Sweeping camera movement across landscape",
  "电影级别的戏剧场景",
  "充满张力的叙事镜头",
  "史诗般的视觉故事",
  "专业电影摄影风格",

  // 混合类别示例
  "Cinematic portrait of elegant woman",
  "Magical butterfly transformation",
  "Animated cooking tutorial",
  "Fantasy creature in natural habitat",
  "Abstract portrait with artistic effects",
  "Lifestyle scene with magical elements"
]

/**
 * 批量分类演示提示词
 */
export function classifyDemoPrompts(): VideoPrompt[] {
  return DEMO_PROMPTS.map((content, index) => {
    const result = promptClassifier.classify(content)

    return {
      id: `demo-${index + 1}`,
      content,
      category: result.category,
      autoAssigned: true,
      confidence: result.confidence,
      tags: result.matchedKeywords,
      createdAt: new Date(),
      language: /[\u4e00-\u9fff]/.test(content) ? 'zh' : 'en'
    }
  })
}

/**
 * 计算分类统计数据
 */
export function calculateCategoryStats(prompts: VideoPrompt[]): CategoryStats[] {
  const categoryCounts = new Map<VideoPromptCategory, number>()

  // 初始化计数
  Object.values(VideoPromptCategory).forEach(category => {
    categoryCounts.set(category, 0)
  })

  // 统计每个分类的数量
  prompts.forEach(prompt => {
    const currentCount = categoryCounts.get(prompt.category) || 0
    categoryCounts.set(prompt.category, currentCount + 1)
  })

  // 添加 ALL 分类的总数
  categoryCounts.set(VideoPromptCategory.ALL, prompts.length)

  // 计算百分比并返回结果
  const total = prompts.length
  return Array.from(categoryCounts.entries()).map(([category, count]) => ({
    category,
    count,
    percentage: total > 0 ? (count / total) * 100 : 0
  }))
}

/**
 * 生成分类分布报告
 */
export function generateCategoryReport(): {
  prompts: VideoPrompt[]
  stats: CategoryStats[]
  summary: {
    totalPrompts: number
    mostPopularCategory: string
    averageConfidence: number
    languageDistribution: {
      english: number
      chinese: number
      mixed: number
    }
  }
} {
  const classifiedPrompts = classifyDemoPrompts()
  const stats = calculateCategoryStats(classifiedPrompts)

  // 找到最受欢迎的分类（除了ALL）
  const nonAllStats = stats.filter(stat => stat.category !== VideoPromptCategory.ALL)
  const mostPopular = nonAllStats.reduce((prev, current) =>
    (current.count > prev.count) ? current : prev
  )

  // 计算平均置信度
  const averageConfidence = classifiedPrompts.reduce((sum, prompt) =>
    sum + prompt.confidence, 0
  ) / classifiedPrompts.length

  // 语言分布统计
  const languageDistribution = classifiedPrompts.reduce((acc, prompt) => {
    acc[prompt.language]++
    return acc
  }, { english: 0, chinese: 0, mixed: 0 } as { english: number; chinese: number; mixed: number })

  return {
    prompts: classifiedPrompts,
    stats,
    summary: {
      totalPrompts: classifiedPrompts.length,
      mostPopularCategory: promptClassifier.getCategory(mostPopular.category)?.name || 'Unknown',
      averageConfidence: Math.round(averageConfidence * 100) / 100,
      languageDistribution
    }
  }
}

/**
 * 导出用于UI组件的分类计数
 */
export function getCategoryCounts(prompts: VideoPrompt[]): Record<VideoPromptCategory, number> {
  const stats = calculateCategoryStats(prompts)
  const counts: Record<VideoPromptCategory, number> = {} as Record<VideoPromptCategory, number>

  stats.forEach(stat => {
    counts[stat.category] = stat.count
  })

  return counts
}
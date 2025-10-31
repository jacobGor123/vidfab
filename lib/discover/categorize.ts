/**
 * Discover 视频自动分类逻辑
 * 基于 prompt 关键词匹配
 */

import { DiscoverCategory } from '@/types/discover'

// 分类关键词映射
const categoryKeywords: Record<string, string[]> = {
  portrait: [
    'woman', 'girl', 'boy', 'man', 'person', 'face', 'eyes', 'hair',
    'smile', 'portrait', '女子', '美女', '男子', '人物', '脸', '肖像'
  ],
  nature: [
    'butterfly', 'flowers', 'tree', 'water', 'ocean', 'mountain', 'sky',
    'sunlight', 'panda', 'cat', 'dog', 'bird', 'animal', 'forest',
    '猫', '狗', '鸟', '森林', '花', '树', '海洋'
  ],
  fantasy: [
    'fairy', 'mermaid', 'dragon', 'magic', 'mystical', 'werewolf',
    'space', 'astronaut', 'floating', 'glowing', 'wizard',
    '美人鱼', '魔法', '龙', '巫师', '神秘'
  ],
  lifestyle: [
    'kitchen', 'home', 'office', 'laundry', 'cooking', 'coffee',
    'beer', 'sofa', 'food', 'family', 'indoor',
    '锅', '土豆丝', '烹饪', '家庭', '咖啡', '食物'
  ],
  abstract: [
    'animate', 'move', 'particles', 'transform', 'gears', 'abstract',
    'minimal', 'texture', 'pattern', 'colors', 'geometric',
    '抽象', '图案', '颜色', '几何'
  ],
  cinematic: [
    'camera', 'zoom', 'tracking', 'cinematic', 'film', 'professional',
    'lighting', 'composition', 'dramatic', 'epic', 'mood',
    '电影', '镜头', '戏剧性', '史诗'
  ],
  technology: [
    'cyberpunk', 'futuristic', 'sci-fi', 'robot', 'AI', 'digital',
    'gaming', 'tech', 'neon', 'hologram',
    '科技', '数字', '未来', '机器人'
  ],
  vehicles: [
    'car', 'motorcycle', 'spaceship', 'satellite', 'bicycle', 'train',
    'vehicle', 'driving', 'racing',
    '汽车', '摩托车', '飞船', '车辆'
  ]
}

/**
 * 基于 prompt 自动分类
 * @param prompt 视频描述文本
 * @returns 分类结果
 */
export function categorizePrompt(prompt: string): DiscoverCategory {
  const lowerPrompt = prompt.toLowerCase()
  const scores: Record<string, number> = {}

  // 计算每个分类的匹配分数
  Object.entries(categoryKeywords).forEach(([category, keywords]) => {
    scores[category] = keywords.filter(keyword =>
      lowerPrompt.includes(keyword.toLowerCase())
    ).length
  })

  // 找到得分最高的分类
  const entries = Object.entries(scores)
  if (entries.length === 0) {
    return DiscoverCategory.ABSTRACT
  }

  const bestCategory = entries.reduce((a, b) =>
    scores[a[0]] > scores[b[0]] ? a : b
  )[0]

  // 如果没有匹配任何关键词，返回 abstract 作为默认值
  return scores[bestCategory] > 0
    ? (bestCategory as DiscoverCategory)
    : DiscoverCategory.ABSTRACT
}

/**
 * 获取分类的显示名称（中文）
 */
export function getCategoryDisplayName(category: DiscoverCategory): string {
  const names: Record<DiscoverCategory, string> = {
    [DiscoverCategory.PORTRAIT]: 'Portrait',
    [DiscoverCategory.NATURE]: 'Nature',
    [DiscoverCategory.FANTASY]: 'Fantasy',
    [DiscoverCategory.LIFESTYLE]: 'Lifestyle',
    [DiscoverCategory.ABSTRACT]: 'Abstract',
    [DiscoverCategory.CINEMATIC]: 'Cinematic',
    [DiscoverCategory.TECHNOLOGY]: 'Technology',
    [DiscoverCategory.VEHICLES]: 'Vehicles'
  }
  return names[category] || 'Abstract'
}

/**
 * 获取所有分类选项（用于下拉菜单）
 */
export function getAllCategories(): Array<{ value: DiscoverCategory; label: string }> {
  return Object.values(DiscoverCategory).map(category => ({
    value: category,
    label: getCategoryDisplayName(category)
  }))
}

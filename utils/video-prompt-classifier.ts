/**
 * 视频提示词智能分类系统
 */

import {
  VideoPromptCategory,
  CategoryInfo,
  ClassificationResult,
  ClassifierConfig,
  KeywordWeight
} from '@/types/video-prompts';

// 分类配置数据
export const CATEGORY_CONFIGS: CategoryInfo[] = [
  {
    key: VideoPromptCategory.ALL,
    name: 'All',
    icon: 'Grid3X3',
    description: 'All video prompts',
    keywords: [],
    chineseKeywords: []
  },
  {
    key: VideoPromptCategory.PORTRAIT,
    name: 'Portrait',
    icon: 'User',
    description: 'Human characters, faces, and portrait scenes',
    keywords: [
      'woman', 'man', 'girl', 'boy', 'person', 'character', 'face', 'portrait',
      'blonde', 'hair', 'eyes', 'smile', 'expression', 'human', 'figure',
      'model', 'actor', 'actress', 'child', 'adult', 'elderly'
    ],
    chineseKeywords: [
      '女子', '男子', '女孩', '男孩', '人物', '角色', '脸', '肖像',
      '金髮', '头发', '眼睛', '微笑', '表情', '人类', '身影',
      '模特', '演员', '女演员', '孩子', '成人', '老人'
    ]
  },
  {
    key: VideoPromptCategory.NATURE,
    name: 'Nature',
    icon: 'TreePine',
    description: 'Animals, plants, natural environments',
    keywords: [
      'cat', 'dog', 'bird', 'butterfly', 'animal', 'tree', 'flower', 'forest',
      'ocean', 'mountain', 'river', 'sky', 'cloud', 'sun', 'moon', 'star',
      'nature', 'wildlife', 'landscape', 'garden', 'park', 'beach'
    ],
    chineseKeywords: [
      '猫', '狗', '鸟', '蝴蝶', '动物', '树', '花', '森林',
      '海洋', '山', '河', '天空', '云', '太阳', '月亮', '星星',
      '自然', '野生动物', '风景', '花园', '公园', '海滩', '金吉拉猫'
    ]
  },
  {
    key: VideoPromptCategory.FANTASY,
    name: 'Fantasy',
    icon: 'Sparkles',
    description: 'Magical, mythical, and supernatural elements',
    keywords: [
      'mermaid', 'dragon', 'fairy', 'magic', 'wizard', 'spell', 'fantasy',
      'mythical', 'supernatural', 'enchanted', 'mystical', 'unicorn',
      'phoenix', 'crystal', 'potion', 'castle', 'kingdom', 'pearl', 'tears'
    ],
    chineseKeywords: [
      '美人鱼', '龙', '仙女', '魔法', '巫师', '咒语', '奇幻',
      '神话', '超自然', '魔法的', '神秘的', '独角兽',
      '凤凰', '水晶', '药水', '城堡', '王国', '珍珠', '眼泪'
    ]
  },
  {
    key: VideoPromptCategory.LIFESTYLE,
    name: 'Lifestyle',
    icon: 'Home',
    description: 'Daily life, food, home, and everyday activities',
    keywords: [
      'cooking', 'food', 'kitchen', 'home', 'family', 'coffee', 'tea',
      'meal', 'dinner', 'breakfast', 'recipe', 'restaurant', 'daily',
      'routine', 'lifestyle', 'comfort', 'cozy', 'potato', 'vegetable'
    ],
    chineseKeywords: [
      '烹饪', '食物', '厨房', '家', '家庭', '咖啡', '茶',
      '餐', '晚餐', '早餐', '食谱', '餐厅', '日常',
      '常规', '生活方式', '舒适', '温馨', '土豆', '蔬菜', '土豆丝', '锅'
    ]
  },
  {
    key: VideoPromptCategory.ANIMATION,
    name: 'Animation',
    icon: 'Play',
    description: 'Simple animations, transitions, and motion effects',
    keywords: [
      'animate', 'animation', 'move', 'motion', 'transition', 'effect',
      'transform', 'morph', 'change', 'shift', 'flow', 'smooth',
      'dynamic', 'kinetic', 'movement', 'sequence', 'loop'
    ],
    chineseKeywords: [
      '动画', '动画化', '移动', '运动', '过渡', '效果',
      '变换', '变形', '改变', '转换', '流动', '平滑',
      '动态', '动力', '运动', '序列', '循环'
    ]
  },
  {
    key: VideoPromptCategory.ABSTRACT,
    name: 'Abstract',
    icon: 'Palette',
    description: 'Artistic, conceptual, and abstract visual elements',
    keywords: [
      'abstract', 'artistic', 'concept', 'color', 'texture', 'pattern',
      'geometric', 'surreal', 'experimental', 'creative', 'visual',
      'aesthetic', 'modern', 'contemporary', 'design', 'composition'
    ],
    chineseKeywords: [
      '抽象', '艺术的', '概念', '颜色', '纹理', '图案',
      '几何', '超现实', '实验性', '创意', '视觉',
      '美学', '现代', '当代', '设计', '构图'
    ]
  },
  {
    key: VideoPromptCategory.CINEMATIC,
    name: 'Cinematic',
    icon: 'Video',
    description: 'Complex scenes, storytelling, and movie-like visuals',
    keywords: [
      'cinematic', 'scene', 'story', 'dramatic', 'epic', 'camera',
      'lighting', 'atmosphere', 'mood', 'tension', 'narrative',
      'film', 'movie', 'shot', 'angle', 'composition', 'robe', 'scarf'
    ],
    chineseKeywords: [
      '电影的', '场景', '故事', '戏剧性', '史诗', '相机',
      '照明', '气氛', '情绪', '紧张', '叙述',
      '电影', '影片', '镜头', '角度', '构图', '长袍', '围巾', '微暗'
    ]
  }
];

// 关键词权重配置
const KEYWORD_WEIGHTS: KeywordWeight[] = [
  // 高权重关键词
  { keyword: 'mermaid', weight: 0.9, categories: [VideoPromptCategory.FANTASY] },
  { keyword: 'animate', weight: 0.9, categories: [VideoPromptCategory.ANIMATION] },
  { keyword: 'cooking', weight: 0.8, categories: [VideoPromptCategory.LIFESTYLE] },
  { keyword: 'portrait', weight: 0.8, categories: [VideoPromptCategory.PORTRAIT] },
  { keyword: 'cinematic', weight: 0.8, categories: [VideoPromptCategory.CINEMATIC] },

  // 中权重关键词
  { keyword: 'woman', weight: 0.7, categories: [VideoPromptCategory.PORTRAIT] },
  { keyword: 'man', weight: 0.7, categories: [VideoPromptCategory.PORTRAIT] },
  { keyword: 'cat', weight: 0.7, categories: [VideoPromptCategory.NATURE] },
  { keyword: 'butterfly', weight: 0.6, categories: [VideoPromptCategory.NATURE] },
  { keyword: 'magic', weight: 0.7, categories: [VideoPromptCategory.FANTASY] },

  // 中文关键词
  { keyword: '女子', weight: 0.7, categories: [VideoPromptCategory.PORTRAIT] },
  { keyword: '金吉拉猫', weight: 0.8, categories: [VideoPromptCategory.NATURE] },
  { keyword: '土豆丝', weight: 0.8, categories: [VideoPromptCategory.LIFESTYLE] },
  { keyword: '美人鱼', weight: 0.9, categories: [VideoPromptCategory.FANTASY] },
  { keyword: '珍珠', weight: 0.6, categories: [VideoPromptCategory.FANTASY] }
];

// 默认分类器配置
const DEFAULT_CONFIG: ClassifierConfig = {
  minimumConfidence: 0.3,
  fallbackCategory: VideoPromptCategory.ABSTRACT,
  enableFuzzyMatching: true,
  languageDetection: true
};

/**
 * 视频提示词分类器类
 */
export class VideoPromptClassifier {
  private config: ClassifierConfig;
  private categoryMap: Map<VideoPromptCategory, CategoryInfo>;
  private keywordWeights: Map<string, KeywordWeight>;

  constructor(config: Partial<ClassifierConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.categoryMap = new Map(CATEGORY_CONFIGS.map(cat => [cat.key, cat]));
    this.keywordWeights = new Map(KEYWORD_WEIGHTS.map(kw => [kw.keyword.toLowerCase(), kw]));
  }

  /**
   * 对单个提示词进行分类
   */
  classify(prompt: string): ClassificationResult {
    const normalizedPrompt = prompt.toLowerCase().trim();
    const scores = new Map<VideoPromptCategory, number>();
    const matchedKeywords: string[] = [];

    // 初始化分数
    Object.values(VideoPromptCategory).forEach(category => {
      if (category !== VideoPromptCategory.ALL) {
        scores.set(category, 0);
      }
    });

    // 关键词匹配评分
    for (const [keyword, weightConfig] of this.keywordWeights) {
      if (normalizedPrompt.includes(keyword)) {
        matchedKeywords.push(keyword);
        weightConfig.categories.forEach(category => {
          const currentScore = scores.get(category) || 0;
          scores.set(category, currentScore + weightConfig.weight);
        });
      }
    }

    // 通用关键词匹配
    this.categoryMap.forEach((categoryInfo, categoryKey) => {
      if (categoryKey === VideoPromptCategory.ALL) return;

      const allKeywords = [...categoryInfo.keywords, ...categoryInfo.chineseKeywords];
      for (const keyword of allKeywords) {
        if (normalizedPrompt.includes(keyword.toLowerCase())) {
          if (!matchedKeywords.includes(keyword)) {
            matchedKeywords.push(keyword);
          }
          const currentScore = scores.get(categoryKey) || 0;
          scores.set(categoryKey, currentScore + 0.5); // 默认权重
        }
      }
    });

    // 找到最高分的分类
    let bestCategory = this.config.fallbackCategory;
    let maxScore = 0;

    for (const [category, score] of scores) {
      if (score > maxScore) {
        maxScore = score;
        bestCategory = category;
      }
    }

    // 计算置信度
    const totalScore = Array.from(scores.values()).reduce((sum, score) => sum + score, 0);
    const confidence = totalScore > 0 ? maxScore / totalScore : 0;

    // 如果置信度太低，使用回退分类
    if (confidence < this.config.minimumConfidence) {
      bestCategory = this.config.fallbackCategory;
    }

    return {
      category: bestCategory,
      confidence,
      matchedKeywords,
      reasoning: this.generateReasoning(bestCategory, matchedKeywords, confidence)
    };
  }

  /**
   * 生成分类理由
   */
  private generateReasoning(
    category: VideoPromptCategory,
    matchedKeywords: string[],
    confidence: number
  ): string {
    const categoryInfo = this.categoryMap.get(category);
    if (!categoryInfo) return 'Unknown category';

    if (matchedKeywords.length === 0) {
      return `Classified as ${categoryInfo.name} by default (low confidence: ${confidence.toFixed(2)})`;
    }

    return `Classified as ${categoryInfo.name} based on keywords: ${matchedKeywords.join(', ')} (confidence: ${confidence.toFixed(2)})`;
  }

  /**
   * 获取所有分类配置
   */
  getCategories(): CategoryInfo[] {
    return CATEGORY_CONFIGS;
  }

  /**
   * 获取特定分类的配置
   */
  getCategory(key: VideoPromptCategory): CategoryInfo | undefined {
    return this.categoryMap.get(key);
  }
}

// 导出单例实例
export const promptClassifier = new VideoPromptClassifier();
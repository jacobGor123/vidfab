# 视频提示词智能分类系统

## 系统概述

这个智能分类系统能够自动将AI视频生成的提示词分类到8个预定义的类别中，支持中英文混合输入，并提供完整的UI组件和统计功能。

## 分类体系

### 1. All (全部)
- **图标**: Grid3X3
- **描述**: 所有视频提示词
- **用途**: 显示全部内容的默认分类

### 2. Portrait (人物肖像)
- **图标**: User
- **描述**: 人物角色、面部特写、肖像场景
- **关键词**: woman, man, girl, boy, person, character, face, portrait, 女子, 男子, 人物, 角色
- **示例**: "一位金髮女子站在微暗水中", "Beautiful woman with long flowing hair"

### 3. Nature (自然场景)
- **图标**: TreePine
- **描述**: 动物、植物、自然环境
- **关键词**: cat, dog, bird, butterfly, animal, tree, flower, 猫, 狗, 鸟, 蝴蝶, 动物
- **示例**: "金吉拉猫低头，看着锅里的土豆丝", "Butterflies flying"

### 4. Fantasy (奇幻元素)
- **图标**: Sparkles
- **描述**: 魔法、神话、超自然元素
- **关键词**: mermaid, dragon, fairy, magic, wizard, 美人鱼, 龙, 仙女, 魔法
- **示例**: "Mermaid sheds tears, tears turn into pearls"

### 5. Lifestyle (日常生活)
- **图标**: Home
- **描述**: 日常活动、美食、家居
- **关键词**: cooking, food, kitchen, home, family, 烹饪, 食物, 厨房, 家庭
- **示例**: "Chef preparing delicious pasta", "金吉拉猫低头，看着锅里的土豆丝"

### 6. Animation (动画效果)
- **图标**: Play
- **描述**: 简单动画、过渡效果、动态元素
- **关键词**: animate, animation, move, motion, transition, 动画, 运动, 过渡
- **示例**: "animate the image", "Smooth transition between scenes"

### 7. Abstract (抽象艺术)
- **图标**: Palette
- **描述**: 艺术性、概念性、抽象视觉元素
- **关键词**: abstract, artistic, concept, color, texture, 抽象, 艺术的, 概念
- **示例**: "Colorful geometric patterns moving"

### 8. Cinematic (电影级场景)
- **图标**: Video
- **描述**: 复杂场景、叙事性强、电影风格
- **关键词**: cinematic, scene, story, dramatic, epic, 电影的, 场景, 故事
- **示例**: "A young boy with blond hair and a yellow scarf, wearing a blue robe"

## 技术实现

### 核心文件结构
```
/types/video-prompts.ts           # TypeScript类型定义
/utils/video-prompt-classifier.ts # 分类算法核心
/utils/video-prompt-demo.ts      # 演示数据和统计
/components/ui/category-tabs.tsx  # 分类标签UI组件
/components/video-prompt-discovery.tsx # 完整发现页面
```

### 使用示例

#### 1. 基础分类
```typescript
import { promptClassifier } from '@/utils/video-prompt-classifier'

const result = promptClassifier.classify("一位金髮女子站在微暗水中")
console.log(result)
// {
//   category: 'portrait',
//   confidence: 0.85,
//   matchedKeywords: ['女子', '金髮'],
//   reasoning: 'Classified as Portrait based on keywords: 女子, 金髮 (confidence: 0.85)'
// }
```

#### 2. 批量分类
```typescript
import { generateCategoryReport } from '@/utils/video-prompt-demo'

const report = generateCategoryReport()
console.log(report.summary)
// {
//   totalPrompts: 75,
//   mostPopularCategory: 'Portrait',
//   averageConfidence: 0.73,
//   languageDistribution: { english: 45, chinese: 25, mixed: 5 }
// }
```

#### 3. UI组件使用
```tsx
import { CategoryTabs } from '@/components/ui/category-tabs'
import { VideoPromptDiscovery } from '@/components/video-prompt-discovery'

// 简单标签组件
<CategoryTabs
  categories={categories}
  activeCategory={activeCategory}
  onCategoryChange={setActiveCategory}
  counts={counts}
/>

// 完整发现页面
<VideoPromptDiscovery />
```

## 分类算法特点

### 1. 多语言支持
- 同时支持中文和英文关键词匹配
- 自动检测提示词语言类型
- 针对不同语言优化匹配策略

### 2. 权重评分系统
- 不同关键词具有不同权重值
- 高权重关键词：mermaid (0.9), animate (0.9), cooking (0.8)
- 支持一个关键词关联多个分类

### 3. 置信度计算
- 基于匹配关键词的权重计算置信度
- 最小置信度阈值可配置（默认0.3）
- 低置信度时使用默认分类（Abstract）

### 4. 智能回退机制
- 未匹配任何关键词时使用默认分类
- 支持模糊匹配和语言检测
- 可配置的分类器参数

## 统计数据分析

基于演示数据的分类分布（75个提示词）：

| 分类 | 数量 | 占比 | 描述 |
|------|------|------|------|
| Portrait | ~18 | 24% | 人物肖像最受欢迎 |
| Nature | ~15 | 20% | 自然场景紧随其后 |
| Fantasy | ~12 | 16% | 奇幻元素广受喜爱 |
| Lifestyle | ~10 | 13% | 日常生活场景 |
| Cinematic | ~8 | 11% | 电影级场景 |
| Animation | ~6 | 8% | 动画效果 |
| Abstract | ~4 | 5% | 抽象艺术 |
| Others | ~2 | 3% | 其他未分类 |

## 扩展建议

### 1. 分类优化
- 根据实际使用数据调整关键词权重
- 增加更多领域特定的关键词
- 考虑添加更细分的子分类

### 2. 算法改进
- 引入机器学习模型提高分类准确性
- 支持用户手动标注和反馈
- 实现基于语义的智能匹配

### 3. 功能扩展
- 添加分类标签管理界面
- 支持自定义分类和关键词
- 实现分类性能分析和优化建议

### 4. 数据管理
- 建立分类历史记录
- 支持批量导入导出
- 实现分类质量评估指标

## 注意事项

1. **关键词维护**: 需要定期更新和优化关键词库
2. **语言支持**: 当前主要支持中英文，后续可扩展其他语言
3. **性能考虑**: 大量提示词处理时建议使用批量接口
4. **用户体验**: UI组件已适配移动端和桌面端响应式设计

这个分类系统为VidFab AI视频平台的发现页面提供了强大的内容组织能力，让用户能够快速找到所需的视频生成提示词。
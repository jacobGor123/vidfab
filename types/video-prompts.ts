/**
 * 视频提示词分类系统的TypeScript类型定义
 */

// 视频提示词分类枚举
export enum VideoPromptCategory {
  ALL = 'all',
  PORTRAIT = 'portrait',
  NATURE = 'nature',
  FANTASY = 'fantasy',
  LIFESTYLE = 'lifestyle',
  ANIMATION = 'animation',
  ABSTRACT = 'abstract',
  CINEMATIC = 'cinematic'
}

// 分类信息接口
export interface CategoryInfo {
  key: VideoPromptCategory;
  name: string;
  icon: string; // Lucide icon name
  description: string;
  keywords: string[]; // 用于自动分类的关键词
  chineseKeywords: string[]; // 中文关键词
}

// 视频提示词接口
export interface VideoPrompt {
  id: string;
  content: string;
  category: VideoPromptCategory;
  autoAssigned: boolean; // 是否为自动分配的分类
  confidence: number; // 分类置信度 0-1
  tags?: string[];
  createdAt: Date;
  language: 'en' | 'zh' | 'mixed';
}

// 分类统计接口
export interface CategoryStats {
  category: VideoPromptCategory;
  count: number;
  percentage: number;
}

// 分类结果接口
export interface ClassificationResult {
  category: VideoPromptCategory;
  confidence: number;
  matchedKeywords: string[];
  reasoning: string;
}

// 关键词权重配置
export interface KeywordWeight {
  keyword: string;
  weight: number; // 权重值，越高越重要
  categories: VideoPromptCategory[]; // 关联的分类
}

// 分类器配置
export interface ClassifierConfig {
  minimumConfidence: number; // 最小置信度阈值
  fallbackCategory: VideoPromptCategory; // 默认分类
  enableFuzzyMatching: boolean; // 是否启用模糊匹配
  languageDetection: boolean; // 是否启用语言检测
}

// 批量分类接口
export interface BatchClassificationRequest {
  prompts: string[];
  config?: Partial<ClassifierConfig>;
}

export interface BatchClassificationResponse {
  results: ClassificationResult[];
  stats: CategoryStats[];
  processingTime: number;
}
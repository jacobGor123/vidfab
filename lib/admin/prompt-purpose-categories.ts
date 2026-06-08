import type { PromptPurposeCategory } from '@/types/admin/tasks';

export const PROMPT_PURPOSE_CATEGORIES: PromptPurposeCategory[] = [
  'marketing_ad',
  'product_showcase',
  'social_content',
  'storytelling',
  'education_tutorial',
  'entertainment_meme',
  'personal_memory',
  'character_avatar',
  'scene_visualization',
  'fashion_beauty',
  'music_dance',
  'game_anime',
  'business_presentation',
  'image_editing_request',
  'other',
];

export const PROMPT_PURPOSE_CATEGORY_LABELS: Record<PromptPurposeCategory, string> = {
  marketing_ad: 'Marketing Ad',
  product_showcase: 'Product Showcase',
  social_content: 'Social Content',
  storytelling: 'Storytelling',
  education_tutorial: 'Education / Tutorial',
  entertainment_meme: 'Entertainment / Meme',
  personal_memory: 'Personal Memory',
  character_avatar: 'Character / Avatar',
  scene_visualization: 'Scene Visualization',
  fashion_beauty: 'Fashion / Beauty',
  music_dance: 'Music / Dance',
  game_anime: 'Game / Anime',
  business_presentation: 'Business Presentation',
  image_editing_request: 'Image Editing',
  other: 'Other',
};

const categorySet = new Set<string>(PROMPT_PURPOSE_CATEGORIES);

export function isPromptPurposeCategory(value: unknown): value is PromptPurposeCategory {
  return typeof value === 'string' && categorySet.has(value);
}

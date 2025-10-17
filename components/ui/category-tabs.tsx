"use client"

import React from 'react'
import { cn } from '@/lib/utils'
import {
  Grid3X3,
  User,
  TreePine,
  Sparkles,
  Home,
  Play,
  Palette,
  Video
} from 'lucide-react'
import { VideoPromptCategory, CategoryInfo } from '@/types/video-prompts'

// 图标映射
const iconMap = {
  Grid3X3,
  User,
  TreePine,
  Sparkles,
  Home,
  Play,
  Palette,
  Video
}

interface CategoryTabsProps {
  categories: CategoryInfo[]
  activeCategory: VideoPromptCategory
  onCategoryChange: (category: VideoPromptCategory) => void
  counts?: Record<VideoPromptCategory, number>
  className?: string
}

interface CategoryTabProps {
  category: CategoryInfo
  isActive: boolean
  count?: number
  onClick: () => void
}

const CategoryTab: React.FC<CategoryTabProps> = ({
  category,
  isActive,
  count,
  onClick
}) => {
  const IconComponent = iconMap[category.icon as keyof typeof iconMap]

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200",
        "text-sm font-medium whitespace-nowrap",
        "hover:bg-white/10 hover:scale-105",
        "focus:outline-none focus:ring-2 focus:ring-blue-500/50",
        isActive
          ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25"
          : "bg-white/5 text-gray-300 hover:text-white"
      )}
      title={category.description}
    >
      {IconComponent && (
        <IconComponent className="w-4 h-4" />
      )}
      <span>{category.name}</span>
      {count !== undefined && count > 0 && (
        <span
          className={cn(
            "px-2 py-0.5 rounded-full text-xs font-semibold",
            isActive
              ? "bg-white/20 text-white"
              : "bg-white/10 text-gray-400"
          )}
        >
          {count}
        </span>
      )}
    </button>
  )
}

export const CategoryTabs: React.FC<CategoryTabsProps> = ({
  categories,
  activeCategory,
  onCategoryChange,
  counts,
  className
}) => {
  return (
    <div className={cn("w-full", className)}>
      {/* 桌面端：水平滚动标签 */}
      <div className="hidden md:block">
        <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide py-2">
          {categories.map((category) => (
            <CategoryTab
              key={category.key}
              category={category}
              isActive={activeCategory === category.key}
              count={counts?.[category.key]}
              onClick={() => onCategoryChange(category.key)}
            />
          ))}
        </div>
      </div>

      {/* 移动端：网格布局 */}
      <div className="md:hidden">
        <div className="grid grid-cols-2 gap-2 p-2">
          {categories.map((category) => {
            const IconComponent = iconMap[category.icon as keyof typeof iconMap]
            const isActive = activeCategory === category.key
            const count = counts?.[category.key]

            return (
              <button
                key={category.key}
                onClick={() => onCategoryChange(category.key)}
                className={cn(
                  "flex flex-col items-center gap-2 p-3 rounded-lg transition-all duration-200",
                  "text-sm font-medium",
                  "hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500/50",
                  isActive
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25"
                    : "bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white"
                )}
              >
                <div className="flex items-center justify-center w-8 h-8">
                  {IconComponent && <IconComponent className="w-5 h-5" />}
                </div>
                <span className="text-xs">{category.name}</span>
                {count !== undefined && count > 0 && (
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-semibold",
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-white/10 text-gray-400"
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// 分类过滤hook
export const useCategoryFilter = (initialCategory: VideoPromptCategory = VideoPromptCategory.ALL) => {
  const [activeCategory, setActiveCategory] = React.useState<VideoPromptCategory>(initialCategory)

  const filterItems = React.useCallback(<T extends { category: VideoPromptCategory }>(
    items: T[]
  ) => {
    if (activeCategory === VideoPromptCategory.ALL) {
      return items
    }
    return items.filter(item => item.category === activeCategory)
  }, [activeCategory])

  return {
    activeCategory,
    setActiveCategory,
    filterItems
  }
}
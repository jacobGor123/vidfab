/**
 * Studio 工具统一配置
 *
 * 集中管理所有创意工具的配置信息，包括：
 * - 工具类型定义
 * - 菜单项配置
 * - URL 路由映射
 * - 图标路径
 * - 显示标签
 *
 * 所有相关组件应从此文件导入配置，而非各自维护重复的配置
 */

import { LucideIcon, Sparkles, FileText, Image as ImageIcon, Wand2, ImagePlus, FolderOpen, User } from 'lucide-react'

// ==================== 类型定义 ====================

export type ToolType =
  | "discover"
  | "story-to-video"
  | "text-to-video"
  | "image-to-video"
  | "video-effects"
  | "text-to-image"
  | "image-to-image"
  | "my-assets"
  | "my-profile"

// ==================== 工具配置接口 ====================

export interface ToolConfig {
  id: ToolType
  label: string
  iconPath?: string           // SVG 图标路径（可选）
  icon?: LucideIcon           // Lucide 图标组件（可选）
  url: string
  shortLabel?: string  // 用于移动端显示
  isBeta?: boolean     // 是否显示 BETA 标识
  hidden?: boolean     // 是否隐藏（由 feature flags 控制）
}

export interface ToolCategory {
  category: string
  items: ToolConfig[]
}

// ==================== 工具配置数据 ====================

/**
 * Discover 单独配置
 */
export const discoverTool: ToolConfig = {
  id: "discover",
  label: "Discover",
  iconPath: "/logo/discover.svg",
  url: "/studio/discover",
  shortLabel: "Discover"
}

/**
 * AI Video 工具分类
 */
export const aiVideoTools: ToolConfig[] = [
  {
    id: "story-to-video",
    label: "Story to Video",
    icon: Wand2,  // 使用 Lucide 图标组件
    url: "/studio/video-agent-beta",
    shortLabel: "S2V",
    isBeta: true  // 显示 BETA 标识
  },
  {
    id: "text-to-video",
    label: "Text to Video",
    iconPath: "/logo/text-to-video.svg",
    url: "/studio/text-to-video",
    shortLabel: "T2V"
  },
  {
    id: "image-to-video",
    label: "Image to Video",
    iconPath: "/logo/image-to-video.svg",
    url: "/studio/image-to-video",
    shortLabel: "I2V"
  },
  {
    id: "video-effects",
    label: "Video Effects",
    iconPath: "/logo/video-effects.svg",
    url: "/studio/ai-video-effects",
    shortLabel: "Effects"
  }
]

/**
 * AI Image 工具分类
 */
export const aiImageTools: ToolConfig[] = [
  {
    id: "text-to-image",
    label: "Text to Image",
    iconPath: "/logo/text-to-image.svg",
    url: "/studio/text-to-image",
    shortLabel: "T2I"
  },
  {
    id: "image-to-image",
    label: "Image to Image",
    iconPath: "/logo/image-to-image.svg",
    url: "/studio/image-to-image",
    shortLabel: "I2I"
  }
]

/**
 * My Works 工具分类
 */
export const myWorksTools: ToolConfig[] = [
  {
    id: "my-assets",
    label: "My Assets",
    iconPath: "/logo/my-assets.svg",
    url: "/studio/my-assets",
    shortLabel: "Assets"
  }
]

/**
 * Account 工具分类
 */
export const accountTools: ToolConfig[] = [
  {
    id: "my-profile",
    label: "Plans & Billing",
    iconPath: "/logo/plans-&-billing.svg",
    url: "/studio/plans",
    shortLabel: "Billing"
  }
]

/**
 * 完整的菜单分类配置
 */
export const menuCategories: ToolCategory[] = [
  {
    category: "AI Video",
    items: aiVideoTools
  },
  {
    category: "AI Image",
    items: aiImageTools
  },
  {
    category: "My Works",
    items: myWorksTools
  },
  {
    category: "Account",
    items: accountTools
  }
]

// ==================== URL 映射表 ====================

/**
 * 工具 ID 到 URL 的映射表
 * 用于路由跳转
 */
export const toolToUrlMap: Record<ToolType, string> = {
  'discover': '/studio/discover',
  'story-to-video': '/studio/video-agent-beta',
  'text-to-video': '/studio/text-to-video',
  'image-to-video': '/studio/image-to-video',
  'video-effects': '/studio/ai-video-effects',
  'text-to-image': '/studio/text-to-image',
  'image-to-image': '/studio/image-to-image',
  'my-assets': '/studio/my-assets',
  'my-profile': '/studio/plans',
}

/**
 * URL 路径到工具 ID 的反向映射表
 * 用于从路径识别当前工具
 */
export const urlToToolMap: Record<string, ToolType> = {
  'discover': 'discover',
  'video-agent-beta': 'story-to-video',
  'text-to-video': 'text-to-video',
  'image-to-video': 'image-to-video',
  'ai-video-effects': 'video-effects',
  'text-to-image': 'text-to-image',
  'image-to-image': 'image-to-image',
  'my-assets': 'my-assets',
  'plans': 'my-profile',
}

// ==================== 辅助函数 ====================

/**
 * 获取所有可见的工具配置（排除隐藏的）
 */
export function getVisibleTools(): ToolConfig[] {
  const allTools = [
    discoverTool,
    ...aiVideoTools,
    ...aiImageTools,
    ...myWorksTools,
    ...accountTools
  ]

  return allTools.filter(tool => !tool.hidden)
}

/**
 * 根据工具 ID 获取工具配置
 */
export function getToolConfig(toolId: ToolType): ToolConfig | undefined {
  const allTools = [
    discoverTool,
    ...aiVideoTools,
    ...aiImageTools,
    ...myWorksTools,
    ...accountTools
  ]

  return allTools.find(tool => tool.id === toolId)
}

/**
 * 从路径提取工具 ID
 */
export function getToolFromPath(pathname: string): ToolType {
  if (pathname.startsWith('/studio/')) {
    const pathParts = pathname.split('/').filter(Boolean)
    const toolPath = pathParts[1]
    return urlToToolMap[toolPath] || 'discover'
  }

  return 'discover'
}

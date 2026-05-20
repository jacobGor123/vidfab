/**
 * Discover Videos 相关类型定义
 */

// 分类枚举
export enum DiscoverCategory {
  PORTRAIT = 'portrait',
  NATURE = 'nature',
  FANTASY = 'fantasy',
  LIFESTYLE = 'lifestyle',
  ABSTRACT = 'abstract',
  CINEMATIC = 'cinematic',
  TECHNOLOGY = 'technology',
  VEHICLES = 'vehicles'
}

// 状态枚举
export enum DiscoverStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DRAFT = 'draft'
}

// 资源类型：image 走 image_url，video 走 video_url
export enum DiscoverMediaType {
  IMAGE = 'image',
  VIDEO = 'video',
}

// 内容专区 tab —— 前端 Discover 页顶部切换
export enum DiscoverContentTab {
  ENTERTAINMENT = 'entertainment',
  PRODUCT_DEMO = 'product_demo',
}

// 数据库表数据结构
export interface DiscoverVideo {
  id: string
  prompt: string
  video_url: string
  image_url: string | null
  category: DiscoverCategory
  display_order: number
  status: DiscoverStatus
  is_featured: boolean
  media_type: DiscoverMediaType
  content_tab: DiscoverContentTab
  created_by: string | null
  created_at: string
  updated_at: string
}

// 创建/更新时的表单数据
export interface DiscoverVideoFormData {
  prompt: string
  video_url?: string
  image_url?: string
  category?: DiscoverCategory
  status?: DiscoverStatus
  is_featured?: boolean
  display_order?: number
  media_type?: DiscoverMediaType
  content_tab?: DiscoverContentTab
}

// API 响应 - 列表
export interface DiscoverVideosResponse {
  success: boolean
  data: DiscoverVideo[]
  pagination?: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

// API 响应 - 单条
export interface DiscoverVideoResponse {
  success: boolean
  data: DiscoverVideo
  message?: string
}

// API 响应 - 统计
export interface DiscoverStatsResponse {
  success: boolean
  data: {
    total: number
    byCategory: Record<string, number>
    byStatus: Record<string, number>
    featured: number
  }
}

// 分类统计
export interface CategoryStats {
  name: string
  key: string
  count: number
}

// 批量操作请求
export interface DiscoverBatchRequest {
  action: 'delete' | 'updateStatus' | 'updateOrder' | 'generateThumbnails'
  ids: string[]
  payload?: {
    status?: DiscoverStatus
    display_order?: number
  }
}

// 批量操作响应
export interface DiscoverBatchResponse {
  success: boolean
  message: string
  affected?: number
  processed?: number
  failed?: number
  errors?: Array<{ id: string; error: string }>
}

// 查询参数
export interface DiscoverQueryParams {
  page?: number
  limit?: number
  category?: string
  status?: DiscoverStatus | 'all'
  search?: string
  sortBy?: 'created_at' | 'display_order' | 'updated_at'
  sortOrder?: 'asc' | 'desc'
  media?: DiscoverMediaType | 'all'
  tab?: DiscoverContentTab | 'all'
}

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
  errors?: Array<{ id: number; error: string }>
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
}

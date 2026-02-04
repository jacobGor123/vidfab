/**
 * StoryboardHistoryCarousel Component
 *
 * 分镜图历史版本轮播
 * - 显示最多5个缩略图
 * - 左右滑动按钮
 * - 点击切换到对应版本
 * - 当前选中版本高亮显示
 */

'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StoryboardVersion {
  id: string
  version: number
  image_url: string
  is_current: boolean
  created_at: string
}

interface StoryboardHistoryCarouselProps {
  projectId: string
  shotNumber: number
  currentVersionId?: string
  onVersionSelect: (versionId: string, version: number) => void
}

export function StoryboardHistoryCarousel({
  projectId,
  shotNumber,
  currentVersionId,
  onVersionSelect
}: StoryboardHistoryCarouselProps) {
  const [versions, setVersions] = useState<StoryboardVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(0)
  const itemsPerPage = 5
  const totalPages = Math.ceil(versions.length / itemsPerPage)

  // 加载历史版本
  useEffect(() => {
    loadHistory()
  }, [projectId, shotNumber])

  const loadHistory = async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/video-agent/projects/${projectId}/storyboards/${shotNumber}/history`
      )

      if (!response.ok) {
        throw new Error('Failed to load history')
      }

      const data = await response.json()
      setVersions(data.data || [])
    } catch (error) {
      console.error('[StoryboardHistory] Failed to load:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(0, prev - 1))
  }

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))
  }

  const handleVersionClick = (versionId: string, version: number) => {
    onVersionSelect(versionId, version)
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-4 bg-slate-900/30 rounded-lg">
        <div className="text-xs text-slate-400">Loading history...</div>
      </div>
    )
  }

  if (versions.length === 0) {
    return null
  }

  const startIndex = currentPage * itemsPerPage
  const visibleVersions = versions.slice(startIndex, startIndex + itemsPerPage)
  const hasPrev = currentPage > 0
  const hasNext = currentPage < totalPages - 1

  return (
    <div className="space-y-2">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          History Versions ({versions.length})
        </h4>
        <div className="text-xs text-slate-500">
          Page {currentPage + 1} / {totalPages}
        </div>
      </div>

      {/* 轮播容器 */}
      <div className="relative flex items-center gap-2">
        {/* 左滑按钮 */}
        <Button
          onClick={handlePrevPage}
          disabled={!hasPrev}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 flex-shrink-0 disabled:opacity-30"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        {/* 缩略图列表 */}
        <div className="flex-1 overflow-hidden">
          <div className="flex gap-2">
            {visibleVersions.map((version) => {
              const isCurrent = version.is_current
              const isSelected = version.id === currentVersionId

              return (
                <button
                  key={version.id}
                  onClick={() => handleVersionClick(version.id, version.version)}
                  className={cn(
                    "relative flex-1 group aspect-video rounded-lg overflow-hidden border-2 transition-all",
                    isSelected
                      ? "border-blue-500 shadow-lg shadow-blue-500/20"
                      : "border-slate-700 hover:border-slate-500"
                  )}
                >
                  {/* 缩略图 */}
                  <img
                    src={version.image_url}
                    alt={`Version ${version.version}`}
                    className="w-full h-full object-cover"
                  />

                  {/* 当前版本标记 */}
                  {isCurrent && (
                    <div className="absolute top-1 right-1 bg-green-500 rounded-full p-0.5">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}

                  {/* 版本号 */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1">
                    <div className="text-[10px] text-white font-medium text-center">
                      V{version.version}
                    </div>
                  </div>

                  {/* 悬停效果 */}
                  <div className={cn(
                    "absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors",
                    isSelected && "ring-2 ring-blue-500 ring-inset"
                  )} />
                </button>
              )
            })}
          </div>
        </div>

        {/* 右滑按钮 */}
        <Button
          onClick={handleNextPage}
          disabled={!hasNext}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 flex-shrink-0 disabled:opacity-30"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* 提示文本 */}
      <div className="text-xs text-slate-500 text-center">
        Click on a thumbnail to switch to that version
      </div>
    </div>
  )
}

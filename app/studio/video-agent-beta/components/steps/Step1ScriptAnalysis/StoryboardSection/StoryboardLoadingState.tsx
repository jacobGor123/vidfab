/**
 * StoryboardLoadingState Component
 *
 * 分镜生成加载状态组件
 * 显示 skeleton 加载动画和生成进度
 */

'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Loader2 } from 'lucide-react'

interface StoryboardLoadingStateProps {
  count: number // 要生成的分镜数量
  progress?: { current: number; total: number } // 生成进度
}

export function StoryboardLoadingState({ count, progress }: StoryboardLoadingStateProps) {
  // 计算进度百分比
  const percentage = progress
    ? Math.round((progress.current / progress.total) * 100)
    : 0

  return (
    <div className="space-y-4">
      {/* 进度条 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Generating storyboard images...</span>
          </div>
          {progress && (
            <span className="font-medium">
              {progress.current}/{progress.total}
            </span>
          )}
        </div>
        <Progress value={percentage} className="h-2" />
      </div>

      {/* Skeleton 卡片 */}
      <div className="space-y-6">
        {Array.from({ length: Math.min(count, 3) }).map((_, index) => (
          <Card key={index} className="overflow-hidden bg-slate-900/40 border-slate-800">
            <CardContent className="p-8">
              <div className="flex gap-8">
                {/* Shot Number Column */}
                <div className="flex-shrink-0 flex flex-col items-center gap-4 pt-1">
                  <div className="w-12 h-10 bg-muted rounded animate-pulse" />
                  <div className="w-px h-full bg-gradient-to-b from-slate-800 to-transparent" />
                </div>

                {/* Content Column */}
                <div className="flex-1 space-y-5">
                  {/* Time Range */}
                  <div className="h-6 bg-muted rounded animate-pulse w-32" />

                  {/* Description */}
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded animate-pulse w-full" />
                    <div className="h-4 bg-muted rounded animate-pulse w-5/6" />
                    <div className="h-4 bg-muted rounded animate-pulse w-4/6" />
                  </div>

                  {/* Image Placeholder */}
                  <div className="aspect-video bg-muted rounded-lg animate-pulse" />

                  {/* Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="h-10 bg-muted rounded animate-pulse" />
                    <div className="h-10 bg-muted rounded animate-pulse" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

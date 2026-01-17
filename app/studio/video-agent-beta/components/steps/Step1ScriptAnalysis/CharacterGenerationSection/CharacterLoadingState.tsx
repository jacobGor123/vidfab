/**
 * CharacterLoadingState Component
 *
 * 人物生成加载状态组件
 * 显示 skeleton 加载动画和生成进度
 */

'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Loader2 } from 'lucide-react'

interface CharacterLoadingStateProps {
  count: number // 要生成的人物数量
  progress?: { current: number; total: number } // 生成进度
}

export function CharacterLoadingState({ count, progress }: CharacterLoadingStateProps) {
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
            <span>Generating character images...</span>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: count }).map((_, index) => (
          <Card key={index} className="overflow-hidden">
            <CardContent className="p-4">
              {/* 图片 skeleton */}
              <div className="aspect-square bg-muted rounded-lg animate-pulse mb-3" />

              {/* 名称 skeleton */}
              <div className="h-5 bg-muted rounded animate-pulse mb-2 w-3/4" />

              {/* 描述 skeleton */}
              <div className="space-y-2">
                <div className="h-3 bg-muted rounded animate-pulse w-full" />
                <div className="h-3 bg-muted rounded animate-pulse w-5/6" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

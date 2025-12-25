/**
 * Step 3 - Progress Card
 * 分镜生成进度展示卡片
 */

'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

interface Step3ProgressCardProps {
  totalShots: number
  completedShots: number
  generatingShots: number
  failedShots: number
  progress: number
  regenerateQuotaRemaining?: number
}

export function Step3ProgressCard({
  totalShots,
  completedShots,
  generatingShots,
  failedShots,
  progress,
  regenerateQuotaRemaining
}: Step3ProgressCardProps) {
  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Generation Progress</h3>
          <span className="text-sm font-bold">
            {completedShots} / {totalShots}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
        <div className="flex gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full" />
            <span>{completedShots} Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full" />
            <span>{generatingShots} Generating</span>
          </div>
          {failedShots > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-destructive rounded-full" />
              <span>{failedShots} Failed</span>
            </div>
          )}
        </div>
        {regenerateQuotaRemaining !== undefined && (
          <div className="text-xs text-muted-foreground">
            Regenerate Quota: {regenerateQuotaRemaining} remaining
          </div>
        )}
      </CardContent>
    </Card>
  )
}

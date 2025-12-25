/**
 * Step 4 - Preparing State UI
 * 视频生成准备阶段界面
 */

'use client'

import { Card, CardContent } from '@/components/ui/card'

interface Step4PreparingStateProps {
  storyboardsReady: boolean
}

export function Step4PreparingState({ storyboardsReady }: Step4PreparingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 space-y-6">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">Preparing Video Generation</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Loading storyboards and initializing video generation...
        </p>
      </div>
      {!storyboardsReady && (
        <Card className="bg-blue-500/10 border-blue-500/20 max-w-md">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <div className="text-xl">⏳</div>
              <div className="flex-1 text-sm">
                <p className="font-semibold text-blue-400">Waiting for Storyboards</p>
                <p className="text-muted-foreground">
                  Please wait for storyboard generation to complete.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

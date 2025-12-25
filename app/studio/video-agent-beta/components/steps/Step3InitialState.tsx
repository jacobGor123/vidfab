/**
 * Step 3 - Initial State UI
 * 分镜生成初始状态界面（生成前）
 */

'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface Step3InitialStateProps {
  totalShots: number
  imageStyle: string
  error: string | null
  onGenerate: () => void
}

export function Step3InitialState({
  totalShots,
  imageStyle,
  error,
  onGenerate
}: Step3InitialStateProps) {
  return (
    <div className="space-y-6">
      <div className="text-center py-8">
        <div className="text-5xl mb-4">🎨</div>
        <h2 className="text-xl font-bold mb-2">Generate Storyboards</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Transform your script into visual storyboards. We&apos;ll generate {totalShots} images
          based on your shot breakdown.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Shots</span>
              <span className="font-bold">{totalShots}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Estimated Time</span>
              <span className="font-bold">{Math.ceil(totalShots * 10)} seconds</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Style</span>
              <span className="font-bold capitalize">{imageStyle}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex justify-center">
        <Button onClick={onGenerate} size="lg" className="px-12">
          Generate Storyboards
        </Button>
      </div>
    </div>
  )
}

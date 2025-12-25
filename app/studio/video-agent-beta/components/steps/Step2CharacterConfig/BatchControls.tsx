/**
 * Batch Controls Component
 * 批量操作控制面板
 */

'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Sparkles, Loader2, Wand2 } from 'lucide-react'

interface BatchControlsProps {
  onGenerateAll: () => void
  onGeneratePrompts: () => void
  isGeneratingPrompts: boolean
  isBatchGenerating: boolean
  isLoading: boolean
  generatedCount: number
  totalCount: number
}

export function BatchControls({
  onGenerateAll,
  onGeneratePrompts,
  isGeneratingPrompts,
  isBatchGenerating,
  isLoading,
  generatedCount,
  totalCount
}: BatchControlsProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex gap-2">
          {/* 一键生成按钮（主要操作） */}
          <Button
            onClick={onGenerateAll}
            disabled={isBatchGenerating || isGeneratingPrompts || isLoading}
            className="flex-1"
          >
            {isBatchGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating {generatedCount}/{totalCount}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate All
              </>
            )}
          </Button>

          {/* 仅生成Prompts按钮（次要操作） */}
          <Button
            onClick={onGeneratePrompts}
            disabled={isGeneratingPrompts || isBatchGenerating || isLoading}
            variant="outline"
            className="flex-1"
          >
            {isGeneratingPrompts ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Prompts...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 mr-2" />
                Prompts Only
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

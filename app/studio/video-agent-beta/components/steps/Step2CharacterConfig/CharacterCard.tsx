/**
 * Character Card Component
 * 单个角色卡片 - 包含图片预览、Prompt 编辑、操作按钮
 */

'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { CharacterState } from './hooks/useCharacterState'
import {
  Loader2,
  Upload,
  RefreshCw,
  Check,
  Sparkles,
  Library
} from 'lucide-react'

interface CharacterCardProps {
  state: CharacterState
  onPromptChange: (prompt: string) => void
  onGenerate: () => void
  onUpload: (file: File) => void
  onOpenPreset: () => void
}

export function CharacterCard({
  state,
  onPromptChange,
  onGenerate,
  onUpload,
  onOpenPreset
}: CharacterCardProps) {
  return (
    <Card className="relative">
      <CardContent className="pt-6 space-y-3">
        {/* 人物名称 */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{state.name}</h3>
          {state.imageUrl && (
            <Badge variant="outline" className="text-green-600 border-green-600">
              <Check className="w-3 h-3 mr-1" />
              Generated
            </Badge>
          )}
        </div>

        {/* 图片预览 - 自适应尺寸，不裁切 */}
        <div className="min-h-[300px] max-h-[600px] border-2 border-dashed rounded-lg overflow-hidden bg-muted/30 relative group flex items-center justify-center">
          {state.isGenerating ? (
            <div className="w-full h-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : state.imageUrl ? (
            <>
              <img
                src={state.imageUrl}
                alt={state.name}
                className="w-full h-auto max-h-[600px] object-contain"
              />
              {/* 重新生成按钮 - 悬停时显示 */}
              <button
                onClick={onGenerate}
                disabled={!(state.prompt || '').trim()}
                className="absolute top-2 right-2 p-2 bg-background/90 hover:bg-background border border-border rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                title="Regenerate image"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
              No image yet
            </div>
          )}
        </div>

        {/* Prompt 编辑 */}
        <div className="space-y-2">
          <Label className="text-xs">Prompt</Label>
          <Textarea
            value={state.prompt || ''}
            onChange={(e) => onPromptChange(e.target.value)}
            placeholder="AI will generate prompt..."
            rows={3}
            className="text-xs"
          />
        </div>

        {/* 错误提示 */}
        {state.error && (
          <div className="text-xs text-destructive bg-destructive/10 p-2 rounded">
            {state.error}
          </div>
        )}

        {/* 操作按钮 */}
        <div className="grid grid-cols-3 gap-2">
          <Button
            onClick={onGenerate}
            disabled={state.isGenerating || !(state.prompt || '').trim()}
            size="sm"
            variant="outline"
          >
            {state.imageUrl ? (
              <>
                <RefreshCw className="w-3 h-3 mr-1" />
                Regen
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3 mr-1" />
                Gen
              </>
            )}
          </Button>

          <label>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) onUpload(file)
              }}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="w-full"
              asChild
            >
              <span>
                <Upload className="w-3 h-3 mr-1" />
                Upload
              </span>
            </Button>
          </label>

          <Button
            onClick={onOpenPreset}
            size="sm"
            variant="outline"
            title="Choose from preset characters"
          >
            <Library className="w-3 h-3 mr-1" />
            Preset
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Character Card Skeleton (Loading State)
 */
export function CharacterCardSkeleton() {
  return (
    <Card className="relative">
      <CardContent className="pt-6 space-y-3">
        {/* 骨架屏：人物名称 */}
        <div className="flex items-center justify-between">
          <div className="h-7 w-24 bg-muted/50 rounded animate-pulse" />
          <div className="h-6 w-20 bg-muted/50 rounded-full animate-pulse" />
        </div>

        {/* 骨架屏：图片区域 */}
        <div className="min-h-[300px] max-h-[600px] border-2 border-dashed rounded-lg overflow-hidden bg-muted/30 relative flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-muted-foreground/50">
            <div className="w-16 h-16 rounded-full bg-muted/50 animate-pulse" />
            <div className="h-4 w-32 bg-muted/50 rounded animate-pulse" />
          </div>
        </div>

        {/* 骨架屏：Prompt 输入框 */}
        <div className="space-y-2">
          <div className="h-3 w-12 bg-muted/50 rounded animate-pulse" />
          <div className="h-20 bg-muted/50 rounded animate-pulse" />
        </div>

        {/* 骨架屏：按钮 */}
        <div className="grid grid-cols-3 gap-2">
          <div className="h-9 bg-muted/50 rounded animate-pulse" />
          <div className="h-9 bg-muted/50 rounded animate-pulse" />
          <div className="h-9 bg-muted/50 rounded animate-pulse" />
        </div>
      </CardContent>
    </Card>
  )
}

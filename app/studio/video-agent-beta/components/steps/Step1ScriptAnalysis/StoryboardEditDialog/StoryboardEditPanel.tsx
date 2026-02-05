/**
 * StoryboardEditPanel Component
 *
 * 右侧分镜编辑面板
 * 显示分镜预览、prompt 编辑器、重新生成按钮
 */

'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { RefreshCw, Image as ImageIcon, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { StoryboardHistoryCarousel } from './StoryboardHistoryCarousel'

function resolveStoryboardSrc(storyboard?: Storyboard): string | undefined {
  if (!storyboard) return undefined

  // Match the preview card behavior: prefer stable URLs, and proxy external signed URLs.
  const stableUrl = storyboard.cdn_url || storyboard.image_url
  const externalUrl = storyboard.image_url_external || undefined
  const proxiedExternalUrl = externalUrl
    ? `/api/video-agent/proxy-image?u=${encodeURIComponent(externalUrl)}`
    : undefined

  const preferred = storyboard.storage_status === 'pending'
    ? (proxiedExternalUrl || stableUrl)
    : (stableUrl || proxiedExternalUrl)

  if (!preferred) return undefined

  if (storyboard.updated_at) {
    const separator = preferred.includes('?') ? '&' : '?' // signed URLs already have query params
    return `${preferred}${separator}t=${encodeURIComponent(storyboard.updated_at)}`
  }

  return preferred
}

interface Storyboard {
  id: string
  shot_number: number
  image_url?: string
  image_url_external?: string | null
  cdn_url?: string | null
  storage_status?: 'pending' | 'completed' | 'failed' | null
  status?: 'generating' | 'completed' | 'failed'
  error_message?: string | null
  updated_at?: string | null
}

interface PreviewVersion {
  id: string
  version: number
  image_url: string
  image_url_external?: string
  cdn_url?: string
  storage_status?: string
  is_current: boolean
  updated_at?: string
}

interface StoryboardEditPanelProps {
  projectId: string
  shotNumber: number
  storyboard?: Storyboard
  previewVersion?: PreviewVersion | null
  prompt: string
  isRegenerating: boolean
  onPromptChange: (prompt: string) => void
  onRegenerate: () => void
  onVersionPreview?: (versionId: string, version: number) => void
  onSetAsCurrent?: () => void
}

export function StoryboardEditPanel({
  projectId,
  shotNumber,
  storyboard,
  previewVersion,
  prompt,
  isRegenerating,
  onPromptChange,
  onRegenerate,
  onVersionPreview,
  onSetAsCurrent
}: StoryboardEditPanelProps) {
  // 🔥 优先使用预览版本，否则使用当前分镜图
  const displayStoryboard = previewVersion || storyboard
  const hasImage = !!(displayStoryboard?.image_url || displayStoryboard?.image_url_external || displayStoryboard?.cdn_url)
  const isGenerating = storyboard?.status === 'generating' || isRegenerating
  const isPreviewing = !!previewVersion

  // Reuse the same resolution strategy as the Step1 preview card.
  const resolvedSrc = resolveStoryboardSrc(displayStoryboard as any)

  return (
    <div className="flex gap-6">
      {/* 左侧：分镜图预览 + 历史版本轮播 */}
      <div className="w-1/2 flex-shrink-0 space-y-4">
        {/* 当前分镜图预览 */}
        <Card className="border-slate-700 bg-slate-900/50 overflow-hidden">
          <CardContent className="p-0">
            <div className="relative w-full h-[350px] bg-slate-800 flex items-center justify-center">
              {hasImage ? (
                <>
                  <img
                    key={`storyboard-${displayStoryboard?.id}-${displayStoryboard?.updated_at || 'initial'}`}
                    src={resolvedSrc}
                    alt={`Shot ${shotNumber}`}
                    className={cn(
                      "max-w-full max-h-full object-contain",
                      isGenerating && "opacity-50"
                    )}
                    loading="lazy"
                    decoding="async"
                  />
                  {isGenerating && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50">
                      <div className="text-center space-y-3">
                        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
                        <p className="text-sm text-slate-300 font-medium">
                          Regenerating...
                        </p>
                      </div>
                    </div>
                  )}
                  {/* 🔥 预览/成功提示 */}
                  {isPreviewing && previewVersion && (
                    <div className={cn(
                      "absolute top-2 left-2 right-2 rounded-lg px-3 py-2 flex items-center justify-between",
                      previewVersion.is_current
                        ? "bg-green-600/90" // 切换成功：绿色
                        : "bg-blue-600/90"   // 预览中：蓝色
                    )}>
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-white" />
                        <span className="text-xs text-white font-medium">
                          {previewVersion.is_current
                            ? `Version ${previewVersion.version} is now current` // 切换成功提示
                            : `Previewing Version ${previewVersion.version}`     // 预览提示
                          }
                        </span>
                      </div>
                      {!previewVersion.is_current && onSetAsCurrent && (
                        <Button
                          onClick={onSetAsCurrent}
                          size="sm"
                          className="h-6 text-xs bg-white text-blue-600 hover:bg-slate-100"
                        >
                          Set as Current
                        </Button>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center">
                  {isGenerating ? (
                    <div className="space-y-3">
                      <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
                      <p className="text-sm text-slate-300 font-medium">
                        Generating...
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <ImageIcon className="w-12 h-12 text-slate-600 mx-auto" />
                      <p className="text-sm text-slate-400">
                        No image generated yet
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 历史版本轮播 */}
        {hasImage && !isGenerating && onVersionPreview && (
          <Card className="border-slate-700 bg-slate-900/50">
            <CardContent className="p-4">
              <StoryboardHistoryCarousel
                projectId={projectId}
                shotNumber={shotNumber}
                currentVersionId={previewVersion?.id || storyboard?.id}
                onVersionSelect={onVersionPreview}
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* 右侧：Prompt 编辑区 */}
      <div className="flex-1 flex flex-col space-y-4">
        {/* Prompt Editor */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-slate-200">
              Generation Prompt
            </label>
            <span className="text-xs text-slate-400">
              {prompt.length} characters
            </span>
          </div>
          <Textarea
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            placeholder="Describe the scene and any specific details..."
            className="h-[200px] bg-slate-900/50 border-slate-700 focus:border-blue-500 text-slate-200 placeholder:text-slate-500 resize-none"
            disabled={isRegenerating}
          />
        </div>

        {/* Regenerate Button */}
        <div>
          <Button
            onClick={onRegenerate}
            disabled={isRegenerating || !prompt.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            size="lg"
          >
            {isRegenerating ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Regenerating...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Regenerate Storyboard
              </>
            )}
          </Button>
          {!prompt.trim() && (
            <p className="text-xs text-amber-400 mt-2 text-center">
              Please enter a prompt to regenerate
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

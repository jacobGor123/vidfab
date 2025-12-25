/**
 * Step 3 - Storyboard Card
 * 单个分镜卡片组件
 */

'use client'

import { Card, CardContent } from '@/components/ui/card'
import ViewportMount from './ViewportMount'
import { showConfirm } from '@/lib/utils/toast'
import type { DisplayItem } from './Step3StoryboardGen.types'

interface Step3StoryboardCardProps {
  item: DisplayItem
  aspectRatioClass: string
  regeneratingShot: number | null
  isShowingConfirm: boolean
  expandedPrompts: Record<number, boolean>
  customPrompts: Record<number, string>
  onRegenerateClick: (shotNumber: number) => void
  onTogglePrompt: (shotNumber: number) => void
  onUpdatePrompt: (shotNumber: number, prompt: string) => void
  getDefaultPrompt: (shotNumber: number) => string
  setIsShowingConfirm: (value: boolean) => void
}

export function Step3StoryboardCard({
  item,
  aspectRatioClass,
  regeneratingShot,
  isShowingConfirm,
  expandedPrompts,
  customPrompts,
  onRegenerateClick,
  onTogglePrompt,
  onUpdatePrompt,
  getDefaultPrompt,
  setIsShowingConfirm
}: Step3StoryboardCardProps) {
  const handleRegenerateClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // 防止多个确认对话框或已有任务在进行
    if (isShowingConfirm || regeneratingShot !== null) {
      return
    }

    setIsShowingConfirm(true)
    const confirmed = await showConfirm(
      'The current image will be replaced.',
      {
        title: 'Regenerate Storyboard',
        confirmText: 'Regenerate',
        cancelText: 'Cancel'
      }
    )
    setIsShowingConfirm(false)

    if (confirmed) {
      onRegenerateClick(item.shot_number)
    }
  }

  return (
    <Card key={item.shot_number} className="overflow-hidden">
      <CardContent className="p-0">
        <div className={`relative ${aspectRatioClass} bg-muted`}>
          {item.status === 'pending' ? (
            // 骨架屏占位
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-muted-foreground/20 border-t-muted-foreground/40 rounded-full animate-pulse mx-auto mb-2" />
                <div className="text-xs text-muted-foreground/60">Waiting...</div>
              </div>
            </div>
          ) : item.status === 'generating' ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 animate-pulse">
              <div className="text-center">
                {/* 增强的轮询动画 */}
                <div className="relative w-16 h-16 mx-auto mb-3">
                  {/* 外圈旋转 */}
                  <div className="absolute inset-0 border-4 border-primary/20 border-t-primary/60 border-r-primary/40 rounded-full animate-spin" />
                  {/* 内圈反向旋转 */}
                  <div className="absolute inset-2 border-4 border-primary/30 border-b-primary/70 border-l-primary/50 rounded-full animate-spin-reverse" style={{ animationDuration: '1.5s' }} />
                  {/* 中心点脉冲 */}
                  <div className="absolute inset-6 bg-primary/30 rounded-full animate-pulse" />
                </div>
                <div className="text-sm font-medium text-primary mb-1">Regenerating...</div>
                <div className="text-xs text-muted-foreground">Please wait</div>
              </div>
            </div>
          ) : item.status === 'success' && item.image_url ? (
            <ViewportMount
              className="absolute inset-0"
              placeholder={
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-8 h-8 border-4 border-primary/10 border-t-primary/40 rounded-full animate-pulse mx-auto mb-2" />
                    <div className="text-xs text-muted-foreground/70">Image ready</div>
                  </div>
                </div>
              }
            >
              <img
                src={item.image_url}
                alt={`Shot ${item.shot_number}`}
                className="w-full h-full object-contain"
                loading="lazy"
                decoding="async"
              />
            </ViewportMount>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-3xl mb-2">❌</div>
                <div className="text-xs text-destructive">Failed</div>
              </div>
            </div>
          )}
        </div>
        <div className="p-3 space-y-2">
          {/* 标题行 */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Shot {item.shot_number}</span>
          </div>

          {/* 操作按钮行 */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onTogglePrompt(item.shot_number)}
              className="flex-1 text-xs text-left px-2 py-1.5 rounded bg-muted/30 hover:bg-muted/60 text-muted-foreground hover:text-primary transition-colors"
              title={expandedPrompts[item.shot_number] ? "Hide prompt" : "Edit prompt"}
            >
              {expandedPrompts[item.shot_number] ? '▼ Prompt' : '▶ Prompt'}
            </button>

            {/* 重新生成按钮（仅在有图片时显示）*/}
            {(item.status === 'success' || item.status === 'failed') && (
              <button
                onClick={handleRegenerateClick}
                disabled={regeneratingShot !== null || isShowingConfirm}
                className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                title={regeneratingShot !== null && regeneratingShot !== item.shot_number ? "Another regeneration is in progress" : "Regenerate this storyboard"}
              >
                {regeneratingShot === item.shot_number ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-medium">Regenerating</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    <span className="text-xs font-medium">
                      {item.status === 'failed' ? 'Retry' : 'Regenerate'}
                    </span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Prompt 输入框 */}
          {expandedPrompts[item.shot_number] && (
            <div className="space-y-2 pt-2 border-t">
              <label className="text-xs text-muted-foreground">Custom Prompt:</label>
              <textarea
                value={customPrompts[item.shot_number] || getDefaultPrompt(item.shot_number)}
                onChange={(e) => onUpdatePrompt(item.shot_number, e.target.value)}
                className="w-full text-xs p-2 bg-muted/50 border border-muted rounded resize-none focus:outline-none focus:border-primary"
                rows={3}
                placeholder="Enter custom prompt for storyboard generation..."
              />
              <p className="text-xs text-muted-foreground/70">
                Modify the prompt and click regenerate to create a new storyboard
              </p>
            </div>
          )}

          {item.error_message && (
            <p className="text-xs text-destructive">{item.error_message}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

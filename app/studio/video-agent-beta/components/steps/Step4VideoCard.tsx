/**
 * Step 4 - Video Card
 * 单个视频卡片组件
 */

'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import ViewportMount from './ViewportMount'
import { showConfirm } from '@/lib/utils/toast'
import { RefreshCw, FileText, Clapperboard, Clock } from 'lucide-react'  // 🔥 添加 Clock 图标
import { FieldsEditor, type Field } from '../common/FieldsEditor'
import type { DisplayVideoItem } from './Step4VideoGen.types'
import type { Shot } from '@/lib/types/video-agent'

interface Step4VideoCardProps {
  item: DisplayVideoItem
  shot: Shot | undefined  // 🔥 新增：完整的 Shot 对象
  aspectRatioClass: string
  retryingShot: number | null
  isShowingConfirm: boolean
  expandedPrompts: Record<number, boolean>
  customPrompts: Record<number, string>
  onRetryClick: (shotNumber: number) => void
  onTogglePrompt: (shotNumber: number) => void
  onUpdatePrompt: (shotNumber: number, prompt: string) => void
  getDefaultPrompt: (shotNumber: number) => string  // 保留用于向后兼容
  setIsShowingConfirm: (value: boolean) => void
}

export function Step4VideoCard({
  item,
  shot,  // 🔥 新增
  aspectRatioClass,
  retryingShot,
  isShowingConfirm,
  expandedPrompts,
  customPrompts,
  onRetryClick,
  onTogglePrompt,
  onUpdatePrompt,
  getDefaultPrompt,
  setIsShowingConfirm
}: Step4VideoCardProps) {
  // 🔥 字段编辑状态
  const [editFields, setEditFields] = useState<{
    description: string
    character_action: string
    duration_seconds: number  // 🔥 新增：时长字段
  } | null>(null)

  // 🔥 从 customPrompts 解析字段（如果是 JSON 格式）
  const parsedFields = useMemo(() => {
    const customPrompt = customPrompts[item.shot_number]
    if (!customPrompt) return null

    try {
      const parsed = JSON.parse(customPrompt)
      if (parsed && typeof parsed === 'object') {
        return {
          description: parsed.description,
          character_action: parsed.character_action,
          duration_seconds: parsed.duration_seconds  // 🔥 新增：解析时长
        } as typeof editFields
      }
    } catch {
      // 不是 JSON，忽略
    }
    return null
  }, [customPrompts, item.shot_number])

  // 🔥 获取当前编辑字段（优先使用本地状态，其次使用 parsedFields，最后使用 shot 原始值）
  const currentFields = editFields || parsedFields || {
    description: shot?.description || getDefaultPrompt(item.shot_number),
    character_action: shot?.character_action || '',
    duration_seconds: Math.max(4, shot?.duration_seconds || 5)
  }

  const handleRetryClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // 防止多个确认对话框或已有任务在进行
    if (isShowingConfirm || retryingShot !== null) {
      return
    }

    setIsShowingConfirm(true)
    const confirmed = await showConfirm(
      'The current video will be replaced.',
      {
        title: 'Regenerate Video',
        confirmText: 'Regenerate',
        cancelText: 'Cancel'
      }
    )
    setIsShowingConfirm(false)

    if (confirmed) {
      // 🔥 如果有编辑字段，将其序列化为 JSON 字符串
      if (editFields) {
        const customPrompt = JSON.stringify(editFields)
        onUpdatePrompt(item.shot_number, customPrompt)
      }
      onRetryClick(item.shot_number)
    }
  }

  // 🔥 处理字段变化
  const handleFieldChange = (name: string, value: string) => {
    setEditFields(prev => ({
      ...(prev || currentFields),
      [name]: name === 'duration_seconds' ? parseInt(value, 10) : value  // 🔥 duration 转换为数字
    }))
  }

  // 🔥 重置字段
  const handleReset = () => {
    setEditFields(null)
    onUpdatePrompt(item.shot_number, '')
  }

  // 🔥 字段定义 - Scene Description 独立字段
  const descriptionField: Field = {
    name: 'description',
    label: 'Scene Description',
    value: currentFields.description,
    placeholder: 'Describe what is happening in this scene...',
    required: true,
    rows: 3,
    maxLength: 500,
    helpText: 'What is the main focus of this scene?',
    icon: FileText
  }

  // 🔥 Character Action + Duration 字段（用于并排显示）
  const characterActionField: Field = {
    name: 'character_action',
    label: 'Character Action',
    value: currentFields.character_action,
    placeholder: 'What are the characters doing?',
    required: true,
    rows: 3,
    maxLength: 500,
    helpText: 'Describe character movements and interactions',
    icon: Clapperboard
  }

  const durationField: Field = {
    name: 'duration_seconds',
    label: 'Duration',
    type: 'select',
    value: String(currentFields.duration_seconds),
    options: [
      { value: '4', label: '4s' },
      { value: '5', label: '5s' },
      { value: '6', label: '6s' },
      { value: '7', label: '7s' },
      { value: '8', label: '8s' },
      { value: '9', label: '9s' },
      { value: '10', label: '10s' },
      { value: '11', label: '11s' },
      { value: '12', label: '12s' }
    ],
    required: true,
    helpText: 'Video duration for this shot',
    icon: Clock
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
                <div className="text-xs text-muted-foreground">This may take 30-60s</div>
              </div>
            </div>
          ) : item.status === 'success' && item.video_url ? (
            <ViewportMount
              className="absolute inset-0"
              placeholder={
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-8 h-8 border-4 border-primary/20 border-t-primary/60 rounded-full animate-pulse mx-auto mb-2" />
                    <div className="text-xs text-muted-foreground/70">Video ready</div>
                  </div>
                </div>
              }
            >
              <video
                src={item.video_url}
                poster={item.poster_url}
                controls
                className="w-full h-full object-contain"
                preload="none"
                playsInline
                onError={(e) => {
                  console.error('[Video Playback] Failed to load video:', {
                    shotNumber: item.shot_number,
                    videoUrl: item.video_url,
                    error: e.currentTarget.error
                  })
                }}
                onLoadedMetadata={() => {
                  console.log('[Video Playback] Video loaded successfully:', {
                    shotNumber: item.shot_number,
                    videoUrl: item.video_url
                  })
                }}
              >
                Your browser does not support the video tag.
              </video>
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

            {/* 重新生成按钮（仅在有视频时显示）*/}
            {(item.status === 'success' || item.status === 'failed') && (
              <button
                onClick={handleRetryClick}
                disabled={retryingShot !== null || isShowingConfirm}
                className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                title={retryingShot !== null && retryingShot !== item.shot_number ? "Another regeneration is in progress" : "Regenerate this video"}
              >
                {retryingShot === item.shot_number ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span className="text-xs font-medium">Regenerating</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">
                      {item.status === 'failed' ? 'Retry' : 'Regenerate'}
                    </span>
                  </>
                )}
              </button>
            )}
          </div>
          {item.status === 'success' && item.duration && (
            <div className="text-xs text-muted-foreground">{item.duration}s</div>
          )}
          {item.error_message && (
            <p className="text-xs text-destructive">{item.error_message}</p>
          )}

          {/* 🔥 字段编辑器 - 自定义布局 */}
          {expandedPrompts[item.shot_number] && (
            <div className="space-y-3 pt-2 border-t">
              {/* Scene Description - 单独一行 */}
              <div className="space-y-1">
                <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <FileText className="w-3.5 h-3.5" />
                  <span>{descriptionField.label}</span>
                  {descriptionField.required && <span className="text-red-400">*</span>}
                </label>
                <textarea
                  value={descriptionField.value}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  placeholder={descriptionField.placeholder}
                  rows={descriptionField.rows}
                  maxLength={descriptionField.maxLength}
                  className="w-full text-xs p-2 bg-muted/50 border border-muted focus:border-primary rounded resize-none focus:outline-none transition-colors"
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground/60">{descriptionField.helpText}</p>
                  <div className="text-xs tabular-nums text-muted-foreground/50">
                    {descriptionField.value.length}/{descriptionField.maxLength}
                  </div>
                </div>
              </div>

              {/* Character Action + Duration - 并排显示 */}
              <div className="grid grid-cols-2 gap-3">
                {/* Character Action */}
                <div className="space-y-1">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Clapperboard className="w-3.5 h-3.5" />
                    <span>{characterActionField.label}</span>
                    {characterActionField.required && <span className="text-red-400">*</span>}
                  </label>
                  <textarea
                    value={characterActionField.value}
                    onChange={(e) => handleFieldChange('character_action', e.target.value)}
                    placeholder={characterActionField.placeholder}
                    rows={characterActionField.rows}
                    maxLength={characterActionField.maxLength}
                    className="w-full text-xs p-2 bg-muted/50 border border-muted focus:border-primary rounded resize-none focus:outline-none transition-colors"
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground/60">{characterActionField.helpText}</p>
                    <div className="text-xs tabular-nums text-muted-foreground/50">
                      {characterActionField.value.length}/{characterActionField.maxLength}
                    </div>
                  </div>
                </div>

                {/* Duration */}
                <div className="space-y-1">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{durationField.label}</span>
                    {durationField.required && <span className="text-red-400">*</span>}
                  </label>
                  <select
                    value={durationField.value}
                    onChange={(e) => handleFieldChange('duration_seconds', e.target.value)}
                    className="w-full text-xs p-2 bg-muted/50 border border-muted focus:border-primary rounded focus:outline-none transition-colors"
                  >
                    {durationField.options?.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground/60">{durationField.helpText}</p>
                </div>
              </div>

              {/* 自动添加信息提示 */}
              <div className="p-2.5 bg-primary/5 border border-primary/10 rounded text-xs text-muted-foreground leading-relaxed">
                Character consistency (BytePlus mode) and subtitle restrictions will be automatically added
              </div>

              {/* Reset 按钮 */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleReset}
                  className="text-xs px-3 py-2 bg-muted/30 hover:bg-muted/60 text-muted-foreground rounded transition-colors font-medium"
                >
                  Reset
                </button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

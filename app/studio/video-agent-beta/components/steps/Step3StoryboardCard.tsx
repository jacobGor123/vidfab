/**
 * Step 3 - Storyboard Card
 * 单个分镜卡片组件
 */

'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import ViewportMount from './ViewportMount'
import { showConfirm } from '@/lib/utils/toast'
import { FieldsEditor, type Field } from '../common/FieldsEditor'
import { FileText, Camera, Clapperboard, Drama, Trash2 } from 'lucide-react'  // 🔥 添加 Trash2 图标
import type { DisplayItem } from './Step3StoryboardGen.types'
import type { Shot } from '@/lib/types/video-agent'

interface Step3StoryboardCardProps {
  item: DisplayItem
  shot: Shot | undefined  // 🔥 新增：完整的 Shot 对象
  aspectRatioClass: string
  regeneratingShot: number | null
  deletingShot: number | null  // 🔥 新增
  isShowingConfirm: boolean
  expandedPrompts: Record<number, boolean>
  customPrompts: Record<number, string>
  onRegenerateClick: (shotNumber: number) => void
  onDeleteClick: (shotNumber: number) => void  // 🔥 新增
  onTogglePrompt: (shotNumber: number) => void
  onUpdatePrompt: (shotNumber: number, prompt: string) => void
  getDefaultPrompt: (shotNumber: number) => string  // 保留用于向后兼容
  setIsShowingConfirm: (value: boolean) => void
}

export function Step3StoryboardCard({
  item,
  shot,  // 🔥 新增
  aspectRatioClass,
  regeneratingShot,
  deletingShot,  // 🔥 新增
  isShowingConfirm,
  expandedPrompts,
  customPrompts,
  onRegenerateClick,
  onDeleteClick,  // 🔥 新增
  onTogglePrompt,
  onUpdatePrompt,
  getDefaultPrompt,
  setIsShowingConfirm
}: Step3StoryboardCardProps) {
  // 🔥 字段编辑状态
  const [editFields, setEditFields] = useState<{
    description: string
    camera_angle: string
    character_action: string
    mood: string
  } | null>(null)

  // 🔥 从 customPrompts 解析字段（如果是 JSON 格式）
  const parsedFields = useMemo(() => {
    const customPrompt = customPrompts[item.shot_number]
    if (!customPrompt) return null

    try {
      const parsed = JSON.parse(customPrompt)
      if (parsed && typeof parsed === 'object') {
        return parsed as typeof editFields
      }
    } catch {
      // 不是 JSON，忽略
    }
    return null
  }, [customPrompts, item.shot_number])

  // 🔥 获取当前编辑字段（优先使用本地状态，其次使用 parsedFields，最后使用 shot 原始值）
  const currentFields = editFields || parsedFields || {
    description: shot?.description || getDefaultPrompt(item.shot_number),
    camera_angle: shot?.camera_angle || '',
    character_action: shot?.character_action || '',
    mood: shot?.mood || ''
  }

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
      // 🔥 如果有编辑字段，将其序列化为 JSON 字符串
      if (editFields) {
        const customPrompt = JSON.stringify(editFields)
        onUpdatePrompt(item.shot_number, customPrompt)
      }
      onRegenerateClick(item.shot_number)
    }
  }

  // 🔥 处理字段变化
  const handleFieldChange = (name: string, value: string) => {
    setEditFields(prev => ({
      ...(prev || currentFields),
      [name]: value
    }))
  }

  // 🔥 重置字段
  const handleReset = () => {
    setEditFields(null)
    onUpdatePrompt(item.shot_number, '')
  }

  // 🔥 字段定义
  const fields: Field[] = [
    {
      name: 'description',
      label: 'Scene Description',
      value: currentFields.description,
      placeholder: 'Describe what is happening in this scene...',
      required: true,
      rows: 3,
      maxLength: 500,
      helpText: 'What is the main focus of this scene?',
      icon: FileText
    },
    {
      name: 'camera_angle',
      label: 'Camera Angle',
      value: currentFields.camera_angle,
      placeholder: 'e.g., Wide shot, Close-up, Over-the-shoulder...',
      rows: 2,
      maxLength: 200,
      helpText: 'Shot composition and framing',
      icon: Camera
    },
    {
      name: 'character_action',
      label: 'Character Action',
      value: currentFields.character_action,
      placeholder: 'What are the characters doing?',
      required: true,
      rows: 3,
      maxLength: 500,
      helpText: 'Describe character movements and interactions',
      icon: Clapperboard
    },
    {
      name: 'mood',
      label: 'Mood/Atmosphere',
      value: currentFields.mood,
      placeholder: 'e.g., Warm and welcoming, Tense, Mysterious...',
      rows: 2,
      maxLength: 200,
      helpText: 'Emotional tone and ambiance',
      icon: Drama
    }
  ]

  return (
    <Card key={item.shot_number} className="overflow-hidden group">
      <CardContent className="p-0 relative">
        {/* 🔥 删除按钮 - 只在分镜图生成成功后显示 */}
        {item.status === 'success' && item.image_url && (
          <button
            onClick={() => onDeleteClick(item.shot_number)}
            disabled={deletingShot !== null || regeneratingShot !== null}
            className="absolute top-2 right-2 z-10 p-2 bg-red-500/90 hover:bg-red-600 text-white rounded-lg transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            title="Delete this shot"
          >
            {deletingShot === item.shot_number ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </button>
        )}

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

          {/* 🔥 字段编辑器 */}
          {expandedPrompts[item.shot_number] && (
            <FieldsEditor
              fields={fields}
              onChange={handleFieldChange}
              onReset={handleReset}
              autoAddedInfo="Character consistency, visual style, and quality constraints will be automatically added"
            />
          )}

          {item.error_message && (
            <p className="text-xs text-destructive">{item.error_message}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

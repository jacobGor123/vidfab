/**
 * StoryboardCardEnhanced Component
 *
 * 增强版分镜卡片 - 在原有基础上添加分镜图显示和 Edit 按钮
 */

'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Clock, Video, Smile, Users, Edit3, Loader2, AlertCircle, Film, Trash2, ImagePlus } from 'lucide-react'
import type { Shot, Storyboard } from '@/lib/stores/video-agent'

interface StoryboardCardEnhancedProps {
  shot: Shot
  storyboard?: Storyboard
  isGenerating: boolean
  onEdit: () => void
  onDelete?: () => void
  onFieldChange: (field: 'description' | 'camera_angle' | 'mood', value: string) => void
  getFieldValue: (field: 'description' | 'camera_angle' | 'mood', originalValue: string) => string
}

export function StoryboardCardEnhanced({
  shot,
  storyboard,
  isGenerating,
  onEdit,
  onDelete,
  onFieldChange,
  getFieldValue
}: StoryboardCardEnhancedProps) {
  return (
    <Card className="group relative bg-slate-900/40 hover:bg-slate-900/60 border border-slate-800 hover:border-slate-700 rounded-xl overflow-hidden transition-all duration-300">
      <CardContent className="p-8" style={{ padding: '32px' }}>
        <div className="flex flex-row gap-5 relative isolate" style={{ display: 'flex', flexDirection: 'row', gap: '20px' }}>
          {/* Shot Number Column - Fixed Width */}
          <div className="w-12 flex-none flex flex-col items-center gap-2 pt-1 relative z-10" style={{ width: '48px', flex: 'none' }}>
            <div className="text-2xl font-bold text-slate-600 group-hover:text-blue-500 transition-colors font-mono">
              {shot.shot_number.toString().padStart(2, '0')}
            </div>
            {/* 删除按钮 */}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete()
                }}
                className="mt-2 p-2 text-red-400/80 hover:text-red-300 bg-red-950/30 hover:bg-red-900/50 border border-red-900/50 rounded-lg transition-all duration-200 group/delete"
                title="Delete shot"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* 🔥 中间：分镜描述 (Flex-1 自适应) */}
          <div className="flex-1 min-w-0 space-y-3 relative z-10" style={{ flex: '1', minWidth: '0' }}>
            {/* Time Range */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-950/50 border border-slate-800 text-xs font-mono text-slate-400">
                <Clock className="w-3 h-3" />
                <span className="text-slate-300">{shot.time_range}</span>
              </span>
            </div>

            {/* 可编辑的分镜描述 */}
            <Textarea
              value={getFieldValue('description', shot.description)}
              onChange={(e) => onFieldChange('description', e.target.value)}
              className="text-sm text-slate-200 leading-relaxed bg-slate-900/50 border-slate-700/50 focus:border-blue-500/50 resize-none min-h-[100px]"
              placeholder="Describe this shot..."
            />

            {/* Fields: Camera Angle & Mood */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Video className="w-3 h-3" />
                  Camera Angle
                </label>
                <Input
                  value={getFieldValue('camera_angle', shot.camera_angle)}
                  onChange={(e) => onFieldChange('camera_angle', e.target.value)}
                  className="h-8 text-sm bg-slate-900/50 border-slate-700/50 text-indigo-300"
                  placeholder="e.g. Close-up"
                />
              </div>
              <div className="space-y-1">
                <label className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Smile className="w-3 h-3" />
                  Mood
                </label>
                <Input
                  value={getFieldValue('mood', shot.mood)}
                  onChange={(e) => onFieldChange('mood', e.target.value)}
                  className="h-8 text-sm bg-slate-900/50 border-slate-700/50 text-rose-300"
                  placeholder="e.g. Tense"
                />
              </div>
            </div>

            {/* Characters */}
            {shot.characters && shot.characters.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-800/50 border border-slate-700/50 text-xs text-slate-400">
                  <Users className="w-3 h-3" />
                  {shot.characters.join(', ')}
                </span>
              </div>
            )}
          </div>

          {/* 🔥 右侧：分镜图（固定 280px） */}
          <div className="w-[280px] flex-none relative z-10" style={{ width: '280px', flex: 'none' }}>
            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-xs text-slate-500">
                <Film className="w-3 h-3" />
                Storyboard
              </label>

              <div className="relative group/image overflow-hidden rounded-lg bg-slate-950 isolate" style={{ overflow: 'hidden' }}>
                {storyboard?.image_url ? (
                  <>
                    <img
                      src={storyboard.image_url}
                      alt={`Storyboard ${shot.shot_number}`}
                      className="w-full h-auto object-contain rounded-lg border border-slate-700"
                      style={{ width: '100%', height: 'auto', display: 'block' }}
                    />
                    {/* Edit 按钮 - 悬浮显示 */}
                    <button
                      onClick={onEdit}
                      className="absolute top-2 right-2 px-2 py-1 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-blue-500 rounded-md shadow-lg opacity-0 group-hover/image:opacity-100 transition-all duration-200 flex items-center gap-1.5 text-xs font-medium text-slate-200 z-20"
                    >
                      <Edit3 className="w-3 h-3" />
                      Edit
                    </button>
                  </>
                ) : storyboard?.status === 'failed' ? (
                  <div className="aspect-[4/3] bg-red-950/20 rounded-lg border border-red-800/50 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2 text-red-400">
                      <AlertCircle className="w-6 h-6" />
                      <span className="text-xs">Failed</span>
                      <button
                        onClick={onEdit}
                        className="px-2 py-1 bg-red-900/50 hover:bg-red-900 border border-red-700 rounded text-xs font-medium text-red-200"
                      >
                        Retry
                      </button>
                    </div>
                  </div>
                ) : storyboard?.status === 'generating' ? (
                  // 正在生成中 - 显示加载动画
                  <div className="aspect-[4/3] bg-slate-950/50 rounded-lg border border-slate-800 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <span className="text-xs">Generating...</span>
                    </div>
                  </div>
                ) : (
                  // 🔥 新增：占位状态 - 没有图片且不在生成中，显示可点击的占位图
                  <button
                    onClick={onEdit}
                    className="w-full aspect-[4/3] bg-slate-900/50 hover:bg-slate-800/50 rounded-lg border-2 border-dashed border-slate-700 hover:border-blue-500 flex items-center justify-center transition-all duration-200 cursor-pointer group/placeholder"
                  >
                    <div className="flex flex-col items-center gap-2 text-slate-500 group-hover/placeholder:text-blue-400 transition-colors">
                      <ImagePlus className="w-8 h-8" />
                      <span className="text-xs font-medium">Click to Generate</span>
                    </div>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

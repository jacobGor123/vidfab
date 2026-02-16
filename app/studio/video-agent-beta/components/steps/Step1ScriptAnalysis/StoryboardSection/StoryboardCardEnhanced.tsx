/**
 * StoryboardCardEnhanced Component
 *
 * 增强版分镜卡片 - 包含分镜图和视频卡片
 * 布局: Shot Number (48px) | Description (flex-1) | Storyboard (220px) | Video (220px)
 */

'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Clock, Video, Smile, Users, Edit3, Loader2, AlertCircle, Film, Trash2, ImagePlus } from 'lucide-react'
import type { Shot, Storyboard, VideoClip, Character } from '@/lib/stores/video-agent'
import { VideoCardCompact } from './VideoCardCompact'

function isValidImageSrc(src: string): boolean {
  if (!src) return false
  // Avoid rendering a broken/blank <img> when the URL is briefly invalid.
  // This can happen during rapid regenerate -> store -> revalidate transitions.
  return src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:') || src.startsWith('/')
}

function resolveStoryboardSrc(storyboard?: Storyboard): string | undefined {
  if (!storyboard) return undefined

  // 🔥 混合方案："Fast then Stable"
  // 1. 优先使用稳定的 CDN URL（cdn_url 或 image_url）
  // 2. 如果 storage 还在 pending，使用代理的 external URL 作为快速预览
  // 3. 一旦 storage 完成，自动切换到稳定 CDN

  const stableUrl = storyboard.cdn_url || storyboard.image_url
  const externalUrl = storyboard.image_url_external

  // 代理外部URL（防止签名过期导致浏览器直接访问失败）
  const proxiedExternalUrl = externalUrl
    ? `/api/video-agent/proxy-image?u=${encodeURIComponent(externalUrl)}`
    : undefined

  // 策略：storage pending时优先用external（快），完成后优先用stable（可靠）
  const preferred = storyboard.storage_status === 'pending'
    ? (proxiedExternalUrl || stableUrl)
    : (stableUrl || proxiedExternalUrl)

  if (!preferred) return undefined

  // 添加时间戳防止缓存
  // 🔥 关键修复：BytePlus的签名URL已经有查询参数，使用&而不是?
  if (storyboard.updated_at) {
    const separator = preferred.includes('?') ? '&' : '?'
    return `${preferred}${separator}t=${encodeURIComponent(storyboard.updated_at)}`
  }
  return preferred
}

function normalizeCharacterName(name: string): { baseName: string; legacyDetail?: string } {
  const raw = String(name || '').trim()
  const leftParen = raw.indexOf('(')
  if (leftParen === -1) return { baseName: raw }
  const baseName = raw.slice(0, leftParen).trim()
  const legacyDetail = raw.slice(leftParen).trim()
  return { baseName, legacyDetail }
}

function getLatestCharacterPrompt(
  projectCharacters: Character[] | undefined,
  baseName: string
): string | undefined {
  if (!Array.isArray(projectCharacters)) return undefined
  const key = baseName.trim().toLowerCase()

  // Match both store-format and DB-format fields.
  const match = projectCharacters.find((c: any) => {
    const n = String((c as any)?.character_name || (c as any)?.name || '').trim().toLowerCase()
    return n === key
  }) as any

  const prompt = match?.generation_prompt || match?.generationPrompt || match?.generation_prompt || null
  return typeof prompt === 'string' && prompt.trim() ? prompt.trim() : undefined
}

function getLatestCharacterDisplayName(
  projectCharacters: Character[] | undefined,
  baseName: string
): string {
  if (!Array.isArray(projectCharacters)) return baseName
  const key = baseName.trim().toLowerCase()
  const match = projectCharacters.find((c: any) => {
    const n = String((c as any)?.character_name || (c as any)?.name || '').trim().toLowerCase()
    return n === key
  }) as any
  return String(match?.character_name || match?.name || baseName)
}

interface StoryboardCardEnhancedProps {
  shot: Shot
  storyboard?: Storyboard
  projectCharacters?: Character[]
  videoClip?: VideoClip
  isStoryboardGenerating: boolean
  isVideoGenerating: boolean
  aspectRatio: '16:9' | '9:16'
  customVideoPrompt?: string
  onEdit: () => void
  onDelete?: () => void
  onFieldChange: (field: 'description', value: string) => void
  getFieldValue: (field: 'description', originalValue: string) => string
  onGenerateVideo: (prompt: string, duration: number, resolution: string) => void  // 🔥 添加 duration 和 resolution 参数
  onUpdateVideoPrompt: (prompt: string) => void
}

export function StoryboardCardEnhanced({
  shot,
  storyboard,
  projectCharacters,
  videoClip,
  isStoryboardGenerating,
  isVideoGenerating,
  aspectRatio,
  customVideoPrompt,
  onEdit,
  onDelete,
  onFieldChange,
  getFieldValue,
  onGenerateVideo,
  onUpdateVideoPrompt
}: StoryboardCardEnhancedProps) {
  // 检查分镜图是否已生成（用于禁用视频生成）
  const hasStoryboard = storyboard?.status === 'success' && storyboard?.image_url
  const isStoryboardOutdated = storyboard?.status === 'outdated'
  const resolvedStoryboardSrc = resolveStoryboardSrc(storyboard)
  const isGenerating = storyboard?.status === 'generating' || isStoryboardGenerating

  return (
    <Card
      className="group relative border border-slate-700/50 rounded-xl overflow-hidden transition-all duration-300"
      style={{
        background: 'rgba(58, 51, 80, 0.6)'
      }}
    >
      <CardContent className="p-6">
        {/* 删除按钮 - 右上角绝对定位 */}
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="absolute top-4 right-4 p-2 text-red-400/80 hover:text-red-300 bg-red-950/30 hover:bg-red-900/50 border border-red-900/50 rounded-lg transition-all duration-200 z-10"
            title="Delete shot"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}

        {/* Shot Number + Time Range - 顶部 */}
        <div className="flex items-center gap-3 flex-wrap mb-4">
          <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-950/50 border border-slate-800 text-xs font-mono text-slate-400">
            <Film className="w-3 h-3" />
            <span className="text-slate-300">{shot.shot_number.toString().padStart(2, '0')}</span>
          </span>
          <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-950/50 border border-slate-800 text-xs font-mono text-slate-400">
            <Clock className="w-3 h-3" />
            <span className="text-slate-300">{shot.time_range}</span>
          </span>
        </div>

        {/* 左右两列布局 - 移动端单列，桌面端双列 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 左列 - Storyboard */}
          <div className="space-y-3">
            <label className="flex items-center gap-1.5 text-xs text-slate-400 font-medium pb-2 border-b border-slate-700/50">
              <Film className="w-3.5 h-3.5" />
              Storyboard
            </label>

            {/* 分镜描述 + 分镜图 - 移动端垂直，桌面端水平 */}
            <div className="flex flex-col sm:flex-row gap-4">
              {/* 分镜描述文字 */}
              <div className="flex-1 text-sm text-slate-200 leading-relaxed bg-slate-900/50 border border-slate-700/50 rounded-md p-4">
                {getFieldValue('description', shot.description)}
              </div>

              {/* 分镜图 + 按钮（右侧垂直排列）- 移动端全宽，桌面端固定 200px */}
              <div className="space-y-2 w-full sm:w-auto sm:flex-shrink-0 sm:basis-[200px]">
                <div className="relative group/image overflow-hidden rounded-lg">
                {/* 状态徽章 */}
                {storyboard?.status === 'outdated' && !isGenerating && (
                  <div className="absolute top-2 right-2 z-30 px-2 py-1 rounded-md bg-yellow-950/90 text-yellow-400 border border-yellow-800 text-[10px] font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Outdated
                  </div>
                )}

                {/* 🔥 修复：优先检查数据（有图片就显示），而不是全局状态 */}
                {storyboard && resolvedStoryboardSrc && isValidImageSrc(resolvedStoryboardSrc) ? (
                  <>
                    <img
                      key={`storyboard-${storyboard.id}-${storyboard.updated_at || 'initial'}`}
                      src={resolvedStoryboardSrc}
                      alt={`Storyboard ${shot.shot_number}`}
                      className={`w-full max-h-[200px] object-cover rounded-lg border border-slate-700 transition-all duration-300 ${isGenerating ? 'opacity-50 grayscale pointer-events-none' : ''}`}
                      loading="lazy"
                      decoding="async"
                      onError={(e) => {
                        // If the browser fails to decode the image (rare, but can happen with partial
                        // downloads or stale in-memory caches), retry once with a fresh cache-buster.
                        const img = e.currentTarget
                        const base = resolveStoryboardSrc(storyboard)?.split('?t=')[0] || storyboard?.image_url
                        if (!base) return

                        // Prevent infinite loops.
                        if (img.dataset.retry === '1') return
                        img.dataset.retry = '1'
                        img.src = `${base}?t=${encodeURIComponent(new Date().toISOString())}`
                      }}
                    />

                    {/* 🔥 Loading Overlay (when updating existing image) */}
                    {isGenerating && (
                      <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/20 backdrop-blur-[1px]">
                        <Loader2 className="w-8 h-8 text-blue-400 animate-spin shadow-lg" />
                        <span className="text-xs font-medium text-blue-200 mt-2 drop-shadow-md cursor-default">Updating...</span>
                      </div>
                    )}

                    {/* Edit 按钮 - 生成中隐藏 */}
                    {!isGenerating && (
                      <button
                        onClick={onEdit}
                        className="absolute top-2 right-2 px-2 py-1 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-blue-500 rounded-md shadow-lg opacity-0 group-hover/image:opacity-100 transition-all duration-200 flex items-center gap-1.5 text-xs font-medium text-slate-200 z-20"
                      >
                        <Edit3 className="w-3 h-3" />
                        Edit
                      </button>
                    )}
                  </>
                ) : storyboard?.status === 'failed' ? (
                  <div className="h-[200px] bg-red-950/20 rounded-lg border border-red-800/50 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2 text-red-400">
                      <AlertCircle className="w-5 h-5" />
                      <span className="text-xs">Failed</span>
                      <button
                        onClick={onEdit}
                        className="px-2 py-1 bg-red-900/50 hover:bg-red-900 border border-red-700 rounded text-xs font-medium text-red-200"
                      >
                        Retry
                      </button>
                    </div>
                  </div>
                ) : isGenerating ? (
                  <div className="h-[200px] bg-slate-950/50 rounded-lg border border-slate-800 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="text-xs">Generating...</span>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={onEdit}
                    className="w-full h-[200px] bg-slate-900/50 hover:bg-slate-800/50 rounded-lg border-2 border-dashed border-slate-700 hover:border-blue-500 flex items-center justify-center transition-all duration-200 cursor-pointer group/placeholder"
                  >
                    <div className="flex flex-col items-center gap-2 text-slate-500 group-hover/placeholder:text-blue-400 transition-colors">
                      <ImagePlus className="w-6 h-6" />
                      <span className="text-xs font-medium">Generate</span>
                    </div>
                  </button>
                )}
                </div>

                {/* Edit / Generate 按钮 - 在图片下方，与图片同宽 */}
                {hasStoryboard ? (
                  <button
                    onClick={onEdit}
                    className="w-full px-4 py-2.5 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 hover:border-blue-500 rounded-lg text-sm font-medium text-slate-200 transition-all flex items-center justify-center gap-2"
                  >
                    Edit
                  </button>
                ) : (
                  <button
                    onClick={onEdit}
                    className="w-full px-4 py-2.5 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 hover:border-blue-500 rounded-lg text-sm font-medium text-slate-200 transition-all flex items-center justify-center gap-2"
                  >
                    Generate
                  </button>
                )}
              </div>
            </div>

            {/* 角色信息 */}
            {Array.isArray(shot.characters) && shot.characters.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {shot.characters.map((rawName) => {
                  const { baseName } = normalizeCharacterName(rawName)
                  const latestName = getLatestCharacterDisplayName(projectCharacters, baseName)

                  return (
                    <span
                      key={rawName}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-800/50 border border-slate-700/50 text-xs text-slate-300"
                    >
                      <Users className="w-3 h-3 text-slate-400" />
                      <span className="text-slate-200">{latestName}</span>
                    </span>
                  )
                })}
              </div>
            )}
          </div>

          {/* 右列 - Video Clip */}
          <div className="space-y-3">
            <VideoCardCompact
              shotNumber={shot.shot_number}
              videoClip={videoClip}
              defaultPrompt={shot.character_action || ''}
              customPrompt={customVideoPrompt}
              defaultDuration={shot.duration_seconds}
              defaultResolution={shot.resolution || '720p'}
              aspectRatio={aspectRatio}
              isGenerating={isVideoGenerating}
              disabled={!hasStoryboard}
              onGenerate={onGenerateVideo}
              onUpdatePrompt={onUpdateVideoPrompt}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

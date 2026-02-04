/**
 * VideoCardCompact Component
 *
 * 紧凑版视频卡片 - 显示在分镜图旁边
 * 功能：
 * 1. 显示视频预览/加载动画/占位状态
 * 2. Prompt 输入框（默认填充 AI 生成的内容）
 * 3. 生成/重新生成按钮
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Video, Loader2, AlertCircle, Play, RefreshCw, ChevronDown, ChevronUp, Clock } from 'lucide-react'
import type { VideoClip } from '@/lib/stores/video-agent'

interface VideoCardCompactProps {
    shotNumber: number
    videoClip?: VideoClip
    defaultPrompt: string
    customPrompt?: string
    defaultDuration?: number  // 🔥 新增：默认时长
    aspectRatio: '16:9' | '9:16'
    isGenerating: boolean
    disabled?: boolean
    onGenerate: (prompt: string, duration: number) => void  // 🔥 修改：添加 duration 参数
    onUpdatePrompt: (prompt: string) => void
}

export function VideoCardCompact({
    shotNumber,
    videoClip,
    defaultPrompt,
    customPrompt,
    defaultDuration = 5,  // 🔥 新增：默认 5 秒
    aspectRatio,
    isGenerating,
    disabled = false,
    onGenerate,
    onUpdatePrompt
}: VideoCardCompactProps) {
    const [isPromptExpanded, setIsPromptExpanded] = useState(false)
    const [duration, setDuration] = useState(defaultDuration)  // 🔥 新增：时长状态

    // 使用自定义 prompt 或默认 prompt
    const currentPrompt = customPrompt ?? defaultPrompt

    // 计算状态
    const status = videoClip?.status || 'idle'
    const hasVideo = status === 'success' && videoClip?.video_url
    const isOutdated = status === 'outdated'
    const isFailed = status === 'failed'
    const isCurrentlyGenerating = status === 'generating' || isGenerating

    return (
        <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-xs text-slate-500">
                <Video className="w-3 h-3" />
                Video Clip
            </label>

            {/* 视频预览区域 - 使用固定高度与 Storyboard 保持一致 */}
            <div className="relative h-[200px] bg-slate-950 rounded-lg border border-slate-800 overflow-hidden">
                {hasVideo ? (
                    // 成功状态 - 显示视频
                    <video
                        src={videoClip.video_url}
                        poster={(videoClip as any)?.poster_url}
                        controls
                        className="w-full h-full object-contain"
                        preload="metadata"
                        playsInline
                    />
                ) : isOutdated ? (
                    // 过期状态
                    <div className="absolute inset-0 flex items-center justify-center bg-yellow-950/20">
                        <div className="text-center">
                            <AlertCircle className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                            <div className="text-xs text-yellow-400">Outdated</div>
                            <div className="text-[10px] text-yellow-400/70 mt-1 max-w-[180px]">
                                Regenerate recommended
                            </div>
                        </div>
                    </div>
                ) : isCurrentlyGenerating ? (
                    // 生成中状态
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-500/5 via-blue-500/10 to-blue-500/5">
                        <div className="text-center">
                            <div className="relative w-12 h-12 mx-auto mb-2">
                                <div className="absolute inset-0 border-4 border-blue-500/20 border-t-blue-500/60 rounded-full animate-spin" />
                                <div className="absolute inset-2 border-4 border-blue-500/30 border-b-blue-500/70 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
                            </div>
                            <div className="text-xs font-medium text-blue-400">Generating...</div>
                            <div className="text-[10px] text-slate-500 mt-1">30-60s</div>
                        </div>
                    </div>
                ) : isFailed ? (
                    // 失败状态
                    <div className="absolute inset-0 flex items-center justify-center bg-red-950/20">
                        <div className="text-center">
                            <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                            <div className="text-xs text-red-400">Failed</div>
                            {videoClip?.error_message && (
                                <div className="text-[10px] text-red-400/70 mt-1 max-w-[180px] truncate">
                                    {videoClip.error_message}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    // 空占位状态
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center text-slate-600">
                            <Play className="w-8 h-8 mx-auto mb-2" />
                            <div className="text-xs">No video yet</div>
                        </div>
                    </div>
                )}
            </div>

            {/* 编辑区 - 可折叠 */}
            <button
                onClick={() => setIsPromptExpanded(!isPromptExpanded)}
                className="w-full flex items-center justify-between px-2 py-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-900/50 hover:bg-slate-800/50 rounded transition-colors"
            >
                <span>Edit Fields</span>
                {isPromptExpanded ? (
                    <ChevronUp className="w-3 h-3" />
                ) : (
                    <ChevronDown className="w-3 h-3" />
                )}
            </button>

            {/* 🔥 Duration 在上，Character Action 在下 */}
            {isPromptExpanded && (
                <div className="space-y-3">
                    {/* Duration - 单独一行 */}
                    <div className="space-y-1">
                        <label className="flex items-center gap-1 text-[10px] text-slate-500">
                            <Clock className="w-3 h-3" />
                            <span>Duration</span>
                        </label>
                        <select
                            value={duration}
                            onChange={(e) => setDuration(parseInt(e.target.value, 10))}
                            disabled={isCurrentlyGenerating}
                            className="w-full text-xs p-2 bg-slate-900/50 border border-slate-700/50 focus:border-blue-500/50 rounded focus:outline-none transition-colors"
                        >
                            <option value={2}>2s</option>
                            <option value={3}>3s</option>
                            <option value={4}>4s</option>
                            <option value={5}>5s</option>
                            <option value={6}>6s</option>
                            <option value={7}>7s</option>
                            <option value={8}>8s</option>
                            <option value={9}>9s</option>
                            <option value={10}>10s</option>
                        </select>
                    </div>

                    {/* Character Action - 单独一行 */}
                    <div className="space-y-1">
                        <label className="flex items-center gap-1 text-[10px] text-slate-500">
                            <Video className="w-3 h-3" />
                            <span>Character Action</span>
                        </label>
                        <Textarea
                            value={currentPrompt}
                            onChange={(e) => onUpdatePrompt(e.target.value)}
                            placeholder="What is the character doing?"
                            className="text-xs bg-slate-900/50 border-slate-700/50 focus:border-blue-500/50 resize-none min-h-[60px]"
                            disabled={isCurrentlyGenerating}
                        />
                    </div>
                </div>
            )}

            {/* 生成按钮 */}
            <Button
                onClick={() => onGenerate(currentPrompt, duration)}  // 🔥 传递 duration 参数
                disabled={disabled || isCurrentlyGenerating || !currentPrompt.trim()}
                size="sm"
                variant={hasVideo ? 'outline' : 'default'}
                className={`w-full text-xs ${hasVideo
                    ? 'border-slate-700 hover:border-blue-500 hover:bg-blue-500/10'
                    : 'bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500'
                    }`}
            >
                {isCurrentlyGenerating ? (
                    <>
                        <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                        Generating...
                    </>
                ) : hasVideo ? (
                    <>
                        <RefreshCw className="w-3 h-3 mr-1.5" />
                        Regenerate
                    </>
                ) : isOutdated ? (
                    <>
                        <RefreshCw className="w-3 h-3 mr-1.5" />
                        Regenerate
                    </>
                ) : isFailed ? (
                    <>
                        <RefreshCw className="w-3 h-3 mr-1.5" />
                        Retry
                    </>
                ) : (
                    <>
                        <Video className="w-3 h-3 mr-1.5" />
                        Generate Video
                    </>
                )}
            </Button>
        </div>
    )
}

/**
 * VideoCardCompactSkeleton - 加载骨架屏
 */
export function VideoCardCompactSkeleton() {
    return (
        <div className="space-y-2 animate-pulse">
            <div className="h-4 w-20 bg-slate-800 rounded" />
            <div className="aspect-video bg-slate-800 rounded-lg" />
            <div className="h-8 bg-slate-800 rounded" />
            <div className="h-8 bg-slate-800 rounded" />
        </div>
    )
}

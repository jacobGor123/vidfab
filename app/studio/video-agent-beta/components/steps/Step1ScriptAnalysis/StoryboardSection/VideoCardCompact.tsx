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
import { Video, Loader2, AlertCircle, Play, RefreshCw, Clock, Monitor } from 'lucide-react'
import type { VideoClip } from '@/lib/stores/video-agent'

interface VideoCardCompactProps {
    shotNumber: number
    videoClip?: VideoClip
    defaultPrompt: string
    customPrompt?: string
    defaultDuration?: number  // 🔥 新增：默认时长
    defaultResolution?: string  // 🔥 新增：默认分辨率
    aspectRatio: '16:9' | '9:16'
    isGenerating: boolean
    disabled?: boolean
    onGenerate: (prompt: string, duration: number, resolution: string) => void  // 🔥 修改：添加 duration 和 resolution 参数
    onUpdatePrompt: (prompt: string) => void
}

export function VideoCardCompact({
    shotNumber,
    videoClip,
    defaultPrompt,
    customPrompt,
    defaultDuration = 5,
    defaultResolution = '480p',  // 🔥 新增：默认 480p
    aspectRatio,
    isGenerating,
    disabled = false,
    onGenerate,
    onUpdatePrompt
}: VideoCardCompactProps) {
    const [duration, setDuration] = useState(Math.max(4, defaultDuration))
    const [resolution, setResolution] = useState(defaultResolution)  // 🔥 新增：分辨率状态

    // 使用自定义 prompt 或默认 prompt
    const currentPrompt = customPrompt ?? defaultPrompt

    // 计算状态
    const status = videoClip?.status || 'idle'
    const hasVideo = status === 'success' && videoClip?.video_url
    const isOutdated = status === 'outdated'
    const isFailed = status === 'failed'
    const isCurrentlyGenerating = status === 'generating' || isGenerating

    return (
        <div className="space-y-3">
            <label className="flex items-center gap-1.5 text-xs text-slate-400 font-medium pb-2 border-b border-slate-700/50">
                <Video className="w-3.5 h-3.5" />
                Video Clip
            </label>

            {/* 左右布局：移动端垂直，桌面端水平 */}
            <div className="flex flex-col sm:flex-row gap-4">
                {/* 左侧：所有选项 */}
                <div className="flex-1 flex flex-col gap-3">
                    {/* Duration 和 Resolution 横向排列 */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="flex items-center gap-1 text-xs text-slate-400">
                                <Clock className="w-3 h-3" />
                                <span>Duration</span>
                            </label>
                            <select
                                value={duration}
                                onChange={(e) => setDuration(parseInt(e.target.value, 10))}
                                disabled={isCurrentlyGenerating}
                                className="w-full text-sm p-2 bg-slate-900/50 border border-slate-700/50 focus:border-blue-500/50 rounded-lg focus:outline-none transition-colors text-white"
                            >
                                <option value={4}>4s</option>
                                <option value={5}>5s</option>
                                <option value={6}>6s</option>
                                <option value={7}>7s</option>
                                <option value={8}>8s</option>
                                <option value={9}>9s</option>
                                <option value={10}>10s</option>
                                <option value={11}>11s</option>
                                <option value={12}>12s</option>
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="flex items-center gap-1 text-xs text-slate-400">
                                <Monitor className="w-3 h-3" />
                                <span>Resolution</span>
                            </label>
                            <select
                                value={resolution}
                                onChange={(e) => setResolution(e.target.value)}
                                disabled={isCurrentlyGenerating}
                                className="w-full text-sm p-2 bg-slate-900/50 border border-slate-700/50 focus:border-blue-500/50 rounded-lg focus:outline-none transition-colors text-white"
                            >
                                <option value="480p">480p</option>
                                <option value="720p">720p</option>
                                <option value="1080p">1080p</option>
                            </select>
                        </div>
                    </div>

                    {/* Character Action - 填充剩余空间 */}
                    <div className="flex-1 flex flex-col gap-1.5">
                        <label className="flex items-center gap-1 text-xs text-slate-400">
                            <Video className="w-3 h-3" />
                            <span>Character Action</span>
                        </label>
                        <Textarea
                            value={currentPrompt}
                            onChange={(e) => onUpdatePrompt(e.target.value)}
                            placeholder="What is the character doing?"
                            className="flex-1 text-sm bg-slate-900/50 border-slate-700/50 focus:border-blue-500/50 resize-none text-white"
                            disabled={isCurrentlyGenerating}
                        />
                    </div>
                </div>

                {/* 右侧：视频预览 + 按钮 - 移动端全宽，桌面端固定 200px */}
                <div className="space-y-2 w-full sm:w-auto sm:flex-shrink-0 sm:basis-[200px]">
                    <div className="relative bg-slate-900/50 rounded-lg border border-slate-800 overflow-hidden h-[200px]">
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

                    {/* Generate Clip 按钮 */}
                    <Button
                        onClick={() => onGenerate(currentPrompt, duration, resolution)}
                        disabled={disabled || isCurrentlyGenerating || !currentPrompt.trim()}
                        size="sm"
                        className="w-full text-sm text-white font-bold rounded-xl"
                        style={
                            disabled || isCurrentlyGenerating || !currentPrompt.trim()
                                ? {
                                    background: 'linear-gradient(0deg, rgba(0, 0, 0, 0.40) 0%, rgba(0, 0, 0, 0.40) 100%), linear-gradient(90deg, #4CC3FF 0%, #7B5CFF 100%)'
                                }
                                : {
                                    background: 'linear-gradient(90deg, #4CC3FF 0%, #7B5CFF 100%)',
                                    boxShadow: '0 8px 34px 0 rgba(115, 108, 255, 0.40)'
                                }
                        }
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
                                Generate Clip
                            </>
                        )}
                    </Button>
                </div>
            </div>
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

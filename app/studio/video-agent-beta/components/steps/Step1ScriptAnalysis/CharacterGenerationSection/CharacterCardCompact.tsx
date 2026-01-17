/**
 * CharacterCardCompact - 紧凑版人物卡片
 * 用于 Step1 的人物生成区域，占用更少空间
 * 包含悬浮放大预览功能
 */

'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { CharacterState } from '../../Step2CharacterConfig/hooks/useCharacterState'
import {
    Loader2,
    Upload,
    RefreshCw,
    Check,
    Sparkles,
    Library,
    Maximize2
} from 'lucide-react'

interface CharacterCardCompactProps {
    state: CharacterState
    onPromptChange: (prompt: string) => void
    onGenerate: () => void
    onUpload: (file: File) => void
    onOpenPreset: () => void
}

export function CharacterCardCompact({
    state,
    onPromptChange,
    onGenerate,
    onUpload,
    onOpenPreset
}: CharacterCardCompactProps) {
    const [isPreviewOpen, setIsPreviewOpen] = useState(false)

    return (
        <>
            <Card className="relative">
                <CardContent className="p-4 space-y-2">
                    {/* 人物名称 */}
                    <h3 className="text-sm font-semibold truncate">{state.name}</h3>

                    {/* 图片预览 - 等比例缩放，不裁切 */}
                    <div className="aspect-square border border-dashed rounded-lg overflow-hidden bg-muted/30 relative group flex items-center justify-center">
                        {state.isGenerating ? (
                            // 🔥 改进的生成中动画效果
                            <div className="w-full h-full flex flex-col items-center justify-center gap-2 animate-pulse bg-gradient-to-br from-primary/5 to-primary/10">
                                <div className="relative">
                                    <div className="w-12 h-12 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                                    <Sparkles className="absolute inset-0 m-auto w-5 h-5 text-primary/60" />
                                </div>
                                <span className="text-xs text-muted-foreground">Generating...</span>
                            </div>
                        ) : state.imageUrl ? (
                            <>
                                <img
                                    src={state.imageUrl}
                                    alt={state.name}
                                    className="w-full h-full object-contain"
                                />
                                {/* 悬浮操作层 */}
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    {/* 放大按钮 */}
                                    <button
                                        onClick={() => setIsPreviewOpen(true)}
                                        className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                                        title="View full size"
                                    >
                                        <Maximize2 className="w-5 h-5 text-white" />
                                    </button>
                                    {/* 重新生成按钮 */}
                                    <button
                                        onClick={onGenerate}
                                        disabled={!(state.prompt || '').trim()}
                                        className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors disabled:opacity-50"
                                        title="Regenerate"
                                    >
                                        <RefreshCw className="w-5 h-5 text-white" />
                                    </button>
                                </div>
                            </>
                        ) : (
                            // 初始状态：等待生成
                            <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-muted/50 to-muted/30">
                                <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                                <span className="text-xs text-muted-foreground/60">Ready to generate</span>
                            </div>
                        )}
                    </div>

                    {/* Prompt 编辑 - 紧凑版 */}
                    <Textarea
                        value={state.prompt || ''}
                        onChange={(e) => onPromptChange(e.target.value)}
                        placeholder="Character prompt..."
                        rows={2}
                        className="text-xs resize-none"
                    />

                    {/* 错误提示 */}
                    {state.error && (
                        <div className="text-xs text-destructive bg-destructive/10 p-1.5 rounded truncate">
                            {state.error}
                        </div>
                    )}

                    {/* 操作按钮 - 紧凑版 */}
                    <div className="grid grid-cols-3 gap-1.5">
                        <Button
                            onClick={onGenerate}
                            disabled={state.isGenerating || !(state.prompt || '').trim()}
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-2"
                        >
                            {state.imageUrl ? (
                                <RefreshCw className="w-3 h-3" />
                            ) : (
                                <Sparkles className="w-3 h-3" />
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
                                className="w-full h-7 text-xs px-2"
                                asChild
                            >
                                <span>
                                    <Upload className="w-3 h-3" />
                                </span>
                            </Button>
                        </label>

                        <Button
                            onClick={onOpenPreset}
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-2"
                            title="Choose preset"
                        >
                            <Library className="w-3 h-3" />
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* 放大预览对话框 - 只显示图片 */}
            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                <DialogContent className="max-w-2xl p-4">
                    {state.imageUrl && (
                        <img
                            src={state.imageUrl}
                            alt={state.name}
                            className="w-full max-h-[80vh] object-contain rounded-lg"
                        />
                    )}
                </DialogContent>
            </Dialog>
        </>
    )
}

/**
 * CharacterCardCompact Skeleton (Loading State)
 */
export function CharacterCardCompactSkeleton() {
    return (
        <Card className="relative">
            <CardContent className="p-4 space-y-2">
                {/* 骨架屏：人物名称 */}
                <div className="flex items-center justify-between">
                    <div className="h-4 w-20 bg-muted/50 rounded animate-pulse" />
                    <div className="h-4 w-12 bg-muted/50 rounded-full animate-pulse" />
                </div>

                {/* 骨架屏：图片区域 */}
                <div className="aspect-square border border-dashed rounded-lg overflow-hidden bg-muted/30 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-muted/50 animate-pulse" />
                </div>

                {/* 骨架屏：Prompt 输入框 */}
                <div className="h-14 bg-muted/50 rounded animate-pulse" />

                {/* 骨架屏：按钮 */}
                <div className="grid grid-cols-3 gap-1.5">
                    <div className="h-7 bg-muted/50 rounded animate-pulse" />
                    <div className="h-7 bg-muted/50 rounded animate-pulse" />
                    <div className="h-7 bg-muted/50 rounded animate-pulse" />
                </div>
            </CardContent>
        </Card>
    )
}

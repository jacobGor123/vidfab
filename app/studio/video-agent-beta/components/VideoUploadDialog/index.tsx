/**
 * Video Upload Dialog
 * 允许用户输入 YouTube URL 或上传本地视频进行分析
 * 🔥 YouTube 模式：分析完成后直接创建项目并跳转到步骤1
 */

'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Youtube, Upload, Loader2, Volume2, VolumeX } from 'lucide-react'
import { cn } from '@/lib/utils'
import { showError } from '@/lib/utils/toast'
import { useVideoGenerationAuth } from '@/hooks/use-auth-modal'
import { UnifiedAuthModal } from '@/components/auth/unified-auth-modal'
import type { ImageStyle } from '@/lib/services/video-agent/character-prompt-generator'
import { useVideoAnalysis } from './hooks/useVideoAnalysis'
import { YouTubeInput } from './components/YouTubeInput'
import { ImageStyleSelector } from './components/ImageStyleSelector'
import { InfoBox } from './components/InfoBox'
import { useSimpleSubscription } from '@/hooks/use-subscription-simple'
import { UpgradeDialog } from '@/components/subscription/upgrade-dialog'
import { emitCreditsUpdated } from '@/lib/events/credits-events'
import { ScriptQuotaDisplay } from '../ScriptQuotaDisplay'

interface VideoUploadDialogProps {
  isOpen: boolean
  onClose: () => void
  onVideoAnalyzed: (scriptContent: string) => void  // 保留兼容性，但 YouTube 模式不再使用
  duration: number  // YouTube 模式下会被实际时长覆盖
  storyStyle: string
  aspectRatio: '16:9' | '9:16'
}

export default function VideoUploadDialog({
  isOpen,
  onClose,
  onVideoAnalyzed,
  duration,
  storyStyle,
  aspectRatio
}: VideoUploadDialogProps) {
  const authModal = useVideoGenerationAuth()
  const { creditsRemaining, refreshCredits } = useSimpleSubscription()
  const [inputType, setInputType] = useState<'youtube' | 'local'>('youtube')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [imageStyle, setImageStyle] = useState<ImageStyle>('realistic')
  const [muteBgm, setMuteBgm] = useState(true)  // 复刻模式默认关闭 BGM（用户可手动开启，开启后 3× 积分）
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)

  const { isAnalyzing, progress, analyzeYouTubeVideo } = useVideoAnalysis({
    duration,
    storyStyle,
    aspectRatio,
    muteBgm,
    onComplete: (project) => {
      // 重置状态并关闭
      setYoutubeUrl('')
    }
  })

  const handleAnalyze = async () => {
    // 验证输入
    if (inputType === 'youtube' && !youtubeUrl.trim()) {
      showError('Please enter a YouTube URL')
      return
    }

    // 验证 YouTube URL 格式（支持普通视频、Shorts、短链接）
    if (inputType === 'youtube') {
      const isValidUrl = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)[\w-]+/.test(youtubeUrl)
      if (!isValidUrl) {
        showError('Invalid YouTube URL format')
        return
      }
    }

    // ✅ 检查10积分 (人物图初始生成)
    if (creditsRemaining < 10) {
      setShowUpgradeDialog(true)
      return
    }

    // 🔥 检查用户登录状态，未登录则弹出登录弹框
    const success = await authModal.requireAuth(async () => {
      try {
        await analyzeYouTubeVideo(youtubeUrl, imageStyle)
        onClose()
        // ✅ 立即触发积分更新事件，实时刷新右上角显示
        emitCreditsUpdated('video-agent-youtube-analyzed')
      } catch (error: any) {
        // ✅ 捕获402错误
        if (error.status === 402 || error.code === 'INSUFFICIENT_CREDITS') {
          setShowUpgradeDialog(true)
        } else {
          showError(error.message || 'Failed to analyze video')
        }
      }
    })

    // 如果未登录，requireAuth 会返回 false 并显示登录弹框
    if (!success) {
      console.log('User not authenticated, showing login modal')
    }
  }

  const handleClose = () => {
    if (!isAnalyzing) {
      onClose()
      setYoutubeUrl('')
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent
          className="bg-[#1a1d2e] border-white/10 backdrop-blur-xl p-0 gap-0 flex flex-col max-h-[90vh]"
          style={{ maxWidth: '700px', width: '700px' }}
        >
          {/* Header */}
          <div className="px-6 py-3 border-b border-white/10 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="px-3 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center flex-shrink-0">
                <Image
                  src="/logo/analyze-video-icon.svg"
                  alt="Analyze"
                  width={20}
                  height={20}
                  className="opacity-90"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl text-white font-bold">
                  Analyze Video
                </h2>
                <p className="text-sm text-slate-400 mt-0.5">
                  Paste a YouTube link to generate a structured script prompt. Local upload is coming soon.
                </p>
              </div>
            </div>
          </div>

          {/* Script Quota Display */}
          <div className="px-6 pt-2 pb-0">
            <ScriptQuotaDisplay />
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
            {/* Input Type Selector */}
            <div className="flex gap-3">
              <button
                onClick={() => setInputType('youtube')}
                disabled={isAnalyzing}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all",
                  inputType === 'youtube'
                    ? "bg-transparent border-2 border-[#7B5CFF] text-white shadow-lg shadow-purple-900/20"
                    : "bg-transparent border border-white/20 text-white/60 hover:text-white hover:border-white/30"
                )}
              >
                <Youtube className="w-5 h-5" />
                <span>YouTube URL</span>
              </button>
              <button
                onClick={() => setInputType('local')}
                disabled={true}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all cursor-not-allowed",
                  "bg-transparent border border-white/20 text-white/40"
                )}
              >
                <Upload className="w-5 h-5" />
                <span>Local File (Coming Soon)</span>
              </button>
            </div>

            {/* YouTube URL Input */}
            {inputType === 'youtube' && (
              <div className="space-y-6">
                <YouTubeInput
                  value={youtubeUrl}
                  onChange={setYoutubeUrl}
                  disabled={isAnalyzing}
                />

                <ImageStyleSelector
                  value={imageStyle}
                  onChange={setImageStyle}
                  disabled={isAnalyzing}
                />

                {/* BGM 开关 */}
                <button
                  type="button"
                  onClick={() => setMuteBgm(v => !v)}
                  disabled={isAnalyzing}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all",
                    muteBgm
                      ? "bg-slate-800/50 border-slate-700/50 text-slate-400 hover:border-slate-600"
                      : "bg-blue-600/15 border-blue-500/40 text-white hover:border-blue-400/60"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {muteBgm
                      ? <VolumeX className="w-4 h-4 text-slate-400" />
                      : <Volume2 className="w-4 h-4 text-blue-400" />
                    }
                    <div className="text-left">
                      <div className="text-sm font-medium">Background Music</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {muteBgm ? 'Muted — no audio generated' : 'Enabled — Seedance native audio (3× credits)'}
                      </div>
                    </div>
                  </div>
                  <div style={{
                    width: 36, height: 20,
                    borderRadius: 999,
                    backgroundColor: muteBgm ? '#334155' : '#3b82f6',
                    position: 'relative',
                    flexShrink: 0,
                    transition: 'background-color 0.2s'
                  }}>
                    <span style={{
                      position: 'absolute',
                      top: 2, left: 2,
                      width: 16, height: 16,
                      borderRadius: '50%',
                      backgroundColor: 'white',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                      transition: 'transform 0.2s',
                      transform: muteBgm ? 'translateX(0)' : 'translateX(16px)'
                    }} />
                  </div>
                </button>
              </div>
            )}

            {/* Local File Upload (Placeholder) */}
            {inputType === 'local' && (
              <div className="space-y-3">
                <div className="border-2 border-dashed border-white/20 rounded-xl p-12 text-center bg-white/5">
                  <Upload className="w-12 h-12 text-white/30 mx-auto mb-4" />
                  <p className="text-white/50 text-sm font-medium">Local file upload coming soon...</p>
                </div>
              </div>
            )}

            {/* Info Box */}
            <InfoBox duration={duration} storyStyle={storyStyle} />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 p-6 border-t border-white/10 flex-shrink-0">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isAnalyzing}
                className="flex-1 h-12 border-white/20 text-white hover:bg-slate-800/50 hover:text-white rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAnalyze}
                disabled={isAnalyzing || (inputType === 'youtube' && !youtubeUrl.trim())}
                className={cn(
                  "flex-1 h-12 text-white text-base font-bold transition-all duration-300 rounded-xl",
                  isAnalyzing || (inputType === 'youtube' && !youtubeUrl.trim())
                    ? "bg-gradient-disabled cursor-not-allowed"
                    : "bg-gradient-primary shadow-glow-primary"
                )}
              >
                {isAnalyzing ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing...</span>
                  </div>
                ) : (
                  <span>Analyze Video</span>
                )}
              </Button>
            </div>
        </DialogContent>
      </Dialog>

      {/* 登录认证弹框 */}
      <Dialog open={authModal.isAuthModalOpen} onOpenChange={() => authModal.hideAuthModal()}>
        <DialogContent className="p-0 max-w-md">
          <DialogTitle className="sr-only">user login</DialogTitle>
          <UnifiedAuthModal className="min-h-0 p-0" />
        </DialogContent>
      </Dialog>

      {/* ✅ 升级对话框 */}
      <UpgradeDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
      />
    </>
  )
}

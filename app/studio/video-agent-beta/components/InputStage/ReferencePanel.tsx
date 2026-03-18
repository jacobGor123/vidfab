/**
 * Reference Panel — "Create by reference" 模式的内联 YouTube 表单
 * 严格按照 Figma Frame 6 (node 615:913) 设计稿实现
 */

'use client'

import { useState } from 'react'
import { Loader2, Volume2, VolumeX } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { showError } from '@/lib/utils/toast'
import { useVideoGenerationAuth } from '@/hooks/use-auth-modal'
import { UnifiedAuthModal } from '@/components/auth/unified-auth-modal'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useSimpleSubscription } from '@/hooks/use-subscription-simple'
import { UpgradeDialog } from '@/components/subscription/upgrade-dialog'
import { emitCreditsUpdated } from '@/lib/events/credits-events'
import { useVideoAnalysis } from '../VideoUploadDialog/hooks/useVideoAnalysis'
import { IMAGE_STYLES, type ImageStyle } from '@/lib/services/video-agent/character-prompt-generator'

const TIPS = [
  'Only public YouTube videos are supported',
  'Video analysis may take 1-2 minutes depending on video length',
  'The generated script will be editable before creating the project',
] as const

interface ReferencePanelProps {
  duration: number
  storyStyle: string
  aspectRatio: '16:9' | '9:16'
  onCancel: () => void
}

export default function ReferencePanel({ duration, storyStyle, aspectRatio, onCancel }: ReferencePanelProps) {
  const authModal = useVideoGenerationAuth()
  const { creditsRemaining } = useSimpleSubscription()

  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [imageStyle, setImageStyle] = useState<ImageStyle>('realistic')
  const [muteBgm, setMuteBgm] = useState(true)
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)

  const { isAnalyzing, analyzeYouTubeVideo } = useVideoAnalysis({
    duration,
    storyStyle,
    aspectRatio,
    muteBgm,
    onComplete: () => setYoutubeUrl('')
  })

  const handleAnalyze = async () => {
    if (!youtubeUrl.trim()) {
      showError('Please enter a YouTube URL')
      return
    }
    const isValidUrl = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)[\w-]+/.test(youtubeUrl)
    if (!isValidUrl) {
      showError('Invalid YouTube URL format')
      return
    }
    if (creditsRemaining < 10) {
      setShowUpgradeDialog(true)
      return
    }
    await authModal.requireAuth(async () => {
      try {
        await analyzeYouTubeVideo(youtubeUrl, imageStyle)
        emitCreditsUpdated('video-agent-youtube-analyzed')
      } catch (error: any) {
        if (error.status === 402 || error.code === 'INSUFFICIENT_CREDITS') {
          setShowUpgradeDialog(true)
        } else {
          showError(error.message || 'Failed to analyze video')
        }
      }
    })
  }

  return (
    <div className="p-6 md:p-8 space-y-5">

      {/* YouTube Video URL */}
      <div className="space-y-2">
        <label className="block text-base font-medium text-white">
          YouTube Shorts Video URL (&lt;1 min)
        </label>
        <input
          type="url"
          value={youtubeUrl}
          onChange={(e) => setYoutubeUrl(e.target.value)}
          placeholder="Paste a non-dialogue video link, and AI will analyze the plot to generate a similar story script"
          disabled={isAnalyzing}
          className={cn(
            "w-full h-11 px-4 rounded-md text-sm text-white outline-none transition-all",
            "border border-transparent focus:border-purple-500/50",
            "placeholder:text-[#a8adbd] disabled:opacity-50"
          )}
          style={{ background: '#131621' }}
        />
      </div>

      {/* Visual Style */}
      <div className="space-y-2">
        <label className="block text-base font-medium text-white">
          Visual Style
        </label>
        <Select
          value={imageStyle}
          onValueChange={(v) => setImageStyle(v as ImageStyle)}
          disabled={isAnalyzing}
        >
          <SelectTrigger
            className={cn(
              "w-full h-11 px-4 rounded-md text-sm text-white",
              "border border-transparent focus:ring-0 focus:ring-offset-0 focus:border-purple-500/50",
              "hover:border-purple-500/30 disabled:opacity-50 transition-all"
            )}
            style={{ background: '#131621' }}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-700 rounded-lg shadow-xl backdrop-blur-xl z-[100]">
            {Object.entries(IMAGE_STYLES).map(([key, style]) => (
              <SelectItem
                key={key}
                value={key}
                className="text-white text-sm hover:bg-slate-800 focus:bg-slate-800 cursor-pointer"
              >
                {style.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Background Music */}
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
          width: 36, height: 20, borderRadius: 999,
          backgroundColor: muteBgm ? '#334155' : '#3b82f6',
          position: 'relative', flexShrink: 0, transition: 'background-color 0.2s'
        }}>
          <span style={{
            position: 'absolute', top: 2, left: 2, width: 16, height: 16,
            borderRadius: '50%', backgroundColor: 'white',
            boxShadow: '0 1px 3px rgba(0,0,0,0.25)', transition: 'transform 0.2s',
            transform: muteBgm ? 'translateX(0)' : 'translateX(16px)'
          }} />
        </div>
      </button>

      {/* Action Buttons — right aligned */}
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={onCancel}
          disabled={isAnalyzing}
          className="h-11 px-6 rounded-lg text-sm font-medium transition-all disabled:opacity-50 hover:opacity-80"
          style={{ background: '#121420', color: '#aaa9b4' }}
        >
          Cancel
        </button>
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing || !youtubeUrl.trim()}
          className={cn(
            "h-11 px-6 rounded-lg text-sm font-medium text-white transition-all duration-300 flex items-center gap-2",
            isAnalyzing || !youtubeUrl.trim()
              ? "bg-gradient-disabled cursor-not-allowed opacity-50"
              : "bg-gradient-primary shadow-glow-primary"
          )}
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Analyzing...</span>
            </>
          ) : (
            'Analyze Video'
          )}
        </button>
      </div>

      {/* Tips */}
      <div className="rounded-lg px-4 py-4" style={{ background: '#11131e' }}>
        <div className="flex items-center gap-2 mb-3">
          <WarningIcon />
          <span className="text-sm font-semibold text-white">Tips:</span>
        </div>
        <ul className="space-y-1.5 pl-1">
          {TIPS.map((tip, i) => (
            <li key={i} className="flex items-start gap-2 text-sm" style={{ color: '#aaa9b4' }}>
              <span className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0" style={{ background: '#aaa9b4' }} />
              <span>{tip}</span>
            </li>
          ))}
          <li className="flex items-start gap-2 text-sm" style={{ color: '#aaa9b4' }}>
            <span className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0" style={{ background: '#aaa9b4' }} />
            <span>Current settings (duration: {duration}s, style: {storyStyle}) will be used</span>
          </li>
        </ul>
      </div>

      <UpgradeDialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog} />

      <Dialog open={authModal.isAuthModalOpen} onOpenChange={() => authModal.hideAuthModal()}>
        <DialogContent className="p-0 max-w-[800px] bg-[#0e1018] border-white/10 overflow-hidden rounded-[20px]">
          <DialogTitle className="sr-only">user login</DialogTitle>
          <UnifiedAuthModal className="min-h-0 p-0" />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function WarningIcon() {
  return (
    <div
      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
      style={{ background: '#3a311f' }}
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M6 3.5V6.5" stroke="#ebb324" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="6" cy="9" r="0.75" fill="#ebb324" />
      </svg>
    </div>
  )
}

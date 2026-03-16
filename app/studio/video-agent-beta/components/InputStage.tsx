/**
 * Video Agent Beta - Input Stage
 * Tab 切换：Create by myself（自写脚本）| Create by reference（YouTube 复刻）
 */

'use client'

import { useState } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Settings } from 'lucide-react'
import Image from 'next/image'
import InspirationDialog from './InspirationDialog'
import VideoToolbar from './InputStage/VideoToolbar'
import OptionsDrawer from './InputStage/OptionsDrawer'
import ReferencePanel from './InputStage/ReferencePanel'
import { cn } from '@/lib/utils'
import { showError } from '@/lib/utils/toast'
import { useVideoAgentAPI, type ScriptInspiration } from '@/lib/hooks/useVideoAgentAPI'
import { useSimpleSubscription } from '@/hooks/use-subscription-simple'
import { UpgradeDialog } from '@/components/subscription/upgrade-dialog'
import { emitCreditsUpdated } from '@/lib/events/credits-events'
import { useVideoGenerationAuth } from '@/hooks/use-auth-modal'
import { UnifiedAuthModal } from '@/components/auth/unified-auth-modal'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { ScriptQuotaDisplay } from './ScriptQuotaDisplay'

type Mode = 'myself' | 'reference'

interface InputStageProps {
  onStart: (data: {
    duration: number
    storyStyle: string
    originalScript: string
    aspectRatio: '16:9' | '9:16'
    muteBgm: boolean
  }) => Promise<void>
}

export default function InputStage({ onStart }: InputStageProps) {
  const { getInspirations } = useVideoAgentAPI()
  const { creditsRemaining } = useSimpleSubscription()
  const authModal = useVideoGenerationAuth()

  const [mode, setMode] = useState<Mode>('myself')
  const [duration, setDuration] = useState(30)
  const [storyStyle, setStoryStyle] = useState('auto')
  const [script, setScript] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9')
  const [muteBgm, setMuteBgm] = useState(true)
  const [isGeneratingInspiration, setIsGeneratingInspiration] = useState(false)
  const [showInspirationDialog, setShowInspirationDialog] = useState(false)
  const [inspirations, setInspirations] = useState<ScriptInspiration[]>([])
  const [showOptionsDrawer, setShowOptionsDrawer] = useState(false)
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)

  const handleSubmit = async () => {
    if (!script.trim()) {
      showError('Please enter a video script')
      return
    }
    if (creditsRemaining < 10) {
      setShowUpgradeDialog(true)
      return
    }
    await authModal.requireAuth(async () => {
      setIsLoading(true)
      try {
        await onStart({ duration, storyStyle, originalScript: script, aspectRatio, muteBgm })
        emitCreditsUpdated('video-agent-project-created')
      } catch (error: any) {
        if (error.status === 402 || error.code === 'INSUFFICIENT_CREDITS') {
          setShowUpgradeDialog(true)
        } else {
          showError(error.message || 'Failed to create project')
        }
      } finally {
        setIsLoading(false)
      }
    })
  }

  const handleGetInspiration = async () => {
    await authModal.requireAuth(async () => {
      setIsGeneratingInspiration(true)
      try {
        const data = await getInspirations()
        setInspirations(data)
        setShowInspirationDialog(true)
      } catch {
        showError('Failed to generate AI inspirations.')
      } finally {
        setIsGeneratingInspiration(false)
      }
    })
  }

  return (
    <div className="w-full mx-auto px-4 space-y-4 md:px-0 md:space-y-5 md:max-w-4xl">

      {/* Tab 切换器 — 比卡片稍窄，居中；Figma: #2B2049, active 紫色渐变 */}
      <div className="max-w-[72%] mx-auto">
        <div
          className="flex rounded-xl p-[5px]"
          style={{ background: '#2B2049' }}
        >
          {/* 左：Create by myself */}
          <button
            onClick={() => setMode('myself')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-[10px]",
              "text-sm font-medium transition-all duration-200",
              mode === 'myself' ? "text-white" : "text-white/50 hover:text-white/70"
            )}
            style={mode === 'myself' ? {
              background: 'linear-gradient(90deg, #4B2EA1 0%, #4625BC 100%)'
            } : undefined}
          >
            <Image src="/icons/tab-myself.svg" alt="" width={20} height={20} className="flex-shrink-0" />
            <span>Create by myself</span>
          </button>

          {/* 右：Create by reference */}
          <button
            onClick={() => setMode('reference')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-[10px]",
              "text-sm font-medium transition-all duration-200",
              mode === 'reference' ? "text-white" : "text-white/50 hover:text-white/70"
            )}
            style={mode === 'reference' ? {
              background: 'linear-gradient(90deg, #4B2EA1 0%, #4625BC 100%)'
            } : undefined}
          >
            <Image src="/icons/tab-reference.svg" alt="" width={20} height={20} className="flex-shrink-0" />
            <span>Create by reference</span>
          </button>
        </div>
      </div>

      {/* Reference 模式：YouTube 表单（inline） */}
      {mode === 'reference' && (
        <Card
          className="relative overflow-hidden rounded-2xl"
          style={{ border: '1px solid #23263A', background: '#242733' }}
        >
          <ReferencePanel
            duration={duration}
            storyStyle={storyStyle}
            aspectRatio={aspectRatio}
            onCancel={() => setMode('myself')}
          />
        </Card>
      )}

      {/* Myself 模式：脚本输入卡片（工具栏内嵌 Story Style + Generate Video） */}
      {mode === 'myself' && (
        <Card
          className="relative overflow-hidden rounded-2xl bg-gradient-card transition-all duration-300"
          style={{ border: '1px solid #23263A' }}
        >
          <div className="relative p-6 md:p-8 pb-0 md:pb-0">
            {/* 字符计数 — 移动端右上角 */}
            <div className="absolute top-4 right-4 text-xs text-white/30 font-mono px-3 py-1 bg-black/20 rounded-lg backdrop-blur-sm md:hidden z-10">
              {script.length} chars
            </div>

            <Textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder="Start writing your story here..."
              className={cn(
                "w-full resize-none leading-relaxed text-white font-medium",
                "text-lg p-0 md:text-2xl",
                "placeholder:text-white/20",
                // 底部留给工具栏 + 字符计数
                "pb-10 md:pb-8",
                "selection:bg-purple-500/30",
                "focus-visible:ring-0 focus:ring-0 focus:outline-none border-0 focus:border-0",
                "bg-transparent"
              )}
              style={{ height: '360px' }}
              spellCheck={false}
              autoFocus
            />

            {/* 字符计数 — 桌面端，textarea 右下角 */}
            <div className="hidden md:block absolute bottom-14 right-8 text-xs text-white/30 font-mono pointer-events-none">
              {script.length} chars
            </div>
          </div>

          {/* 工具栏（含 Story Style 下拉 + Generate Video 按钮） */}
          <div className="hidden md:block" style={{ height: '56px', position: 'relative' }}>
            <VideoToolbar
              aspectRatio={aspectRatio}
              onAspectRatioChange={setAspectRatio}
              duration={duration}
              onDurationChange={setDuration}
              muteBgm={muteBgm}
              onMuteBgmChange={setMuteBgm}
              onAIInspiration={handleGetInspiration}
              isGeneratingInspiration={isGeneratingInspiration}
              storyStyle={storyStyle}
              onStoryStyleChange={setStoryStyle}
              onSubmit={handleSubmit}
              isLoading={isLoading}
              hasScript={!!script.trim()}
            />
          </div>

          {/* 移动端底部：Options 浮动按钮 + Generate */}
          <div className="md:hidden px-6 pb-6 pt-3 flex items-center gap-3">
            <button
              onClick={() => setShowOptionsDrawer(true)}
              className="w-12 h-12 rounded-full bg-gradient-primary shadow-glow-primary flex items-center justify-center"
            >
              <Settings className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading || !script.trim()}
              className={cn(
                "flex-1 h-12 flex items-center justify-center gap-2 rounded-full",
                "text-sm font-bold text-white transition-all",
                isLoading || !script.trim()
                  ? "bg-gradient-disabled cursor-not-allowed"
                  : "bg-gradient-primary shadow-glow-primary"
              )}
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : 'Generate Video'}
            </button>
          </div>
        </Card>
      )}

      {/* Script 配额显示 */}
      <ScriptQuotaDisplay />

      {/* 灵感对话框 */}
      <InspirationDialog
        isOpen={showInspirationDialog}
        onClose={() => setShowInspirationDialog(false)}
        inspirations={inspirations}
        onSelect={(s, style, dur) => { setScript(s); setStoryStyle(style); setDuration(dur) }}
      />

      {/* 选项抽屉（移动端） */}
      <OptionsDrawer
        isOpen={showOptionsDrawer}
        onClose={() => setShowOptionsDrawer(false)}
        aspectRatio={aspectRatio}
        onAspectRatioChange={setAspectRatio}
        duration={duration}
        onDurationChange={setDuration}
        muteBgm={muteBgm}
        onMuteBgmChange={setMuteBgm}
        onAIInspiration={handleGetInspiration}
        isGeneratingInspiration={isGeneratingInspiration}
      />

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

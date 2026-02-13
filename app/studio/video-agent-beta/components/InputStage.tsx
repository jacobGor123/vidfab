/**
 * Video Agent Beta - Input Stage Component
 * Iteration 2: "Writer-Centric" Layout
 * Priority: Script Input -> Options Toolbar
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Sparkles, Settings } from 'lucide-react'
import InspirationDialog from './InspirationDialog'
import VideoUploadDialog from './VideoUploadDialog'
import VideoToolbar from './InputStage/VideoToolbar'
import OptionsDrawer from './InputStage/OptionsDrawer'
import StoryStyleSelector from './InputStage/StoryStyleSelector'
import { cn } from '@/lib/utils'
import { showError, showSuccess } from '@/lib/utils/toast'
import { useVideoAgentAPI, type ScriptInspiration } from '@/lib/hooks/useVideoAgentAPI'
import { useSimpleSubscription } from '@/hooks/use-subscription-simple'
import { UpgradeDialog } from '@/components/subscription/upgrade-dialog'
import { emitCreditsUpdated } from '@/lib/events/credits-events'

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
  const { creditsRemaining, refreshCredits } = useSimpleSubscription()
  const [duration, setDuration] = useState(30)
  const [storyStyle, setStoryStyle] = useState('auto')
  const [script, setScript] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9')
  const [muteBgm, setMuteBgm] = useState(true) // 默认静音 BGM

  const [isGeneratingInspiration, setIsGeneratingInspiration] = useState(false)
  const [showInspirationDialog, setShowInspirationDialog] = useState(false)
  const [inspirations, setInspirations] = useState<ScriptInspiration[]>([])

  // 🔥 新增:视频分析相关状态
  const [showVideoDialog, setShowVideoDialog] = useState(false)

  // 🔥 新增:选项抽屉状态
  const [showOptionsDrawer, setShowOptionsDrawer] = useState(false)

  // ✅ 新增:升级对话框状态
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)

  const handleSubmit = async () => {
    if (!script.trim()) {
      showError('Please enter a video script')
      return
    }

    // ✅ 检查10积分 (人物图初始生成)
    if (creditsRemaining < 10) {
      showError('Insufficient credits. You need 10 credits to start video generation.')
      setShowUpgradeDialog(true)
      return
    }

    setIsLoading(true)
    try {
      await onStart({
        duration,
        storyStyle,
        originalScript: script,
        aspectRatio,
        muteBgm
      })
      // ✅ 立即触发积分更新事件，实时刷新右上角显示
      emitCreditsUpdated('video-agent-project-created')
    } catch (error: any) {
      // ✅ 捕获402错误
      if (error.status === 402 || error.code === 'INSUFFICIENT_CREDITS') {
        showError('Insufficient credits. Please upgrade your plan.')
        setShowUpgradeDialog(true)
      } else {
        showError(error.message || 'Failed to create project')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleGetInspiration = async () => {
    setIsGeneratingInspiration(true)
    try {
      const data = await getInspirations()
      setInspirations(data)
      setShowInspirationDialog(true)
    } catch (error: any) {
      console.error('Failed to get inspirations:', error)
      showError('Failed to generate AI inspirations.')
    } finally {
      setIsGeneratingInspiration(false)
    }
  }

  const handleSelectInspiration = (selectedScript: string, selectedStyle: string, selectedDuration: number) => {
    setScript(selectedScript)
    setStoryStyle(selectedStyle)
    setDuration(selectedDuration)
  }

  // 🔥 新增：处理视频分析完成
  const handleVideoAnalyzed = (scriptContent: string) => {
    setScript(scriptContent)
    showSuccess('Video analyzed successfully! You can edit the script below.')
  }

  return (
    <div className={cn(
      "w-full mx-auto",
      "px-4 space-y-6",              // 移动端: 16px 边距, 24px 间距
      "md:px-0 md:space-y-8",        // 桌面: 无边距, 32px 间距
      "md:max-w-4xl"
    )}>
      {/* 1. Main Script Input Area - The Hero */}
      <div className="relative">
        <Card
          className="relative overflow-hidden rounded-2xl bg-gradient-card p-6 md:p-8 transition-all duration-300"
          style={{
            border: '1px solid #23263A'
          }}
        >
          <div className="relative">
            {/* 字符计数 - 右上角 (仅移动端) */}
            <div className="absolute top-4 right-4 text-xs text-white/30 font-mono px-3 py-1 bg-black/20 rounded-lg backdrop-blur-sm md:hidden z-10">
              {script.length} chars
            </div>

            <Textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder="Start writing your story here..."
              className={cn(
                "w-full resize-none leading-relaxed text-white font-medium",
                "text-lg p-6",                        // 移动端: 18px 字体, 24px 边距
                "md:text-2xl md:p-8",                 // 桌面: 24px 字体, 32px 边距
                "placeholder:text-white/20",
                "pb-20 md:pb-20",                     // 底部留空间给按钮/工具栏
                "selection:bg-purple-500/30",
                "focus-visible:ring-0 focus:ring-0 focus:outline-none border-0 focus:border-0",
                "rounded-[13px] bg-gradient-card-inner"
              )}
              style={{ height: '380px' }}
              spellCheck={false}
              autoFocus
            />

            {/* 悬浮 Options 按钮 - 移动端 */}
            <button
              onClick={() => setShowOptionsDrawer(true)}
              className={cn(
                "md:hidden",                        // 仅移动端显示
                "absolute bottom-6 right-6",
                "w-14 h-14 rounded-full",
                "bg-gradient-primary shadow-glow-primary",
                "flex items-center justify-center",
                "transition-all duration-200",
                "hover:scale-110 hover:shadow-glow-purple",
                "active:scale-95"
              )}
            >
              <Settings className="w-6 h-6 text-white" />
            </button>

            {/* 底部工具栏 - 桌面端 */}
            <div className="hidden md:block">
              <VideoToolbar
                aspectRatio={aspectRatio}
                onAspectRatioChange={setAspectRatio}
                duration={duration}
                onDurationChange={setDuration}
                muteBgm={muteBgm}
                onMuteBgmChange={setMuteBgm}
                charCount={script.length}
                onAIInspiration={handleGetInspiration}
                onAnalyzeVideo={() => setShowVideoDialog(true)}
                isGeneratingInspiration={isGeneratingInspiration}
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Story Style Selector */}
      <StoryStyleSelector
        value={storyStyle}
        onChange={setStoryStyle}
      />

      {/* Generate Button */}
      <div className="flex justify-center mt-8">
        <Button
          onClick={handleSubmit}
          disabled={isLoading || !script.trim()}
          className={cn(
            "w-full max-w-2xl h-14 text-white text-lg font-bold transition-all duration-300",
            "rounded-[147px]",
            isLoading || !script.trim()
              ? "bg-gradient-disabled cursor-not-allowed"
              : "bg-gradient-primary shadow-glow-primary"
          )}
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Creating...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              <span>Generate Video</span>
            </div>
          )}
        </Button>
      </div>

      {/* 灵感对话框 */}
      <InspirationDialog
        isOpen={showInspirationDialog}
        onClose={() => setShowInspirationDialog(false)}
        inspirations={inspirations}
        onSelect={handleSelectInspiration}
      />

      {/* 视频上传对话框 */}
      <VideoUploadDialog
        isOpen={showVideoDialog}
        onClose={() => setShowVideoDialog(false)}
        onVideoAnalyzed={handleVideoAnalyzed}
        duration={duration}
        storyStyle={storyStyle}
        aspectRatio={aspectRatio}
      />

      {/* 选项抽屉 */}
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
        onAnalyzeVideo={() => setShowVideoDialog(true)}
        isGeneratingInspiration={isGeneratingInspiration}
      />

      {/* ✅ 升级对话框 */}
      <UpgradeDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
      />
    </div>
  )
}

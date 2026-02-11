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
import { Sparkles } from 'lucide-react'
import InspirationDialog from './InspirationDialog'
import VideoUploadDialog from './VideoUploadDialog'
import VideoToolbar from './InputStage/VideoToolbar'
import StoryStyleSelector from './InputStage/StoryStyleSelector'
import { cn } from '@/lib/utils'
import { showError, showSuccess } from '@/lib/utils/toast'
import { useVideoAgentAPI, type ScriptInspiration } from '@/lib/hooks/useVideoAgentAPI'

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

  const handleSubmit = async () => {
    if (!script.trim()) {
      showError('Please enter a video script')
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
    } catch (error: any) {
      showError(error.message)
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
    <div className="w-full max-w-4xl mx-auto space-y-8">
      {/* 1. Main Script Input Area - The Hero */}
      <div className="relative">
        <Card
          className="relative overflow-hidden rounded-2xl transition-all duration-300"
          style={{
            borderRadius: '16px',
            border: '1px solid #23263A',
            background: 'linear-gradient(135deg, #1a1d2e 0%, #181921 50%, #16181f 100%)',
            padding: '24px'
          }}
        >
          <div className="relative">
            <Textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder="Start writing your story here..."
              className="w-full min-h-[380px] resize-none text-xl md:text-2xl leading-relaxed text-white font-medium placeholder:text-white/20 pb-20 selection:bg-purple-500/30 focus-visible:ring-0 focus:ring-0 focus:outline-none border-0 focus:border-0"
              style={{
                borderTopLeftRadius: '13px',
                borderTopRightRadius: '13px',
                borderBottomLeftRadius: '13px',
                borderBottomRightRadius: '13px',
                background: 'linear-gradient(180deg, #111319 0%, #111319 100%)',
                outline: 'none',
                boxShadow: 'none',
                padding: '32px'
              }}
              spellCheck={false}
              autoFocus
            />

            {/* 底部工具栏 */}
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
          className="w-full max-w-2xl h-14 text-white text-lg font-bold transition-all duration-300 disabled:cursor-not-allowed"
          style={
            isLoading || !script.trim()
              ? {
                  borderRadius: '147px',
                  background: 'linear-gradient(0deg, rgba(0, 0, 0, 0.40) 0%, rgba(0, 0, 0, 0.40) 100%), linear-gradient(90deg, #4CC3FF 0%, #7B5CFF 100%)'
                }
              : {
                  borderRadius: '147px',
                  background: 'linear-gradient(90deg, #4CC3FF 0%, #7B5CFF 100%)',
                  boxShadow: '0 8px 34px 0 rgba(115, 108, 255, 0.40)'
                }
          }
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

      <InspirationDialog
        isOpen={showInspirationDialog}
        onClose={() => setShowInspirationDialog(false)}
        inspirations={inspirations}
        onSelect={handleSelectInspiration}
      />

      {/* 🔥 新增：Video Upload Dialog */}
      <VideoUploadDialog
        isOpen={showVideoDialog}
        onClose={() => setShowVideoDialog(false)}
        onVideoAnalyzed={handleVideoAnalyzed}
        duration={duration}
        storyStyle={storyStyle}
        aspectRatio={aspectRatio}
      />
    </div>
  )
}

/**
 * Video Agent Beta - Input Stage Component
 * Iteration 2: "Writer-Centric" Layout
 * Priority: Script Input -> Options Toolbar
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import {
  Sparkles,
  Mic,
  Clapperboard,
  Layout,
  Clock,
  ChevronRight
} from 'lucide-react'
import InspirationDialog from './InspirationDialog'
import VideoUploadDialog from './VideoUploadDialog'
import { cn } from '@/lib/utils'
import { showError, showSuccess } from '@/lib/utils/toast'
import { useVideoAgentAPI, type ScriptInspiration } from '@/lib/hooks/useVideoAgentAPI'

const DURATIONS = [
  { value: 15, label: '15s' },
  { value: 30, label: '30s' },
  { value: 45, label: '45s' },
  { value: 60, label: '60s' }
]

const STORY_STYLES = [
  { value: 'auto', label: 'Auto' },
  { value: 'comedy', label: 'Comedy' },
  { value: 'mystery', label: 'Mystery' },
  { value: 'moral', label: 'Moral' },
  { value: 'twist', label: 'Twist' },
  { value: 'suspense', label: 'Suspense' },
  { value: 'warmth', label: 'Warmth' },
  { value: 'inspiration', label: 'Inspire' }
]

interface InputStageProps {
  onStart: (data: {
    duration: number
    storyStyle: string
    originalScript: string
    aspectRatio: '16:9' | '9:16'
    enableNarration: boolean
  }) => Promise<void>
}

export default function InputStage({ onStart }: InputStageProps) {
  const { getInspirations } = useVideoAgentAPI()
  const [duration, setDuration] = useState(30)
  const [storyStyle, setStoryStyle] = useState('auto')
  const [script, setScript] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9')
  const [enableNarration, setEnableNarration] = useState(false)

  const [isGeneratingInspiration, setIsGeneratingInspiration] = useState(false)
  const [showInspirationDialog, setShowInspirationDialog] = useState(false)
  const [inspirations, setInspirations] = useState<ScriptInspiration[]>([])

  // 🔥 新增：视频分析相关状态
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
        enableNarration
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
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        <Card className="relative bg-slate-950/50 border-2 border-dashed border-white/30 backdrop-blur-xl shadow-[inset_0_2px_20px_rgba(0,0,0,0.5)] transition-all focus-within:border-blue-500/50 focus-within:bg-slate-900/80 focus-within:shadow-[0_0_0_2px_rgba(59,130,246,0.3)]">
          <div className="relative">
            <Textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder="Start writing your story here..."
              className="w-full min-h-[300px] resize-none bg-transparent border-0 focus-visible:ring-0 text-xl md:text-2xl leading-relaxed text-white placeholder:text-white/30 p-8 font-medium selection:bg-blue-500/30"
              spellCheck={false}
              autoFocus
            />

            {/* Floating Actions inside Input - positioned over textarea */}
            {/* Left: Analyze Video Button */}
            <div className="absolute bottom-6 pointer-events-auto" style={{ left: '1.5rem' }}>
              <button
                onClick={() => setShowVideoDialog(true)}
                className="group/video flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-purple-600/90 to-pink-600/90 hover:from-purple-600 hover:to-pink-600 text-sm font-semibold text-white transition-all shadow-lg shadow-purple-900/30 hover:shadow-xl hover:shadow-purple-900/50 hover:scale-105 border border-purple-400/50"
              >
                {/* Custom Video Analysis Icon */}
                <svg
                  className="w-4 h-4 group-hover/video:scale-110 transition-transform"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M14 8L18 12L14 16M4 8C4 6.89543 4.89543 6 6 6H10C11.1046 6 12 6.89543 12 8V16C12 17.1046 11.1046 18 10 18H6C4.89543 18 4 17.1046 4 16V8Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="8" cy="12" r="1.5" fill="currentColor" className="animate-pulse" />
                </svg>
                <span>Analyze Video</span>
              </button>
            </div>

            {/* Right: AI Inspiration & Character Count */}
            <div className="absolute bottom-6 right-6 flex items-center gap-3 pointer-events-auto">
              <button
                onClick={handleGetInspiration}
                disabled={isGeneratingInspiration}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 text-sm font-medium text-purple-300 transition-colors border border-white/5 hover:border-white/20"
              >
                {isGeneratingInspiration ? <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" /> : <Sparkles className="w-4 h-4" />}
                <span>AI Inspiration</span>
              </button>
              <div className="text-xs text-white/30 font-mono px-2">
                {script.length} chars
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* 2. Configuration Toolbar - Secondary Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* Left: Settings Group */}
        <div className="space-y-6">

          {/* Section 1: Visual Format */}
          <div className="space-y-3">
            <Label className="text-white/50 text-xs font-bold uppercase tracking-widest pl-1">Visual Format</Label>
            <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 w-fit">
              <button
                onClick={() => setAspectRatio('16:9')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                  aspectRatio === '16:9'
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                )}
              >
                <Layout className="w-4 h-4" />
                <span>16:9 Landscape</span>
              </button>
              <button
                onClick={() => setAspectRatio('9:16')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                  aspectRatio === '9:16'
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                )}
              >
                <Layout className="w-4 h-4 rotate-90" />
                <span>9:16 Portrait</span>
              </button>
            </div>
          </div>

          {/* Section 2: Duration & Audio */}
          <div className="flex flex-wrap gap-8">
            <div className="space-y-3">
              <Label className="text-white/50 text-xs font-bold uppercase tracking-widest pl-1">Duration</Label>
              <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                {DURATIONS.map(d => (
                  <button
                    key={d.value}
                    onClick={() => setDuration(d.value)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                      duration === d.value
                        ? "bg-purple-600 text-white shadow-lg shadow-purple-900/20"
                        : "text-white/60 hover:text-white hover:bg-white/5"
                    )}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-white/50 text-xs font-bold uppercase tracking-widest pl-1">Audio</Label>
              <button
                onClick={() => setEnableNarration(!enableNarration)}
                className={cn(
                  "flex items-center gap-2 px-5 py-3 rounded-xl border transition-all text-sm font-medium",
                  enableNarration
                    ? "bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-900/20"
                    : "bg-white/5 border-white/5 text-white/60 hover:bg-white/10 hover:border-white/10"
                )}
              >
                <Mic className="w-4 h-4" />
                <span>{enableNarration ? "Narration On" : "Narration Off"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Style & Action */}
        <div className="space-y-6 flex flex-col">
          <div className="space-y-3">
            <Label className="text-white/50 text-xs font-bold uppercase tracking-widest pl-1">Story Style</Label>
            <div className="grid grid-cols-4 gap-2">
              {STORY_STYLES.map((style) => (
                <button
                  key={style.value}
                  onClick={() => setStoryStyle(style.value)}
                  className={cn(
                    "px-2 py-2 rounded-lg text-xs font-medium border transition-all text-center truncate",
                    storyStyle === style.value
                      ? "bg-white text-black border-white"
                      : "bg-white/5 border-white/5 text-white/50 hover:bg-white/10 hover:text-white/80"
                  )}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 flex items-end justify-end pt-4">
            <Button
              onClick={handleSubmit}
              disabled={isLoading || !script.trim()}
              className="w-full md:w-auto h-14 px-8 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-lg font-bold shadow-xl shadow-blue-900/20 hover:shadow-blue-900/40 hover:-translate-y-0.5 transition-all duration-300"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Creating...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span>Generate Video</span>
                  <ChevronRight className="w-5 h-5 opacity-50" />
                </div>
              )}
            </Button>
          </div>
        </div>
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

/**
 * Video Upload Dialog
 * 允许用户输入 YouTube URL 或上传本地视频进行分析
 */

'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Youtube, Upload, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { showError } from '@/lib/utils/toast'
import { useVideoAgentAPI } from '@/lib/hooks/useVideoAgentAPI'

interface VideoUploadDialogProps {
  isOpen: boolean
  onClose: () => void
  onVideoAnalyzed: (scriptContent: string) => void
  duration: number
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
  const { analyzeVideo } = useVideoAgentAPI()
  const [inputType, setInputType] = useState<'youtube' | 'local'>('youtube')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [progress, setProgress] = useState<string>('')

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

    setIsAnalyzing(true)
    setProgress('Analyzing video content...')

    try {
      // 调用视频分析 API
      const data = await analyzeVideo({
        videoSource: {
          type: inputType,
          url: inputType === 'youtube' ? youtubeUrl : '' // 本地文件暂时留空
        },
        duration,
        storyStyle,
        aspectRatio
      })

      setProgress('Analysis complete!')

      // 提取脚本内容
      const scriptContent = generateScriptFromAnalysis(data)

      // 调用回调函数
      onVideoAnalyzed(scriptContent)

      // 关闭对话框
      setTimeout(() => {
        onClose()
        setIsAnalyzing(false)
        setProgress('')
        setYoutubeUrl('')
      }, 500)

    } catch (error: any) {
      console.error('Video analysis error:', error)
      showError(error.message || 'Failed to analyze video')
      setIsAnalyzing(false)
      setProgress('')
    }
  }

  // 从分析结果生成脚本文本
  const generateScriptFromAnalysis = (analysis: any): string => {
    const { shots } = analysis
    if (!shots || shots.length === 0) {
      return ''
    }

    // 生成脚本：每个 shot 的 description + character_action
    const scriptParts = shots.map((shot: any, index: number) => {
      const shotNumber = index + 1
      const description = shot.description || ''
      const action = shot.character_action || ''
      return `Shot ${shotNumber}: ${description}. ${action}`
    })

    return scriptParts.join('\n\n')
  }

  const handleClose = () => {
    if (!isAnalyzing) {
      onClose()
      setYoutubeUrl('')
      setProgress('')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] bg-slate-950/95 border-white/10 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white">Analyze Video</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Input Type Selector */}
          <div className="flex gap-2 bg-white/5 p-1.5 rounded-xl border border-white/10">
            <button
              onClick={() => setInputType('youtube')}
              disabled={isAnalyzing}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all",
                inputType === 'youtube'
                  ? "bg-red-600 text-white shadow-lg shadow-red-900/20"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              )}
            >
              <Youtube className="w-5 h-5" />
              <span>YouTube URL</span>
            </button>
            <button
              onClick={() => setInputType('local')}
              disabled={true} // 暂时禁用本地上传
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all opacity-50 cursor-not-allowed",
                inputType === 'local'
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
                  : "text-white/60"
              )}
            >
              <Upload className="w-5 h-5" />
              <span>Local File (Coming Soon)</span>
            </button>
          </div>

          {/* YouTube URL Input */}
          {inputType === 'youtube' && (
            <div className="space-y-3">
              <Label className="text-white/70 text-sm">YouTube Video URL</Label>
              <Input
                type="url"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                disabled={isAnalyzing}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-blue-500/50"
              />
              <p className="text-xs text-white/40">
                Enter a public YouTube video URL to analyze its content and generate a script.
                <br />
                <span className="text-blue-400">Tip: YouTube Shorts URLs are automatically converted to standard format.</span>
              </p>
            </div>
          )}

          {/* Local File Upload (Placeholder) */}
          {inputType === 'local' && (
            <div className="space-y-3">
              <Label className="text-white/70 text-sm">Upload Video File</Label>
              <div className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center">
                <Upload className="w-12 h-12 text-white/30 mx-auto mb-4" />
                <p className="text-white/40 text-sm">Local file upload coming soon...</p>
              </div>
            </div>
          )}

          {/* Progress Indicator */}
          {isAnalyzing && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                <div>
                  <p className="text-blue-400 font-medium">{progress}</p>
                  <p className="text-white/40 text-xs mt-1">This may take 1-2 minutes...</p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isAnalyzing}
              className="flex-1 border-white/10 text-white/70 hover:bg-white/5 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing || (inputType === 'youtube' && !youtubeUrl.trim())}
              className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-medium shadow-lg"
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

          {/* Info Box */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-white/60 space-y-2">
                <p className="font-medium text-white/80">Tips:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Only public YouTube videos are supported</li>
                  <li>Video analysis may take 1-2 minutes depending on video length</li>
                  <li>The generated script will be editable before creating the project</li>
                  <li>Current settings (duration: {duration}s, style: {storyStyle}) will be used</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Video Upload Dialog
 * 允许用户输入 YouTube URL 或上传本地视频进行分析
 * 🔥 YouTube 模式：分析完成后直接创建项目并跳转到步骤1
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Youtube, Upload, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { showError, showSuccess } from '@/lib/utils/toast'
import { useVideoAgentAPI } from '@/lib/hooks/useVideoAgentAPI'
import { useVideoGenerationAuth } from '@/hooks/use-auth-modal'
import { UnifiedAuthModal } from '@/components/auth/unified-auth-modal'
import { IMAGE_STYLES, type ImageStyle } from '@/lib/services/video-agent/character-prompt-generator'

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
  const { analyzeVideo, createProject, updateProject, getProject } = useVideoAgentAPI()
  const authModal = useVideoGenerationAuth()
  const [inputType, setInputType] = useState<'youtube' | 'local'>('youtube')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [imageStyle, setImageStyle] = useState<ImageStyle>('realistic')  // 🔥 新增：图片风格选择
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [progress, setProgress] = useState<string>('')
  const [createdProject, setCreatedProject] = useState<any>(null)

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

    // 🔥 检查用户登录状态，未登录则弹出登录弹框
    const success = await authModal.requireAuth(async () => {
      setIsAnalyzing(true)
      setProgress('Analyzing video content...')

      try {
        // 🔥 步骤1: 调用视频分析 API
        const analysisData = await analyzeVideo({
          videoSource: {
            type: inputType,
            url: inputType === 'youtube' ? youtubeUrl : ''
          },
          duration,  // YouTube 模式下会被实际时长覆盖
          storyStyle,
          aspectRatio
        })

        setProgress('Creating project...')

        // 🔥 步骤2: 提取脚本内容并创建项目
        const scriptContent = generateScriptFromAnalysis(analysisData)

        // 🔥 YouTube 模式：默认开启背景音乐，9:16 比例
        // 🔥 确保 duration 有效：优先使用分析结果，其次使用传入参数，最后使用默认值 30
        const validDuration = analysisData.duration || duration || 30
        // 🔥 额外防御：确保 validDuration 是有效数字
        const safeDuration = typeof validDuration === 'number' && !isNaN(validDuration) && isFinite(validDuration)
          ? validDuration
          : 30
        const finalDuration = Math.max(1, Math.min(120, Math.round(safeDuration)))  // 限制在 1-120 秒

        const project = await createProject({
          duration: finalDuration,
          story_style: storyStyle,
          original_script: scriptContent,
          aspect_ratio: '9:16',  // 🔥 默认 9:16
          enable_narration: false,  // 🔥 非旁白模式
          mute_bgm: false,  // 🔥 开启背景音乐（默认使用预设音乐）
          image_style_id: imageStyle  // 🔥 新增：保存用户选择的图片风格
        } as any)

        setProgress('Saving analysis results...')

        // 🔥 步骤3: 直接保存视频分析结果为脚本分析结果（跳过重复分析）
        // YouTube 模式下，视频分析已经完成了分镜脚本的生成，不需要再次调用 analyzeScript
        // ✅ PATCH API 会自动把 script_analysis.shots 保存到 project_shots 表
        console.log('[YouTube Mode] Saving script_analysis to project:', {
          projectId: project.id,
          hasAnalysisData: !!analysisData,
          analysisKeys: analysisData ? Object.keys(analysisData) : null,
          shotsCount: analysisData?.shots?.length || 0,
          duration: analysisData?.duration
        })

        await updateProject(project.id, {
          script_analysis: analysisData,  // 直接使用视频分析结果
          step_1_status: 'completed'
        } as any)

        console.log('[YouTube Mode] ✅ script_analysis saved successfully')

        // 🔥 步骤4: 自动生成角色 Prompts（YouTube 模式）
        if (analysisData.characters && analysisData.characters.length > 0) {
          setProgress('Generating character prompts...')

          try {
            // 调用 character-prompts API 生成角色的 prompts
            const response = await fetch(`/api/video-agent/projects/${project.id}/character-prompts`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ imageStyle })  // 🔥 使用用户选择的风格
            })

            if (response.ok) {
              const { data } = await response.json()
              const characterPrompts = data.characterPrompts || []

              // 将 prompts 保存到数据库
              if (characterPrompts.length > 0) {
                const charactersData = characterPrompts.map((cp: any) => ({
                  name: cp.characterName,
                  source: 'ai_generate' as const,
                  generationPrompt: cp.prompt,
                  negativePrompt: cp.negativePrompt
                }))

                const updateCharsResponse = await fetch(`/api/video-agent/projects/${project.id}/characters`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ characters: charactersData })
                })

                if (!updateCharsResponse.ok) {
                  console.warn('[YouTube Mode] Failed to save character prompts, but continuing...')
                }
              }
            } else {
              console.warn('[YouTube Mode] Failed to generate character prompts, but continuing...')
            }
          } catch (charError) {
            console.warn('[YouTube Mode] Character prompt generation failed (non-critical):', charError)
            // 角色 prompt 生成失败不影响主流程，继续执行
          }
        }

        setProgress('Loading project...')

        // 🔥 步骤5: 重新获取完整项目数据（包含分析结果）
        const fullProject = await getProject(project.id)

        showSuccess('Video analyzed successfully!')

        // 🔥 步骤6: 保存项目信息并关闭对话框
        // 通过父组件的 onVideoAnalyzed 回调通知项目已创建
        // 父组件可以通过 store 加载这个项目
        setCreatedProject(fullProject)

        setTimeout(() => {
          // 通知父组件（通过全局事件或其他方式）
          window.dispatchEvent(new CustomEvent('video-agent-project-created', {
            detail: fullProject
          }))

          onClose()
          setIsAnalyzing(false)
          setProgress('')
          setYoutubeUrl('')
          setCreatedProject(null)
        }, 500)

      } catch (error: any) {
        console.error('Video analysis error:', error)
        showError(error.message || 'Failed to analyze video')
        setIsAnalyzing(false)
        setProgress('')
      }
    })

    // 如果未登录，requireAuth 会返回 false 并显示登录弹框
    if (!success) {
      console.log('User not authenticated, showing login modal')
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
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent
          className="bg-[#1a1d2e] border-white/10 backdrop-blur-xl"
          style={{ maxWidth: '700px', width: '700px' }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl font-bold text-white">
              <div className="w-12 h-12 rounded-xl bg-[#211F43] flex items-center justify-center">
                <Image
                  src="/logo/analyze-video-icon.svg"
                  alt="Analyze"
                  width={24}
                  height={24}
                />
              </div>
              Analyze Video
            </DialogTitle>
            <DialogDescription className="text-white/60 text-sm mt-2">
              Paste a YouTube link to generate a structured script prompt. Local upload is coming soon.
            </DialogDescription>
          </DialogHeader>

        <div className="space-y-6 pt-4">
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
              {/* YouTube URL 输入框 */}
              <div className="space-y-3">
                <Label className="text-white/70 text-sm font-medium">YouTube Video URL</Label>
                <Input
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  disabled={isAnalyzing}
                  className="h-12 bg-white/5 border border-[#7B5CFF]/50 text-white placeholder:text-white/30 focus-visible:ring-2 focus-visible:ring-[#7B5CFF]/50 rounded-xl"
                />
              </div>

              {/* 🔥 图片风格选择器 */}
              <div className="space-y-3">
                <Label className="text-white/70 text-sm font-medium">Image Style</Label>
                <Select value={imageStyle} onValueChange={(value) => setImageStyle(value as ImageStyle)} disabled={isAnalyzing}>
                  <SelectTrigger className="h-12 bg-[#0f1117] border border-white/20 text-white hover:bg-[#0f1117] focus:ring-2 focus:ring-[#7B5CFF]/50 rounded-xl">
                    <SelectValue placeholder="Select an image style" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10 backdrop-blur-xl rounded-xl">
                    {Object.entries(IMAGE_STYLES).map(([key, style]) => (
                      <SelectItem
                        key={key}
                        value={key}
                        className="text-white hover:bg-white/10 focus:bg-white/10 cursor-pointer text-left"
                      >
                        {style.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Local File Upload (Placeholder) */}
          {inputType === 'local' && (
            <div className="space-y-3">
              <Label className="text-white/70 text-sm font-medium">Upload Video File</Label>
              <div className="border-2 border-dashed border-white/20 rounded-xl p-12 text-center bg-white/5">
                <Upload className="w-12 h-12 text-white/30 mx-auto mb-4" />
                <p className="text-white/50 text-sm font-medium">Local file upload coming soon...</p>
              </div>
            </div>
          )}

          {/* Progress Indicator - Hidden during analysis */}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-4">
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
              className="flex-1 h-12 text-white text-base font-bold transition-all duration-300 disabled:cursor-not-allowed rounded-xl"
              style={
                isAnalyzing || (inputType === 'youtube' && !youtubeUrl.trim())
                  ? {
                      background: 'linear-gradient(0deg, rgba(0, 0, 0, 0.40) 0%, rgba(0, 0, 0, 0.40) 100%), linear-gradient(90deg, #4CC3FF 0%, #7B5CFF 100%)'
                    }
                  : {
                      background: 'linear-gradient(90deg, #4CC3FF 0%, #7B5CFF 100%)',
                      boxShadow: '0 8px 34px 0 rgba(115, 108, 255, 0.40)'
                    }
              }
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
          <div className="bg-[#2a2416] border border-[#4a3f1f] rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#D4AF37] flex-shrink-0 mt-0.5" />
              <div className="text-sm text-white/70 space-y-2">
                <p className="font-semibold text-white/90">Tips:</p>
                <ul className="list-disc list-inside space-y-1.5 text-sm">
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

    {/* 登录认证弹框 */}
    <Dialog open={authModal.isAuthModalOpen} onOpenChange={() => authModal.hideAuthModal()}>
      <DialogContent className="p-0 max-w-md">
        <DialogTitle className="sr-only">user login</DialogTitle>
        <UnifiedAuthModal className="min-h-0 p-0" />
      </DialogContent>
    </Dialog>
    </>
  )
}

"use client"

/**
 * Enhanced Text to Video Panel
 * 集成真实的视频生成功能，包括登录验证、轮询状态管理等
 */

import { useState, useEffect, useCallback, useRef } from "react"
import { useTranslations } from "next-intl"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Play, Sparkles, AlertTriangle, CheckCircle, Zap, Lock, Volume2, VolumeX } from "lucide-react"

// Hooks and services
import { useVideoGeneration } from "@/hooks/use-video-generation"
import { useVideoPollingV2 } from "@/hooks/use-video-polling-v2"
import { useVideoGenerationAuth } from "@/hooks/use-auth-modal"
import { useVideoContext } from "@/lib/contexts/video-context"
import { useSimpleSubscription } from "@/hooks/use-subscription-simple"
import { useIsMobile } from "@/hooks/use-mobile"
import { UnifiedAuthModal } from "@/components/auth/unified-auth-modal"
import { VideoResult } from "./video-result-enhanced"
import { VideoTaskGridItem } from "./video-task-grid-item"
import { VideoLimitDialog } from "./video-limit-dialog"
import { calculateCreditsRequired } from "@/lib/subscription/pricing-config"
import { UpgradeDialog } from "@/components/subscription/upgrade-dialog"
import { GenerationAnalytics } from "@/lib/analytics/generation-events"

// Types
import { VideoGenerationRequest, DURATION_MAP } from "@/lib/types/video"

interface VideoGenerationParams {
  prompt: string
  model: string
  duration: string
  resolution: string
  aspectRatio: string
  style: string
}

interface VideoJobProgress {
  jobId: string
  status: string
  progress: number
  prompt: string
  settings: any
  startTime: number
}

interface TextToVideoPanelEnhancedProps {
  initialPrompt?: string
}

export function TextToVideoPanelEnhanced({ initialPrompt }: TextToVideoPanelEnhancedProps = {}) {
  const t = useTranslations('studio')
  const isMobile = useIsMobile()
  const [params, setParams] = useState<VideoGenerationParams>({
    prompt: "",
    model: "vidfab-q1",
    duration: "5s",
    resolution: "480p",
    aspectRatio: "16:9",
    style: "realistic"
  })

  const [generateAudio, setGenerateAudio] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [showLimitDialog, setShowLimitDialog] = useState(false)
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)

  // 设置初始 prompt
  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      setParams(prev => ({
        ...prev,
        prompt: initialPrompt.trim()
      }))
    }
  }, [initialPrompt])

  // Context and hooks
  const videoContext = useVideoContext()
  const authModal = useVideoGenerationAuth()
  const {
    creditsInfo: subscription,
    creditsRemaining,
    canAccessModel,
    checkCreditsAvailability,
    isLoading: subscriptionLoading,
    hasEnoughCreditsForVideo,
    refreshCredits
  } = useSimpleSubscription()

  // Video polling V2
  const videoPolling = useVideoPollingV2({
    onCompleted: (job, resultUrl) => {
    },
    onFailed: (job, error) => {
    }
  })

  const { startPolling } = videoPolling

  // 防止重复提交的标志
  const isSubmittingRef = useRef(false)

  const videoGeneration = useVideoGeneration({
    onSuccess: (job, requestId) => {
      isSubmittingRef.current = false

      GenerationAnalytics.trackGenerationStarted({
        generationType: 'text-to-video',
        jobId: job.id,
        requestId,
        modelType: params.model,
        duration: params.duration,
        aspectRatio: params.aspectRatio,
        resolution: params.resolution,
        creditsRequired: getCreditsRequired(),
      })

      startPolling(job)
    },
    onError: (error) => {
      isSubmittingRef.current = false
    },
    onAuthRequired: () => {
      authModal.showAuthModal()
    }
  })

  // 使用useSession获取用户信息
  const { data: session } = useSession()
  const currentUserId = session?.user?.uuid


  // 获取用户的任务和视频
  const userJobs = currentUserId
    ? videoContext.activeJobs.filter(job => job.userId === currentUserId)
    : []

  const userVideos = currentUserId
    ? videoContext.completedVideos.filter(video => video.userId === currentUserId)
    : []

  const userTemporaryVideos = currentUserId
    ? videoContext.temporaryVideos.filter(video => video.userId === currentUserId)
    : []

  // 合并所有要显示的项目：进行中任务 + 临时完成视频
  const allUserItems = [
    ...userJobs,
    ...userTemporaryVideos.map(video => ({
      id: video.id,
      userId: video.userId || currentUserId,
      status: 'completed' as const,
      prompt: video.prompt,
      settings: video.settings,
      resultUrl: video.videoUrl,
      createdAt: video.createdAt,
      updatedAt: video.createdAt,
      requestId: '',
      progress: 100,
      error: null
    }))
  ]


  // Note: Polling is now handled automatically by useVideoGeneration hook

  // Handle Vidfab Pro model selection - auto-configure settings
  useEffect(() => {
    if (params.model === "vidfab-pro") {
      // 自动设置为8秒和720p（如果当前不是支持的选项）
      setParams(prev => ({
        ...prev,
        duration: "8s",
        resolution: prev.resolution === "480p" ? "720p" : prev.resolution,  // 如果是480p则改为720p，否则保持
        // 移除强制设置 aspectRatio，保持用户选择
      }))
    }
  }, [params.model])

  // Form validation
  const validateForm = useCallback((): string[] => {
    const errors: string[] = []

    if (!params.prompt?.trim()) {
      errors.push(t('validation.enterVideoDescription'))
    }

    if (params.prompt && params.prompt.length > 500) {
      errors.push(t('validation.descriptionTooLong'))
    }

    if (!params.model) {
      errors.push(t('validation.selectModel'))
    }

    if (!params.duration) {
      errors.push(t('validation.selectDuration'))
    }

    if (!params.resolution) {
      errors.push(t('validation.selectResolution'))
    }

    if (!params.aspectRatio) {
      errors.push(t('validation.selectAspectRatio'))
    }

    return errors
  }, [params])

  // Generate video
  const handleGenerate = useCallback(async () => {
    // 防止重复提交
    if (isSubmittingRef.current) {
      return
    }

    isSubmittingRef.current = true

    // 自动清理：如果达到20个上限，移除最旧的已完成视频
    if (userJobs.length >= 20) {
      // 找到所有已完成的视频（不包括处理中、失败等状态）
      const completedItems = allUserItems.filter(item =>
        item.status === 'completed' && item.resultUrl
      )

      if (completedItems.length > 0) {
        // 按创建时间排序，找到最旧的
        const sortedCompleted = completedItems.sort((a, b) => {
          const timeA = new Date(a.createdAt || 0).getTime()
          const timeB = new Date(b.createdAt || 0).getTime()
          return timeA - timeB // 升序，最旧的在前
        })

        const oldestItem = sortedCompleted[0]
        // 只从前端预览移除，不删除数据库记录
        videoContext.removeCompletedVideo(oldestItem.id)
      } else {
        // 如果没有已完成的视频可清理，显示限制提示
        isSubmittingRef.current = false
        setShowLimitDialog(true)
        return
      }
    }

    // Form validation
    const errors = validateForm()
    if (errors.length > 0) {
      isSubmittingRef.current = false
      setValidationErrors(errors)
      return
    }

    GenerationAnalytics.trackClickGenerate({
      generationType: 'text-to-video',
      modelType: params.model,
      duration: params.duration,
      aspectRatio: params.aspectRatio,
      resolution: params.resolution,
      hasPrompt: !!params.prompt.trim(),
      promptLength: params.prompt.trim().length,
      creditsRequired: getCreditsRequired(),
    })

    // 权限和Credits检查
    if (session?.user?.uuid) {
      try {
        const audioForCheck = params.model === 'vidfab-q1' ? generateAudio : false
        const [modelAccess, budgetInfo] = await Promise.all([
          canAccessModel(params.model, params.resolution),
          checkCreditsAvailability(params.model, params.resolution, params.duration, audioForCheck)
        ])

        if (!modelAccess.can_access) {
          isSubmittingRef.current = false
          setShowUpgradeDialog(true)
          return
        }

        if (!budgetInfo.can_afford) {
          isSubmittingRef.current = false
          setShowUpgradeDialog(true)
          return
        }
      } catch (error) {
        isSubmittingRef.current = false
        setShowUpgradeDialog(true)
        return
      }
    }

    setValidationErrors([])

    // Build request
    const request: VideoGenerationRequest = {
      prompt: params.prompt.trim(),
      model: params.model,
      duration: DURATION_MAP[params.duration] || 5,
      resolution: params.resolution,
      aspectRatio: params.aspectRatio,
      seed: -1,
      cameraFixed: false
    }

    // Use auth hook to ensure user is logged in
    const isAuthenticated = await authModal.requireAuth(async () => {
      await videoGeneration.generateTextToVideo(
        params.prompt.trim(),
        {
          model: params.model,
          duration: DURATION_MAP[params.duration] || 5,
          resolution: params.resolution,
          aspectRatio: params.aspectRatio,
          style: 'realistic',
          generateAudio: params.model === 'vidfab-q1' ? generateAudio : false
        }
      )
    })

    if (!isAuthenticated) {
      isSubmittingRef.current = false
      return
    }
  }, [params, validateForm, authModal, videoGeneration, userJobs.length, allUserItems, videoContext])

  // Update form parameters
  const updateParam = useCallback((key: keyof VideoGenerationParams, value: string) => {
    setParams(prev => {
      const oldValue = prev[key]

      if (oldValue !== value) {
        if (key === 'model') {
          GenerationAnalytics.trackChangeModel({
            generationType: 'text-to-video',
            oldValue: oldValue as string,
            newValue: value,
          })
        } else if (key === 'duration') {
          GenerationAnalytics.trackChangeDuration({
            generationType: 'text-to-video',
            oldValue: oldValue as string,
            newValue: value,
            modelType: prev.model,
          })
        } else if (key === 'aspectRatio') {
          GenerationAnalytics.trackChangeRatio({
            generationType: 'text-to-video',
            oldValue: oldValue as string,
            newValue: value,
            modelType: prev.model,
          })
        }
      }

      return { ...prev, [key]: value }
    })

    // Clear related validation errors
    if (validationErrors.length > 0) {
      setValidationErrors([])
    }
  }, [validationErrors.length])

  // Calculate current active jobs (processing only)
  const activeJobs = userJobs.filter(job => job.status === "processing" || job.status === "queued")
  const processingJobs = userJobs.filter(job => job.status === "processing")
  const hasActiveJobs = activeJobs.length > 0

  // Calculate credits required for current settings
  const getCreditsRequired = () => {
    const modelForCredits = params.model === 'vidfab-q1' ? 'seedance-v1-pro-t2v' :
                           params.model === 'vidfab-pro' ? 'veo3-fast' : params.model
    const audioForCredits = params.model === 'vidfab-q1' ? generateAudio : false
    return calculateCreditsRequired(modelForCredits, params.resolution, params.duration, audioForCredits)
  }



  return (
    <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} h-full`}>
        {/* 左侧控制面板 */}
        <div className={`${isMobile ? 'w-full h-1/2' : 'w-1/2 h-full'} min-h-0 overflow-y-auto px-6 pr-3`} style={{ scrollbarWidth: 'thin', scrollbarColor: '#4b5563 #1f2937' }}>
          <div className="py-6 space-y-6">

              {/* Error display */}
              {(validationErrors.length > 0 || videoGeneration.error) && (
                <Alert className="border-red-800 bg-red-900/20">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-red-300">
                    {validationErrors.length > 0 ? (
                      <ul className="list-disc list-inside space-y-1">
                        {validationErrors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    ) : (
                      videoGeneration.error
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {/* Video description input */}
              <Card className="bg-gray-950 border-gray-800">
                <CardContent className="space-y-4 pt-6">
                  <Textarea
                    placeholder={t('textToVideo.promptPlaceholder')}
                    value={params.prompt}
                    onChange={(e) => updateParam("prompt", e.target.value)}
                    className="min-h-[120px] bg-gray-900 border-gray-700 text-white placeholder-gray-500 resize-none focus:border-purple-500 focus:ring-purple-500"
                    maxLength={500}
                    disabled={videoGeneration.isGenerating}
                  />
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">{t('common.detailedDescriptions')}</span>
                    <span className={`${params.prompt.length > 450 ? 'text-yellow-400' : 'text-gray-400'}`}>
                      {params.prompt.length}/500
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Generation settings */}
              <Card className="bg-gray-950 border-gray-800">
                <CardContent className="space-y-4 pt-6">
                  {/* Model selection */}
                  <div className="space-y-2">
                    <Label className="text-gray-300">{t('common.model')}</Label>
                    {subscriptionLoading ? (
                      <div className="bg-gray-900 border border-gray-700 rounded-md h-10 flex items-center px-3 animate-pulse">
                        <div className="h-4 bg-gray-700 rounded w-24"></div>
                      </div>
                    ) : (
                      <Select
                        value={params.model}
                        onValueChange={(value) => updateParam("model", value)}
                        disabled={videoGeneration.isGenerating}
                      >
                        <SelectTrigger className="bg-gray-900 border-gray-700 text-white transition-all duration-300">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900 border-gray-700">
                          <SelectItem value="vidfab-q1" className="transition-all duration-200">{t('common.modelVidfabQ1')}</SelectItem>
                          <SelectItem value="vidfab-pro" className="transition-all duration-200">
                            {t('common.modelVidfabPro')}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Duration and resolution */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-300">{t('common.duration')}</Label>
                      <Select
                        value={params.duration}
                        onValueChange={(value) => updateParam("duration", value)}
                        disabled={videoGeneration.isGenerating}
                      >
                        <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900 border-gray-700">
                          {params.model === "vidfab-pro" ? (
                            <SelectItem value="8s">{t('common.duration8s')}</SelectItem>
                          ) : (
                            <>
                              <SelectItem value="4s">{t('common.duration4s')}</SelectItem>
                              <SelectItem value="5s">{t('common.duration5s')}</SelectItem>
                              <SelectItem value="6s">{t('common.duration6s')}</SelectItem>
                              <SelectItem value="7s">{t('common.duration7s')}</SelectItem>
                              <SelectItem value="8s">{t('common.duration8s')}</SelectItem>
                              <SelectItem value="10s">{t('common.duration10s')}</SelectItem>
                              <SelectItem value="12s">{t('common.duration12s')}</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-300">{t('common.resolution')}</Label>
                      {subscriptionLoading ? (
                        <div className="bg-gray-900 border border-gray-700 rounded-md h-10 flex items-center px-3 animate-pulse">
                          <div className="h-4 bg-gray-700 rounded w-20"></div>
                        </div>
                      ) : (
                        <Select
                          value={params.resolution}
                          onValueChange={(value) => updateParam("resolution", value)}
                          disabled={videoGeneration.isGenerating}
                        >
                          <SelectTrigger className="bg-gray-900 border-gray-700 text-white transition-all duration-300">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-900 border-gray-700">
                            {params.model === "vidfab-pro" ? (
                              <>
                                <SelectItem value="720p" className="transition-all duration-200">{t('common.resolution720p')}</SelectItem>
                                <SelectItem value="1080p" className="transition-all duration-200">{t('common.resolution1080p')}</SelectItem>
                              </>
                            ) : (
                              <>
                                <SelectItem value="480p" className="transition-all duration-200">{t('common.resolution480p')}</SelectItem>
                                <SelectItem value="720p" className="transition-all duration-200">{t('common.resolution720p')}</SelectItem>
                                <SelectItem value="1080p" className="transition-all duration-200">{t('common.resolution1080p')}</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>

                  {/* Aspect ratio */}
                  <div className="space-y-2">
                    <Label className="text-gray-300">{t('common.aspectRatio')}</Label>
                    <div className="flex gap-2">
                      {(params.model === "vidfab-pro" ? ["16:9", "9:16"] : ["16:9", "9:16", "1:1"]).map((ratio) => (
                        <button
                          key={ratio}
                          onClick={() => updateParam("aspectRatio", ratio)}
                          disabled={videoGeneration.isGenerating}
                          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all disabled:opacity-50 ${
                            params.aspectRatio === ratio
                              ? "bg-primary text-primary-foreground"
                              : "bg-gray-800 text-gray-400 hover:bg-primary/80 hover:text-white"
                          }`}
                        >
                          {ratio}
                        </button>
                      ))}
                    </div>
                    {params.model === "vidfab-pro" && (
                      <p className="text-xs text-gray-500">
                        {t('textToVideo.proAspectRatioHint')}
                      </p>
                    )}
                  </div>

                  {/* Audio toggle - vidfab-q1 only */}
                  {params.model === "vidfab-q1" && (
                    <div className="flex items-center justify-between pt-1">
                      <div className="space-y-0.5">
                        <Label className="text-gray-300">{t('common.generateAudio')}</Label>
                        <p className="text-xs text-gray-500">{t('common.generateAudioHint')}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setGenerateAudio(prev => !prev)}
                        disabled={videoGeneration.isGenerating}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
                          generateAudio ? 'bg-purple-600' : 'bg-gray-700'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          generateAudio ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                  )}
                </CardContent>
              </Card>


              {/* Generate button */}
              <Button
                onClick={handleGenerate}
                disabled={!params.prompt.trim() || videoGeneration.isGenerating || authModal.isLoading || processingJobs.length >= 4}
                className="w-full bg-gradient-to-r from-purple-500 to-cyan-400 hover:from-purple-600 hover:to-cyan-500 text-white py-6 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed relative"
              >
                {videoGeneration.isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    {t('common.submitting')}
                  </>
                ) : authModal.isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    {t('common.checkingLogin')}
                  </>
                ) : !authModal.isAuthenticated ? (
                  <>
                    {t('common.signInAndGenerate')}
                  </>
                ) : processingJobs.length >= 4 ? (
                  <>
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    {t('textToVideo.maxVideos')}
                  </>
                ) : (
                  <div className="gap-[20px] w-full flex justify-center items-center">
                    <span>{t('textToVideo.generateVideo')} {processingJobs.length > 0 ? `(${processingJobs.length}/4)` : ''}</span>
                    <span className="flex items-center text-sm opacity-90">
                      <Zap className="w-3 h-3 mr-1" />
                      {getCreditsRequired()}
                    </span>
                  </div>
                )}
              </Button>
          </div>
        </div>

      {/* Right preview area - Multi-task Grid Layout */}
      <div className={`${isMobile ? 'w-full h-1/2' : 'w-1/2 h-full'} min-h-0 overflow-y-auto px-6 pl-3`} style={{ scrollbarWidth: 'thin', scrollbarColor: '#4b5563 #1f2937' }}>
        <div className="pt-6 pb-20">
            {/* 显示所有用户的任务（进行中+已完成） */}
            {(allUserItems.length > 0 || userVideos.length > 0) ? (
              <div
                className={`
                  grid gap-4
                  ${allUserItems.length === 1 ? 'grid-cols-1' : ''}
                  ${allUserItems.length === 2 ? 'grid-cols-2' : ''}
                  ${allUserItems.length >= 3 ? 'grid-cols-2' : ''}
                `}
              >
                {allUserItems.slice(0, 20).map((job) => {
                  const completedVideo = job.status === 'completed' && job.resultUrl
                    ? {
                        id: job.id,
                        videoUrl: job.resultUrl,
                        prompt: job.prompt,
                        settings: job.settings,
                        userId: job.userId,
                        createdAt: job.createdAt
                      }
                    : userVideos.find(v => v.id === job.id)


                  return (
                    <VideoTaskGridItem
                      key={job.id}
                      job={job}
                      completedVideo={completedVideo as any}
                    />
                  )
                })}


              </div>
            ) : (
              <Card className="h-full bg-transparent border-none">
                <CardContent className="h-full flex flex-col items-center justify-center">
                  <div className="flex items-center justify-center flex-col">
                    <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center mb-6">
                      <Play className="w-8 h-8 text-gray-500 ml-1" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-400 mb-2">{t('common.previewArea')}</h3>
                    <p className="text-gray-500">{t('textToVideo.videoPreviewHint')}</p>
                  </div>
                </CardContent>
              </Card>
            )}
        </div>
      </div>

      {/* Login modal */}
      <Dialog open={authModal.isAuthModalOpen} onOpenChange={() => authModal.hideAuthModal()}>
        <DialogContent className="p-0 max-w-[800px] bg-[#0e1018] border-white/10 overflow-hidden rounded-[20px]">
          <DialogTitle className="sr-only">user login</DialogTitle>
          <UnifiedAuthModal className="min-h-0 p-0" />
        </DialogContent>
      </Dialog>

      {/* Video limit dialog */}
      <VideoLimitDialog open={showLimitDialog} onOpenChange={setShowLimitDialog} />

      {/* Upgrade dialog */}
      <UpgradeDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        recommendedPlan="pro"
        context="Unlock advanced models and get more credits for video generation"
      />
    </div>
  )
}
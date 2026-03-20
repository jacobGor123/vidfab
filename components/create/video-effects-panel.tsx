"use client"

/**
 * Video Effects Panel
 * Video Effects Panel - Simplified version based on image-to-video
 */

import { useState, useEffect, useCallback, useRef } from "react"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Play, Sparkles, AlertTriangle, CheckCircle, Upload, X, ImageIcon, Zap } from "lucide-react"

// Hooks and services
import { useVideoGeneration } from "@/hooks/use-video-generation"
import { useVideoPollingV2 } from "@/hooks/use-video-polling-v2"
import { useVideoGenerationAuth } from "@/hooks/use-auth-modal"
import { useVideoContext } from "@/lib/contexts/video-context"
import { useRemix } from "@/hooks/use-remix"
import { useSimpleSubscription } from "@/hooks/use-subscription-simple"
import { useIsMobile } from "@/hooks/use-mobile"
import { UnifiedAuthModal } from "@/components/auth/unified-auth-modal"
import { VideoResult } from "./video-result-enhanced"
import { VideoTaskGridItem } from "./video-task-grid-item"
import { VideoLimitDialog } from "./video-limit-dialog"
import { UpgradeDialog } from "@/components/subscription/upgrade-dialog"
import { CREDITS_CONSUMPTION } from "@/lib/subscription/pricing-config"
import { GenerationAnalytics } from "@/lib/analytics/generation-events"
import { trackApplyAiEffect } from "@/lib/analytics/gtm"

// Video Effects Components
import { EffectSelector } from "./effect-selector"
import { EffectsSelectorModal } from "./effects-selector-modal"
import { VideoEffect, DEFAULT_EFFECT } from "@/lib/constants/video-effects"

// Types
import { ImageProcessor } from "@/lib/image-processor"
import { toast } from "sonner"

interface VideoEffectsParams {
  image: string // Image URL or base64
  imageFile: File | null // Local file reference
  uploadMode: 'local' | 'url'
  selectedEffect: VideoEffect | null
}

export function VideoEffectsPanel() {
  const t = useTranslations('studio')
  const isMobile = useIsMobile()
  const [params, setParams] = useState<VideoEffectsParams>({
    image: "",
    imageFile: null,
    uploadMode: 'local',
    selectedEffect: DEFAULT_EFFECT
  })

  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [showLimitDialog, setShowLimitDialog] = useState(false)
  const [showEffectsModal, setShowEffectsModal] = useState(false)
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageUploadProgress, setImageUploadProgress] = useState(0)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadHistory, setUploadHistory] = useState<Array<{id: string, name: string, size: string, timestamp: Date}>>([])

  // 错误信息转换函数（移至组件内部以访问 t）
  const getFriendlyErrorMessage = (error: string): string => {
    const errorMessages: Record<string, string> = {
      'ImageObjectsUndetected': t('videoEffects.errors.imageObjectsUndetected'),
      'InputTooLarge': t('videoEffects.errors.inputTooLarge'),
      'InvalidImageFormat': t('videoEffects.errors.invalidImageFormat'),
      'ContentPolicyViolation': t('videoEffects.errors.contentPolicyViolation'),
      'ProcessingTimeout': t('videoEffects.errors.processingTimeout'),
      'InsufficientCredits': t('videoEffects.errors.insufficientCredits'),
      'ImageTooSmall': t('videoEffects.errors.imageTooSmall'),
      'ImageTooBlurry': t('videoEffects.errors.imageTooBlurry'),
      'NoFaceDetected': t('videoEffects.errors.noFaceDetected'),
      'MultipleFacesDetected': t('videoEffects.errors.multipleFacesDetected'),
      'NetworkError': t('videoEffects.errors.networkError'),
      'ServerError': t('videoEffects.errors.serverError'),
      'RateLimitExceeded': t('videoEffects.errors.rateLimitExceeded'),
      'UnknownError': t('videoEffects.errors.unknownError')
    }

    // Exact match
    if (errorMessages[error]) {
      return errorMessages[error]
    }

    // Fuzzy match
    for (const [key, message] of Object.entries(errorMessages)) {
      if (error.toLowerCase().includes(key.toLowerCase())) {
        return message
      }
    }

    // Special keyword matching
    const errorLower = error.toLowerCase()
    if (errorLower.includes('object') && errorLower.includes('detect')) {
      return errorMessages['ImageObjectsUndetected']
    }
    if (errorLower.includes('face') && errorLower.includes('not')) {
      return errorMessages['NoFaceDetected']
    }
    if (errorLower.includes('multiple') && errorLower.includes('face')) {
      return errorMessages['MultipleFacesDetected']
    }
    if (errorLower.includes('blur') || errorLower.includes('quality')) {
      return errorMessages['ImageTooBlurry']
    }
    if (errorLower.includes('small') || errorLower.includes('resolution')) {
      return errorMessages['ImageTooSmall']
    }
    if (errorLower.includes('network') || errorLower.includes('connection')) {
      return errorMessages['NetworkError']
    }
    if (errorLower.includes('server')) {
      return errorMessages['ServerError']
    }
    if (errorLower.includes('rate') && errorLower.includes('limit')) {
      return errorMessages['RateLimitExceeded']
    }

    // Default return
    return error || t('videoEffects.errors.fallbackError')
  }

  // Context and hooks
  const videoContext = useVideoContext()
  const { getRemixData, clearRemixData } = useRemix()
  const {
    creditsRemaining,
    canAccessModel,
    checkCreditsAvailability,
    isLoading: subscriptionLoading,
    hasEnoughCreditsForVideo,
    refreshCredits
  } = useSimpleSubscription()

  // 防止重复提交的标志
  const isSubmittingRef = useRef(false)

  const videoGeneration = useVideoGeneration({
    onSuccess: (job, requestId) => {
      isSubmittingRef.current = false
      startPolling(job)
    },
    onError: (error) => {
      isSubmittingRef.current = false
    },
    onAuthRequired: () => {
      // Authentication will be handled by the useVideoGeneration hook internally
    }
  })

  // Video polling V2
  const videoPolling = useVideoPollingV2({
    onCompleted: (job, resultUrl) => {
      refreshCredits()
    },
    onFailed: (job, error) => {
      const friendlyError = getFriendlyErrorMessage(error)
      toast.error(`${t('videoEffects.generationFailedError', { error: friendlyError })}`, {
        description: t('videoEffects.tryDifferentImage'),
        duration: 8000
      })
    },
    onProgress: (job, progress) => {
    }
  })

  const { startPolling } = videoPolling

  // 使用useSession获取用户信息，避免触发认证弹框
  const { data: session, status: sessionStatus } = useSession()
  const currentUserId = session?.user?.uuid
  const isAuthenticated = !!session?.user
  const isSessionLoading = sessionStatus === "loading"

  // 使用认证弹框hook
  const authModal = useVideoGenerationAuth()

  // 获取用户的任务和视频
  const allUserJobs = currentUserId
    ? videoContext.activeJobs.filter(job => job.userId === currentUserId)
    : []

  const userFailedJobs = currentUserId
    ? videoContext.failedJobs.filter(job => job.userId === currentUserId)
    : []

  // 只显示video-effects类型的任务
  const userJobs = allUserJobs.filter(job =>
    job.generationType === 'video-effects' || !job.generationType
  )

  const userVideos = currentUserId
    ? videoContext.completedVideos.filter(video =>
        video.userId === currentUserId
      )
    : []

  const userTemporaryVideos = currentUserId
    ? videoContext.temporaryVideos.filter(video =>
        video.userId === currentUserId
      )
    : []

  // 合并所有要显示的项目：进行中任务 + 临时完成视频
  const allUserItems = [
    ...userJobs,
    ...userTemporaryVideos.map(video => ({
      id: video.id,
      userId: video.userId || currentUserId,
      status: 'completed' as const,
      prompt: video.prompt || `${video.effectName || 'Video'} Effect`,
      settings: video.settings,
      resultUrl: video.videoUrl,
      createdAt: video.createdAt,
      updatedAt: video.createdAt,
      requestId: '',
      progress: 100,
      error: null,
      generationType: 'video-effects' as const,
      effectName: video.effectName,
      effectId: video.effectId,
      sourceImage: video.sourceImage
    }))
  ]




  // Form validation
  const validateForm = useCallback((): string[] => {
    const errors: string[] = []

    if (!params.image) {
      errors.push(t('videoEffects.pleaseUploadImage'))
    }

    if (!params.selectedEffect) {
      errors.push(t('validation.selectEffect'))
    }

    return errors
  }, [params.image, params.selectedEffect, t])

  // Image upload handling
  const handleImageUpload = async (file: File) => {
    if (!file) return


    // 检查用户认证状态
    const authSuccess = await authModal.requireAuth(async () => {
      await uploadImageFile(file)
    })

    if (!authSuccess) {
      return
    }
  }

  // 实际的图片上传逻辑，分离出来以便于认证检查
  const uploadImageFile = async (file: File) => {
    // Enhanced validation
    if (!file.type.startsWith('image/')) {
      setValidationErrors([t('videoEffects.uploadImageFileError')])
      return
    }

    // Check file format more strictly
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setValidationErrors([t('videoEffects.unsupportedFormatError')])
      return
    }

    // File size validation
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setValidationErrors([getFriendlyErrorMessage("InputTooLarge")])
      return
    }

    // Minimum file size check (avoid empty or corrupted files)
    if (file.size < 1024) { // Less than 1KB
      setValidationErrors([t('videoEffects.fileTooSmallError')])
      return
    }

    // Basic image dimension validation using Image API
    try {
      const img = new Image()
      const imageLoadPromise = new Promise<{ width: number; height: number }>((resolve, reject) => {
        img.onload = () => resolve({ width: img.width, height: img.height })
        img.onerror = () => reject(new Error("Image file corrupted or invalid format"))
      })
      img.src = URL.createObjectURL(file)

      const { width, height } = await imageLoadPromise
      URL.revokeObjectURL(img.src) // Clean up memory

      // Check minimum dimensions
      if (width < 256 || height < 256) {
        setValidationErrors([getFriendlyErrorMessage("ImageTooSmall")])
        return
      }

      // Check aspect ratio (too extreme ratios might cause issues)
      const aspectRatio = Math.max(width, height) / Math.min(width, height)
      if (aspectRatio > 4) {
        setValidationErrors([t('videoEffects.aspectRatioExtremeError')])
        return
      }

    } catch (error) {
      setValidationErrors([t('videoEffects.invalidImageError')])
      return
    }

    setIsUploadingImage(true)
    setImageUploadProgress(0)
    setValidationErrors([])

    try {
      // Step 1: Validate image (5%)
      setImageUploadProgress(5)
      await new Promise(resolve => setTimeout(resolve, 100))

      // Step 2: Create immediate preview (15%)
      setImageUploadProgress(15)
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
      await new Promise(resolve => setTimeout(resolve, 200))

      // Step 3: Process image (45%)
      setImageUploadProgress(30)
      const processedResult = await ImageProcessor.processImage(file, {
        maxWidth: 1024,
        maxHeight: 1024,
        quality: 0.9
      })

      setImageUploadProgress(60)

      // Step 4: Upload to server (85%)
      const formData = new FormData()
      formData.append('file', processedResult.file)
      formData.append('autoOptimized', 'true')

      const response = await fetch('/api/images/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }

      const data = await response.json()

      setImageUploadProgress(90)

      // Step 5: Update UI (100%)
      setParams(prev => ({
        ...prev,
        image: data.data.url,
        imageFile: processedResult.file,
        uploadMode: 'local'
      }))

      GenerationAnalytics.trackUploadImage({
        generationType: 'video-effects',
        uploadMode: 'local',
        imageCount: 1,
      })

      // Add to upload history with original file size
      const historyItem = {
        id: data.data.id || Date.now().toString(),
        name: file.name,
        size: (file.size / 1024 / 1024).toFixed(2) + 'MB',
        timestamp: new Date()
      }
      setUploadHistory(prev => [historyItem, ...prev.slice(0, 4)])

      setImageUploadProgress(100)

      // Clear progress after showing success briefly
      setTimeout(() => {
        setImageUploadProgress(0)
      }, 1500)

    } catch (error) {
      setValidationErrors([
        error instanceof Error ? error.message : t('videoEffects.uploadFailedError')
      ])
      setImagePreview(null)
    } finally {
      setIsUploadingImage(false)
    }
  }

  // Handle file input change
  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleImageUpload(file)
    }
  }

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0 && files[0].type.startsWith('image/')) {
      handleImageUpload(files[0])
    }
  }

  const removeImage = async () => {
    // If there's a Supabase URL, attempt to delete the image
    if (params.image && params.uploadMode === 'local') {
      try {
        // Extract image ID from URL for deletion
        const urlParts = params.image.split('/')
        const imageFile = urlParts[urlParts.length - 1]
        const imageId = imageFile.split('.')[0]

        if (imageId) {
          await fetch(`/api/images/upload?imageId=${imageId}`, {
            method: 'DELETE'
          })
          // Remove from upload history
          setUploadHistory(prev => prev.filter(item => item.id !== imageId))
        }
      } catch (error) {
        // Ignore error
      }
    }

    // Clear local state
    setParams(prev => ({ ...prev, imageFile: null, image: '' }))
    setImagePreview(null)
    setImageUploadProgress(0)
    setValidationErrors([]) // Clear any image-related errors
  }

  // Generate video effects
  const handleGenerate = useCallback(async () => {
    // 防止重复提交
    if (isSubmittingRef.current) {
      return
    }

    isSubmittingRef.current = true

    GenerationAnalytics.trackClickGenerate({
      generationType: 'video-effects',
      effectId: params.selectedEffect?.id,
      effectName: params.selectedEffect?.name,
      uploadMode: params.uploadMode,
      creditsRequired: CREDITS_CONSUMPTION['video-effects'],
    })

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

    setValidationErrors([])

    try {
      // 检查模型访问权限和积分可用性
      const [modelAccess, budgetInfo] = await Promise.all([
        canAccessModel('video-effects', 'standard'), // 视频特效没有分辨率概念
        checkCreditsAvailability('video-effects', 'standard', '4')
      ])

      if (!modelAccess.can_access) {
        setShowUpgradeDialog(true)
        return
      }

      if (!budgetInfo.can_afford) {
        isSubmittingRef.current = false
        setShowUpgradeDialog(true)
        return
      }

    } catch (error) {
      console.error('积分检查失败:', error)
      // 🔥 积分检查失败时不显示技术性错误信息，直接引导用户升级
      isSubmittingRef.current = false
      setShowUpgradeDialog(true)
      return
    }

    // 🔥 包装视频生成调用以确保错误处理
    try {
      // Prepare image URL
      let imageUrl = params.image

      // For local upload mode, we should already have a Supabase URL
      if (params.uploadMode === 'local' && !imageUrl) {
        throw new Error(t('validation.uploadImageFirst'))
      }

      // For URL mode, validate the URL
      if (params.uploadMode === 'url' && imageUrl) {
        try {
          new URL(imageUrl) // Validate URL format
          if (!imageUrl.match(/\.(jpg|jpeg|png|webp)(\?.*)?$/i)) {
            throw new Error(t('validation.validImageUrlFormat'))
          }
        } catch {
          throw new Error(t('validation.validImageUrl'))
        }
      }

      // Call the video effects generation
      const result = await videoGeneration.generateVideoEffects({
        image: imageUrl,
        effectId: params.selectedEffect?.id || '',
        effectName: params.selectedEffect?.name
      })

      if (result?.success && result.jobId && result.requestId) {
        GenerationAnalytics.trackGenerationStarted({
          generationType: 'video-effects',
          jobId: result.jobId,
          requestId: result.requestId,
          effectId: params.selectedEffect?.id,
          effectName: params.selectedEffect?.name,
          creditsRequired: CREDITS_CONSUMPTION['video-effects'],
        })
      }
    } catch (error) {
      isSubmittingRef.current = false
      if (error instanceof Error && error.message.includes('insufficient') || error.message.includes('credits')) {
        setShowUpgradeDialog(true)
      } else {
        setValidationErrors([t('videoEffects.uploadFailedError')])
      }
    }
  }, [params, validateForm, videoGeneration, userJobs.length, canAccessModel, checkCreditsAvailability, allUserItems, videoContext, t])

  // Update form parameters
  const updateParam = useCallback((key: keyof VideoEffectsParams, value: any) => {
    setParams(prev => ({ ...prev, [key]: value }))
    // Clear related validation errors
    if (validationErrors.length > 0) {
      setValidationErrors([])
    }
  }, [validationErrors.length])

  // Calculate current active jobs (processing only)
  const activeJobs = userJobs.filter(job => job.status === "processing" || job.status === "queued")
  const processingJobs = userJobs.filter(job => job.status === "processing")

  // Handle effect selection
  const handleEffectSelect = (effect: VideoEffect) => {
    trackApplyAiEffect(effect.id)

    setParams(prev => ({ ...prev, selectedEffect: effect }))
    setShowEffectsModal(false)
  }

  return (
    <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} h-full`}>
      {/* Left control panel - 50% width */}
      <div className={`${isMobile ? 'w-full h-1/2' : 'w-1/2 h-full'} min-h-0 overflow-y-auto px-6 pr-3`} style={{ scrollbarWidth: 'thin', scrollbarColor: '#4b5563 #1f2937' }}>
        <div className="py-6 space-y-6">

          {/* Image upload section */}
          <Card className="bg-gray-950 border-gray-800 pt-6">
            <CardContent className="space-y-4">
              {/* Upload mode selector */}
              <div className="flex bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => updateParam("uploadMode", "local")}
                  disabled={videoGeneration.isGenerating}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all disabled:opacity-50 ${
                    params.uploadMode === "local"
                      ? "bg-primary text-primary-foreground"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {t('common.uploadFile')}
                </button>
                <button
                  onClick={() => updateParam("uploadMode", "url")}
                  disabled={videoGeneration.isGenerating}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all disabled:opacity-50 ${
                    params.uploadMode === "url"
                      ? "bg-primary text-primary-foreground"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {t('common.imageUrl')}
                </button>
              </div>

              {params.uploadMode === 'local' ? (
                /* Local Upload Mode */
                <div className="space-y-2">
                  <Label className="text-gray-300">{t('videoEffects.selectImageFile')}</Label>
                  {!params.image ? (
                    <div className="space-y-4">
                      <div
                        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                          isDragging
                            ? 'border-purple-500 bg-purple-500/10'
                            : 'border-gray-600 hover:border-gray-500'
                        }`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => {
                                          document.getElementById('image-upload')?.click()
                        }}
                      >
                        <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-gray-400 mb-2">{t('videoEffects.clickToUpload')}</p>
                        <p className="text-xs text-gray-500">{t('videoEffects.uploadHint')}</p>
                        <input
                          id="image-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleFileInputChange}
                          disabled={videoGeneration.isGenerating || isUploadingImage}
                          className="hidden"
                        />
                      </div>

                      {/* Upload Progress (for initial upload) */}
                      {isUploadingImage && imageUploadProgress > 0 && (
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">
                              {imageUploadProgress < 15 ? t('videoEffects.validating') :
                               imageUploadProgress < 60 ? t('videoEffects.processing') :
                               imageUploadProgress < 90 ? t('videoEffects.uploading') : t('videoEffects.completing')}
                            </span>
                            <span className="text-gray-400">{Math.round(imageUploadProgress)}%</span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-purple-500 to-cyan-400 h-2 rounded-full transition-all duration-500 ease-out"
                              style={{ width: `${imageUploadProgress}%` }}
                            />
                          </div>
                          <div className="text-xs text-gray-500 text-center">
                            {imageUploadProgress < 15 ? t('videoEffects.checkingFormat') :
                             imageUploadProgress < 30 ? t('videoEffects.creatingPreview') :
                             imageUploadProgress < 60 ? t('videoEffects.optimizingQuality') :
                             imageUploadProgress < 90 ? t('videoEffects.uploadingCloud') :
                             t('videoEffects.finalizingUpload')}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative">
                        <img
                          src={imagePreview || params.image}
                          alt="Uploaded preview"
                          className="w-full max-h-48 object-contain rounded-lg bg-gray-800"
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={removeImage}
                          disabled={videoGeneration.isGenerating}
                          className="absolute top-2 right-2"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Upload progress */}
                      {isUploadingImage && imageUploadProgress > 0 && (
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">
                              {imageUploadProgress < 15 ? t('videoEffects.validating') :
                               imageUploadProgress < 60 ? t('videoEffects.processing') :
                               imageUploadProgress < 90 ? t('videoEffects.uploading') : t('videoEffects.completing')}
                            </span>
                            <span className="text-gray-400">{Math.round(imageUploadProgress)}%</span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-purple-500 to-cyan-400 h-2 rounded-full transition-all duration-500 ease-out"
                              style={{ width: `${imageUploadProgress}%` }}
                            />
                          </div>
                          <div className="text-xs text-gray-500 text-center">
                            {imageUploadProgress < 15 ? t('videoEffects.checkingFormat') :
                             imageUploadProgress < 30 ? t('videoEffects.creatingPreview') :
                             imageUploadProgress < 60 ? t('videoEffects.optimizingQuality') :
                             imageUploadProgress < 90 ? t('videoEffects.uploadingCloud') :
                             t('videoEffects.finalizingUpload')}
                          </div>
                        </div>
                      )}

                      {/* Upload Success Feedback */}
                      {uploadHistory.length > 0 && !isUploadingImage && params.image && (
                        <div className="flex items-center gap-2 text-sm text-green-400">
                          <CheckCircle className="w-4 h-4" />
                          <span>
                            {t('videoEffects.uploadSuccessMessage', { size: uploadHistory[0].size })}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* URL Upload Mode */
                <div className="space-y-2">
                  <Label className="text-gray-300">{t('common.imageUrl')}</Label>
                  <input
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={params.image}
                    onChange={(e) => updateParam("image", e.target.value)}
                    disabled={videoGeneration.isGenerating}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none disabled:opacity-50"
                  />
                  {params.image && (
                    <div className="mt-2 space-y-2">
                      <img
                        src={params.image}
                        alt="URL preview"
                        className="w-full max-h-48 object-contain rounded-lg bg-gray-800"
                        onError={() => setValidationErrors([t('validation.validImageUrl')])}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={removeImage}
                        disabled={videoGeneration.isGenerating}
                        className="w-full text-gray-400 hover:text-white hover:bg-gray-800"
                      >
                        <X className="w-4 h-4 mr-2" />
                        {t('common.removeImage')}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Effect selector */}
          <Card className="bg-gray-950 border-gray-800">
            <CardContent className="pt-6">
              <EffectSelector
                selectedEffect={params.selectedEffect}
                onOpenModal={() => setShowEffectsModal(true)}
              />
            </CardContent>
          </Card>


          {/* Generate button */}
          <Button
            onClick={handleGenerate}
            disabled={!params.image || !params.selectedEffect || videoGeneration.isGenerating || isSessionLoading || processingJobs.length >= 4 || isUploadingImage}
            className="w-full bg-gradient-to-r from-purple-500 to-cyan-400 hover:from-purple-600 hover:to-cyan-500 text-white py-6 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed relative"
          >
            {videoGeneration.isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                {t('common.submitting')}
              </>
            ) : isSessionLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                {t('common.checkingLogin')}
              </>
            ) : !isAuthenticated ? (
              <>
                {t('common.signInAndGenerate')}
              </>
            ) : isUploadingImage ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                {t('videoEffects.processingImage')}
              </>
            ) : processingJobs.length >= 4 ? (
              <>
                <AlertTriangle className="w-5 h-5 mr-2" />
                {t('videoEffects.maxVideos')}
              </>
            ) : (
              <div className="gap-[20px] w-full flex justify-center items-center">
                <span>{t('videoEffects.generateEffects')} {processingJobs.length > 0 ? `(${processingJobs.length}/4)` : ''}</span>
                <span className="flex items-center text-sm opacity-90">
                  <Zap className="w-3 h-3 mr-1" />
                  {CREDITS_CONSUMPTION['video-effects']['4s']}
                </span>
              </div>
            )}
          </Button>
          </div>
        </div>

      {/* Right preview area - Multi-task Grid Layout */}
      <div className={`${isMobile ? 'w-full h-1/2' : 'w-1/2 h-full'} min-h-0 overflow-y-auto px-6 pl-3`} style={{ scrollbarWidth: 'thin', scrollbarColor: '#4b5563 #1f2937' }}>
        <div className="pt-6 pb-20">
          {/* Display all user tasks (in progress + completed) */}
          {(allUserItems.length > 0 || userVideos.length > 0) ? (
            <div
              className={`
                grid gap-4
                ${allUserItems.length === 1 ? 'grid-cols-1' : ''}
                ${allUserItems.length === 2 ? 'grid-cols-2' : ''}
                ${allUserItems.length >= 3 ? 'grid-cols-2' : ''}
              `}
            >
              {/* Display maximum 20 tasks */}
              {allUserItems.slice(0, 20).map((job) => {
                // If task is completed, find corresponding video
                const completedVideo = job.status === 'completed' && job.resultUrl
                  ? {
                      id: job.id,
                      videoUrl: job.resultUrl,
                      prompt: `${job.effectName} Effect`,
                      settings: job.settings,
                      userId: job.userId,
                      createdAt: job.createdAt
                    }
                  : userVideos.find(v => v.id === job.id)

                return (
                  <VideoTaskGridItem
                    key={job.id}
                    job={job}
                    completedVideo={completedVideo}
                  />
                )
              })}


            </div>
          ) : (
            /* Empty state */
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center mb-6">
                <Play className="w-8 h-8 text-gray-500 ml-1" />
              </div>
              <h3 className="text-lg font-semibold text-gray-400 mb-2">{t('common.previewArea')}</h3>
              <p className="text-gray-500">{t('videoEffects.videoPreviewHint')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Effects selector modal */}
      <EffectsSelectorModal
        open={showEffectsModal}
        onOpenChange={setShowEffectsModal}
        selectedEffect={params.selectedEffect}
        onEffectSelect={handleEffectSelect}
      />

      {/* Video limit dialog */}
      <VideoLimitDialog
        open={showLimitDialog}
        onOpenChange={setShowLimitDialog}
      />

      {/* Login modal */}
      <Dialog open={authModal.isAuthModalOpen} onOpenChange={() => authModal.hideAuthModal()}>
        <DialogContent className="p-0 max-w-[800px] bg-[#0e1018] border-white/10 overflow-hidden rounded-[20px]">
          <DialogTitle className="sr-only">user login</DialogTitle>
          <UnifiedAuthModal className="min-h-0 p-0" />
        </DialogContent>
      </Dialog>

      {/* Upgrade dialog */}
      <UpgradeDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        trigger="video_effects_generation"
      />

    </div>
  )
}

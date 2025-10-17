"use client"

/**
 * Video Effects Panel
 * Video Effects Panel - Simplified version based on image-to-video
 */

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Play, Sparkles, AlertTriangle, CheckCircle, Upload, X, ImageIcon, Zap } from "lucide-react"

// Hooks and services
import { useVideoGeneration } from "@/hooks/use-video-generation"
import { useVideoPolling } from "@/hooks/use-video-polling"
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

// Video Effects Components
import { EffectSelector } from "./effect-selector"
import { EffectsSelectorModal } from "./effects-selector-modal"
import { VideoEffect, DEFAULT_EFFECT } from "@/lib/constants/video-effects"

// Types
import { ImageProcessor } from "@/lib/image-processor"
import { toast } from "sonner"

// 🔥 Error message translation function - English version
function getFriendlyErrorMessage(error: string): string {
  const errorMessages: Record<string, string> = {
    'ImageObjectsUndetected': 'No clear objects detected in image. Please try using images with visible people, objects, or buildings',
    'InputTooLarge': 'File too large. Please use images smaller than 10MB',
    'InvalidImageFormat': 'Unsupported image format. Please use JPG, PNG, or WebP formats',
    'ContentPolicyViolation': 'Image content violates usage policy. Please select a different image',
    'ProcessingTimeout': 'Processing timeout. Please retry or use a smaller resolution image',
    'InsufficientCredits': 'Insufficient credits. Please top up your account and try again',
    'ImageTooSmall': 'Image resolution too low. Please use images of at least 512x512 pixels',
    'ImageTooBlurry': 'Image too blurry. Please use a higher quality, clearer image',
    'NoFaceDetected': 'No face detected. Please ensure image contains a clear human face',
    'MultipleFacesDetected': 'Multiple faces detected. Please use an image with only one person',
    'NetworkError': 'Network connection failed. Please check your connection and retry',
    'ServerError': 'Server temporarily unavailable. Please try again later',
    'RateLimitExceeded': 'Too many requests. Please wait a moment and try again',
    'UnknownError': 'Unknown error occurred. Please retry or contact support'
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
  return error || 'Unknown error. Please try again with a different image'
}

interface VideoEffectsParams {
  image: string // Image URL or base64
  imageFile: File | null // Local file reference
  uploadMode: 'local' | 'url'
  selectedEffect: VideoEffect | null
}

export function VideoEffectsPanel() {
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

  // Video generation
  const videoGeneration = useVideoGeneration({
    onSuccess: (jobId) => {
      startPolling(jobId)
    },
    onError: (error) => {
      console.error("Video effects generation failed:", error)
    },
    onAuthRequired: () => {
      // Authentication will be handled by the useVideoGeneration hook internally
    }
  })

  // Video polling
  const videoPolling = useVideoPolling({
    onCompleted: (job, resultUrl) => {
      console.log('Video effects generation completed:', job.id)
      // 🔥 刷新积分显示，确保前端显示的积分数是最新的
      refreshCredits()
    },
    onFailed: (job, error) => {
      console.error(`Video effects generation failed: ${job.id}`, error)

      // 🔥 为用户提供友好的错误提示
      const friendlyError = getFriendlyErrorMessage(error)
      toast.error(`Video effects generation failed: ${friendlyError}`, {
        description: 'You can try using a different image or regenerate',
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

  // 🔥 修复：获取所有用户的任务和视频 - 包含进行中和已完成的
  const allUserJobs = currentUserId
    ? videoContext.activeJobs.filter(job => job.userId === currentUserId)
    : []

  const userFailedJobs = currentUserId
    ? videoContext.failedJobs.filter(job => job.userId === currentUserId)
    : []

  // 🔥 为video-effects面板，只显示video-effects类型的任务
  const userJobs = allUserJobs.filter(job =>
    job.generationType === 'video-effects' || !job.generationType
  )

  const userVideos = currentUserId
    ? videoContext.completedVideos.filter(video =>
        video.userId === currentUserId
      )
    : []

  // 🔥 新增：获取临时视频（刚完成的video-effects类型）
  const userTemporaryVideos = currentUserId
    ? videoContext.temporaryVideos.filter(video =>
        video.userId === currentUserId
        // video-effects类型的临时视频通常包含effectName等特殊字段
      )
    : []

  // 🔥 合并所有要显示的项目：进行中任务 + 临时完成视频（仅video-effects类型）
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
      errors.push("Please upload an image")
    }

    if (!params.selectedEffect) {
      errors.push("Please select a video effect")
    }

    return errors
  }, [params.image, params.selectedEffect])

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
      setValidationErrors(["Please upload an image file (JPG, PNG, WebP formats)"])
      return
    }

    // Check file format more strictly
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setValidationErrors(["Unsupported image format. Please use JPG, PNG, or WebP formats"])
      return
    }

    // File size validation
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setValidationErrors([getFriendlyErrorMessage("InputTooLarge")])
      return
    }

    // Minimum file size check (avoid empty or corrupted files)
    if (file.size < 1024) { // Less than 1KB
      setValidationErrors(["Image file too small. Please select a valid image file"])
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
        setValidationErrors(["Image aspect ratio too extreme. Please use images with aspect ratio within 1:4"])
        return
      }

    } catch (error) {
      setValidationErrors(["Image file invalid or corrupted. Please select a different image"])
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
      console.error('❌ Image upload failed:', error)
      setValidationErrors([
        error instanceof Error ? error.message : "Image upload failed, please try again"
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
    } else {
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
        console.warn('⚠️ Failed to delete image from Supabase:', error)
        // Don't throw error, just log warning
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
    // 🔥 自动清理：如果达到20个上限，移除最旧的已完成视频
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
        console.log('🔥 Auto-cleanup: Removed oldest video from preview:', oldestItem.id)
      } else {
        // 如果没有已完成的视频可清理，显示限制提示
        setShowLimitDialog(true)
        return
      }
    }

    // Form validation
    const errors = validateForm()
    if (errors.length > 0) {
      setValidationErrors(errors)
      return
    }

    setValidationErrors([])

    // 积分检查
    try {
      // 检查模型访问权限和积分可用性
      const [modelAccess, budgetInfo] = await Promise.all([
        canAccessModel('video-effects', 'standard'), // 视频特效没有分辨率概念
        checkCreditsAvailability('video-effects', 'standard', '4') // (model, resolution, duration)
      ])

      // 处理模型访问权限问题
      if (!modelAccess.can_access) {
        setShowUpgradeDialog(true)
        return
      }

      // 处理积分不足问题
      if (!budgetInfo.can_afford) {
        setShowUpgradeDialog(true)
        return
      }

    } catch (error) {
      console.error('积分检查失败:', error)
      // 🔥 积分检查失败时不显示技术性错误信息，直接引导用户升级
      setShowUpgradeDialog(true)
      return
    }

    // 🔥 包装视频生成调用以确保错误处理
    try {
      // Prepare image URL
      let imageUrl = params.image

      // For local upload mode, we should already have a Supabase URL
      if (params.uploadMode === 'local' && !imageUrl) {
        throw new Error("Please upload an image first")
      }

      // For URL mode, validate the URL
      if (params.uploadMode === 'url' && imageUrl) {
        try {
          new URL(imageUrl) // Validate URL format
          if (!imageUrl.match(/\.(jpg|jpeg|png|webp)(\?.*)?$/i)) {
            throw new Error("Please provide a valid image URL with jpg, jpeg, png, or webp extension")
          }
        } catch {
          throw new Error("Please provide a valid image URL")
        }
      }

      // Call the video effects generation
      await videoGeneration.generateVideoEffects({
        image: imageUrl,
        effectId: params.selectedEffect?.id || '',
        effectName: params.selectedEffect?.name
      })
    } catch (error) {
      console.error('视频特效生成失败:', error)
      // 🔥 视频生成失败时不显示技术性错误信息，直接引导用户升级或重试
      if (error instanceof Error && error.message.includes('insufficient') || error.message.includes('credits')) {
        setShowUpgradeDialog(true)
      } else {
        setValidationErrors(['视频生成失败，请稍后重试'])
      }
    }
  }, [params, validateForm, videoGeneration, userJobs.length, canAccessModel, checkCreditsAvailability, allUserItems, videoContext])

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
    setParams(prev => ({ ...prev, selectedEffect: effect }))
    setShowEffectsModal(false)
  }

  return (
    <div className={`h-screen flex ${isMobile ? 'flex-col' : 'flex-row'}`}>
      {/* Left control panel - 50% width */}
      <div className={`${isMobile ? 'w-full' : 'w-1/2'} h-full min-h-[1180px]`}>
        <div className="h-full overflow-y-auto custom-scrollbar py-12 px-6 pr-3" style={{ scrollbarWidth: 'thin', scrollbarColor: '#4b5563 #1f2937' }}>

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
                  Upload File
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
                  Image URL
                </button>
              </div>

              {params.uploadMode === 'local' ? (
                /* Local Upload Mode */
                <div className="space-y-2">
                  <Label className="text-gray-300">Select Image File</Label>
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
                        <p className="text-gray-400 mb-2">Click to upload or drag & drop</p>
                        <p className="text-xs text-gray-500">JPEG, PNG, WebP (max 10MB)</p>
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
                              {imageUploadProgress < 15 ? 'Validating...' :
                               imageUploadProgress < 60 ? 'Processing...' :
                               imageUploadProgress < 90 ? 'Uploading...' : 'Completing...'}
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
                            {imageUploadProgress < 15 ? 'Checking file format and size...' :
                             imageUploadProgress < 30 ? 'Creating preview...' :
                             imageUploadProgress < 60 ? '🤖 Auto-optimizing image quality...' :
                             imageUploadProgress < 90 ? 'Uploading to cloud storage...' :
                             'Finalizing upload...'}
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
                              {imageUploadProgress < 15 ? 'Validating...' :
                               imageUploadProgress < 60 ? 'Processing...' :
                               imageUploadProgress < 90 ? 'Uploading...' : 'Completing...'}
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
                            {imageUploadProgress < 15 ? 'Checking file format and size...' :
                             imageUploadProgress < 30 ? 'Creating preview...' :
                             imageUploadProgress < 60 ? '🤖 Auto-optimizing image quality...' :
                             imageUploadProgress < 90 ? 'Uploading to cloud storage...' :
                             'Finalizing upload...'}
                          </div>
                        </div>
                      )}

                      {/* Upload Success Feedback */}
                      {uploadHistory.length > 0 && !isUploadingImage && params.image && (
                        <div className="flex items-center gap-2 text-sm text-green-400">
                          <CheckCircle className="w-4 h-4" />
                          <span>
                            Upload successful • Saved {uploadHistory[0].size} to cloud
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* URL Upload Mode */
                <div className="space-y-2">
                  <Label className="text-gray-300">Image URL</Label>
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
                        onError={() => setValidationErrors(["Invalid image URL or image cannot be loaded"])}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={removeImage}
                        disabled={videoGeneration.isGenerating}
                        className="w-full text-gray-400 hover:text-white hover:bg-gray-800"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Remove Image
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
                Submitting...
              </>
            ) : isSessionLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Checking login...
              </>
            ) : !isAuthenticated ? (
              <>
                Sign In & Generate Video
              </>
            ) : isUploadingImage ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Processing Image...
              </>
            ) : processingJobs.length >= 4 ? (
              <>
                <AlertTriangle className="w-5 h-5 mr-2" />
                Maximum 4 Videos at Once
              </>
            ) : (
              <div className="gap-[20px] w-full flex justify-center items-center">
                <span>Generate Video Effects {processingJobs.length > 0 ? `(${processingJobs.length}/4)` : ''}</span>
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
      <div className={`${isMobile ? 'w-full' : 'w-1/2'} h-full overflow-hidden`}>
        <div className="h-full overflow-y-auto pt-6 px-6 pb-20 pl-3" style={{ scrollbarWidth: 'thin', scrollbarColor: '#4b5563 #1f2937' }}>
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
              <h3 className="text-lg font-semibold text-gray-400 mb-2">Preview Area</h3>
              <p className="text-gray-500">Your generated video will appear here</p>
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
        <DialogContent className="p-0 max-w-md">
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
"use client"

/**
 * Enhanced Image to Video Panel
 * 1:1 replica of text-to-video functionality with image upload capability
 */

import { useState, useEffect, useCallback, useRef } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Play, Sparkles, AlertTriangle, CheckCircle, Upload, X, ImageIcon, Zap, Lock } from "lucide-react"

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
import { calculateCreditsRequired } from "@/lib/subscription/pricing-config"
import { UpgradeDialog } from "@/components/subscription/upgrade-dialog"

// Types
import { VideoGenerationRequest, DURATION_MAP } from "@/lib/types/video"
import { ImageProcessor } from "@/lib/image-processor"
import { UploadTask } from "./image-upload/types"
import { ImageToVideoParams } from "./types"
import { useImageUpload } from "./hooks/use-image-upload"
import { ImageUploadArea } from "./image-upload/image-upload-area"
import { ImageUploadGrid } from "./image-upload/image-upload-grid"

export function ImageToVideoPanelEnhanced() {
  const isMobile = useIsMobile()
  const [params, setParams] = useState<ImageToVideoParams>({
    image: "",
    imageFile: null,
    uploadMode: 'local',
    prompt: "",
    model: "vidfab-q1",
    duration: "5s",
    resolution: "480p",
    aspectRatio: "16:9",
    style: "realistic"
  })

  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [showLimitDialog, setShowLimitDialog] = useState(false)
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)

  // 🔥 追踪是否已经加载过 image-to-video 数据
  const imageToVideoLoadedRef = useRef(false)

  // Context and hooks
  const videoContext = useVideoContext()
  const authModal = useVideoGenerationAuth()

  // 🔥 多图上传 Hook
  const imageUpload = useImageUpload(
    {
      uploadMode: params.uploadMode,
      onAuthRequired: async () => {
        return await authModal.requireAuth(async () => {
          // 认证成功后继续上传
        })
      }
    },
    (imageUrl: string) => {
      // 当图片被选中时,更新 params
      setParams(prev => ({
        ...prev,
        imageFile: null,
        image: imageUrl
      }))
    }
  )
  const { getRemixData, clearRemixData } = useRemix()
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
      // 🔥 刷新积分显示，确保前端显示的积分数是最新的
      refreshCredits()
    },
    onFailed: (job, error) => {
      console.error(`Image-to-video generation failed: ${job.id}`, error)
    }
  })

  const { startPolling } = videoPolling

  // Video generation
  const videoGeneration = useVideoGeneration({
    onSuccess: (jobId, requestId) => {
      startPolling(jobId, requestId) // 🔥 启动轮询
    },
    onError: (error) => {
      console.error('Image-to-video generation failed:', error)
    },
    onAuthRequired: () => {
      authModal.showAuthModal()
    }
  })

  // 使用useSession获取用户信息
  const { data: session } = useSession()
  const currentUserId = session?.user?.uuid


  // 🔥 修复：获取所有用户的任务和视频 - 包含进行中和已完成的
  const userJobs = currentUserId
    ? videoContext.activeJobs.filter(job => job.userId === currentUserId)
    : []

  const userVideos = currentUserId
    ? videoContext.completedVideos.filter(video => video.userId === currentUserId)
    : []

  // 🔥 新增：获取临时视频（刚完成的）
  const userTemporaryVideos = currentUserId
    ? videoContext.temporaryVideos.filter(video => video.userId === currentUserId)
    : []

  // 🔥 合并所有要显示的项目：进行中任务 + 临时完成视频
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

  // Check for remix data on component mount
  useEffect(() => {
    const remixData = getRemixData()
    if (remixData) {
      // 🔥 Download image from URL, convert to File, and upload using Hook
      const loadAndUploadRemixImage = async () => {
        try {
          // Fetch the image through proxy to avoid CORS issues
          const proxyUrl = `/api/images/proxy?url=${encodeURIComponent(remixData.imageUrl)}`
          const response = await fetch(proxyUrl)

          if (!response.ok) {
            throw new Error('Failed to fetch image')
          }

          const blob = await response.blob()

          // Create File object from blob
          const fileName = remixData.imageUrl.split('/').pop() || 'remixed-image.webp'
          const file = new File([blob], fileName, { type: blob.type })

          // Set prompt
          setParams(prev => ({
            ...prev,
            prompt: remixData.prompt,
            uploadMode: 'local' // 🔥 Use local mode for remix images
          }))

          // 🔥 使用 imageUpload Hook 上传图片
          await imageUpload.uploadImage(file)

        } catch (error) {
          console.error('Failed to load remix image:', error)

          // Fallback: just set the prompt
          setParams(prev => ({
            ...prev,
            prompt: remixData.prompt
          }))
        }
      }

      loadAndUploadRemixImage()

      // Clear remix data after loading to prevent re-triggering
      clearRemixData()

    }
  }, [getRemixData, clearRemixData, imageUpload])

  // 🔥 Check for image-to-video data from other pages (image previews, my assets)
  useEffect(() => {
    // 如果已经加载过，跳过
    if (imageToVideoLoadedRef.current) {
      return
    }

    const checkImageToVideoData = async () => {
      try {
        const stored = sessionStorage.getItem('vidfab-image-to-video')
        if (!stored) {
          return
        }


        const data = JSON.parse(stored)

        // Check if data is fresh (within 5 minutes)
        const now = Date.now()
        const age = now - (data.timestamp || 0)
        if (age > 5 * 60 * 1000) { // 5 minutes
          sessionStorage.removeItem('vidfab-image-to-video')
          return
        }

        // 标记为已加载
        imageToVideoLoadedRef.current = true


        // 🔥 Download image from URL and upload
        const proxyUrl = `/api/images/proxy?url=${encodeURIComponent(data.imageUrl)}`
        const response = await fetch(proxyUrl)

        if (!response.ok) {
          throw new Error('Failed to fetch image')
        }

        const blob = await response.blob()
        const fileName = data.imageUrl.split('/').pop() || 'image-to-video.jpg'

        // 🔥 根据文件扩展名推断正确的 MIME 类型
        const ext = fileName.toLowerCase().split('.').pop()
        const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' :
                         ext === 'png' ? 'image/png' :
                         ext === 'webp' ? 'image/webp' :
                         blob.type || 'image/jpeg' // 默认使用 blob.type 或 image/jpeg

        const file = new File([blob], fileName, { type: mimeType })


        // Set prompt
        setParams(prev => ({
          ...prev,
          prompt: data.prompt || '',
          uploadMode: 'local'
        }))

        // Upload image
        await imageUpload.uploadImage(file)


        // Clear sessionStorage
        sessionStorage.removeItem('vidfab-image-to-video')

      } catch (error) {
        console.error('❌ Failed to load image-to-video data:', error)
        sessionStorage.removeItem('vidfab-image-to-video')
      }
    }

    checkImageToVideoData()
  }, [imageUpload]) // 🔥 依赖 imageUpload，当它可用时执行

  // Handle Vidfab Pro model selection - auto-configure settings
  useEffect(() => {
    if (params.model === "vidfab-pro") {
      // 自动设置为8秒、720p（Vidfab Pro 支持 16:9 和 9:16）
      setParams(prev => ({
        ...prev,
        duration: "8s",
        resolution: prev.resolution === "480p" ? "720p" : prev.resolution,  // 如果是480p则改为720p，否则保持
        // aspectRatio 保持用户选择，不强制修改
        aspectRatio: prev.aspectRatio === "1:1" ? "16:9" : prev.aspectRatio  // 仅当是 1:1 时切换到 16:9
      }))
    }
  }, [params.model])

  // Form validation
  const validateForm = useCallback((): string[] => {
    const errors: string[] = []

    if (!params.prompt?.trim()) {
      errors.push("Please enter video description")
    }

    if (params.prompt && params.prompt.length > 500) {
      errors.push("Video description cannot exceed 500 characters")
    }

    if (!params.image || params.image.trim() === '') {
      errors.push("Please upload an image or provide image URL")
    }

    if (!params.model) {
      errors.push("Please select generation model")
    }

    if (!params.duration) {
      errors.push("Please select video duration")
    }

    if (!params.resolution) {
      errors.push("Please select video resolution")
    }

    if (!params.aspectRatio) {
      errors.push("Please select aspect ratio")
    }

    return errors
  }, [params])

  // 🔥 拖放处理器（支持多图）
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    imageUpload.setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    imageUpload.setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    imageUpload.setIsDragging(false)

    const filesArray = Array.from(e.dataTransfer.files)
    const imageFiles = filesArray.filter(file => file.type.startsWith('image/'))

    if (imageFiles.length > 0) {
      imageUpload.uploadMultiple(imageFiles)
    }
  }

  // Generate video
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

    // 权限和Credits检查
    if (session?.user?.uuid) {
      try {
        const [modelAccess, budgetInfo] = await Promise.all([
          canAccessModel(params.model, params.resolution),
          checkCreditsAvailability(params.model, params.resolution, params.duration)
        ])

        // 检查模型访问权限
        if (!modelAccess.can_access) {
          // 🔥 不显示技术性错误信息，直接引导用户升级
          setShowUpgradeDialog(true)
          return
        }

        // 检查Credits是否足够
        if (!budgetInfo.can_afford) {
          setShowUpgradeDialog(true)
          return
        }
      } catch (error) {
        console.error('权限检查失败:', error)
        // 🔥 权限检查失败时不显示技术性错误信息，直接引导用户升级
        setShowUpgradeDialog(true)
        return
      }
    }

    setValidationErrors([])

    // Prepare image URL
    let imageUrl = params.image

    // For local upload mode, we should already have a Supabase URL
    // If not, it means the image hasn't been uploaded yet
    if (params.uploadMode === 'local' && !imageUrl) {
      throw new Error("Please upload an image first")
    }

    // For URL mode, validate the URL
    if (params.uploadMode === 'url' && imageUrl) {
      try {
        new URL(imageUrl) // Validate URL format

        // Additional URL validation
        if (!imageUrl.match(/\.(jpg|jpeg|png|webp)(\?.*)?$/i)) {
          throw new Error("Please provide a valid image URL with supported format (JPG, PNG, WebP)")
        }
      } catch {
        throw new Error("Please provide a valid image URL")
      }
    }

    try {
      // Use auth hook to ensure user is logged in
      const isAuthenticated = await authModal.requireAuth(async () => {
        await videoGeneration.generateImageToVideo(
          imageUrl, // 图片URL
          params.prompt.trim(), // 提示词
          {
            model: params.model,
            duration: DURATION_MAP[params.duration] || 5,
            resolution: params.resolution,
            aspectRatio: params.aspectRatio
          }
        )
      })

      if (!isAuthenticated) {
        // 用户未登录，不执行任何操作
        return
      }
    } catch (error) {
      setValidationErrors([error instanceof Error ? error.message : 'Generation failed'])
    }
  }, [params, validateForm, authModal, videoGeneration, userJobs.length, allUserItems, videoContext])

  // Update form parameters
  const updateParam = useCallback((key: keyof ImageToVideoParams, value: string) => {
    setParams(prev => ({ ...prev, [key]: value }))
    // Clear related validation errors
    if (validationErrors.length > 0) {
      setValidationErrors([])
    }
  }, [validationErrors.length])

  // Calculate current active jobs (processing only)
  const activeJobs = userJobs.filter(job => job.status === "processing" || job.status === "queued")
  const processingJobs = userJobs.filter(job => job.status === "processing")

  // Calculate credits required for current settings
  const getCreditsRequired = () => {
    const modelForCredits = params.model === 'vidfab-q1' ? 'seedance-v1-pro-t2v' :
                           params.model === 'vidfab-pro' ? 'veo3-fast' : params.model
    return calculateCreditsRequired(modelForCredits, params.resolution, params.duration)
  }




  return (
    <>
      <div className={`h-screen flex ${isMobile ? 'flex-col' : 'flex-row'}`}>
        {/* 左侧控制面板 */}
        <div className={`${isMobile ? 'w-full' : 'w-1/2'} h-full`}>
          <div className="h-full overflow-y-auto custom-scrollbar py-12 px-6 pr-3">
            <div className="space-y-6 min-h-[1180px]">

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

              {/* 🆕 Image Upload Section */}
              <Card className="bg-gray-950 border-gray-800">
                <CardContent className="space-y-4 pt-6">
                  {/* Upload Mode Tabs */}
                  <div className="flex rounded-lg bg-gray-800 p-1 mb-4">
                    <button
                      onClick={() => updateParam("uploadMode", "local")}
                      disabled={videoGeneration.isGenerating}
                      className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all disabled:opacity-50 ${
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
                      className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all disabled:opacity-50 ${
                        params.uploadMode === "url"
                          ? "bg-primary text-primary-foreground"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      Image URL
                    </button>
                  </div>

                  {params.uploadMode === "local" ? (
                    /* 🔥 多图上传模式 */
                    <div className="space-y-4">
                      <ImageUploadArea
                        disabled={videoGeneration.isGenerating}
                        onFilesSelected={imageUpload.uploadMultiple}
                        multiple={true}
                        isDragging={imageUpload.isDragging}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                      />

                      <ImageUploadGrid
                        tasks={imageUpload.uploadTasks}
                        selectedId={imageUpload.selectedImageId}
                        onSelectImage={imageUpload.selectImage}
                        onRemoveTask={imageUpload.removeTask}
                        onClearAll={() => imageUpload.clearAll()}
                        disabled={videoGeneration.isGenerating}
                      />
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
                            onClick={() => updateParam("image", "")}
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

              {/* Video description input */}
              <Card className="bg-gray-950 border-gray-800">
                <CardContent className="space-y-4 pt-6">
                  <Textarea
                    placeholder="A girl turns toward the camera, her earrings swaying gently with the motion. The camera rotates, bathed in dreamy sunlight..."
                    value={params.prompt}
                    onChange={(e) => updateParam("prompt", e.target.value)}
                    className="min-h-[120px] bg-gray-900 border-gray-700 text-white placeholder-gray-500 resize-none focus:border-purple-500 focus:ring-purple-500"
                    maxLength={500}
                    disabled={videoGeneration.isGenerating}
                  />
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Detailed descriptions produce better results</span>
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
                    <Label className="text-gray-300">Model</Label>
                    {subscriptionLoading ? (
                      <div className="bg-gray-900 border border-gray-700 rounded-md h-10 flex items-center px-3 animate-pulse">
                        <div className="h-4 bg-gray-700 rounded w-24"></div>
                      </div>
                    ) : (
                      <Select
                        value={params.model}
                        defaultValue="vidfab-q1"
                        onValueChange={(value) => updateParam("model", value)}
                        disabled={videoGeneration.isGenerating}
                      >
                        <SelectTrigger className="bg-gray-900 border-gray-700 text-white transition-all duration-300">
                          <SelectValue placeholder="Select model" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900 border-gray-700">
                          <SelectItem value="vidfab-q1" className="transition-all duration-200">Vidfab Q1 ⭐</SelectItem>
                          <SelectItem value="vidfab-pro" className="transition-all duration-200">
                            Vidfab Pro 🚀
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Duration and resolution */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-300">Duration</Label>
                      <Select
                        value={params.duration}
                        defaultValue="5s"
                        onValueChange={(value) => updateParam("duration", value)}
                        disabled={videoGeneration.isGenerating}
                      >
                        <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                          <SelectValue placeholder="Select duration" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900 border-gray-700">
                          {params.model === "vidfab-pro" ? (
                            <SelectItem value="8s">8 seconds</SelectItem>
                          ) : (
                            <>
                              <SelectItem value="5s">5 seconds</SelectItem>
                              <SelectItem value="10s">10 seconds</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-300">Resolution</Label>
                      {subscriptionLoading ? (
                        <div className="bg-gray-900 border border-gray-700 rounded-md h-10 flex items-center px-3 animate-pulse">
                          <div className="h-4 bg-gray-700 rounded w-20"></div>
                        </div>
                      ) : (
                        <Select
                          value={params.resolution}
                          defaultValue="480p"
                          onValueChange={(value) => updateParam("resolution", value)}
                          disabled={videoGeneration.isGenerating}
                        >
                          <SelectTrigger className="bg-gray-900 border-gray-700 text-white transition-all duration-300">
                            <SelectValue placeholder="Select resolution" />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-900 border-gray-700">
                            {params.model === "vidfab-pro" ? (
                              <>
                                <SelectItem value="720p" className="transition-all duration-200">720p HD</SelectItem>
                                <SelectItem value="1080p" className="transition-all duration-200">1080p Full HD</SelectItem>
                              </>
                            ) : (
                              <>
                                <SelectItem value="480p" className="transition-all duration-200">480p</SelectItem>
                                <SelectItem value="720p" className="transition-all duration-200">720p HD</SelectItem>
                                <SelectItem value="1080p" className="transition-all duration-200">1080p Full HD</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>

                  {/* Aspect ratio */}
                  <div className="space-y-2">
                    <Label className="text-gray-300">Aspect Ratio</Label>
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
                        Image-to-Video Vidfab Pro supports 16:9 and 9:16 aspect ratios
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>


              {/* Generate button */}
              <Button
                onClick={handleGenerate}
                disabled={!params.prompt.trim() || !params.image || videoGeneration.isGenerating || authModal.isLoading || processingJobs.length >= 4}
                className="w-full bg-gradient-to-r from-purple-500 to-cyan-400 hover:from-purple-600 hover:to-cyan-500 text-white py-6 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed relative"
              >
                {videoGeneration.isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : authModal.isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Checking login...
                  </>
                ) : !authModal.isAuthenticated ? (
                  <>
                    Sign In & Generate Video
                  </>
                ) : processingJobs.length >= 4 ? (
                  <>
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    Maximum 4 Videos at Once
                  </>
                ) : (
                  <div className="gap-[20px] w-full flex justify-center items-center">
                    <span>Generate Video</span>
                    <span className="flex items-center text-sm opacity-90">
                      <Zap className="w-3 h-3 mr-1" />
                      {getCreditsRequired()}
                    </span>
                  </div>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Right preview area - Multi-task Grid Layout */}
        <div className={`${isMobile ? 'w-full' : 'w-1/2'} h-full overflow-hidden`}>
          <div className="h-full overflow-y-auto pt-6 px-6 pb-20 pl-3" style={{ scrollbarWidth: 'thin', scrollbarColor: '#4b5563 #1f2937' }}>
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
                {/* 显示最多20个任务 */}
                {allUserItems.slice(0, 20).map((job) => {
                  // 如果任务已完成，查找对应的视频
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
                    <h3 className="text-lg font-semibold text-gray-400 mb-2">Preview Area</h3>
                    <p className="text-gray-500">Your generated video will appear here</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Login modal */}
      <Dialog open={authModal.isAuthModalOpen} onOpenChange={() => authModal.hideAuthModal()}>
        <DialogContent className="p-0 max-w-md">
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
        context="Unlock advanced models and get more credits for image-to-video generation"
      />
    </>
  )
}
"use client"

/**
 * Enhanced Image to Video Panel
 * 1:1 replica of text-to-video functionality with image upload capability
 */

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Play, Sparkles, AlertTriangle, CheckCircle, Upload, X, ImageIcon } from "lucide-react"

// Hooks and services
import { useVideoGeneration } from "@/hooks/use-video-generation"
import { useVideoPolling } from "@/hooks/use-video-polling"
import { useVideoGenerationAuth } from "@/hooks/use-auth-modal"
import { useVideoContext } from "@/lib/contexts/video-context"
import { useRemix } from "@/hooks/use-remix"
import { UnifiedAuthModal } from "@/components/auth/unified-auth-modal"
import { VideoResult } from "./video-result-enhanced"
import { VideoTaskGridItem } from "./video-task-grid-item"
import { VideoLimitDialog } from "./video-limit-dialog"

// Types
import { VideoGenerationRequest, DURATION_MAP } from "@/lib/types/video"
import { ImageProcessor } from "@/lib/image-processor"

interface ImageToVideoParams {
  image: string // Image URL or base64
  imageFile: File | null // Local file reference
  uploadMode: 'local' | 'url'
  prompt: string
  model: string
  duration: string
  resolution: string
  aspectRatio: string
  style: string
}

export function ImageToVideoPanelEnhanced() {
  const [params, setParams] = useState<ImageToVideoParams>({
    image: "",
    imageFile: null,
    uploadMode: 'local',
    prompt: "",
    model: "vidu-q1",
    duration: "5s",
    resolution: "480p",
    aspectRatio: "16:9",
    style: "realistic"
  })

  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [showLimitDialog, setShowLimitDialog] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageUploadProgress, setImageUploadProgress] = useState(0)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadHistory, setUploadHistory] = useState<Array<{id: string, name: string, size: string, timestamp: Date}>>([])

  // Context and hooks
  const videoContext = useVideoContext()
  const authModal = useVideoGenerationAuth()
  const { getRemixData, clearRemixData } = useRemix()

  // Video generation
  const videoGeneration = useVideoGeneration({
    onSuccess: (jobId) => {
      console.log(`Image-to-video generation started: ${jobId}`)
      startPolling(jobId)
    },
    onError: (error) => {
      console.error("Image-to-video generation failed:", error)
    },
    onAuthRequired: () => {
      authModal.showAuthModal()
    }
  })

  // Video polling
  const videoPolling = useVideoPolling({
    onCompleted: (job, resultUrl) => {
      console.log(`Image-to-video generation completed: ${job.id}`)
    },
    onFailed: (job, error) => {
      console.error(`Image-to-video generation failed: ${job.id}`, error)
    },
    onProgress: (job, progress) => {
      console.log(`Task progress updated: ${job.id} - ${progress}%`)
    }
  })

  const { startPolling } = videoPolling

  // 使用useSession获取用户信息
  const { data: session } = useSession()
  const currentUserId = session?.user?.uuid

  // 🔥 调试用户ID匹配问题
  console.log('🔑 Current user UUID from session:', currentUserId)
  console.log('🔑 All active jobs:', videoContext.activeJobs.map(job => ({
    id: job.id,
    userId: job.userId,
    status: job.status
  })))

  // Get current user's jobs - 只有当用户已登录时才显示数据
  const userJobs = currentUserId
    ? videoContext.activeJobs.filter(job => job.userId === currentUserId)
    : [] // 如果没有用户ID，不显示任何内容，避免闪现

  const userVideos = currentUserId
    ? videoContext.completedVideos.filter(video => video.userId === currentUserId)
    : [] // 如果没有用户ID，不显示任何内容，避免闪现

  console.log('🔑 Filtered user jobs count:', userJobs.length)
  console.log('🔑 Filtered user videos count:', userVideos.length)

  // Resume polling on page load
  useEffect(() => {
    if (authModal.isAuthenticated && userJobs.length > 0) {
      console.log(`Resuming polling for ${userJobs.length} tasks`)
      userJobs.forEach(job => {
        if (job.status === "processing" && job.requestId) {
          startPolling(job.id)
        }
      })
    }
  }, [authModal.isAuthenticated, userJobs.length, startPolling])

  // Check for remix data on component mount
  useEffect(() => {
    const remixData = getRemixData()
    if (remixData) {
      console.log('🎬 Loading remix data:', remixData)
      setParams(prev => ({
        ...prev,
        prompt: remixData.prompt,
        image: remixData.imageUrl,
        uploadMode: 'url' // Use URL mode for remix images
      }))
      setImagePreview(remixData.imageUrl)

      // Clear remix data after loading to prevent re-triggering
      clearRemixData()

      // Show success message
      console.log('✅ Remix data loaded successfully')
    }
  }, [getRemixData, clearRemixData])

  // Handle Vidfab Pro model selection
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
      errors.push("Please enter video description")
    }

    if (params.prompt && params.prompt.length > 500) {
      errors.push("Video description cannot exceed 500 characters")
    }

    if (!params.image) {
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

  // Image upload handling with compression and Supabase integration
  const handleImageUpload = async (file: File) => {
    if (!file) return

    setIsUploadingImage(true)
    setImageUploadProgress(0)

    const startTime = Date.now()

    try {
      console.log('📸 Processing image:', {
        name: file.name,
        size: `${(file.size / 1024).toFixed(1)}KB`,
        type: file.type,
        autoOptimization: true
      })

      // Step 1: Validate image (5%)
      setImageUploadProgress(5)
      const validation = ImageProcessor.validateImage(file)
      if (!validation.valid) {
        throw new Error(validation.error)
      }

      // Step 2: Create immediate preview (15%)
      setImageUploadProgress(15)
      const previewUrl = await ImageProcessor.createPreviewUrl(file)
      setImagePreview(previewUrl)

      // Step 3: 🤖 智能处理和压缩图片 (45%)
      setImageUploadProgress(30)
      const processedResult = await ImageProcessor.processImageSmart(file)

      console.log('🔧 Image processed:', {
        originalSize: `${(processedResult.originalMetadata.size / 1024).toFixed(1)}KB`,
        processedSize: `${(processedResult.metadata.size / 1024).toFixed(1)}KB`,
        compressionRatio: `${processedResult.compressionRatio.toFixed(2)}x`,
        dimensions: `${processedResult.metadata.width}x${processedResult.metadata.height}`
      })

      setImageUploadProgress(60)

      // Step 4: Upload to Supabase (85%)
      const formData = new FormData()
      formData.append('file', processedResult.file)
      formData.append('autoOptimized', 'true')

      const response = await fetch('/api/images/upload', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed')
      }

      setImageUploadProgress(90)

      // Step 5: Complete (100%)
      setParams(prev => ({
        ...prev,
        imageFile: null,
        image: result.data.url
      }))

      setImageUploadProgress(100)

      // Add to upload history
      setUploadHistory(prev => [{
        id: result.data.id,
        name: file.name,
        size: `${(result.data.size / 1024).toFixed(1)}KB`,
        timestamp: new Date()
      }, ...prev.slice(0, 4)]) // Keep only last 5 uploads

      console.log('✅ Upload completed:', {
        id: result.data.id,
        url: result.data.url,
        finalSize: `${(result.data.size / 1024).toFixed(1)}KB`,
        compression: `${((file.size - result.data.size) / file.size * 100).toFixed(1)}% saved`,
        processingTime: `${(Date.now() - startTime) / 1000}s`
      })

      setValidationErrors([])

    } catch (error) {
      console.error('❌ Image processing/upload failed:', error)
      setValidationErrors([error instanceof Error ? error.message : "Failed to process image. Please try again."])
      setImagePreview(null)
      setParams(prev => ({ ...prev, imageFile: null, image: '' }))
    } finally {
      setIsUploadingImage(false)
      setTimeout(() => setImageUploadProgress(0), 2000)
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
          console.log('🗑️ Image deleted from Supabase:', imageId)

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

  // Generate video
  const handleGenerate = useCallback(async () => {
    // Check if user has reached the limit
    if (userJobs.length >= 20) {
      setShowLimitDialog(true)
      return
    }

    // Form validation
    const errors = validateForm()
    if (errors.length > 0) {
      setValidationErrors(errors)
      return
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
          console.warn('⚠️ URL does not have image extension, proceeding anyway...')
        }
      } catch {
        throw new Error("Please provide a valid image URL")
      }
    }

    // Build request
    const request: VideoGenerationRequest = {
      prompt: params.prompt.trim(),
      image: imageUrl, // 🆕 Image parameter
      model: params.model,
      duration: DURATION_MAP[params.duration] || 5,
      resolution: params.resolution,
      aspectRatio: params.aspectRatio,
      seed: -1,
      cameraFixed: false
    }

    // Use auth hook to ensure user is logged in
    await authModal.requireAuth(async () => {
      await videoGeneration.generateVideo(request)
    })
  }, [params, validateForm, authModal, videoGeneration, userJobs.length])

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

  // 🔍 调试按钮禁用状态
  console.log('🔍 Generate Video Button Debug:', {
    hasPrompt: !!params.prompt.trim(),
    hasImage: !!params.image,
    isGenerating: videoGeneration.isGenerating,
    isAuthLoading: authModal.isLoading,
    isAuthenticated: authModal.isAuthenticated,
    processingJobsCount: processingJobs.length,
    isUploadingImage: isUploadingImage,
    shouldBeDisabled: !params.prompt.trim() || !params.image || videoGeneration.isGenerating || authModal.isLoading || processingJobs.length >= 4 || isUploadingImage
  })

  // 🔥 修复视频显示逻辑：检查activeJobs中已完成的job
  const completedJobsFromActive = userJobs.filter(job =>
    job.status === "completed" && job.resultUrl
  )

  // 🔥 调试：打印所有job状态
  console.log('🔍 All user jobs:', userJobs.map(job => ({
    id: job.id,
    status: job.status,
    resultUrl: job.resultUrl,
    progress: job.progress
  })))
  console.log('🔍 Completed jobs from active:', completedJobsFromActive)
  console.log('🔍 User videos from database:', userVideos)

  // 找到最新的已完成视频（只来自当前会话，不包括数据库历史视频）
  const latestCompletedJob = completedJobsFromActive[0] // Latest completed job from active jobs

  // 预览区域只显示当前会话中生成的视频，不显示历史视频
  const videoToShow = latestCompletedJob

  console.log('🎬 Video to show:', videoToShow)

  return (
    <>
      <div className="h-screen flex">
        {/* 左侧控制面板 */}
        <div className="w-1/2 h-full">
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
                    /* Local Upload Mode */
                    <div className="space-y-4">

                      {!imagePreview ? (
                        <div
                          className={`border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer ${
                            isDragging
                              ? 'border-purple-400 bg-purple-500/10'
                              : 'border-gray-700 hover:border-purple-500/50'
                          }`}
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                        >
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleFileInputChange}
                            className="hidden"
                            id="image-upload"
                            disabled={isUploadingImage || videoGeneration.isGenerating}
                          />
                          <label htmlFor="image-upload" className="cursor-pointer block">
                            <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4 hover:bg-gray-600 transition-colors">
                              <Upload className="w-8 h-8 text-gray-400" />
                            </div>
                            <p className="text-gray-300 mb-2">
                              {isDragging ? 'Drop image here' : 'Click to upload or drag & drop'}
                            </p>
                            <p className="text-sm text-gray-500">JPEG, PNG, WebP (max 10MB)</p>
                          </label>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="relative">
                            <img
                              src={imagePreview}
                              alt="Uploaded image"
                              className="w-full max-h-64 object-contain rounded-lg bg-gray-800"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={removeImage}
                              disabled={videoGeneration.isGenerating}
                              className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white w-8 h-8"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                            {uploadHistory.length > 0 && (
                              <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                                {uploadHistory[0].size} • auto-optimized
                              </div>
                            )}
                          </div>

                          {/* Upload Success Feedback */}
                          {uploadHistory.length > 0 && !isUploadingImage && (
                            <div className="flex items-center gap-2 text-sm text-green-400">
                              <CheckCircle className="w-4 h-4" />
                              <span>
                                Upload successful • Saved {uploadHistory[0].size} to cloud
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Upload Progress */}
                      {isUploadingImage && (
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">
                              {imageUploadProgress < 15 ? 'Validating...' :
                               imageUploadProgress < 60 ? 'Processing...' :
                               imageUploadProgress < 90 ? 'Uploading...' : 'Completing...'}
                            </span>
                            <span className="text-gray-400">{imageUploadProgress}%</span>
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
                    <Select
                      value={params.model}
                      onValueChange={(value) => updateParam("model", value)}
                      disabled={videoGeneration.isGenerating}
                    >
                      <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-gray-700">
                        <SelectItem value="vidu-q1">Vidfab Q1 ⭐</SelectItem>
                        <SelectItem value="vidfab-pro">Vidfab Pro 🚀</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Duration and resolution */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-300">Duration</Label>
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
                      <Select
                        value={params.resolution}
                        onValueChange={(value) => updateParam("resolution", value)}
                        disabled={videoGeneration.isGenerating}
                      >
                        <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900 border-gray-700">
                          {params.model === "vidfab-pro" ? (
                            <>
                              <SelectItem value="720p">720p HD</SelectItem>
                              <SelectItem value="1080p">1080p Full HD</SelectItem>
                            </>
                          ) : (
                            <>
                              <SelectItem value="480p">480p</SelectItem>
                              <SelectItem value="720p">720p HD</SelectItem>
                              <SelectItem value="1080p">1080p Full HD</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
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
                        Vidfab Pro supports 16:9 and 9:16 aspect ratios
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Generate button */}
              <Button
                onClick={handleGenerate}
                disabled={!params.prompt.trim() || !params.image || videoGeneration.isGenerating || authModal.isLoading || processingJobs.length >= 4 || isUploadingImage}
                className="w-full bg-gradient-to-r from-purple-500 to-cyan-400 hover:from-purple-600 hover:to-cyan-500 text-white py-4 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
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
                  <>
                    Generate Video {processingJobs.length > 0 ? `(${processingJobs.length}/4)` : ''}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Right preview area - Multi-task Grid Layout */}
        <div className="w-1/2 h-full overflow-hidden">
          <div className="h-full overflow-y-auto p-6 pl-3" style={{ scrollbarWidth: 'thin', scrollbarColor: '#4b5563 #1f2937' }}>
            {/* 显示所有用户的任务（进行中+已完成） */}
            {(userJobs.length > 0 || userVideos.length > 0) ? (
              <div
                className={`
                  grid gap-4
                  ${userJobs.length === 1 ? 'grid-cols-1' : ''}
                  ${userJobs.length === 2 ? 'grid-cols-2' : ''}
                  ${userJobs.length >= 3 ? 'grid-cols-2' : ''}
                `}
              >
                {/* 显示最多20个任务 */}
                {userJobs.slice(0, 20).map((job) => {
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
                      onRegenerateClick={() => {
                        setParams({
                          ...params,
                          prompt: job.prompt,
                          model: job.settings.model,
                          duration: job.settings.duration,
                          resolution: job.settings.resolution,
                          aspectRatio: job.settings.aspectRatio,
                          style: job.settings.style || "realistic"
                        })
                      }}
                    />
                  )
                })}

                {/* 如果没有当前任务但有当前会话的已完成视频，显示最新的一个 */}
                {userJobs.length === 0 && videoToShow && (
                  <VideoResult
                    videoUrl={videoToShow.resultUrl!}
                    thumbnailUrl={undefined}
                    prompt={videoToShow.prompt}
                    settings={{
                      model: videoToShow.settings.model,
                      duration: videoToShow.settings.duration,
                      resolution: videoToShow.settings.resolution,
                      aspectRatio: videoToShow.settings.aspectRatio,
                      style: videoToShow.settings.style || "realistic"
                    }}
                    onRegenerateClick={() => {
                      setParams({
                        ...params,
                        prompt: videoToShow.prompt,
                        model: videoToShow.settings.model,
                        duration: videoToShow.settings.duration,
                        resolution: videoToShow.settings.resolution,
                        aspectRatio: videoToShow.settings.aspectRatio,
                        style: videoToShow.settings.style || "realistic"
                      })
                    }}
                    video={videoToShow}
                    isFromDatabase={false}
                    videoId={videoToShow.id}
                  />
                )}

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
        <DialogContent className="p-0 border-none bg-transparent max-w-md">
          <DialogTitle className="sr-only">user login</DialogTitle>
          <UnifiedAuthModal />
        </DialogContent>
      </Dialog>

      {/* Video limit dialog */}
      <VideoLimitDialog open={showLimitDialog} onOpenChange={setShowLimitDialog} />
    </>
  )
}
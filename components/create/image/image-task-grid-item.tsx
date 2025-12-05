"use client"

/**
 * Image Task Grid Item Component
 * 图片任务网格项组件
 */

import { Card, CardContent } from "@/components/ui/card"
import { Download, AlertCircle, CheckCircle, Maximize, X, Video, RotateCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { useState, useCallback } from "react"
import { ImagePreviewDialog } from "./image-preview-dialog"
import { useImageContext } from "@/lib/contexts/image-context"
import toast from "react-hot-toast"
import { useRouter } from "next/navigation"

interface ImageTaskGridItemProps {
  id: string
  prompt: string
  status: "pending" | "processing" | "completed" | "failed"
  imageUrl?: string
  error?: string
  model?: string
  aspectRatio?: string
  onDownload?: (imageUrl: string) => void
}

export function ImageTaskGridItem({
  id,
  prompt,
  status,
  imageUrl,
  error,
  model,
  aspectRatio,
  onDownload
}: ImageTaskGridItemProps) {
  const [showPreview, setShowPreview] = useState(false)
  const imageContext = useImageContext()
  const router = useRouter()

  const isProcessing = status === "pending" || status === "processing"
  const isCompleted = status === "completed"
  const isFailed = status === "failed"

  // 🔥 直接取消任务（无需确认）
  const handleCancelTask = useCallback(() => {
    imageContext.removeTask(id)
    toast.success('Task closed')
  }, [id, imageContext])

  const handleDownload = () => {
    if (imageUrl && onDownload) {
      onDownload(imageUrl)
    } else if (imageUrl) {
      // 默认下载行为
      const link = document.createElement('a')
      link.href = imageUrl
      link.download = `image_${id}.png`
      link.click()
    }
  }

  // 🔥 跳转到 Image to Video（参考 remix 逻辑）
  const handleImageToVideo = useCallback(() => {
    if (!imageUrl) return

    // 存储图片数据到 sessionStorage（5分钟有效期）
    const imageToVideoData = {
      imageUrl,
      prompt: prompt || '',
      timestamp: Date.now()
    }

    sessionStorage.setItem('vidfab-image-to-video', JSON.stringify(imageToVideoData))

    // 跳转到 Image to Video
    router.push('/studio/image-to-video')

    toast.success('Image ready for video generation')
  }, [imageUrl, prompt, router])

  // 🔥 跳转到 Image to Image
  const handleImageToImage = useCallback(() => {
    if (!imageUrl) return

    // 存储图片数据到 sessionStorage（5分钟有效期）
    const imageToImageData = {
      imageUrl,
      prompt: prompt || '',
      timestamp: Date.now()
    }

    sessionStorage.setItem('vidfab-image-to-image', JSON.stringify(imageToImageData))

    // 跳转到 Image to Image
    router.push('/studio/image-to-image')

    toast.success('Image ready for transformation')
  }, [imageUrl, prompt, router])

  return (
    <>
      <Card className={cn(
        "bg-gray-950 border-gray-800 overflow-hidden transition-all hover:border-gray-700 relative",
        isCompleted && "border-green-800/50",
        isFailed && "border-red-800/50"
      )}>
        <CardContent className="p-0">
          {/* 图片区域 */}
          <div className="relative aspect-square bg-gray-900">
            {isProcessing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/95">
                {/* 🔥 关闭按钮 - 在轮询动画内部，确保在最上层 */}
                <button
                  onClick={handleCancelTask}
                  className="absolute top-2 right-2 z-50 p-1.5 rounded-lg bg-gray-900/90 hover:bg-red-600 text-gray-400 hover:text-white transition-all shadow-lg backdrop-blur-sm border border-gray-700"
                  title="Close this task"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* 🔥 统一为 Video 风格的旋转动画 */}
                <div className="relative mb-4">
                  <div className="w-16 h-16 border-4 border-primary/30 rounded-full animate-spin">
                    <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-primary rounded-full animate-spin"></div>
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">Creating Your Image</h3>
                <p className="text-xs text-gray-400">This may take a few moments...</p>
              </div>
            )}

          {isCompleted && imageUrl && (
            <>
              <Image
                src={imageUrl}
                alt={prompt}
                fill
                unoptimized={imageUrl.includes('cloudfront.net')}
                className="object-cover cursor-pointer transition-transform hover:scale-105"
                onClick={() => setShowPreview(true)}
              />
              <div className="absolute top-2 right-2 flex gap-2">
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8 bg-black/50 hover:bg-black/70 backdrop-blur-sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowPreview(true)
                  }}
                  title="View full size"
                >
                  <Maximize className="h-4 w-4 text-white" />
                </Button>
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8 bg-black/50 hover:bg-black/70 backdrop-blur-sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDownload()
                  }}
                  title="Download image"
                >
                  <Download className="h-4 w-4 text-white" />
                </Button>
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8 bg-black/50 hover:bg-purple-600/70 backdrop-blur-sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleImageToVideo()
                  }}
                  title="Create video from this image"
                >
                  <Video className="h-4 w-4 text-white" />
                </Button>
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8 bg-black/50 hover:bg-cyan-600/70 backdrop-blur-sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleImageToImage()
                  }}
                  title="Transform this image"
                >
                  <RotateCw className="h-4 w-4 text-white" />
                </Button>
              </div>

              {/* 预览对话框 */}
              <ImagePreviewDialog
                open={showPreview}
                onOpenChange={setShowPreview}
                imageUrl={imageUrl}
                prompt={prompt}
                model={model}
                aspectRatio={aspectRatio}
                onDownload={handleDownload}
              />
            </>
          )}

          {isFailed && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/10">
              <AlertCircle className="w-12 h-12 text-red-500 mb-3" />
              <p className="text-sm text-red-400 px-4 text-center">
                {error || 'Generation failed'}
              </p>
            </div>
          )}
        </div>

        {/* 信息区域 */}
        <div className="p-3 space-y-2">
          {/* Prompt */}
          <p className="text-sm text-gray-300 line-clamp-2">
            {prompt}
          </p>

          {/* 元数据 */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-2">
              {model && <span>{model}</span>}
              {aspectRatio && <span>•</span>}
              {aspectRatio && <span>{aspectRatio}</span>}
            </div>

            {/* 状态图标 */}
            {isCompleted && (
              <CheckCircle className="w-4 h-4 text-green-500" />
            )}
            {isFailed && (
              <AlertCircle className="w-4 h-4 text-red-500" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  </>
  )
}

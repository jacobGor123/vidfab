"use client"

/**
 * Image Preview Dialog Component
 * 图片放大预览对话框组件
 */

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Download, X, ZoomIn, ZoomOut } from "lucide-react"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"

interface ImagePreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  imageUrl: string
  prompt: string
  model?: string
  aspectRatio?: string
  onDownload?: () => void
}

export function ImagePreviewDialog({
  open,
  onOpenChange,
  imageUrl,
  prompt,
  model,
  aspectRatio,
  onDownload
}: ImagePreviewDialogProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [zoom, setZoom] = useState(100) // 缩放百分比

  // 🔥 当对话框打开时重置加载状态和缩放
  useEffect(() => {
    if (open) {
      setIsLoading(true)
      setZoom(100)
    }
  }, [open, imageUrl])

  const handleDownload = () => {
    if (onDownload) {
      onDownload()
    } else {
      // 默认下载行为
      const link = document.createElement('a')
      link.href = imageUrl
      link.download = `image_${Date.now()}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 200))
  }

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 50))
  }

  const resetZoom = () => {
    setZoom(100)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] w-[90vw] h-[90vh] p-0 bg-black border-gray-700 flex gap-0 [&>button]:hidden">
        <VisuallyHidden>
          <DialogTitle>Image Preview</DialogTitle>
        </VisuallyHidden>
        <div className="relative w-full h-full flex flex-col overflow-hidden">
          {/* 顶部工具栏 */}
          <div className="flex items-center justify-between p-4 bg-gray-900/90 border-b border-gray-800 flex-shrink-0">
            <div className="flex items-center gap-2">
              {/* 缩放按钮 */}
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 h-10 w-10"
                onClick={handleZoomOut}
                disabled={zoom <= 50}
              >
                <ZoomOut className="h-5 w-5" />
              </Button>

              <span className="text-white text-sm font-medium min-w-[60px] text-center">
                {zoom}%
              </span>

              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 h-10 w-10"
                onClick={handleZoomIn}
                disabled={zoom >= 200}
              >
                <ZoomIn className="h-5 w-5" />
              </Button>

              {zoom !== 100 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20 ml-2"
                  onClick={resetZoom}
                >
                  Reset
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* 下载按钮 */}
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 h-10 w-10"
                onClick={handleDownload}
              >
                <Download className="h-5 w-5" />
              </Button>

              {/* 关闭按钮 */}
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 h-10 w-10"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* 图片区域 */}
          <div className="flex-1 relative flex items-center justify-center p-8 overflow-auto bg-gray-950">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center z-10 bg-gray-950">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-400"></div>
              </div>
            )}

            <img
              src={imageUrl}
              alt={prompt}
              style={{
                width: `${zoom}%`,
                maxWidth: 'none',
                height: 'auto',
                objectFit: 'contain'
              }}
              className={cn(
                "rounded-lg transition-opacity duration-300 max-h-full",
                isLoading ? "opacity-0" : "opacity-100"
              )}
              onLoad={() => {
                console.log('✅ Image loaded successfully:', imageUrl)
                setIsLoading(false)
              }}
              onError={(e) => {
                console.error('❌ Failed to load image:', imageUrl, e)
                setIsLoading(false)
              }}
            />
          </div>

          {/* 底部信息栏 */}
          <div className="p-4 bg-gray-900/90 border-t border-gray-800 flex-shrink-0">
            <p className="text-white text-sm font-medium line-clamp-2 mb-2">
              {prompt}
            </p>

            {/* 元数据 */}
            {(model || aspectRatio) && (
              <div className="flex items-center gap-2 text-xs text-gray-400">
                {model && (
                  <span className="px-2 py-1 bg-gray-800 rounded">
                    {model}
                  </span>
                )}
                {aspectRatio && (
                  <span className="px-2 py-1 bg-gray-800 rounded">
                    {aspectRatio}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

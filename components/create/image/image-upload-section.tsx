"use client"

/**
 * Image Upload Section Component
 * 图片上传区域组件 - 支持最多3张图片
 */

import { useState, useRef } from "react"
import { Upload, X, Loader2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Image from "next/image"

interface UploadedImage {
  id: string
  url: string
  file?: File
  isUploading?: boolean
}

interface ImageUploadSectionProps {
  images: UploadedImage[]
  onImagesChange: (images: UploadedImage[]) => void
  onUpload: (files: File[]) => Promise<string[]>  // 返回上传后的 URLs
  disabled?: boolean
  maxImages?: number
}

export function ImageUploadSection({
  images,
  onImagesChange,
  onUpload,
  disabled = false,
  maxImages = 3
}: ImageUploadSectionProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const canAddMore = images.length < maxImages

  // 处理文件选择
  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const filesArray = Array.from(files)
    const imageFiles = filesArray.filter(file => file.type.startsWith('image/'))

    if (imageFiles.length === 0) {
      alert('Please select valid image files')
      return
    }

    // 检查数量限制
    const remainingSlots = maxImages - images.length
    if (imageFiles.length > remainingSlots) {
      alert(`You can only upload ${remainingSlots} more image(s)`)
      return
    }

    setIsUploading(true)

    try {
      // 上传图片
      const uploadedUrls = await onUpload(imageFiles)

      // 添加到列表
      const newImages = uploadedUrls.map((url, index) => ({
        id: `img_${Date.now()}_${index}`,
        url,
        file: imageFiles[index]
      }))

      onImagesChange([...images, ...newImages])
    } catch (error) {
      console.error('Upload failed:', error)
      // 🔥 不显示 alert，让父组件处理错误（包括 401 认证错误）
      // 只有当错误不是认证相关时才显示通用错误
      if (error instanceof Error && error.message !== 'Authentication required') {
        alert('Failed to upload images. Please try again.')
      }
    } finally {
      setIsUploading(false)
    }
  }

  // 拖拽处理
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled && canAddMore) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    if (disabled || !canAddMore) return

    handleFileSelect(e.dataTransfer.files)
  }

  // 删除图片
  const handleRemove = (id: string) => {
    onImagesChange(images.filter(img => img.id !== id))
  }

  // 点击上传
  const handleClick = () => {
    if (!disabled && canAddMore) {
      fileInputRef.current?.click()
    }
  }

  return (
    <div className="space-y-4">
      {/* 已上传的图片 */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {images.map((image) => (
            <div key={image.id} className="relative aspect-square rounded-lg overflow-hidden bg-gray-800 border border-gray-700">
              <Image
                src={image.url}
                alt="Uploaded"
                fill
                className="object-cover"
              />
              {!disabled && (
                <button
                  onClick={() => handleRemove(image.id)}
                  className="absolute top-2 right-2 p-1 bg-red-600 hover:bg-red-700 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 上传区域 */}
      {canAddMore && (
        <div
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "relative border-2 border-dashed rounded-lg p-8 transition-all cursor-pointer",
            isDragging
              ? "border-primary bg-primary/10"
              : "border-gray-700 hover:border-gray-600 bg-gray-900/50",
            disabled && "opacity-50 cursor-not-allowed",
            isUploading && "pointer-events-none"
          )}
        >
          <div className="flex flex-col items-center justify-center text-center space-y-3">
            {isUploading ? (
              <>
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                <p className="text-sm text-gray-400">Uploading images...</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center">
                  <Plus className="w-8 h-8 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-300">
                    Click or drag images here
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {images.length === 0 ? 'Add up to 3 images' : `${maxImages - images.length} more image(s) allowed`}
                  </p>
                </div>
                <p className="text-xs text-gray-600">
                  Supports: JPG, PNG, WebP (max 10MB each)
                </p>
              </>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
            disabled={disabled || isUploading}
          />
        </div>
      )}

      {/* 已达上限提示 */}
      {!canAddMore && (
        <p className="text-sm text-gray-500 text-center">
          Maximum {maxImages} images reached
        </p>
      )}
    </div>
  )
}

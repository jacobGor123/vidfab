/**
 * 图片上传区域组件
 * 支持拖放上传和点击选择文件
 */

"use client"

import { Upload } from "lucide-react"
import { useTranslations } from "next-intl"

interface ImageUploadAreaProps {
  disabled?: boolean
  onFilesSelected: (files: File[]) => void
  multiple?: boolean
  maxFiles?: number  // 最大上传数量限制
  currentCount?: number  // 当前已上传数量
  isDragging: boolean
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
}

export function ImageUploadArea({
  disabled = false,
  onFilesSelected,
  multiple = true,
  maxFiles,
  currentCount = 0,
  isDragging,
  onDragOver,
  onDragLeave,
  onDrop
}: ImageUploadAreaProps) {
  const t = useTranslations('studio')

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const filesArray = event.target.files ? Array.from(event.target.files) : []
    if (filesArray.length > 0) {
      // 过滤出图片文件
      const imageFiles = filesArray.filter(file => file.type.startsWith('image/'))
      if (imageFiles.length > 0) {
        onFilesSelected(imageFiles)
      }
    }
  }

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer ${
        isDragging
          ? 'border-purple-400 bg-purple-500/10'
          : 'border-gray-700 hover:border-purple-500/50'
      }`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileInputChange}
        className="hidden"
        id="image-upload"
        multiple={multiple}
        disabled={disabled}
      />
      <label htmlFor="image-upload" className="cursor-pointer block">
        <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3 hover:bg-gray-600 transition-colors">
          <Upload className="w-6 h-6 text-gray-400" />
        </div>
        <p className="text-gray-300 mb-1 text-sm">
          {isDragging ? t('imageUpload.dropHere') : t('imageUpload.clickToUpload')}
        </p>
        <p className="text-xs text-gray-500">
          {t('imageUpload.formatHint')} • {
            maxFiles === 1
              ? t('imageUpload.singleImage')
              : maxFiles
                ? t('imageUpload.maxImages', { max: maxFiles, current: currentCount })
                : multiple
                  ? t('imageUpload.multipleSupported')
                  : t('imageUpload.singleImage')
          }
        </p>
      </label>
    </div>
  )
}

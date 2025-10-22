/**
 * 图片上传区域组件
 * 支持拖放上传和点击选择文件
 */

import { Upload } from "lucide-react"

interface ImageUploadAreaProps {
  disabled?: boolean
  onFilesSelected: (files: File[]) => void
  multiple?: boolean
  isDragging: boolean
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
}

export function ImageUploadArea({
  disabled = false,
  onFilesSelected,
  multiple = true,
  isDragging,
  onDragOver,
  onDragLeave,
  onDrop
}: ImageUploadAreaProps) {
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
          {isDragging ? 'Drop images here' : 'Click to upload or drag & drop'}
        </p>
        <p className="text-xs text-gray-500">
          JPEG, PNG, WebP (max 10MB each) • {multiple ? 'Multiple images supported' : 'Single image'}
        </p>
      </label>
    </div>
  )
}

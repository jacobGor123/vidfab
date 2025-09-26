'use client'

import React, { useState, useCallback, useRef, DragEvent } from 'react'
import { Upload, Image as ImageIcon, Link, X, Check, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ImageProcessor, ImageMetadata, ProcessedImageResult, IMAGE_PRESETS, ImagePreset } from '@/lib/image-processor'
import { VideoStorageManager } from '@/lib/storage'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'
import { v4 as uuidv4 } from 'uuid'

export interface UploadedImage {
  id: string
  url: string
  metadata: ImageMetadata
  source: 'file' | 'url'
  originalName?: string
}

interface ImageUploadWidgetProps {
  onImageUploaded: (image: UploadedImage) => void
  onError: (error: string) => void
  maxImages?: number
  allowedFormats?: string[]
  className?: string
}

export function ImageUploadWidget({
  onImageUploaded,
  onError,
  maxImages = 1,
  allowedFormats = ['image/jpeg', 'image/png', 'image/webp'],
  className
}: ImageUploadWidgetProps) {
  const { user } = useAuth()
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file')
  const [imageUrl, setImageUrl] = useState('')
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [processingStep, setProcessingStep] = useState('')
  const [imageQuality, setImageQuality] = useState<ImagePreset>('STANDARD')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [imageMetadata, setImageMetadata] = useState<ImageMetadata | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 重置状态
  const resetState = useCallback(() => {
    setIsUploading(false)
    setUploadProgress(0)
    setProcessingStep('')
    setPreviewUrl(null)
    setImageMetadata(null)
    setImageUrl('')
    setIsDragOver(false)
  }, [])

  // 处理文件上传
  const handleFileUpload = useCallback(async (files: File[]) => {
    if (!user) {
      onError('请先登录')
      return
    }

    if (files.length === 0) return

    const file = files[0]

    try {
      setIsUploading(true)
      setProcessingStep('验证图片...')
      setUploadProgress(10)

      // 验证文件
      const validation = ImageProcessor.validateImage(file)
      if (!validation.valid) {
        throw new Error(validation.error)
      }

      setProcessingStep('获取图片信息...')
      setUploadProgress(20)

      // 获取原始图片信息
      const originalMetadata = await ImageProcessor.getImageMetadata(file)
      setImageMetadata(originalMetadata)

      // 生成预览
      const preview = await ImageProcessor.createPreviewUrl(file)
      setPreviewUrl(preview)

      setProcessingStep('处理图片...')
      setUploadProgress(40)

      // 处理图片
      const preset = IMAGE_PRESETS[imageQuality]
      const processedResult = await ImageProcessor.processImage(file, preset)

      setProcessingStep('上传到云存储...')
      setUploadProgress(70)

      // 上传到Supabase
      const imageId = uuidv4()
      const uploadResult = await VideoStorageManager.uploadImage(
        user.uuid,
        imageId,
        processedResult.file
      )

      setProcessingStep('完成上传...')
      setUploadProgress(100)

      const uploadedImage: UploadedImage = {
        id: imageId,
        url: uploadResult.url,
        metadata: processedResult.metadata,
        source: 'file',
        originalName: file.name
      }

      setUploadedImages(prev => [...prev, uploadedImage])
      onImageUploaded(uploadedImage)

      // 清理预览URL
      setTimeout(() => {
        URL.revokeObjectURL(preview)
        resetState()
      }, 1000)

    } catch (error) {
      console.error('文件上传失败:', error)
      onError(error instanceof Error ? error.message : '上传失败')
      resetState()
    }
  }, [user, imageQuality, onImageUploaded, onError, resetState])

  // 处理URL输入
  const handleUrlUpload = useCallback(async () => {
    if (!user || !imageUrl.trim()) {
      onError('请输入有效的图片URL')
      return
    }

    try {
      setIsUploading(true)
      setProcessingStep('验证URL...')
      setUploadProgress(10)

      // 验证URL
      const validation = await ImageProcessor.validateImageUrl(imageUrl)
      if (!validation.valid) {
        throw new Error(validation.error)
      }

      setProcessingStep('下载图片...')
      setUploadProgress(30)

      // 将URL转换为File
      const file = await ImageProcessor.urlToFile(imageUrl)

      setProcessingStep('处理图片...')
      setUploadProgress(50)

      // 生成预览
      const preview = await ImageProcessor.createPreviewUrl(file)
      setPreviewUrl(preview)

      // 获取图片信息
      const metadata = validation.metadata || await ImageProcessor.getImageMetadata(file)
      setImageMetadata(metadata)

      // 处理图片
      const preset = IMAGE_PRESETS[imageQuality]
      const processedResult = await ImageProcessor.processImage(file, preset)

      setProcessingStep('上传到云存储...')
      setUploadProgress(80)

      // 上传到Supabase
      const imageId = uuidv4()
      const uploadResult = await VideoStorageManager.uploadImage(
        user.uuid,
        imageId,
        processedResult.file
      )

      setProcessingStep('完成上传...')
      setUploadProgress(100)

      const uploadedImage: UploadedImage = {
        id: imageId,
        url: uploadResult.url,
        metadata: processedResult.metadata,
        source: 'url'
      }

      setUploadedImages(prev => [...prev, uploadedImage])
      onImageUploaded(uploadedImage)

      // 清理状态
      setTimeout(() => {
        URL.revokeObjectURL(preview)
        resetState()
      }, 1000)

    } catch (error) {
      console.error('URL上传失败:', error)
      onError(error instanceof Error ? error.message : 'URL上传失败')
      resetState()
    }
  }, [user, imageUrl, imageQuality, onImageUploaded, onError, resetState])

  // 拖拽处理
  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isUploading) {
      setIsDragOver(true)
    }
  }, [isUploading])

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    if (isUploading) return

    const files = Array.from(e.dataTransfer.files).filter(file =>
      allowedFormats.includes(file.type)
    )

    if (files.length > 0) {
      handleFileUpload(files)
    }
  }, [isUploading, allowedFormats, handleFileUpload])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileUpload(Array.from(files))
    }
  }, [handleFileUpload])

  // 删除图片
  const removeImage = useCallback((imageId: string) => {
    setUploadedImages(prev => prev.filter(img => img.id !== imageId))
  }, [])

  return (
    <div className={cn('w-full max-w-2xl mx-auto space-y-6', className)}>
      {/* 质量设置 */}
      <div className="flex items-center gap-4">
        <Label htmlFor="quality-select">图片质量:</Label>
        <Select value={imageQuality} onValueChange={(value: ImagePreset) => setImageQuality(value)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="HIGH_QUALITY">高质量</SelectItem>
            <SelectItem value="STANDARD">标准</SelectItem>
            <SelectItem value="COMPRESSED">压缩</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 上传方式选择 */}
      <Tabs value={uploadMode} onValueChange={(value: 'file' | 'url') => setUploadMode(value)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="file">
            <Upload className="w-4 h-4 mr-2" />
            文件上传
          </TabsTrigger>
          <TabsTrigger value="url">
            <Link className="w-4 h-4 mr-2" />
            URL输入
          </TabsTrigger>
        </TabsList>

        {/* 文件上传 */}
        <TabsContent value="file">
          <Card>
            <CardContent className="pt-6">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                  isDragOver
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400',
                  isUploading && 'pointer-events-none opacity-50'
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={allowedFormats.join(',')}
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <ImageIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium mb-2">
                  {isDragOver ? '放开文件即可上传' : '拖拽图片到这里或点击选择'}
                </p>
                <p className="text-sm text-gray-500">
                  支持 JPG, PNG, WebP 格式，最大 10MB
                </p>
                {!isUploading && (
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={(e) => {
                      e.stopPropagation()
                      fileInputRef.current?.click()
                    }}
                  >
                    选择文件
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* URL输入 */}
        <TabsContent value="url">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div>
                <Label htmlFor="image-url">图片URL</Label>
                <Input
                  id="image-url"
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  disabled={isUploading}
                />
              </div>
              <Button
                onClick={handleUrlUpload}
                disabled={isUploading || !imageUrl.trim()}
                className="w-full"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    上传中...
                  </>
                ) : (
                  '上传图片'
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 上传进度 */}
      {isUploading && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{processingStep}</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* 图片预览 */}
      {previewUrl && imageMetadata && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <img
                  src={previewUrl}
                  alt="预览图片"
                  className="w-full h-48 object-cover rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">图片信息</h4>
                <div className="text-sm space-y-1">
                  <p>尺寸: {imageMetadata.width} × {imageMetadata.height}px</p>
                  <p>大小: {(imageMetadata.size / 1024 / 1024).toFixed(2)} MB</p>
                  <p>格式: {imageMetadata.type}</p>
                  <p>宽高比: {imageMetadata.aspectRatio.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 已上传的图片列表 */}
      {uploadedImages.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <h4 className="font-medium mb-4">已上传的图片</h4>
            <div className="space-y-3">
              {uploadedImages.map((image) => (
                <div key={image.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <img
                    src={image.url}
                    alt={image.originalName || 'Uploaded image'}
                    className="w-16 h-16 object-cover rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {image.originalName || 'URL图片'}
                    </p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {image.source === 'file' ? '文件' : 'URL'}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {image.metadata.width}×{image.metadata.height}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeImage(image.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
"use client"

/**
 * Image to Image Panel
 * 图生图面板主组件（重构版 - 使用 useImageUpload Hook）
 */

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Loader2, Sparkles, AlertTriangle, Zap } from "lucide-react"
import { ImageGenerationSettings } from "./image-generation-settings"
import { ImageTaskGridItem } from "./image-task-grid-item"
import { useImageGenerationManager } from "@/hooks/use-image-generation-manager"
import { useAuthModal } from "@/hooks/use-auth-modal"
import { UnifiedAuthModal } from "@/components/auth/unified-auth-modal"
import { UpgradeDialog } from "@/components/subscription/upgrade-dialog"
import { IMAGE_GENERATION_CREDITS } from "@/lib/simple-credits-check"
import { useImageUpload } from "../hooks/use-image-upload"
import { ImageUploadArea } from "../image-upload/image-upload-area"
import { ImageUploadGrid } from "../image-upload/image-upload-grid"

export function ImageToImagePanel() {
  const [prompt, setPrompt] = useState("")
  const [model, setModel] = useState("seedream-v4")
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)

  // 🔥 认证弹框 Hook
  const authModal = useAuthModal()

  // 🔥 多图上传 Hook
  const imageUpload = useImageUpload(
    {
      uploadMode: 'local',
      onAuthRequired: async () => {
        return await authModal.requireAuth(async () => {
          // 认证成功后继续上传
        })
      }
    },
    (imageUrl: string) => {
      // 当图片被选中时的回调（可选）
      console.log('Selected image:', imageUrl)
    }
  )

  // 🔥 使用统一的图片生成管理 Hook
  const {
    tasks,
    error,
    isGenerating,
    processingCount,
    isAuthenticated,
    generateImageToImage,
    clearError
  } = useImageGenerationManager({
    maxTasks: 20,
    onAuthRequired: () => {
      authModal.showAuthModal()
    },
    onSubscriptionRequired: () => {
      setShowUpgradeDialog(true)
    }
  })

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

  // 生成图片 - 使用 requireAuth 包装
  const handleGenerate = useCallback(async () => {
    await authModal.requireAuth(async () => {
      // 🔥 从 imageUpload Hook 获取所有已完成上传的图片 URL
      const completedImages = imageUpload.getCompletedImages()
      const imageUrls = completedImages.map(task => task.resultUrl).filter(Boolean) as string[]

      if (imageUrls.length === 0) {
        throw new Error('Please upload at least one image')
      }

      await generateImageToImage(imageUrls, prompt, model)
    })
  }, [prompt, model, imageUpload, generateImageToImage, authModal])

  return (
    <div className="h-screen flex flex-row">
      {/* 左侧控制面板 */}
      <div className="w-1/2 h-full">
        <div className="h-full overflow-y-auto custom-scrollbar pt-12 pb-20 px-6 pr-3">
          <div className="space-y-6">
            {/* 错误提示 */}
            {error && (
              <Alert className="border-red-800 bg-red-900/20">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-red-300">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {/* 图片上传 */}
            <Card className="bg-gray-950 border-gray-800">
              <CardContent className="space-y-4 pt-6">
                <ImageUploadArea
                  disabled={isGenerating}
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
                  disabled={isGenerating}
                />
              </CardContent>
            </Card>

            {/* Prompt 输入 */}
            <Card className="bg-gray-950 border-gray-800">
              <CardContent className="space-y-4 pt-6">
                <Textarea
                  placeholder="Transform the image into a watercolor painting style with vibrant colors..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[120px] bg-gray-900 border-gray-700 text-white placeholder-gray-500 resize-none focus:border-purple-500 focus:ring-purple-500"
                  maxLength={1000}
                  disabled={isGenerating}
                />
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Describe how to transform the images</span>
                  <span className={`${prompt.length > 900 ? 'text-yellow-400' : 'text-gray-400'}`}>
                    {prompt.length}/1000
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* 生成设置 */}
            <Card className="bg-gray-950 border-gray-800">
              <CardContent className="space-y-4 pt-6">
                <ImageGenerationSettings
                  model={model}
                  aspectRatio="1:1"  // 图生图不需要选择宽高比
                  onModelChange={setModel}
                  onAspectRatioChange={() => {}}
                  disabled={isGenerating}
                  showAspectRatio={false}  // 不显示宽高比选择
                />
              </CardContent>
            </Card>

            {/* Generate 按钮 */}
            <Button
              onClick={handleGenerate}
              disabled={!prompt.trim() || imageUpload.getCompletedImages().length === 0 || isGenerating || processingCount >= 4}
              className="w-full bg-gradient-to-r from-purple-500 to-cyan-400 hover:from-purple-600 hover:to-cyan-500 text-white py-6 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : processingCount >= 4 ? (
                <>
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Maximum 4 Images at Once
                </>
              ) : (
                <div className="gap-[20px] w-full flex justify-center items-center">
                  <span>Generate Image {processingCount > 0 ? `(${processingCount}/4)` : ''}</span>
                  <span className="flex items-center text-sm opacity-90">
                    <Zap className="w-3 h-3 mr-1" />
                    {IMAGE_GENERATION_CREDITS}
                  </span>
                </div>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* 右侧预览区域 */}
      <div className="w-1/2 h-full overflow-hidden">
        <div className="h-full overflow-y-auto pt-6 px-6 pb-20 pl-3" style={{ scrollbarWidth: 'thin', scrollbarColor: '#4b5563 #1f2937' }}>
          {tasks.length > 0 ? (
            <div className={`grid gap-4 ${tasks.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {tasks.map((task) => (
                <ImageTaskGridItem
                  key={task.id}
                  id={task.id}
                  prompt={task.prompt}
                  status={task.status}
                  imageUrl={task.imageUrl}
                  error={task.error}
                  model={task.model}
                />
              ))}
            </div>
          ) : (
            <Card className="h-full bg-transparent border-none">
              <CardContent className="h-full flex flex-col items-center justify-center">
                <div className="flex items-center justify-center flex-col">
                  <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center mb-6">
                    <Sparkles className="w-8 h-8 text-gray-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-400 mb-2">Preview Area</h3>
                  <p className="text-gray-500">Your generated images will appear here</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

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
        recommendedPlan="pro"
        context="Unlock advanced models and get more credits for image generation"
      />
    </div>
  )
}

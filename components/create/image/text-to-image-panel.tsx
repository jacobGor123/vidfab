"use client"

/**
 * Text to Image Panel
 * 文生图面板主组件（重构版 - 使用共享 Hook）
 */

import { useState, useMemo, useRef } from "react"
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
import { UpgradeDialog } from "@/components/subscription/upgrade-dialog"  // 🔥 订阅弹框
import { IMAGE_GENERATION_CREDITS } from "@/lib/simple-credits-check"
import { useIsMobile } from "@/hooks/use-mobile"
import { GenerationAnalytics, debounce } from "@/lib/analytics/generation-events"

export function TextToImagePanel() {
  const isMobile = useIsMobile()
  const [prompt, setPrompt] = useState("")
  const [model, setModelState] = useState("seedream-v4")
  const [aspectRatio, setAspectRatioState] = useState("1:1")
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)  // 🔥 订阅弹框状态

  // 🔥 Analytics: 包装 model setter 来追踪切换事件
  const setModel = (newValue: string) => {
    const oldValue = model
    if (oldValue !== newValue) {
      GenerationAnalytics.trackChangeModel({
        generationType: 'text-to-image',
        oldValue,
        newValue,
      })
    }
    setModelState(newValue)
  }

  // 🔥 Analytics: 包装 aspectRatio setter 来追踪切换事件
  const setAspectRatio = (newValue: string) => {
    const oldValue = aspectRatio
    if (oldValue !== newValue) {
      GenerationAnalytics.trackChangeRatio({
        generationType: 'text-to-image',
        oldValue,
        newValue,
        modelType: model,
      })
    }
    setAspectRatioState(newValue)
  }

  // 用于去重的 Ref：记录上次输入的 prompt
  const lastPromptRef = useRef<string>("")

  // 防抖的 input_prompt 事件追踪
  const debouncedTrackPrompt = useMemo(
    () =>
      debounce((prompt: string) => {
        if (prompt !== lastPromptRef.current) {
          lastPromptRef.current = prompt
          GenerationAnalytics.trackInputPrompt({
            generationType: 'text-to-image',
            promptLength: prompt.length,
          })
        }
      }, 2000),
    []
  )

  // 🔥 认证弹框 Hook
  const authModal = useAuthModal()

  // 🔥 使用统一的图片生成管理 Hook
  const {
    tasks,
    error,
    isGenerating,
    processingCount,
    isAuthenticated,
    generateTextToImage,
    clearError
  } = useImageGenerationManager({
    maxTasks: 20,
    onAuthRequired: () => {
      authModal.showAuthModal()
    },
    onSubscriptionRequired: () => {  // 🔥 积分不足时显示订阅弹框
      setShowUpgradeDialog(true)
    }
  })

  // 生成图片 - 使用 requireAuth 包装
  const handleGenerate = async () => {
    // 🔥 事件1: 点击生成按钮
    GenerationAnalytics.trackClickGenerate({
      generationType: 'text-to-image',
      modelType: model,
      aspectRatio: aspectRatio,
      hasPrompt: !!prompt.trim(),
      promptLength: prompt.trim().length,
      creditsRequired: IMAGE_GENERATION_CREDITS,
    })

    await authModal.requireAuth(async () => {
      const result = await generateTextToImage(prompt, model, aspectRatio)

      // 🔥 事件2: 后端开始生成 (仅在API成功返回时触发)
      // useImageGenerationManager 返回 { success, requestId, localId }
      if (result?.success && result.requestId && result.localId) {
        GenerationAnalytics.trackGenerationStarted({
          generationType: 'text-to-image',
          jobId: result.localId,
          requestId: result.requestId,
          modelType: model,
          aspectRatio: aspectRatio,
          creditsRequired: IMAGE_GENERATION_CREDITS,
        })
      }
    })
  }

  return (
    <div className={`h-screen flex ${isMobile ? 'flex-col' : 'flex-row'}`}>
      {/* 左侧控制面板 */}
      <div className={`${isMobile ? 'w-full' : 'w-1/2'} h-full`}>
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

            {/* Prompt 输入 */}
            <Card className="bg-gray-950 border-gray-800">
              <CardContent className="space-y-4 pt-6">
                <Textarea
                  placeholder="A serene mountain landscape at sunset, with vibrant colors and dramatic clouds..."
                  value={prompt}
                  onChange={(e) => {
                    const newValue = e.target.value
                    setPrompt(newValue)
                    // 🔥 防抖触发 input_prompt 事件
                    debouncedTrackPrompt(newValue)
                  }}
                  className="min-h-[120px] bg-gray-900 border-gray-700 text-white placeholder-gray-500 resize-none focus:border-purple-500 focus:ring-purple-500"
                  maxLength={1000}
                  disabled={isGenerating}
                />
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Detailed descriptions produce better results</span>
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
                  aspectRatio={aspectRatio}
                  onModelChange={setModel}
                  onAspectRatioChange={setAspectRatio}
                  disabled={isGenerating}
                  showAspectRatio={true}
                />
              </CardContent>
            </Card>

            {/* Generate 按钮 */}
            <Button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating || processingCount >= 4}
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
      <div className={`${isMobile ? 'w-full' : 'w-1/2'} h-full overflow-hidden`}>
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
                  aspectRatio={task.aspectRatio}
                />
              ))}
            </div>
          ) : (
            // 空状态
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

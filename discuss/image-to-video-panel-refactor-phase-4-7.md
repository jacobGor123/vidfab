# Image-to-Video Panel 组件拆分方案 - Phase 4-7

## 📊 当前状态 (Phase 3 完成后)

### 文件结构
```
components/create/
├── image-to-video-panel.tsx  (786行)
├── types.ts                  (17行)
├── image-upload/
│   ├── types.ts              (29行)
│   ├── image-upload-area.tsx (71行)
│   ├── image-upload-card.tsx (105行)
│   └── image-upload-grid.tsx (67行)
└── hooks/
    └── use-image-upload.ts   (333行)
```

### 已完成工作
- ✅ **Phase 1**: 提取类型定义 (完成)
- ✅ **Phase 2**: 提取多图上传逻辑 Hook (完成)
- ✅ **Phase 3**: 提取图片上传 UI 组件 (完成)

### 收益总结
- 主组件从 **1200行** 减少到 **786行** (↓34.5%)
- 创建了 **6个模块化文件**
- 代码结构更清晰,易于维护

---

## 🎯 后续拆分计划 (Phase 4-7)

### Phase 4: 提取视频设置 UI 组件

#### 目标
将视频生成参数设置面板拆分为独立组件,进一步减少主组件复杂度。

#### 当前代码位置
主组件 `image-to-video-panel.tsx` 的视频设置部分 (约150-200行):
- **Model 选择器** (lines ~720-750)
- **Duration/Resolution 选择器** (lines ~750-800)
- **Aspect Ratio 选择器** (lines ~800-850)
- **Prompt 输入框** (lines ~665-680)

#### 需要创建的文件

##### 1. `components/create/video-settings/video-settings-panel.tsx`
**职责**: 视频设置面板容器组件

```typescript
/**
 * 视频生成参数设置面板
 */

import { ImageToVideoParams } from "../types"
import { PromptInput } from "./prompt-input"
import { ModelSelector } from "./model-selector"
import { DurationResolutionSelector } from "./duration-resolution-selector"
import { AspectRatioSelector } from "./aspect-ratio-selector"

interface VideoSettingsPanelProps {
  params: ImageToVideoParams
  onParamChange: (key: keyof ImageToVideoParams, value: string) => void
  disabled?: boolean
  subscriptionLoading?: boolean
}

export function VideoSettingsPanel({
  params,
  onParamChange,
  disabled = false,
  subscriptionLoading = false
}: VideoSettingsPanelProps) {
  return (
    <div className="space-y-6">
      {/* Prompt 输入 */}
      <PromptInput
        value={params.prompt}
        onChange={(value) => onParamChange("prompt", value)}
        disabled={disabled}
        maxLength={500}
      />

      {/* Model 选择 */}
      <ModelSelector
        value={params.model}
        onChange={(value) => onParamChange("model", value)}
        disabled={disabled}
        loading={subscriptionLoading}
      />

      {/* Duration & Resolution */}
      <DurationResolutionSelector
        model={params.model}
        duration={params.duration}
        resolution={params.resolution}
        onDurationChange={(value) => onParamChange("duration", value)}
        onResolutionChange={(value) => onParamChange("resolution", value)}
        disabled={disabled}
        loading={subscriptionLoading}
      />

      {/* Aspect Ratio */}
      <AspectRatioSelector
        model={params.model}
        value={params.aspectRatio}
        onChange={(value) => onParamChange("aspectRatio", value)}
        disabled={disabled}
      />
    </div>
  )
}
```

**预计行数**: 约 80 行

##### 2. `components/create/video-settings/prompt-input.tsx`
**职责**: Prompt 输入框组件

```typescript
/**
 * 视频描述输入框
 */

import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"

interface PromptInputProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  maxLength?: number
}

export function PromptInput({
  value,
  onChange,
  disabled = false,
  maxLength = 500
}: PromptInputProps) {
  return (
    <Card className="bg-gray-950 border-gray-800">
      <CardContent className="space-y-4 pt-6">
        <Textarea
          placeholder="A girl turns toward the camera, her earrings swaying gently with the motion. The camera rotates, bathed in dreamy sunlight..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[120px] bg-gray-900 border-gray-700 text-white placeholder-gray-500 resize-none focus:border-purple-500 focus:ring-purple-500"
          maxLength={maxLength}
          disabled={disabled}
        />
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Detailed descriptions produce better results</span>
          <span className={`${value.length > maxLength * 0.9 ? 'text-yellow-400' : 'text-gray-400'}`}>
            {value.length}/{maxLength}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
```

**预计行数**: 约 50 行

##### 3. `components/create/video-settings/model-selector.tsx`
**职责**: Model 选择器组件

```typescript
/**
 * 视频生成模型选择器
 */

import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface ModelSelectorProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  loading?: boolean
}

export function ModelSelector({
  value,
  onChange,
  disabled = false,
  loading = false
}: ModelSelectorProps) {
  return (
    <div className="space-y-2">
      <Label className="text-gray-300">Model</Label>
      {loading ? (
        <div className="bg-gray-900 border border-gray-700 rounded-md h-10 flex items-center px-3 animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-24"></div>
        </div>
      ) : (
        <Select value={value} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger className="bg-gray-900 border-gray-700 text-white transition-all duration-300">
            <SelectValue placeholder="Select model" />
          </SelectTrigger>
          <SelectContent className="bg-gray-900 border-gray-700">
            <SelectItem value="vidfab-q1" className="transition-all duration-200">
              Vidfab Q1 ⭐
            </SelectItem>
            <SelectItem value="vidfab-pro" className="transition-all duration-200">
              Vidfab Pro 🚀
            </SelectItem>
          </SelectContent>
        </Select>
      )}
    </div>
  )
}
```

**预计行数**: 约 50 行

##### 4. `components/create/video-settings/duration-resolution-selector.tsx`
**职责**: Duration 和 Resolution 联合选择器

```typescript
/**
 * Duration 和 Resolution 选择器
 */

import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface DurationResolutionSelectorProps {
  model: string
  duration: string
  resolution: string
  onDurationChange: (value: string) => void
  onResolutionChange: (value: string) => void
  disabled?: boolean
  loading?: boolean
}

export function DurationResolutionSelector({
  model,
  duration,
  resolution,
  onDurationChange,
  onResolutionChange,
  disabled = false,
  loading = false
}: DurationResolutionSelectorProps) {
  const isVidfabPro = model === "vidfab-pro"

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Duration */}
      <div className="space-y-2">
        <Label className="text-gray-300">Duration</Label>
        <Select value={duration} onValueChange={onDurationChange} disabled={disabled}>
          <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
            <SelectValue placeholder="Select duration" />
          </SelectTrigger>
          <SelectContent className="bg-gray-900 border-gray-700">
            {isVidfabPro ? (
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

      {/* Resolution */}
      <div className="space-y-2">
        <Label className="text-gray-300">Resolution</Label>
        {loading ? (
          <div className="bg-gray-900 border border-gray-700 rounded-md h-10 flex items-center px-3 animate-pulse">
            <div className="h-4 bg-gray-700 rounded w-20"></div>
          </div>
        ) : (
          <Select value={resolution} onValueChange={onResolutionChange} disabled={disabled}>
            <SelectTrigger className="bg-gray-900 border-gray-700 text-white transition-all duration-300">
              <SelectValue placeholder="Select resolution" />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700">
              {isVidfabPro ? (
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
  )
}
```

**预计行数**: 约 80 行

##### 5. `components/create/video-settings/aspect-ratio-selector.tsx`
**职责**: Aspect Ratio 选择器

```typescript
/**
 * 视频宽高比选择器
 */

import { Label } from "@/components/ui/label"

interface AspectRatioSelectorProps {
  model: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function AspectRatioSelector({
  model,
  value,
  onChange,
  disabled = false
}: AspectRatioSelectorProps) {
  const isVidfabPro = model === "vidfab-pro"
  const availableRatios = isVidfabPro ? ["16:9"] : ["16:9", "9:16", "1:1"]

  return (
    <div className="space-y-2">
      <Label className="text-gray-300">Aspect Ratio</Label>
      <div className="flex gap-2">
        {availableRatios.map((ratio) => (
          <button
            key={ratio}
            onClick={() => onChange(ratio)}
            disabled={disabled}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all disabled:opacity-50 ${
              value === ratio
                ? "bg-primary text-primary-foreground"
                : "bg-gray-800 text-gray-400 hover:bg-primary/80 hover:text-white"
            }`}
          >
            {ratio}
          </button>
        ))}
      </div>
      {isVidfabPro && (
        <p className="text-xs text-gray-500">
          Image-to-Video Vidfab Pro only supports 16:9 aspect ratio
        </p>
      )}
    </div>
  )
}
```

**预计行数**: 约 50 行

#### 主组件中的使用

在 `image-to-video-panel.tsx` 中:

```typescript
import { VideoSettingsPanel } from "./video-settings/video-settings-panel"

// ...

<VideoSettingsPanel
  params={params}
  onParamChange={updateParam}
  disabled={videoGeneration.isGenerating}
  subscriptionLoading={subscriptionLoading}
/>
```

#### 预计收益
- 主组件减少约 **150-180行**
- 创建 **5个新文件** (约310行)
- 视频设置面板完全模块化

---

### Phase 5: 提取 Remix 功能 Hook

#### 目标
将 Remix 功能从主组件中提取到独立的 Hook。

#### 当前代码位置
主组件 `image-to-video-panel.tsx` 的 Remix useEffect (lines ~162-209, 约50行)

#### 需要创建的文件

##### `components/create/hooks/use-image-remix.ts`

```typescript
/**
 * Remix 功能 Hook
 * 处理从 URL 加载图片并自动上传
 */

import { useEffect } from "react"
import { useRemix } from "@/hooks/use-remix"

interface UseImageRemixOptions {
  uploadImage: (file: File) => Promise<void>
  setPrompt: (prompt: string) => void
  setUploadMode: (mode: 'local' | 'url') => void
}

export function useImageRemix(options: UseImageRemixOptions) {
  const { uploadImage, setPrompt, setUploadMode } = options
  const { getRemixData, clearRemixData } = useRemix()

  useEffect(() => {
    const remixData = getRemixData()
    if (!remixData) return

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

        // Set prompt and upload mode
        setPrompt(remixData.prompt)
        setUploadMode('local')

        // Upload using the provided upload function
        await uploadImage(file)

      } catch (error) {
        console.error('Failed to load remix image:', error)

        // Fallback: just set the prompt
        setPrompt(remixData.prompt)
      }
    }

    loadAndUploadRemixImage()

    // Clear remix data after loading to prevent re-triggering
    clearRemixData()

  }, [getRemixData, clearRemixData, uploadImage, setPrompt, setUploadMode])
}
```

**预计行数**: 约 65 行

#### 主组件中的使用

```typescript
import { useImageRemix } from "./hooks/use-image-remix"

// ...

useImageRemix({
  uploadImage: imageUpload.uploadImage,
  setPrompt: (prompt) => setParams(prev => ({ ...prev, prompt })),
  setUploadMode: (mode) => setParams(prev => ({ ...prev, uploadMode: mode }))
})
```

#### 预计收益
- 主组件减少约 **50行**
- Remix 功能完全独立,易于测试

---

### Phase 6: 提取表单验证和业务逻辑 Hook

#### 目标
将表单验证、Credits 计算等业务逻辑提取到独立 Hook。

#### 当前代码位置
主组件中的以下部分:
- `validateForm` 函数 (lines ~226-259, 约35行)
- `updateParam` 函数 (lines ~435-442, 约8行)
- `getCreditsRequired` 函数 (lines ~449-453, 约5行)

#### 需要创建的文件

##### `components/create/hooks/use-video-generation-form.ts`

```typescript
/**
 * 视频生成表单管理 Hook
 * 管理表单状态、验证、Credits 计算
 */

import { useState, useCallback } from "react"
import { ImageToVideoParams } from "../types"
import { calculateCreditsRequired } from "@/lib/subscription/pricing-config"

interface UseVideoGenerationFormOptions {
  initialParams?: Partial<ImageToVideoParams>
}

export function useVideoGenerationForm(options?: UseVideoGenerationFormOptions) {
  const [params, setParams] = useState<ImageToVideoParams>({
    image: "",
    imageFile: null,
    uploadMode: 'local',
    prompt: "",
    model: "vidfab-q1",
    duration: "5s",
    resolution: "480p",
    aspectRatio: "16:9",
    style: "realistic",
    ...options?.initialParams
  })

  const [validationErrors, setValidationErrors] = useState<string[]>([])

  /**
   * 验证表单
   */
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

    setValidationErrors(errors)
    return errors
  }, [params])

  /**
   * 更新单个参数
   */
  const updateParam = useCallback((key: keyof ImageToVideoParams, value: string) => {
    setParams(prev => ({ ...prev, [key]: value }))
    // Clear validation errors when updating
    if (validationErrors.length > 0) {
      setValidationErrors([])
    }
  }, [validationErrors.length])

  /**
   * 计算所需 Credits
   */
  const getCreditsRequired = useCallback(() => {
    const modelForCredits = params.model === 'vidfab-q1' ? 'seedance-v1-pro-t2v' :
                           params.model === 'vidfab-pro' ? 'veo3-fast' : params.model
    return calculateCreditsRequired(modelForCredits, params.resolution, params.duration)
  }, [params.model, params.resolution, params.duration])

  return {
    params,
    validationErrors,
    validateForm,
    updateParam,
    getCreditsRequired,
    setParams,
    setValidationErrors
  }
}
```

**预计行数**: 约 110 行

#### 主组件中的使用

```typescript
import { useVideoGenerationForm } from "./hooks/use-video-generation-form"

// ...

const formState = useVideoGenerationForm()

// 使用
const errors = formState.validateForm()
formState.updateParam("prompt", "new prompt")
const credits = formState.getCreditsRequired()
```

#### 预计收益
- 主组件减少约 **50行**
- 表单逻辑完全独立,易于测试和复用

---

### Phase 7: 最终优化和重构主组件

#### 目标
完成所有拆分后,对主组件进行最终优化,使其成为纯协调器。

#### 主组件重构后的理想结构

```typescript
export function ImageToVideoPanelEnhanced() {
  const isMobile = useIsMobile()

  // 1. Hooks - 状态和逻辑管理
  const videoContext = useVideoContext()
  const authModal = useVideoGenerationAuth()
  const subscription = useSimpleSubscription()
  const videoGeneration = useVideoGeneration({ ... })
  const videoPolling = useVideoPolling({ ... })

  // 表单管理
  const formState = useVideoGenerationForm()

  // 图片上传
  const imageUpload = useImageUpload({
    uploadMode: formState.params.uploadMode,
    onAuthRequired: async () => await authModal.requireAuth(async () => {})
  }, (imageUrl: string) => {
    formState.updateParam("image", imageUrl)
  })

  // Remix 功能
  useImageRemix({
    uploadImage: imageUpload.uploadImage,
    setPrompt: (prompt) => formState.updateParam("prompt", prompt),
    setUploadMode: (mode) => formState.updateParam("uploadMode", mode)
  })

  // 2. 业务逻辑
  const handleGenerate = useCallback(async () => {
    // 表单验证
    const errors = formState.validateForm()
    if (errors.length > 0) return

    // Credits 检查
    // ...

    // 调用视频生成
    await videoGeneration.generateImageToVideo(...)
  }, [formState, videoGeneration])

  // 3. 拖放处理
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

  // 4. 渲染 - 纯 UI 组合
  return (
    <div className={`h-screen flex ${isMobile ? 'flex-col' : 'flex-row'}`}>
      {/* 左侧：设置面板 */}
      <div className={`${isMobile ? 'w-full' : 'w-1/2'} h-full`}>
        <div className="h-full overflow-y-auto custom-scrollbar py-12 px-6 pr-3">
          <div className="space-y-6">
            {/* Error display */}
            {(formState.validationErrors.length > 0 || videoGeneration.error) && (
              <Alert className="border-red-800 bg-red-900/20">
                {/* ... */}
              </Alert>
            )}

            {/* 图片上传 */}
            <Card className="bg-gray-950 border-gray-800">
              <CardContent className="space-y-4 pt-6">
                {/* Upload Mode Tabs */}
                {/* ... */}

                {formState.params.uploadMode === "local" ? (
                  <div className="space-y-4">
                    <ImageUploadArea
                      disabled={videoGeneration.isGenerating}
                      onFilesSelected={imageUpload.uploadMultiple}
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
                  <div className="space-y-2">
                    {/* URL Upload Mode */}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 视频设置 */}
            <VideoSettingsPanel
              params={formState.params}
              onParamChange={formState.updateParam}
              disabled={videoGeneration.isGenerating}
              subscriptionLoading={subscription.isLoading}
            />

            {/* Generate Button */}
            <Button onClick={handleGenerate} disabled={...}>
              Generate Video
              <span className="flex items-center text-sm opacity-90">
                <Zap className="w-3 h-3 mr-1" />
                {formState.getCreditsRequired()}
              </span>
            </Button>
          </div>
        </div>
      </div>

      {/* 右侧：视频预览 */}
      <div className={`${isMobile ? 'w-full' : 'w-1/2'} h-full overflow-hidden`}>
        {/* Video Task Grid */}
      </div>

      {/* Dialogs */}
      <UnifiedAuthModal ... />
      <UpgradeDialog ... />
      <VideoLimitDialog ... />
    </div>
  )
}
```

#### 预计最终状态
- 主组件约 **400-450行**
- 代码结构清晰,易于理解
- 大部分逻辑都在 Hooks 和子组件中

---

## 📊 最终收益预测

### 代码行数变化

| 组件/模块 | 原始 | Phase 3 后 | Phase 7 后 | 变化 |
|----------|------|-----------|-----------|------|
| **主组件** | 1200 | 786 | **~450** | ↓62.5% |
| 类型定义 | 0 | 46 | 46 | - |
| Hooks | 0 | 333 | **~560** | - |
| UI 组件 | 0 | 243 | **~550** | - |
| **总计** | 1200 | 1408 | **~1606** | +33.8% |

### 文件结构

```
components/create/
├── image-to-video-panel.tsx          (~450行) - 主组件
├── types.ts                          (17行)
│
├── hooks/
│   ├── use-image-upload.ts           (333行)
│   ├── use-image-remix.ts            (65行)  ← Phase 5
│   └── use-video-generation-form.ts  (110行) ← Phase 6
│
├── image-upload/
│   ├── types.ts                      (29行)
│   ├── image-upload-area.tsx         (71行)
│   ├── image-upload-card.tsx         (105行)
│   └── image-upload-grid.tsx         (67行)
│
└── video-settings/                           ← Phase 4
    ├── video-settings-panel.tsx      (80行)
    ├── prompt-input.tsx              (50行)
    ├── model-selector.tsx            (50行)
    ├── duration-resolution-selector.tsx (80行)
    └── aspect-ratio-selector.tsx     (50行)
```

**总计**: 14个文件

### 质量提升

#### 单一职责 ✅
- 每个文件职责明确,不超过 350行
- 符合项目硬性指标要求

#### 可复用性 ✅
- 所有 UI 组件和 Hooks 都可以复用
- 易于在其他页面使用

#### 可测试性 ✅
- Hook 和组件都可以独立测试
- 易于编写单元测试

#### 可维护性 ✅
- 代码结构清晰,易于定位问题
- 新功能开发不影响现有模块

---

## 🚀 执行建议

### 执行顺序
1. **Phase 4**: 提取视频设置 UI 组件 (高优先级)
2. **Phase 5**: 提取 Remix Hook (中优先级)
3. **Phase 6**: 提取表单验证 Hook (中优先级)
4. **Phase 7**: 最终优化主组件 (高优先级)

### 每个 Phase 的验证步骤
1. 编译通过
2. 页面可以正常访问 (http://localhost:3000/create)
3. 功能测试:
   - 图片上传功能正常
   - 视频生成功能正常
   - Remix 功能正常
   - 所有表单验证正常

### 注意事项
1. 每完成一个 Phase,立即提交代码
2. 保持代码风格一致
3. 确保所有类型定义清晰
4. 保持向后兼容

---

## ✅ 验收标准

### 功能验收
- [ ] 所有原有功能正常工作
- [ ] 多图上传无竞态条件
- [ ] Remix 功能正常
- [ ] 视频生成流程无误
- [ ] 表单验证正确

### 代码质量验收
- [ ] 主组件 < 500 行
- [ ] 单个文件 < 350 行
- [ ] TypeScript 无 any 类型
- [ ] ESLint 无警告
- [ ] 编译无错误

### 性能验收
- [ ] 首次渲染时间 < 500ms
- [ ] 上传 10 张图片无卡顿
- [ ] 页面响应流畅

---

**文档版本**: v2.0
**创建日期**: 2025-10-21
**作者**: Claude Code
**状态**: 待执行 (Phase 4-7)

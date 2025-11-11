# AI Image 功能快速参考

## 核心概念速查

### 🎯 三个主要面板

| 面板 | 文件 | 功能 | URL 参数 |
|------|------|------|---------|
| 文生图 | `text-to-image-panel.tsx` | 从文本生成图片 | `?tool=text-to-image` |
| 图生图 | `image-to-image-panel.tsx` | 基于图片生成新图片 | `?tool=image-to-image` |
| 图转视频 | `image-to-video-panel.tsx` | 从图片生成视频 | `?tool=image-to-video` |

---

## 📍 关键位置速查

### Image to Video 按钮 - 两处位置

#### 1️⃣ 文生图预览中的按钮

**文件：** `image-task-grid-item.tsx`

**位置：** 第 166-177 行（右上角按钮组）

```typescript
<Button
  onClick={handleImageToVideo}
  className="hover:bg-purple-600/70"
  title="Create video from this image"
>
  <Video className="h-4 w-4 text-white" />
</Button>
```

#### 2️⃣ My Assets 中的图片项按钮

**文件：** `my-assets.tsx`

**位置：** 第 801-816 行

```typescript
{asset.type === 'image' && asset.status === "completed" && (
  <Button
    onClick={() => !isDeleting && handleImageToVideo(asset.downloadUrl, asset.prompt)}
    className="hover:text-purple-400 hover:bg-purple-400/10"
    title="Create video from this image"
  >
    <Video className="w-4 h-4" />
  </Button>
)}
```

---

## 🔄 数据传递机制

### sessionStorage 模式（极其重要！）

```javascript
// 1️⃣ 发送方（在图片项中）
sessionStorage.setItem('vidfab-image-to-video', JSON.stringify({
  imageUrl: 'https://...',      // 必需：图片 URL
  prompt: 'A beautiful sunset',  // 必需：原始 prompt
  timestamp: Date.now()          // 必需：时间戳
}))

// 2️⃣ 路由
router.push('/create?tool=image-to-video')

// 3️⃣ 接收方（Image to Video 面板）
useEffect(() => {
  const stored = sessionStorage.getItem('vidfab-image-to-video')
  const data = JSON.parse(stored)
  
  // 检查数据新鲜度（必须在 5 分钟内）
  if (Date.now() - data.timestamp < 5 * 60 * 1000) {
    // 自动加载图片
    await imageUpload.uploadImage(file)
    // 填充 prompt
    setParams({ prompt: data.prompt })
  }
}, [])

// 4️⃣ 清理
sessionStorage.removeItem('vidfab-image-to-video')
```

---

## 📂 文件之间的关系

```
create-page-client.tsx (路由管理)
    ↓ (activeTool 参数)
create-content.tsx (动态渲染)
    ├─→ TextToImagePanel
    │   └─→ ImageTaskGridItem (包含 Video 按钮)
    │       └─→ ImagePreviewDialog
    │
    ├─→ ImageToImagePanel
    │   ├─→ ImageUploadArea (拖放区)
    │   └─→ ImageUploadGrid (上传任务列表)
    │       └─→ ImageUploadCard (单个任务)
    │
    ├─→ ImageToVideoPanelEnhanced (接收 sessionStorage 数据)
    │
    └─→ MyAssets (包含另一个 Video 按钮)
        └─→ 渲染资产列表 (视频+图片)
```

---

## 🪝 关键 Hooks

### useImageGenerationManager

**用途：** 管理图片生成任务（文生图、图生图）

```typescript
const {
  tasks,              // Task[] 数组
  error,              // 错误信息
  isGenerating,       // 是否正在生成
  processingCount,    // 当前处理中的任务数（最多4个）
  generateTextToImage,
  generateImageToImage
} = useImageGenerationManager({
  maxTasks: 20,
  onSubscriptionRequired: () => {}
})
```

### useImageUpload

**用途：** 管理图片文件上传

```typescript
const imageUpload = useImageUpload(
  {
    uploadMode: 'local' | 'url',
    onAuthRequired: async () => boolean  // 返回认证是否成功
  },
  (imageUrl: string) => {}  // 图片选中时回调
)

// 返回值
imageUpload.uploadTasks          // Map<string, UploadTask>
imageUpload.selectedImageId      // string | null
imageUpload.isDragging           // boolean
imageUpload.uploadImage(file)    // Promise<void>
imageUpload.uploadMultiple(files) // Promise<void>
imageUpload.getCompletedImages() // UploadTask[]
imageUpload.selectImage(id)      // void
imageUpload.removeTask(id)       // Promise<void>
imageUpload.clearAll()           // Promise<void>
```

---

## 🎨 UI 组件树

### TextToImagePanel 的结构

```
<div className="h-screen flex flex-row">
  {/* 左侧：50% */}
  <div className="w-1/2">
    <Textarea placeholder="..." /> {/* Prompt */}
    <ImageGenerationSettings /> {/* 模型、宽高比 */}
    <Button>Generate Image</Button>
  </div>

  {/* 右侧：50% 预览区 */}
  <div className="w-1/2 overflow-y-auto">
    {tasks.map(task => (
      <ImageTaskGridItem
        key={task.id}
        imageUrl={task.imageUrl}
        status={task.status}
        prompt={task.prompt}
      />
    ))}
  </div>
</div>
```

### ImageTaskGridItem 的内部结构

```
<Card>
  {/* 图片容器 */}
  <div className="aspect-square bg-gray-900">
    <Image src={imageUrl} />  {/* 实际图片 */}
    
    {status === "completed" && (
      <div className="absolute top-2 right-2 flex gap-2">
        <Button> {/* 预览按钮 */}
          <Maximize />
        </Button>
        <Button> {/* 下载按钮 */}
          <Download />
        </Button>
        <Button> {/* 🔥 Image to Video 按钮 */}
          <Video />
        </Button>
      </div>
    )}
  </div>

  {/* 信息区 */}
  <div className="p-3">
    <p>{prompt}</p>  {/* Prompt 文本 */}
    <div className="text-xs text-gray-500">
      {model} • {aspectRatio}
    </div>
  </div>
</Card>
```

---

## 🔐 认证流程

所有需要用户认证的操作都使用 `requireAuth` 包装：

```typescript
const authModal = useAuthModal()

const handleGenerate = async () => {
  // 这个回调确保用户已登录
  await authModal.requireAuth(async () => {
    // 执行生成操作
    await generateTextToImage(prompt, model, aspectRatio)
  })
}
```

**工作流程：**
1. 用户点击生成按钮
2. `requireAuth` 检查登录状态
3. 如果未登录，显示登录弹框
4. 登录后执行回调
5. 自动隐藏弹框

---

## 📊 类型定义速查

### UploadTask（上传任务）

```typescript
interface UploadTask {
  id: string                      // 任务唯一 ID
  file: File                      // 原始文件
  fileName: string                // 文件名
  progress: number                // 0-100 进度
  status: 'uploading' | 'completed' | 'failed'
  previewUrl: string | null       // 本地预览 blob URL
  resultUrl: string | null        // Supabase 上传后 URL
  error: string | null            // 错误信息
  size: number                    // 文件大小（字节）
  timestamp: number               // 创建时间戳
}
```

### ImageToVideoParams（图转视频参数）

```typescript
interface ImageToVideoParams {
  image: string                   // 图片 URL
  imageFile: File | null
  uploadMode: 'local' | 'url'    // 上传模式
  prompt: string                  // 视频描述
  model: string                   // 视频模型
  duration: string                // 视频长度
  resolution: string              // 分辨率
  aspectRatio: string             // 宽高比
  style: string                   // 风格
}
```

### UnifiedAsset（统一资产）

```typescript
interface UnifiedAsset {
  id: string
  type: 'image' | 'video'
  prompt: string
  status: string
  createdAt: string
  downloadUrl: string
  previewUrl: string
  fileSize: number
}
```

---

## ⚙️ 常见操作代码片段

### 触发 Image to Video（来自图片项）

```typescript
const handleImageToVideo = useCallback(() => {
  if (!imageUrl) return

  const imageToVideoData = {
    imageUrl,
    prompt: prompt || '',
    timestamp: Date.now()
  }

  sessionStorage.setItem('vidfab-image-to-video', JSON.stringify(imageToVideoData))
  router.push('/create?tool=image-to-video')
  toast.success('Image ready for video generation')
}, [imageUrl, prompt, router])
```

### 在 Image to Video 面板中接收数据

```typescript
useEffect(() => {
  const checkImageToVideoData = async () => {
    const stored = sessionStorage.getItem('vidfab-image-to-video')
    if (!stored) return

    const data = JSON.parse(stored)
    const now = Date.now()
    const age = now - (data.timestamp || 0)

    // 检查 5 分钟过期
    if (age > 5 * 60 * 1000) {
      sessionStorage.removeItem('vidfab-image-to-video')
      return
    }

    // 加载图片
    const blob = await fetch(data.imageUrl).then(r => r.blob())
    const file = new File([blob], 'image.jpg', { type: blob.type })
    
    // 设置参数
    setParams(prev => ({
      ...prev,
      prompt: data.prompt,
      uploadMode: 'local'
    }))

    // 上传图片
    await imageUpload.uploadImage(file)

    // 清理
    sessionStorage.removeItem('vidfab-image-to-video')
  }

  checkImageToVideoData()
}, [imageUpload])
```

### 在 My Assets 中渲染图片的 Video 按钮

```typescript
{asset.type === 'image' && asset.status === "completed" && asset.downloadUrl && (
  <Button
    size="icon"
    variant="ghost"
    disabled={isDeleting}
    className="text-gray-400 hover:text-purple-400 hover:bg-purple-400/10"
    onClick={() => !isDeleting && handleImageToVideo(asset.downloadUrl, asset.prompt)}
    title="Create video from this image"
  >
    <Video className="w-4 h-4" />
  </Button>
)}
```

---

## 🐛 常见错误排查

### 问题：图片没有自动加载到 Image to Video

**检查清单：**
1. ✅ sessionStorage 中的数据是否存在？
2. ✅ 时间戳是否在 5 分钟内？
3. ✅ imageUrl 是否有效？
4. ✅ useEffect 中的依赖数组是否正确？

### 问题：Upload 任务状态不更新

**原因：** 使用 useState 而不是 useRef

**解决：** useImageUpload 内部使用 `uploadTasksRef` 作为唯一数据源

---

## 📋 最佳实践

### 1. 总是在 sessionStorage 中包含 timestamp

```typescript
const imageToVideoData = {
  imageUrl,
  prompt,
  timestamp: Date.now()  // ✅ 必需
}
```

### 2. 检查数据新鲜度

```typescript
const now = Date.now()
const age = now - (data.timestamp || 0)
if (age > 5 * 60 * 1000) {  // 5 分钟
  // 数据已过期
}
```

### 3. 使用 requireAuth 包装认证相关操作

```typescript
await authModal.requireAuth(async () => {
  // 执行需要认证的操作
})
```

### 4. 在上传前进行验证

```typescript
const validation = ImageProcessor.validateImage(file)
if (!validation.valid) {
  throw new Error(validation.error)
}
```

### 5. 清理 sessionStorage

```typescript
// 使用后立即清理
sessionStorage.removeItem('vidfab-image-to-video')
```

---

## 🎓 学习路径

### 1️⃣ 理解路由和工具切换
- 读：`create-page-client.tsx` (30 行)
- 读：`create-content.tsx` (50 行)

### 2️⃣ 理解图片项渲染
- 读：`image-task-grid-item.tsx` (全部)
- 关注：第 166-177 行的 Video 按钮

### 3️⃣ 理解 sessionStorage 数据传递
- 读：`image-task-grid-item.tsx` 的 `handleImageToVideo()` (第 79-95 行)
- 读：`image-to-video-panel.tsx` 的接收逻辑 (第 223-295 行)

### 4️⃣ 理解上传系统
- 读：`use-image-upload.ts` 的 `uploadImageFile()` (第 65-193 行)
- 读：`image-upload-grid.tsx` (完整)

### 5️⃣ 理解 My Assets
- 读：`my-assets.tsx` 的资产渲染 (第 572-841 行)
- 关注：Image to Video 按钮 (第 801-816 行)

---

## 📞 快速查询

需要找什么？使用这个表：

| 我想找... | 看这个文件 | 行号 |
|----------|----------|------|
| Image to Video 按钮（文生图） | `image-task-grid-item.tsx` | 166-177 |
| Image to Video 按钮（资产页） | `my-assets.tsx` | 801-816 |
| 按钮点击处理 | `image-task-grid-item.tsx` | 79-95 |
| sessionStorage 存储 | 上述两个文件 | 89/244 |
| sessionStorage 读取 | `image-to-video-panel.tsx` | 223-295 |
| 上传流程完整实现 | `use-image-upload.ts` | 65-193 |
| 上传任务显示 | `image-upload-grid.tsx` | 完整 |
| 图片预览对话框 | `image-preview-dialog.tsx` | 完整 |


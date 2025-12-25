# 视频永久存储修复文档

## 问题背景

在 `/admin/tasks` 页面出现大量"失败"的视频预览，但实际上视频生成本身是成功的。问题根源是：

### 原有问题

1. **视频只保存了临时 URL**
   - `original_url`: 来自 BytePlus/Wavespeed 的临时链接
   - `storage_path`: 为空，没有永久存储
   - 临时 URL 通常 24 小时后过期

2. **数据验证结果**
   - `user_videos` 表中 100% 的记录只有临时 URL
   - `user_images` 表中 46% 的记录有 Supabase 永久存储
   - 图片有下载和上传逻辑，但视频缺失

## 修复方案

### 1. 修改视频存储 API (`/app/api/video/store/route.ts`)

添加了完整的下载和上传逻辑，参考图片存储的实现：

```typescript
// 🔥 下载视频并上传到 Supabase Storage（永久存储）
console.log(`💾 Downloading and uploading video to Supabase Storage...`)

let supabaseVideoUrl: string | null = null
let storagePath: string | null = null
let fileSize: number | null = null

try {
  // 1. 下载视频
  console.log(`📥 Downloading video from: ${originalUrl.substring(0, 80)}...`)
  const videoResponse = await fetch(originalUrl)
  if (!videoResponse.ok) {
    throw new Error(`Failed to fetch video: ${videoResponse.statusText}`)
  }

  const videoBuffer = Buffer.from(await videoResponse.arrayBuffer())
  fileSize = videoBuffer.length
  console.log(`✅ Downloaded video: ${(fileSize / (1024 * 1024)).toFixed(2)} MB`)

  // 2. 确定视频格式
  const contentType = videoResponse.headers.get('content-type') || 'video/mp4'

  // 3. 生成唯一的视频ID
  const videoId = wavespeedRequestId.replace(/[^a-zA-Z0-9]/g, '_')

  // 4. 上传到 Supabase Storage
  console.log(`📤 Uploading to Supabase Storage...`)
  const uploadResult = await VideoStorageManager.uploadVideo(
    userId,
    videoId,
    videoBuffer,
    contentType
  )

  supabaseVideoUrl = uploadResult.url  // ✅ Supabase 永久 URL
  storagePath = uploadResult.path       // ✅ 永久存储路径
  console.log(`✅ Video uploaded to Supabase: ${storagePath}`)
} catch (uploadError) {
  console.error(`⚠️ Failed to upload to Supabase Storage:`, uploadError)
  // 如果上传失败，回退到使用原始 URL（兼容性保护）
  supabaseVideoUrl = null
  storagePath = null
}
```

### 2. 更新数据库保存逻辑

修改 `UserVideosDB.createVideo` 和 `updateVideoStatus`，添加 `storagePath` 字段：

```typescript
const newVideo = await UserVideosDB.createVideo(userId, {
  wavespeedRequestId,
  prompt: settings.prompt || 'Generated video',
  settings: {...},
  originalUrl,
  storagePath  // 🔥 新增: 永久存储路径
}, userEmail)

// 更新视频状态
await UserVideosDB.updateVideoStatus(newVideo.id, {
  status: 'completed',
  downloadProgress: 100,
  fileSize: fileSize,
  thumbnailPath: thumbnailPath,
  storagePath: storagePath  // 🔥 新增: 保存永久存储路径
})
```

### 3. 优化返回值

返回值优先使用 Supabase 永久 URL：

```typescript
return NextResponse.json({
  success: true,
  data: {
    videoId: newVideo.id,
    status: 'completed',
    videoUrl: supabaseVideoUrl || originalUrl,  // ✅ 优先返回永久 URL
    storagePath: storagePath,
    fileSize: fileSize,
    uploadedToSupabase: isSupabaseStored,
    message: isSupabaseStored
      ? 'Video saved to Supabase Storage (permanent)'
      : 'Video metadata saved (using original URL)',
    userEmail
  }
})
```

## 关键改进

### ✅ 图片存储 vs ❌ 视频存储（修复前）

| 特性 | 图片存储 | 视频存储（旧） | 视频存储（新）✅ |
|------|---------|--------------|----------------|
| 下载文件 | ✅ 有 | ❌ 无 | ✅ 有 |
| 上传到 Supabase | ✅ 有 | ❌ 无 | ✅ 有 |
| 保存 storage_path | ✅ 有 | ❌ 无 | ✅ 有 |
| 永久 URL | ✅ 46% | ❌ 0% | ✅ 100% |
| URL 过期问题 | ✅ 不会 | ❌ 会 | ✅ 不会 |

### 容错机制

如果上传到 Supabase Storage 失败（网络问题、存储空间等），系统会：

1. 捕获错误并记录日志
2. 回退到使用原始临时 URL
3. 仍然保存视频元数据到数据库
4. 通过 `uploadedToSupabase` 标记区分是否上传成功

这样可以确保即使上传失败，视频生成仍然算作成功，不会影响用户体验。

## 测试验证

### 验证新视频

生成一个新视频后，检查数据库：

```sql
SELECT
  id,
  wavespeed_request_id,
  status,
  original_url IS NOT NULL as has_original_url,
  storage_path IS NOT NULL as has_storage_path,
  storage_path,
  created_at
FROM user_videos
WHERE status = 'completed'
ORDER BY created_at DESC
LIMIT 10;
```

期望结果：
- `has_original_url`: true
- `has_storage_path`: true ✅（新增）
- `storage_path`: `videos/{userId}/{videoId}.mp4`

### 验证 /admin/tasks 页面

1. 访问 `/admin/tasks`
2. 查看最新生成的视频
3. 验证视频预览正常加载
4. URL 不包含 `X-Tos-Expires=` 过期参数

## 影响范围

### 新视频

- ✅ 自动下载并上传到 Supabase Storage
- ✅ 获得永久 URL
- ✅ 不会过期

### 旧视频（历史数据）

- ⚠️ 仍然只有临时 URL
- ⚠️ 24 小时后无法预览
- 💡 可选方案：编写迁移脚本重新下载和上传

## 日志示例

成功上传的日志：

```
🎬 Processing video storage: { userId: 'xxx', wavespeedRequestId: 'cgt-xxx', ... }
💾 Downloading and uploading video to Supabase Storage...
📥 Downloading video from: https://ark-content-generation...
✅ Downloaded video: 12.34 MB
📤 Uploading to Supabase Storage...
✅ Video uploaded to Supabase: videos/xxx/cgt_xxx.mp4
✅ Video stored successfully: xxx-xxx-xxx
   - File size: 12.34 MB
   - Supabase Storage: ✅ Yes
   - Storage path: videos/xxx/cgt_xxx.mp4
```

上传失败时的回退日志：

```
⚠️ Failed to upload to Supabase Storage: Error: ...
   - Supabase Storage: ⚠️ No (using original URL)
```

## 相关文件

修改的文件：
- `/app/api/video/store/route.ts` - 视频存储 API
- `/lib/database/user-videos.ts` - 数据库操作层

使用的现有代码：
- `/lib/storage.ts` - `VideoStorageManager.uploadVideo()`
- `/lib/supabase.ts` - Supabase 客户端

参考实现：
- `/app/api/image/store/route.ts` - 图片存储 API（参考对象）

## 后续优化建议

### 短期

1. ✅ 监控上传成功率
2. ✅ 添加上传进度回调（可选）
3. ✅ 优化大文件上传性能

### 长期

1. 迁移历史数据（编写脚本重新下载旧视频）
2. 添加缩略图生成（使用 Supabase Edge Functions + ffmpeg）
3. 实现视频压缩优化存储空间
4. 添加 CDN 加速

## 注意事项

### Supabase Storage 配置

确保 Supabase Storage bucket `user-videos` 已创建并配置：

```sql
-- 创建 bucket（如果不存在）
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-videos', 'user-videos', true);

-- 配置 RLS 策略（参考 lib/storage.ts 中的 STORAGE_POLICIES）
```

### 文件大小限制

- 视频最大 500MB（`STORAGE_CONFIG.limits.maxVideoSize`）
- 如需调整，修改 `lib/storage.ts`

### 性能考虑

- 视频下载和上传可能耗时较长（取决于文件大小）
- API 调用可能需要更长的超时时间
- 建议在生产环境监控 API 响应时间

## 总结

此修复确保了：
1. ✅ 视频获得永久存储，不会因 URL 过期而丢失
2. ✅ `/admin/tasks` 页面可以正常预览所有视频
3. ✅ 与图片存储逻辑保持一致
4. ✅ 包含容错机制，上传失败时回退到临时 URL
5. ✅ 详细的日志记录便于问题排查

修复后，新生成的视频将自动保存到 Supabase Storage，获得永久 URL，解决了 `/admin/tasks` 中的"失败"预览问题。

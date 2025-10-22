# 视频数据"丢失"问题深度分析报告

## 问题描述
错误信息: `Video not found in database: 58fac628-9c81-435b-a1fa-b016686f5ea1`

## 数据流程完整追踪

### 1. 视频生成完整流程

```
[用户发起生成]
    ↓
[API: /api/video/generate 或 /api/video/effects]
    → 创建本地Job (video-context.tsx: addJob)
    → 调用Wavespeed API
    → 返回requestId
    ↓
[轮询开始] (use-video-polling.ts: startPolling)
    → 每3秒查询: /api/video/status/[requestId]
    → 检查Wavespeed API状态
    ↓
[视频生成完成] (status === "completed")
    ↓
[关键步骤1] 更新Job状态
    → videoContext.updateJob(jobId, { status: 'completed', resultUrl })
    ↓
[关键步骤2] 将视频添加到临时存储
    → videoContext.completeJob(jobId, {...})
    → dispatch({ type: "COMPLETE_JOB" })
    → 视频添加到 temporaryVideos 数组
    → 视频添加到 completedVideos 数组 (向后兼容)
    ↓
[关键步骤3] 后台保存到数据库 (异步，不阻塞用户)
    → saveVideoToDatabase(job, resultUrl)
    → POST /api/video/store
    → UserVideosDB.createVideo() 或 updateVideoStatus()
    ↓
[关键步骤4] 数据库保存完成后
    → handleVideoStorageCompleted(videoId)
    → 从数据库查询完整视频记录
    → 将视频从 temporaryVideos 移到 permanentVideos
```

### 2. 数据存储位置

#### 2.1 临时存储（内存 + LocalStorage）
- **位置**: `VideoContext.temporaryVideos` 和 `VideoContext.completedVideos`
- **特点**:
  - 视频生成完成后立即可用
  - 存储在浏览器内存和LocalStorage中
  - 刷新页面后可能丢失（取决于LocalStorage）
  - ID格式: 可能是 `job_${timestamp}_${random}` 或 Wavespeed requestId

#### 2.2 永久存储（数据库）
- **位置**: Supabase `user_videos` 表
- **特点**:
  - 异步保存，有延迟
  - 需要经过 UserVideosDB.createVideo() 或 updateVideoStatus()
  - ID格式: UUID (数据库生成)
  - 只有保存成功后才移到 `permanentVideos`

### 3. 问题根因分析

#### 🔥 核心问题：时序竞态条件

**问题场景**:
```javascript
// use-video-polling.ts: 244行
case "completed":
  if (resultUrl) {
    // 步骤1: 更新Job状态
    videoContext.updateJob(jobId, updateData)

    // 步骤2: 调用完成回调
    onCompleted?.(job, resultUrl)

    // 步骤3: 停止轮询
    stoppedJobIdsRef.current.add(jobId)

    // 步骤4: 添加到临时存储
    videoContext.completeJob(jobId, {
      videoUrl: resultUrl,
      userId: job.userId,
      isStored: false  // ⚠️ 标记为未存储
    })

    // 步骤5: 异步保存到数据库（不等待）
    saveVideoToDatabase(job, resultUrl)  // ⚠️ 不等待完成
  }
```

**时序问题**:

1. **临时ID vs 数据库ID 不一致**
   - 临时视频ID: `job_${timestamp}_${random}` (本地生成)
   - 数据库视频ID: UUID (Supabase自动生成)
   - **查询时使用了临时ID，但数据库中只有永久ID**

2. **handleVideoStorageCompleted 被调用时机过早**
   ```javascript
   // video-context.tsx: 814行
   const permanentVideo = await UserVideosDB.getVideoById(videoId, session.user.uuid)

   if (!permanentVideo) {
     console.warn(`⚠️ Video not found in database: ${videoId}`)
     return  // ⚠️ 这里就是错误发生的地方！
   }
   ```

   **原因**:
   - `saveVideoToDatabase()` 是异步的，可能还在进行中
   - 或者保存失败，但没有正确重试
   - 或者使用临时ID查询，但数据库中是永久ID

3. **数据库保存失败的情况**

   从 `user-videos.ts` 可以看到，保存可能失败的场景：

   ```javascript
   // user-videos.ts: 58行
   if (error.code === '23503' && error.message.includes('user_videos_user_id_fkey')) {
     // 外键约束错误 - 用户不存在
     return await this.forceCreateUserAndVideo(userId, userEmail, data)
   }
   ```

   - 用户不存在导致外键约束失败
   - 数据库连接超时
   - Supabase服务暂时不可用
   - 网络问题

4. **临时记录判断逻辑问题**

   ```javascript
   // video-context.tsx: 805行
   if (videoId.startsWith('00000000-0000-4000-8000-')) {
     // 临时记录已经通过completeJob添加到内存中
     return  // ⚠️ 跳过数据库查询
   }
   ```

   这个判断假设临时ID有固定前缀，但实际上：
   - 临时ID格式: `job_${timestamp}_${random}`
   - 或者是 Wavespeed requestId
   - **不一定匹配这个前缀！**

### 4. 数据一致性问题

#### 4.1 视频文件已生成，但数据库记录缺失

**场景**:
- Wavespeed API 成功生成视频
- 视频URL可访问
- 但 `user_videos` 表中没有记录

**原因**:
```javascript
// use-video-polling.ts: 286行
saveVideoToDatabase(job, resultUrl)  // 异步调用，不等待结果
```

如果这个调用失败：
- 用户可以在临时存储中看到视频
- 但刷新页面后视频就"丢失"了
- 因为从数据库加载时找不到记录

#### 4.2 数据库保存重试机制

```javascript
// use-video-polling.ts: 68-151行
const saveVideoToDatabase = useCallback(async (job: VideoJob, resultUrl: string, retryCount = 0) => {
  try {
    // ... 调用 /api/video/store
  } catch (error) {
    if (retryCount < MAX_STORAGE_RETRIES) {
      // 重试，但延迟递增
      setTimeout(() => {
        saveVideoToDatabase(job, resultUrl, retryCount + 1)
      }, STORAGE_RETRY_DELAY * (retryCount + 1))
    } else {
      console.error(`💥 All storage attempts failed for video ${job.id}`)
      // ⚠️ 所有重试失败后，视频仍在临时存储，但永远不会保存到数据库
    }
  }
}, [videoContext])
```

**问题**:
- 最多重试3次
- 如果3次都失败，视频就永远停留在临时存储
- **没有机制通知用户保存失败**
- **没有手动重试机制**

### 5. ID匹配问题

#### 5.1 多种ID系统

系统中存在多种ID:

1. **jobId**: 本地生成的任务ID
   - 格式: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
   - 示例: `job_1729587312456_k3j8s9dkf`

2. **requestId**: Wavespeed API返回的请求ID
   - 格式: Wavespeed系统生成
   - 示例: `pred_abc123xyz`

3. **videoId**: 数据库生成的视频ID
   - 格式: UUID
   - 示例: `58fac628-9c81-435b-a1fa-b016686f5ea1`

4. **temporaryId**: 临时视频ID (可能是jobId或requestId)

#### 5.2 ID映射关系

```javascript
// video-context.tsx: 823-832行
const temporaryVideo = state.temporaryVideos.find(video => {
  // 可能通过多种方式匹配：
  // 1. 直接ID匹配
  // 2. 通过wavespeed_request_id匹配
  // 3. 通过original_url匹配
  return video.id === videoId ||
         (video as any).wavespeed_request_id === permanentVideo.wavespeed_request_id ||
         (video as VideoResult).videoUrl === permanentVideo.original_url
})
```

**问题**:
- 匹配逻辑依赖多个字段
- 如果任何一个字段不匹配，就找不到对应关系
- `handleVideoStorageCompleted` 被调用时，传入的是什么ID？

### 6. 查询条件分析

#### 6.1 getVideoById 实现

```javascript
// user-videos.ts: 347-373行
static async getVideoById(videoId: string, userId?: string): Promise<UserVideo | null> {
  try {
    let query = supabaseAdmin
      .from(TABLES.USER_VIDEOS)
      .select('*')
      .eq('id', videoId)  // ⚠️ 直接用videoId查询

    if (userId) {
      query = query.eq('user_id', userId)  // 额外的用户过滤
    }

    const { data: video, error } = await query.single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // No rows found
      }
      handleSupabaseError(error)
    }

    return video as UserVideo
  }
}
```

**问题**:
- 查询条件只有 `id = videoId`
- 如果传入的videoId是临时ID (如 `job_1234567890_xxx`)
- 数据库中的ID是UUID (如 `58fac628-9c81-435b-a1fa-b016686f5ea1`)
- **查询必然失败！**

#### 6.2 应该查询的字段

根据数据结构，应该优先使用:
- `wavespeed_request_id`: Wavespeed API的请求ID
- `original_url`: 视频URL (唯一的)

```sql
-- 当前查询
SELECT * FROM user_videos WHERE id = '58fac628-9c81-435b-a1fa-b016686f5ea1'

-- 更健壮的查询
SELECT * FROM user_videos
WHERE wavespeed_request_id = 'pred_abc123xyz'  -- requestId
   OR original_url = 'https://wavespeed.ai/videos/xxx.mp4'  -- resultUrl
   OR id = '58fac628-9c81-435b-a1fa-b016686f5ea1'  -- videoId
LIMIT 1;
```

### 7. 关键修复点

#### 7.1 修复临时ID判断逻辑

```javascript
// video-context.tsx: 804-808行 (当前代码)
if (videoId.startsWith('00000000-0000-4000-8000-')) {
  return
}

// 应该改为:
if (videoId.startsWith('job_') || videoId.startsWith('temp-') || videoId.startsWith('pred_')) {
  console.log(`跳过临时ID的数据库查询: ${videoId}`)
  return
}
```

#### 7.2 修复查询逻辑

```javascript
// video-context.tsx: 810-816行 (当前代码)
const permanentVideo = await UserVideosDB.getVideoById(videoId, session.user.uuid)

// 应该改为:
const permanentVideo = await UserVideosDB.getVideoByWavespeedId(job.requestId, session.user.uuid)
// 或者通过URL查询
```

#### 7.3 修复保存流程

```javascript
// use-video-polling.ts: 286行 (当前代码)
saveVideoToDatabase(job, resultUrl)  // 不等待

// 应该改为:
await saveVideoToDatabase(job, resultUrl)  // 等待保存完成
// 或者
saveVideoToDatabase(job, resultUrl).catch(error => {
  // 保存失败时，在UI显示警告
  console.error('Video save failed:', error)
  // 将视频标记为"需要手动保存"
})
```

#### 7.4 增强错误处理

```javascript
// 在 saveVideoToDatabase 中
if (retryCount >= MAX_STORAGE_RETRIES) {
  console.error(`💥 All storage attempts failed for video ${job.id}`)

  // 🔥 新增: 通知用户保存失败
  window.dispatchEvent(new CustomEvent('video-storage-failed', {
    detail: {
      jobId: job.id,
      videoUrl: resultUrl,
      error: 'Failed to save video after multiple retries'
    }
  }))

  // 🔥 新增: 标记视频为"未保存"状态
  videoContext.updateJob(job.id, {
    storageStatus: 'failed',
    storageError: 'Failed to save after 3 attempts'
  })
}
```

### 8. 事务处理问题

当前系统**没有使用数据库事务**，导致：

1. **用户创建和视频创建不是原子操作**
   ```javascript
   // user-videos.ts: 92-160行
   // 步骤1: 创建用户
   await supabaseAdmin.from('users').insert({...})

   // 步骤2: 等待100ms
   await new Promise(resolve => setTimeout(resolve, 100))

   // 步骤3: 创建视频
   await supabaseAdmin.from('user_videos').insert({...})
   ```

   **问题**: 如果步骤3失败，用户已创建但视频创建失败

2. **降级方案：临时记录**
   ```javascript
   // user-videos.ts: 215-233行
   return {
     id: `temp-${Date.now()}`,  // ⚠️ 临时ID
     user_id: userId,
     wavespeed_request_id: data.wavespeedRequestId,
     status: 'generating',
     // ...
   } as UserVideo
   ```

   **问题**:
   - 临时记录永远不会保存到真实数据库
   - 刷新页面后就丢失了
   - 但用户可能已经支付了积分

### 9. 数据恢复场景

#### 9.1 视频文件存在但数据库记录丢失

**检测方法**:
```javascript
// 遍历临时存储，检查哪些视频没有对应的数据库记录
temporaryVideos.forEach(async (video) => {
  const dbVideo = await UserVideosDB.getVideoByWavespeedId(video.requestId)
  if (!dbVideo) {
    console.warn('Missing DB record:', video)
    // 尝试重新保存
  }
})
```

**恢复方法**:
```javascript
// 重新调用存储API
await fetch('/api/video/store', {
  method: 'POST',
  body: JSON.stringify({
    userId: video.userId,
    wavespeedRequestId: video.requestId,
    originalUrl: video.videoUrl,
    settings: video.settings
  })
})
```

#### 9.2 用户不存在导致的失败

**问题代码**:
```javascript
// user-videos.ts: 58行
if (error.code === '23503' && error.message.includes('user_videos_user_id_fkey')) {
  return await this.forceCreateUserAndVideo(userId, userEmail, data)
}
```

**风险**:
- OAuth登录用户可能在 `users` 表中不存在
- 首次生成视频时触发外键约束错误
- 虽然有自动创建用户的逻辑，但可能失败

### 10. 可能导致"丢失"的所有场景

1. ✅ **时序问题**: `handleVideoStorageCompleted` 在保存完成前被调用
2. ✅ **ID不匹配**: 使用临时ID查询永久表
3. ✅ **保存失败**: 网络错误、数据库错误、外键约束错误
4. ✅ **用户不存在**: OAuth用户首次使用时 users 表无记录
5. ✅ **重试耗尽**: 3次重试全部失败
6. ✅ **页面刷新**: 临时存储丢失，但数据库保存还未完成
7. ✅ **前端崩溃**: 保存过程中页面关闭或崩溃
8. ✅ **后端超时**: Supabase请求超时（30秒）
9. ✅ **查询条件错误**: getVideoById 使用错误的ID类型

## 总结与建议

### 核心问题
**视频记录"丢失"的根本原因是：前端使用临时ID，但查询时直接查询数据库的永久ID，导致查询失败。**

### 推荐修复方案（按优先级）

#### 🔥 P0 - 立即修复

1. **修复ID匹配逻辑**
   - 在 `handleVideoStorageCompleted` 中使用 `wavespeed_request_id` 查询
   - 或者通过 `original_url` 查询
   - 不要直接用 jobId 查询

2. **修复临时ID判断**
   - 检查所有可能的临时ID前缀: `job_`, `temp-`, `pred_`
   - 或者添加明确的 `isTemporary` 标记

#### 🔥 P1 - 重要修复

3. **增强错误处理**
   - 保存失败时通知用户
   - 提供手动重试按钮
   - 记录失败原因到日志

4. **改进保存流程**
   - 等待保存完成后再移除轮询
   - 或者使用后台任务队列确保最终一致性

#### 🔥 P2 - 优化改进

5. **添加事务支持**
   - 用户创建和视频创建使用事务
   - 确保原子性

6. **数据恢复机制**
   - 定期检查临时存储中未保存的视频
   - 自动重试保存
   - 提供UI让用户手动触发保存

7. **监控告警**
   - 统计保存失败率
   - 当失败率超过阈值时告警
   - 记录详细的失败日志

### 调试建议

1. **添加详细日志**
   ```javascript
   console.log('🔍 Video Storage Debug:', {
     jobId: job.id,
     requestId: job.requestId,
     videoUrl: resultUrl,
     userId: job.userId
   })
   ```

2. **添加性能监控**
   ```javascript
   console.time('saveVideoToDatabase')
   await saveVideoToDatabase(job, resultUrl)
   console.timeEnd('saveVideoToDatabase')
   ```

3. **检查数据库状态**
   ```sql
   -- 查找所有未成功保存的视频
   SELECT * FROM user_videos
   WHERE status IN ('generating', 'downloading', 'processing')
   AND created_at < NOW() - INTERVAL '1 hour';
   ```

---

**报告时间**: 2025-10-21
**分析者**: Claude
**项目**: VidFab AI 视频平台

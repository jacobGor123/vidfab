# Video Polling 快速修复方案

## 🚀 立即执行：添加调试日志

### 步骤 1：在 use-video-generation.tsx 添加日志

在 `generateImageToVideo` 函数中添加完整的日志链路，定位问题发生的确切位置。

### 步骤 2：在 use-video-polling-v2.ts 添加日志和容错

修改 `startPolling` 函数，增加延迟重试机制。

### 步骤 3：在 image-to-video-panel.tsx 的 onSuccess 回调中添加验证

确保 job 对象传递正确。

### 步骤 4：在 video-context.tsx 的 handleVideoStorageCompleted 中增强错误处理

避免 406 错误影响用户体验。

## ⚡ 快速调试步骤

1. 打开浏览器控制台（F12）
2. 切换到 Console 标签
3. 点击 "Generate Video" 按钮
4. 查看以下关键日志：
   - `📦 [ImageToVideo API Response]` - 确认 API 返回
   - `✅ [ImageToVideo] Received requestId` - 确认 requestId 存在
   - `📋 [ImageToVideo] Updated job` - 确认 job 更新
   - `🎯 [ImageToVideo] Calling onSuccess callback` - 确认回调执行
   - `🎉 [ImageToVideo] onSuccess triggered` - 确认回调触发
   - `🚀 [ImageToVideo] Calling startPolling` - 确认轮询启动
   - `🚀 [V2] Starting polling for job` - 确认轮询引擎启动

如果中间任何一步缺失，就能立即定位问题所在！

## 🎯 预期修复效果

修复后，控制台应该显示完整的日志链路，并且：
1. 右侧任务列表立即显示新创建的任务
2. 任务状态从 "generating" 变为 "processing"
3. 轮询引擎开始工作，定期查询状态
4. 视频完成后，任务从右侧移除，结果显示在左侧

## 📝 日志示例

成功的情况下，应该看到：
```
📦 [ImageToVideo API Response]: { success: true, data: { requestId: "byteplus:xxxxx" } }
✅ [ImageToVideo] Received requestId: byteplus:xxxxx
📋 [ImageToVideo] Updated job: { id: "job_xxxxx", requestId: "byteplus:xxxxx", hasRequestId: true }
🎯 [ImageToVideo] Calling onSuccess callback...
hookOptionsRef.current: true
hookOptionsRef.current.onSuccess: true
✅ [ImageToVideo] onSuccess callback executed
🎉 [ImageToVideo] onSuccess triggered: { jobId: "job_xxxxx", requestId: "byteplus:xxxxx" }
🚀 [ImageToVideo] Calling startPolling...
🚀 [V2] Starting polling for job job_xxxxx with requestId byteplus:xxxxx
✅ [ImageToVideo] startPolling called successfully
```

失败的情况下，会在某一步停止，立即暴露问题所在。

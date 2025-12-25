# Image-to-Video 轮询错误修复报告

**日期**: 2025-12-25
**修复人**: Claude Code
**相关文件**: `components/create/image-to-video-panel.tsx`

## 问题概述

线上环境偶发两个关键错误，导致 image-to-video 功能失败：

1. ❌ **"Maximum 1 image allowed"** 错误 - 用户无法上传图片
2. ❌ **"Invalid job object"** 错误 - 视频生成任务无法启动轮询

---

## 根本原因分析

### 问题1: startPolling 函数签名不匹配

**错误代码** (line 135):
```typescript
startPolling(jobId, requestId) // ❌ 错误：传入两个字符串参数
```

**问题分析**:
- 2024年12月2日的 commit `02feca10` 修改了 `startPolling` 的函数签名
- 该提交修复了 `create-page-client.tsx`（text-to-video）
- 但**遗漏了** `image-to-video-panel.tsx`
- `startPolling` 现在期待接收一个完整的 `VideoJob` 对象，而不是两个字符串参数

**影响**:
- 每次 image-to-video 生成都会触发 "Invalid job object" 错误
- 导致轮询无法启动，视频生成失败

---

### 问题2: sessionStorage 加载的 useEffect 依赖问题

**错误代码** (line 327):
```typescript
}, [imageUpload.uploadImage, setParams]) // ❌ 依赖不稳定的函数引用
```

**问题分析**:
- `imageUpload.uploadImage` 是一个函数引用，可能在某些情况下重新创建
- 当函数引用变化时，useEffect 会重新执行
- 在并发或快速操作的情况下，可能导致：
  - 多次从 sessionStorage 加载同一份数据
  - 多次调用 `imageUpload.uploadImage(file)`
  - 第二次调用触发 `maxFiles: 1` 限制，抛出 "Maximum 1 image allowed"

**影响**:
- 偶发性地阻止用户上传图片
- 特别是在网络延迟较高或用户快速操作时

---

## 修复方案

### 修复1: startPolling 函数调用

**修复位置**: `components/create/image-to-video-panel.tsx:121-150`

**修复代码**:
```typescript
// Video generation
const videoGeneration = useVideoGeneration({
  onSuccess: (jobId, requestId) => {
    // 🔥 Analytics: 追踪后端开始生成
    GenerationAnalytics.trackGenerationStarted({
      generationType: 'image-to-video',
      jobId,
      requestId,
      modelType: params.model,
      duration: params.duration,
      aspectRatio: params.aspectRatio,
      resolution: params.resolution,
      creditsRequired: getCreditsRequired(),
    })

    // 🔥 修复：从 videoContext 查找完整的 job 对象
    const job = videoContext.activeJobs.find(j => j.id === jobId)

    if (job) {
      startPolling(job) // ✅ 传递完整的 VideoJob 对象
    } else {
      console.error(`❌ [Image-to-Video] Job not found: ${jobId}`)
    }
  },
  onError: (error) => {
    console.error('Image-to-video generation failed:', error)
  },
  onAuthRequired: () => {
    authModal.showAuthModal()
  }
})
```

**改进点**:
- ✅ 从 `videoContext.activeJobs` 查找完整的 job 对象
- ✅ 传递正确的参数类型给 `startPolling`
- ✅ 添加防御性日志，便于调试

---

### 修复2: sessionStorage useEffect 依赖优化

**修复位置**: `components/create/image-to-video-panel.tsx:62-342`

**修复代码**:

1. **添加并发保护 ref** (line 65):
```typescript
// 🔥 追踪是否正在加载 sessionStorage 数据（防止并发加载）
const isLoadingSessionDataRef = useRef(false)
```

2. **双重保护检查** (line 246-249):
```typescript
// 🔥 双重保护：防止并发加载
if (imageToVideoLoadedRef.current || isLoadingSessionDataRef.current) {
  return
}
```

3. **添加加载状态管理** (line 252-338):
```typescript
const checkImageToVideoData = async () => {
  // 🔥 标记正在加载
  isLoadingSessionDataRef.current = true

  try {
    // ... 原有逻辑 ...
  } catch (error) {
    // ... 错误处理 ...
  } finally {
    // 🔥 重置加载状态
    isLoadingSessionDataRef.current = false
  }
}
```

4. **移除不稳定的依赖** (line 342):
```typescript
}, []) // ✅ 只在组件 mount 时执行一次
```

**改进点**:
- ✅ 双重保护机制：`imageToVideoLoadedRef` + `isLoadingSessionDataRef`
- ✅ 防止并发加载导致的重复上传
- ✅ 移除不稳定的函数依赖，避免意外重新执行
- ✅ 使用 finally 块确保状态正确重置

---

## 为什么测试环境不易复现？

1. **问题1 (startPolling)** 是**必现**的 bug
   - 你可能只测试了 text-to-video（已修复）
   - 或者没有等到视频生成的轮询阶段

2. **问题2 (sessionStorage)** 是偶发的竞态条件
   - 测试时操作较慢，给了足够时间完成第一次上传
   - 生产环境网络延迟更高，用户操作更快，更容易触发

---

## 测试建议

### 测试场景1: startPolling 修复
1. 上传一张图片
2. 填写提示词
3. 点击"生成视频"
4. 检查控制台是否还有 "Invalid job object" 错误
5. 验证视频生成任务是否正常轮询

### 测试场景2: sessionStorage 修复
1. 在其他页面（如 My Assets）点击图片的"Generate Video"按钮
2. 跳转到 image-to-video 页面
3. 验证图片是否成功加载，没有 "Maximum 1 image allowed" 错误
4. 快速刷新页面多次，验证是否仍然正常

### 测试场景3: 边界情况
1. 快速切换 tab，验证轮询不会停止
2. 网络延迟时上传图片，验证不会重复上传
3. 同时从多个页面跳转，验证并发保护有效

---

## 影响范围

**修改文件**:
- `components/create/image-to-video-panel.tsx`

**影响功能**:
- ✅ Image-to-Video 视频生成
- ✅ 从其他页面跳转到 Image-to-Video 的场景

**不影响**:
- ✅ Text-to-Video（已在 12月2日修复）
- ✅ Video Effects
- ✅ 其他功能模块

---

## 后续建议

1. **代码审查**
   - 检查是否还有其他地方存在类似的 `startPolling` 调用问题
   - 统一所有视频生成模块的轮询逻辑

2. **监控告警**
   - 添加前端错误监控，捕获 "Invalid job object" 类错误
   - 监控 image-to-video 生成成功率

3. **测试覆盖**
   - 添加 E2E 测试覆盖 image-to-video 完整流程
   - 添加并发场景的测试用例

4. **文档更新**
   - 更新开发文档，说明 `startPolling` 的正确使用方式
   - 记录 sessionStorage 跳转的最佳实践

---

## 总结

本次修复解决了两个关键 bug：
1. ✅ **startPolling 函数签名不匹配** - 导致视频生成任务无法启动轮询
2. ✅ **sessionStorage 竞态条件** - 导致重复上传和 "Maximum 1 image allowed" 错误

修复后，image-to-video 功能应该能够稳定运行，与 text-to-video 保持一致的行为。

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>

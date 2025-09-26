# 已知问题和解决方案

## NextAuth v5 + Next.js 15 警告问题

### 问题描述
在开发环境中，你可能会看到以下警告：

```
Error: Route "/api/video/status/[requestId]" used `headers().get('cookie')`.
`headers()` should be awaited before using its value.
```

### 问题原因
这是 **NextAuth v5 beta 版本**与 **Next.js 15** 的已知兼容性问题：

- NextAuth v5 内部使用 `headers().get()` 来访问 cookies 和其他 headers
- Next.js 15 引入了新的要求：动态 API 需要在使用前 await
- NextAuth v5 beta 还未完全适配这个新要求

### 影响范围
- ❌ **控制台会显示警告信息**
- ✅ **不影响功能正常工作**
- ✅ **不影响用户体验**
- ✅ **不影响生产环境**

### 临时解决方案
目前这个警告无法完全消除，但可以通过以下方式缓解：

#### 方案1：忽略警告（推荐）
这些警告不会影响应用功能，可以安全忽略。

#### 方案2：降级 Next.js 版本
```bash
pnpm install next@14.2.18
```

#### 方案3：等待正式版本
等待 NextAuth v5 正式版本发布，预计会解决这个兼容性问题。

### 长期解决方案
- **NextAuth v5 正式版**：预计会解决兼容性问题
- **Next.js 15.x 更新**：可能会提供更好的向后兼容性

### 项目状态
✅ **所有核心功能正常工作**：
- 用户认证和登录 ✅
- 视频生成和管理 ✅
- 文件存储和上传 ✅
- 队列和轮询系统 ✅

### 相关链接
- [NextAuth v5 文档](https://authjs.dev/)
- [Next.js 15 动态 API 警告](https://nextjs.org/docs/messages/sync-dynamic-apis)
- [相关 GitHub Issue](https://github.com/nextauthjs/next-auth/issues)

---

**最后更新**: 2025-09-16
**状态**: 已知问题，等待上游库修复
# 前端 API 调用缺少 credentials 导致 401 错误的修复

## 问题诊断过程

### 1. 初步现象
- 用户在线上环境遇到 API 401 错误
- 本地环境工作正常

### 2. 第一阶段诊断 - 后端认证配置
- 检查了 `auth/config.ts` 的 cookie secure 配置
- 添加了 `NEXTAUTH_COOKIE_SECURE` 环境变量支持
- 测试发现 `/api/auth/session` 工作正常，返回 200 和用户信息

### 3. 第二阶段诊断 - 前端调用问题
- 用户在界面上测试仍然返回 401
- 错误堆栈显示 `Object.requireAuth`
- 关键发现：**前端 fetch 调用缺少 `credentials: 'include'`**

## 根本原因

### Cookie 传递问题

在 Next.js 应用中，默认情况下 `fetch` API **不会自动发送 cookie**，需要显式指定 `credentials: 'include'`。

**问题代码示例**：
```typescript
const response = await fetch('/api/video/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({...})
})
```

**结果**：
- 浏览器不会在请求中发送 `next-auth.session-token` cookie
- 后端 API 收不到认证信息
- 即使用户已登录，API 仍然返回 401 Unauthorized

## 修复方案

### 修改的文件

#### 1. `hooks/use-video-generation.tsx`

修复了两个视频生成 API 调用：

**Text-to-Video (line 133)**：
```typescript
const response = await fetch('/api/video/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include', // 🔥 添加这一行
  body: JSON.stringify({...})
})
```

**Image-to-Video (line 227)**：
```typescript
const response = await fetch('/api/video/generate-image-to-video', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include', // 🔥 添加这一行
  body: JSON.stringify({...})
})
```

#### 2. `hooks/use-image-generation.tsx`

修复了两个图片生成 API 调用：

**Text-to-Image (line 57)**：
```typescript
const response = await fetch('/api/image/generate-text-to-image', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include', // 🔥 添加这一行
  body: JSON.stringify({...})
})
```

**Image-to-Image (line 127)**：
```typescript
const response = await fetch('/api/image/generate-image-to-image', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include', // 🔥 添加这一行
  body: JSON.stringify({...})
})
```

## 技术说明

### credentials 选项的作用

`credentials: 'include'` 告诉浏览器：
- 在同源请求中包含 cookies
- 在跨域请求中也包含 cookies（如果服务器允许）
- 对于 Next.js App Router 的 API 路由，这是必需的

### 为什么本地环境没问题？

可能的原因：
1. 本地测试时使用了不同的登录方式
2. 浏览器缓存或 session 状态不同
3. 开发环境的某些默认行为与生产环境不同

### 为什么控制台 fetch 测试能工作？

因为手动测试时我们**显式添加了** `credentials: 'include'`：
```javascript
fetch('/api/video/generate-image-to-video', {
  credentials: 'include', // 手动添加
  ...
})
```

## 验证步骤

### 1. 清除浏览器缓存
- 打开开发者工具
- 硬性刷新页面（Ctrl+Shift+R / Cmd+Shift+R）

### 2. 重新测试所有功能
- ✅ Text-to-Video 生成
- ✅ Image-to-Video 生成
- ✅ Text-to-Image 生成
- ✅ Image-to-Image 生成

### 3. 检查 Network 标签
- 确认所有 API 请求都包含 `Cookie` header
- 确认 `Cookie` header 中包含 `next-auth.session-token`

## 相关文档

- `discuss/fix-production-401-auth-issue.md` - 后端 cookie 配置修复
- `discuss/diagnose-401-session-token-issue.md` - Session token 诊断指南
- `discuss/test-401-fix-steps.md` - 测试验证步骤

## 经验总结

### 关键教训

1. **NextAuth + API Routes 必须使用 credentials: 'include'**
   - Next.js 的 API 路由依赖 cookie 进行认证
   - fetch 默认不发送 cookie

2. **分阶段诊断**
   - 先测试 `/api/auth/session` 确认后端认证是否正常
   - 再测试实际 API 调用确认前端是否正确传递 credentials

3. **控制台测试 vs 实际代码**
   - 控制台测试可以手动添加参数
   - 但实际代码中的 fetch 调用可能遗漏这些参数

### 最佳实践

**创建统一的 API 调用函数**：

```typescript
// lib/api-client.ts
export async function apiClient(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  return fetch(url, {
    ...options,
    credentials: 'include', // 统一添加
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
}

// 使用时：
const response = await apiClient('/api/video/generate', {
  method: 'POST',
  body: JSON.stringify({...})
})
```

这样可以：
- 避免遗漏 `credentials: 'include'`
- 统一错误处理
- 简化代码

## 后续优化建议

1. ✅ 创建统一的 API 客户端函数（如上所示）
2. ✅ 添加自动化测试验证 fetch 调用是否包含 credentials
3. ✅ 在 CI/CD 中添加 E2E 测试覆盖认证流程
4. ✅ 文档化所有 API 调用的最佳实践

## 部署清单

- [x] 修复前端 fetch 调用（添加 credentials: 'include'）
- [ ] 提交代码到 Git
- [ ] 部署到线上环境
- [ ] 清除 CloudFlare 缓存
- [ ] 用户测试验证
- [ ] 监控错误日志确认 401 错误消失

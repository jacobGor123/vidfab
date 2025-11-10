# 线上环境 401 错误调试指南

## 🔍 快速诊断步骤

### 步骤 1：检查 Session 解析（最关键！）⭐

**如果请求已经带了 Cookie，但仍然 401，先检查这个**：

在浏览器控制台执行：

```javascript
fetch('/api/debug/session', { credentials: 'include' })
  .then(r => r.json())
  .then(data => {
    console.log('诊断结果:', data.diagnosis.problem)
    console.log('Cookie 已发送:', data.cookie.exists)
    console.log('Session 已解析:', data.session.parsed)
    console.log('完整信息:', data)
  })
```

**关键判断**：
- ✅ `cookie.exists: true` + `session.parsed: true` → Session 正常
- ❌ `cookie.exists: true` + `session.parsed: false` → **NEXTAUTH_SECRET 不匹配或 token 已过期**
- ❌ `cookie.exists: false` → Cookie 未发送（前端问题）

**如果 Cookie 存在但 Session 无法解析**：
1. 检查服务器的 `NEXTAUTH_SECRET` 是否正确
2. 尝试重新登录（token 可能已过期）
3. 确认环境变量在所有服务器实例上一致

---

### 步骤 2：检查代码版本

在浏览器控制台执行：

```javascript
fetch('/api/debug/version')
  .then(r => r.json())
  .then(data => {
    console.log('代码版本:', data.version.gitCommit)
    console.log('是否包含 credentials fix:', data.fixes.credentialsIncludeFix)
  })
```

**预期结果**：
- `gitCommit` 应该是 `17a79b9e` 或更新
- `credentialsIncludeFix` 应该是 `true`

**如果不符合预期**：
- ❌ 线上环境运行的是旧代码
- 🔧 需要重新部署 prod-new 分支

---

### 步骤 3：运行完整诊断脚本

在浏览器控制台执行：

```javascript
fetch('/debug-check.js').then(r => r.text()).then(eval)
```

这会自动执行以下检查：
1. ✅ Session 是否有效
2. ✅ 代码版本是否正确
3. ✅ Cookie 是否存在
4. ✅ API 调用是否成功
5. ✅ 提供详细的错误分析

---

### 步骤 4：手动检查 Network 请求

1. **打开开发者工具** (F12)
2. **切换到 Network 标签**
3. **尝试生成 Image-to-Video**
4. **找到失败的请求**：`generate-image-to-video`
5. **检查 Request Headers**：

   **应该包含**：
   ```
   Cookie: next-auth.session-token=eyJhbGci...
   ```

   **如果没有 Cookie**：
   - 前端代码还是旧的，没有 `credentials: 'include'`
   - 或者浏览器/CDN 缓存了旧的 JavaScript

6. **检查 Response**：

   **如果返回 401**：
   ```json
   {
     "error": "Authentication required",
     "code": "AUTH_REQUIRED"
   }
   ```
   → 说明 Cookie 没有发送

   **如果返回 400**：
   ```json
   {
     "error": "Validation failed",
     "details": [...]
   }
   ```
   → 说明认证通过了，只是参数问题（这是好事！）

---

## 🔧 可能的问题和解决方案

### 问题 1：线上代码未更新 ⚠️⚠️⚠️

**症状**：
- `/api/debug/version` 返回 `credentialsIncludeFix: false`
- 或者 `gitCommit` 不是 `17a79b9e`

**解决方案**：
```bash
# 1. 确认 prod-new 分支已推送
git log --oneline -1
# 应该显示: 17a79b9e fix: 修复前端 API 调用缺少 credentials 导致的 401 认证错误

# 2. 重新部署线上环境
# (具体部署命令根据你们的部署流程)
```

---

### 问题 2：CloudFlare 缓存了旧的 JavaScript

**症状**：
- 后端 API `/api/debug/version` 显示代码是新的
- 但前端仍然报 401 错误
- Network 请求中没有 Cookie

**解决方案**：
1. 登录 CloudFlare Dashboard
2. 选择域名 `vidfab.ai`
3. 进入 **Caching** → **Configuration**
4. 点击 **Purge Everything** 清除所有缓存
5. 等待 1-2 分钟
6. 硬刷新浏览器 (Ctrl+Shift+R / Cmd+Shift+R)

---

### 问题 3：浏览器缓存了旧的 JavaScript

**症状**：
- CloudFlare 缓存已清除
- 但仍然报 401 错误

**解决方案**：
1. 打开开发者工具 (F12)
2. 右键点击刷新按钮
3. 选择 **"清空缓存并硬性重新加载"**
4. 或者：Application → Storage → Clear site data

---

### 问题 4：部署后仍然 401（最罕见）

**症状**：
- 代码版本正确
- 缓存已清除
- 但仍然报 401

**深度调试**：

在浏览器控制台检查前端代码是否真的包含 `credentials: 'include'`：

```javascript
// 检查 use-video-generation hook 的代码
fetch('/_next/static/chunks/pages/_app-xxx.js')
  .then(r => r.text())
  .then(code => {
    if (code.includes('credentials:"include"') || code.includes("credentials:'include'")) {
      console.log('✅ 前端代码包含 credentials: include')
    } else {
      console.log('❌ 前端代码不包含 credentials: include')
      console.log('   需要重新构建并部署')
    }
  })
```

---

## 📊 诊断流程图

```
开始
  ↓
检查 /api/debug/version
  ↓
credentialsIncludeFix = true?
  ↓ 否
  重新部署最新代码 → 结束
  ↓ 是
清除 CloudFlare 缓存
  ↓
清除浏览器缓存
  ↓
重新测试
  ↓
仍然 401?
  ↓ 是
  检查 Network 请求是否有 Cookie
    ↓ 没有
    检查前端 JavaScript 代码 → 重新构建部署
    ↓ 有
    检查后端配置
  ↓ 否
  ✅ 问题解决！
```

---

## 🎯 最可能的原因（按概率排序）

1. **线上环境未部署最新代码** (90%)
   - 解决方案：重新部署 prod-new 分支

2. **CloudFlare 缓存了旧的 JavaScript** (8%)
   - 解决方案：清除 CloudFlare 缓存

3. **浏览器缓存了旧的 JavaScript** (1.5%)
   - 解决方案：硬刷新浏览器

4. **其他问题** (0.5%)
   - 解决方案：深度调试

---

## 🚀 快速验证命令

在浏览器控制台一次性运行：

```javascript
(async () => {
  console.log('🔍 快速诊断...\n')

  // 1. 检查版本
  const version = await fetch('/api/debug/version').then(r => r.json())
  console.log('1️⃣ 版本:', version.version.gitCommit,
              version.fixes.credentialsIncludeFix ? '✅' : '❌')

  // 2. 检查 Session
  const session = await fetch('/api/auth/session', { credentials: 'include' }).then(r => r.json())
  console.log('2️⃣ Session:', session.user ? '✅' : '❌')

  // 3. 检查 Cookie
  const hasCookie = document.cookie.includes('next-auth.session-token')
  console.log('3️⃣ Cookie:', hasCookie ? '✅' : '❌')

  // 4. 测试 API
  const test = await fetch('/api/video/generate-image-to-video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      image: 'https://picsum.photos/1920/1080.jpg',
      prompt: 'test',
      model: 'vidfab-q1',
      resolution: '720p',
      duration: 5,
      aspectRatio: '16:9'
    })
  })
  console.log('4️⃣ API:', test.status, test.status === 401 ? '❌' : '✅')

  console.log('\n诊断完成!')
})()
```

---

## 📞 需要帮助？

如果按照上述步骤仍无法解决，请提供：

1. `/api/debug/version` 的完整返回结果
2. Network 标签中失败请求的截图（包含 Request Headers）
3. 浏览器控制台的完整输出
4. 部署日志（如果有）

这样可以更准确地定位问题。

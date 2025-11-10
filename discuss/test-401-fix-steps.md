# 验证 401 修复的测试步骤

## 当前状况

✅ **已确认工作**：
- Session API (`/api/auth/session`) 返回 200 和完整用户信息
- Session token 正确解析
- Cookie 配置正确（没有 Secure 标志）

❓ **待验证**：
- Image-to-video API 是否仍然返回 401

## 测试步骤

### 步骤 1：清除 CloudFlare 缓存

**选项 A：通过 CloudFlare Dashboard**
1. 登录 CloudFlare Dashboard
2. 选择域名 `vidfab.ai`
3. 进入 "Caching" → "Configuration"
4. 点击 "Purge Everything" 清除所有缓存

**选项 B：通过 API**
```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache" \
  -H "Authorization: Bearer {api_token}" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'
```

### 步骤 2：清除浏览器缓存和 Cookie

**Chrome/Edge：**
1. 打开开发者工具 (F12)
2. 右键点击刷新按钮
3. 选择 "清空缓存并硬性重新加载"

**或者：**
1. 打开开发者工具 (F12)
2. Application → Storage
3. 点击 "Clear site data"
4. 刷新页面

### 步骤 3：重新登录

1. 访问 https://vidfab.ai/login
2. 使用 Google 或验证码登录
3. 登录成功后，检查 Cookie 中是否有 `next-auth.session-token`

### 步骤 4：测试 Image-to-video 生成

1. 进入 Create 页面
2. 选择 Image-to-Video 标签
3. 上传一张图片
4. 点击 Generate

**预期结果**：
- ✅ API 请求成功，返回 200
- ✅ 视频生成任务开始

**如果仍然返回 401**：
1. 打开开发者工具 Network 标签
2. 找到失败的请求
3. 查看 Request Headers：
   - 确认有 `Cookie: next-auth.session-token=...`
4. 查看 Response
5. 截图发给我

### 步骤 5：直接测试 API（如果上面仍然失败）

在浏览器控制台执行：

```javascript
// 1. 先验证 session 是否有效
fetch('/api/auth/session', {
  credentials: 'include'
})
  .then(r => r.json())
  .then(data => {
    console.log('Session:', data)
    if (data.user) {
      console.log('✅ Session 有效')
    } else {
      console.log('❌ Session 无效')
    }
  })

// 2. 如果 session 有效，测试 image-to-video API
// 注意：这会实际调用 API 并扣除积分！
fetch('/api/video/generate-image-to-video', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  credentials: 'include',
  body: JSON.stringify({
    image: 'https://example.com/test.jpg',  // 使用一个测试图片 URL
    prompt: 'test',
    model: 'vidfab-q1',
    resolution: '720p',
    duration: '5s'
  })
})
  .then(r => {
    console.log('Status:', r.status)
    return r.json()
  })
  .then(data => console.log('Response:', data))
  .catch(err => console.error('Error:', err))
```

## 可能的结果

### 结果 A：测试成功 ✅

如果 API 返回 200 和成功响应：
```json
{
  "success": true,
  "data": {
    "requestId": "...",
    "localId": "...",
    ...
  }
}
```

**说明**：问题已解决，是缓存导致的。

### 结果 B：仍然返回 401 ❌

如果 API 仍然返回 401：

**可能原因**：
1. 前端代码发送请求时没有正确包含 credentials
2. API 路由代码有问题
3. 代码版本不一致

**需要检查**：
1. 前端如何发送请求（检查 fetch 配置）
2. 是否所有服务都重启了
3. 线上代码版本是否是最新的

### 结果 C：Session 无效（第一个测试就失败）❌

如果 `/api/auth/session` 返回空对象 `{}`：

**说明**：Session 仍然无效，需要：
1. 检查线上环境变量配置
2. 重新登录
3. 确认代码已部署

## 快速诊断命令

```bash
# 测试 session API（不需要登录）
curl -i https://vidfab.ai/api/auth/session

# 应该返回 200 但内容为空（因为没有 cookie）

# 测试带 cookie 的 session API（需要从浏览器复制 cookie）
curl -i https://vidfab.ai/api/auth/session \
  -H "Cookie: next-auth.session-token=<从浏览器复制>"

# 应该返回 200 和用户信息
```

## 检查线上代码版本

```bash
# SSH 到线上服务器或进入容器
docker exec -it <container-name> sh

# 查看最新 commit
git log --oneline -5

# 应该包含：
# 49a53953 - Merge branch 'master' into 'prod-new'
# b0eef0dd - feat: 添加 NEXTAUTH_COOKIE_SECURE 环境变量文档

# 检查 auth/config.ts 是否包含修复
grep -n "NEXTAUTH_COOKIE_SECURE" auth/config.ts

# 应该显示：
# 156: useSecureCookies: process.env.NEXTAUTH_COOKIE_SECURE === 'false'
# 167: secure: process.env.NEXTAUTH_COOKIE_SECURE === 'false'
```

## 联系我时需要的信息

如果问题仍然存在，请提供：

1. **Session API 测试结果**（浏览器控制台截图）
2. **Image-to-video API 失败截图**（包含 Network 标签的 Request/Response）
3. **Cookie 信息**（Application 标签截图）
4. **线上代码版本**（git log 结果）
5. **环境变量配置**（NEXTAUTH_URL, NEXTAUTH_COOKIE_SECURE 等）

这样我可以更准确地定位问题。

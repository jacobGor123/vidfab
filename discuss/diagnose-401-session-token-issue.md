# Session Token 存在但仍然 401 的问题诊断

## 问题现象

从截图观察到：
- ✅ 浏览器 Cookie 中 `next-auth.session-token` **存在且有效**（过期时间 2025-11）
- ❌ Image-to-video API 调用仍然返回 **HTTP 401 Unauthorized**
- ℹ️ 本地开发环境工作正常，**仅线上生产环境**出现问题

## 根本原因分析

### 关键代码路径

1. **API 认证逻辑** (`app/api/video/generate-image-to-video/route.ts:19`)
   ```typescript
   const session = await auth()
   if (!session?.user) {
     return NextResponse.json(
       { error: "Authentication required", code: "AUTH_REQUIRED" },
       { status: 401 }
     )
   }
   ```

2. **Auth 函数实现** (`auth.ts:16`)
   ```typescript
   export const auth = () => getServerSession(authConfig)
   ```

3. **Session 验证机制**
   - `getServerSession` 会读取请求中的 session token cookie
   - 使用 `authConfig` 中的配置来验证 token 签名
   - 验证时会检查 token 是否由 `NEXTAUTH_SECRET` 签名且未过期

### 可能导致验证失败的原因

#### 1. NEXTAUTH_URL 配置不匹配 ⚠️⚠️⚠️ (最可能的原因)

**问题**：
- `.env.example` 中设置：`NEXTAUTH_URL=http://localhost:3000`
- 但线上环境应该是：`NEXTAUTH_URL=https://your-production-domain.com`

**为什么会导致 401**：
- NextAuth 使用 `NEXTAUTH_URL` 来：
  - 验证 callback URL
  - 设置 cookie domain
  - 生成和验证 CSRF tokens
  - **验证 session token 的来源和有效性**
- 如果 NEXTAUTH_URL 不匹配，即使 cookie 存在，验证也会失败

**检查方法**：
```bash
# 在线上环境执行（通过 SSH 或容器 shell）
echo $NEXTAUTH_URL
# 应该输出: https://实际的线上域名.com
```

#### 2. NEXTAUTH_SECRET 不匹配

**问题**：
- 如果线上环境的 `NEXTAUTH_SECRET` 与生成 session token 时使用的不一致
- Session token 的签名验证会失败

**检查方法**：
```bash
# 确认线上环境的 NEXTAUTH_SECRET 已设置且正确
echo $NEXTAUTH_SECRET
# 应该输出一个长度至少 32 字符的随机字符串
```

#### 3. Cookie Secure 属性问题（已修复但未部署）

**问题**：
- 我们已经在 `auth/config.ts` 中添加了 `NEXTAUTH_COOKIE_SECURE` 环境变量支持
- 但如果这个修复还没有部署到线上环境，问题仍然存在

**检查方法**：
```bash
# 查看线上环境的代码版本
git log --oneline -5
# 应该包含 commit: b0eef0dd 或更新的 commit
```

#### 4. 反向代理 Header 传递问题

**问题**：
- 如果使用 Nginx/CloudFlare 等反向代理
- 但没有正确传递 `X-Forwarded-Proto`、`X-Forwarded-Host` 等 headers
- NextAuth 可能无法正确识别请求来源

**检查方法**：
检查 Nginx 配置是否包含：
```nginx
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-Host $host;
```

#### 5. 跨域 Cookie 问题

**问题**：
- 如果 API 和前端部署在不同的域名或子域名
- Cookie 可能无法在跨域请求中发送

**检查方法**：
```bash
# 检查前端和 API 是否在同一域名下
# 前端: https://vidfab.ai
# API: https://vidfab.ai/api (✅ 同域)
# API: https://api.vidfab.ai (❌ 跨域，需要特殊配置)
```

## 修复方案（按优先级排序）

### 🚨 方案 1：修复 NEXTAUTH_URL 配置（最优先）

**线上环境需要设置正确的域名**：

```bash
# .env 或部署平台环境变量
NEXTAUTH_URL=https://your-actual-domain.com
NEXTAUTH_SECRET=your-secret-key-at-least-32-chars
NODE_ENV=production
```

**重要**：
- `NEXTAUTH_URL` 必须与用户浏览器访问的域名**完全一致**
- 包括协议 (https://)
- 包括端口（如果不是默认的 80/443）
- 不要包含尾部斜杠

### 🔥 方案 2：部署最新代码（如果还没部署）

确保包含以下 commits 的代码已部署到线上：
- `b0eef0dd`: 添加 NEXTAUTH_COOKIE_SECURE 环境变量支持
- `49a53953`: 合并 master 分支

然后在线上环境设置：
```bash
NEXTAUTH_COOKIE_SECURE=false  # 仅在有反向代理时设置
```

### ⚙️ 方案 3：检查和修复反向代理配置

如果使用 Nginx，确保配置正确：

```nginx
location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;

    # 关键配置
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;

    # WebSocket 支持（可选）
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_cache_bypass $http_upgrade;
}
```

### 🔍 方案 4：启用详细日志进行调试

在线上环境临时启用 NextAuth 调试日志：

```bash
# 添加到环境变量
NODE_ENV=production
NEXTAUTH_DEBUG=true  # 临时启用
```

然后查看服务器日志，会显示详细的认证失败原因。

## 诊断步骤（按顺序执行）

### 步骤 1：验证环境变量配置

```bash
# SSH 到线上服务器或进入容器
docker exec -it <container-name> sh

# 检查关键环境变量
echo "NEXTAUTH_URL: $NEXTAUTH_URL"
echo "NEXTAUTH_SECRET: ${NEXTAUTH_SECRET:0:10}..." # 只显示前10个字符
echo "NODE_ENV: $NODE_ENV"
echo "NEXTAUTH_COOKIE_SECURE: $NEXTAUTH_COOKIE_SECURE"
```

**预期结果**：
- `NEXTAUTH_URL` 应该是 `https://实际域名.com`（不是 localhost）
- `NEXTAUTH_SECRET` 应该存在且不为空
- `NODE_ENV` 应该是 `production`

### 步骤 2：验证代码版本

```bash
# 检查线上运行的代码版本
git log --oneline -1
```

**预期结果**：
- 应该是 `49a53953` 或更新的 commit（包含我们的 401 修复）

### 步骤 3：测试 Session API

在浏览器开发者工具中执行：

```javascript
// 测试 session API 是否能正确返回用户信息
fetch('/api/auth/session', {
  credentials: 'include'
})
  .then(r => r.json())
  .then(console.log)
```

**预期结果**：
- 如果配置正确，应该返回用户信息：`{ user: { email: "...", ... } }`
- 如果返回空对象 `{}`，说明 session 验证失败

### 步骤 4：检查请求 Headers

在浏览器开发者工具 Network 标签中：
1. 找到失败的 API 请求（401 的那个）
2. 查看 Request Headers
3. 确认 `Cookie` header 中包含 `next-auth.session-token`

**如果 Cookie 没有发送**：
- 可能是跨域问题
- 检查 API 请求的 URL 是否与前端同域

**如果 Cookie 已发送但仍然 401**：
- 确认 `NEXTAUTH_URL` 配置
- 确认 `NEXTAUTH_SECRET` 配置

### 步骤 5：查看服务器日志

```bash
# 查看 Next.js 服务器日志
docker logs <container-name> -f --tail=100

# 或者如果使用 PM2
pm2 logs <app-name>
```

查找包含以下关键词的日志：
- `Authentication failed`
- `Session`
- `JWT`
- `NextAuth`

## 快速修复清单

如果时间紧急，按以下顺序快速修复：

1. ✅ **设置正确的 NEXTAUTH_URL**
   ```bash
   NEXTAUTH_URL=https://实际的线上域名.com
   ```

2. ✅ **确认 NEXTAUTH_SECRET 已设置**
   ```bash
   NEXTAUTH_SECRET=至少32字符的随机字符串
   ```

3. ✅ **如果有反向代理，添加此变量**
   ```bash
   NEXTAUTH_COOKIE_SECURE=false
   ```

4. ✅ **重启应用**
   ```bash
   docker-compose restart
   # 或
   pm2 restart all
   ```

5. ✅ **清除浏览器 Cookie 并重新登录**
   - 打开浏览器开发者工具
   - Application → Storage → Clear site data
   - 重新登录测试

## 后续验证

修复后，验证以下内容确保问题已解决：

1. ✅ 用户可以成功登录
2. ✅ Session token 在 Cookie 中存在
3. ✅ `/api/auth/session` 返回用户信息（不是空对象）
4. ✅ Image-to-video API 调用成功（不再返回 401）
5. ✅ 服务器日志中没有认证错误

## 联系信息

如果按照上述步骤仍然无法解决，请提供以下信息以便进一步诊断：

1. 线上环境的 `NEXTAUTH_URL` 值（请确认是否与实际访问域名一致）
2. `/api/auth/session` 的返回结果
3. 服务器日志中的相关错误信息
4. 浏览器 Network 标签中失败请求的 Request/Response Headers 截图

# 线上环境 API 401 认证问题修复方案

## 问题描述

线上生产环境出现 API 401 Unauthorized 错误，但本地开发环境工作正常。

## 根本原因

### Cookie Secure 属性导致的问题

在 `auth/config.ts` 中，生产环境默认启用了 `secure: true` 的 cookie 设置：

```typescript
secure: process.env.NODE_ENV === 'production' && !process.env.DOCKER_ENVIRONMENT
```

**问题**：
1. 如果线上环境使用反向代理（Nginx、CloudFlare、CDN等）
2. 代理将 HTTPS 请求转发到后端 HTTP 端口
3. NextAuth 检测到非 HTTPS 环境，拒绝设置 secure cookies
4. 导致 session 无法建立，所有 API 请求返回 401

## 修复方案

### 方案 1：添加环境变量控制（推荐 ✅）

已修改 `auth/config.ts`，添加环境变量 `NEXTAUTH_COOKIE_SECURE` 来控制 cookie 的 secure 属性。

**线上环境配置**：

```bash
# .env 或部署平台的环境变量
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-secret-key
NODE_ENV=production

# 如果使用反向代理且遇到 401 错误，添加此变量
NEXTAUTH_COOKIE_SECURE=false
```

**工作原理**：
- 默认行为保持不变（生产环境使用 secure cookies）
- 可通过设置 `NEXTAUTH_COOKIE_SECURE=false` 临时禁用
- 给运维团队更多灵活性

### 方案 2：配置反向代理（最佳实践 🌟）

**Nginx 配置**：

```nginx
location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;

    # 关键配置 - 告诉后端这是 HTTPS 请求
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Real-IP $remote_addr;
}
```

**Vercel/Netlify 等平台**：
通常会自动处理这些 headers，但如果遇到问题，可以设置 `NEXTAUTH_COOKIE_SECURE=false`。

### 方案 3：Docker 环境

如果使用 Docker 部署：

```bash
DOCKER_ENVIRONMENT=true
```

这会自动禁用 secure cookies。

## 诊断步骤

### 1. 检查 Cookie 是否被设置

在浏览器开发者工具中：
1. 打开 Application/Storage → Cookies
2. 查看是否有 `next-auth.session-token`
3. 如果没有 → cookie 设置失败，使用方案 1 或 2

### 2. 检查环境变量

确保线上环境设置了：
- ✅ `NEXTAUTH_URL` - 完整的域名（必需）
- ✅ `NEXTAUTH_SECRET` - 密钥（必需）
- ⚠️ `NEXTAUTH_COOKIE_SECURE=false` - 如果有代理问题（可选）

### 3. 检查反向代理日志

```bash
# 查看 Nginx 日志
tail -f /var/log/nginx/access.log

# 检查是否有 X-Forwarded-Proto header
grep "X-Forwarded-Proto" /var/log/nginx/access.log
```

## 测试验证

### 本地测试生产配置

```bash
# 模拟生产环境
NODE_ENV=production NEXTAUTH_COOKIE_SECURE=false npm run start
```

### 线上环境验证

1. 部署修复后的代码
2. 清除浏览器 cookies
3. 重新登录
4. 在开发者工具 Network 标签查看 API 请求
5. 确认返回 200 而不是 401

## 相关文件

- `auth/config.ts` - NextAuth 配置
- `auth.ts` - Auth 导出
- `middleware.ts` - 路由保护中间件
- `app/api/image/generate-*/route.ts` - 图片生成 API

## 注意事项

⚠️ **安全提示**：
- `NEXTAUTH_COOKIE_SECURE=false` 仅在有反向代理且配置了 HTTPS 时使用
- 不要在完全没有 HTTPS 的环境使用（会有安全风险）
- 最佳实践是修复反向代理配置，让其正确传递 X-Forwarded-Proto header

## 后续优化

1. ✅ 修复反向代理配置（移除临时环境变量）
2. 🔒 定期检查 session 安全性
3. 📊 添加 cookie 设置失败的监控告警

# 环境变量说明文档

## 概览

本文档详细说明了 VidFab AI 视频平台所需的所有环境变量。

## 必需变量（REQUIRED）

这些变量是应用运行的基础，缺少会导致应用无法启动。

### Supabase 配置

```bash
# Supabase 项目 URL
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co

# Supabase 匿名密钥（公开密钥，用于客户端）
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Supabase 服务角色密钥（私有密钥，仅用于服务端）
# ⚠️ 警告: 此密钥拥有完全数据库访问权限，切勿暴露给客户端
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**获取方式**：
1. 登录 [Supabase Dashboard](https://app.supabase.com/)
2. 选择你的项目
3. 进入 Settings → API
4. 复制 Project URL 和 API Keys

### NextAuth 配置

```bash
# NextAuth 密钥（用于 JWT 签名和加密）
# 必须至少 32 个字符
NEXTAUTH_SECRET=your_nextauth_secret_here_minimum_32_characters

# 应用的完整 URL（包括协议和端口）
NEXTAUTH_URL=http://localhost:3000
```

**生成 NEXTAUTH_SECRET**：
```bash
openssl rand -base64 32
```

---

## 可选但推荐变量（RECOMMENDED）

这些变量不是必需的，但启用后可以增强应用功能。

### Google OAuth 认证

```bash
# Google OAuth 客户端 ID
AUTH_GOOGLE_ID=827684711935-xxx.apps.googleusercontent.com

# Google OAuth 客户端密钥
AUTH_GOOGLE_SECRET=GOCSPX-xxxxxxxxxxxxxxxxx

# 前端配置：是否启用 Google OAuth
NEXT_PUBLIC_AUTH_GOOGLE_ENABLED=true

# 前端配置：是否启用 Google One Tap
NEXT_PUBLIC_AUTH_GOOGLE_ONE_TAP_ENABLED=true

# 前端配置：Google OAuth 客户端 ID（必须与 AUTH_GOOGLE_ID 一致）
NEXT_PUBLIC_AUTH_GOOGLE_ID=827684711935-xxx.apps.googleusercontent.com
```

**获取方式**：
1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建新项目或选择现有项目
3. 启用 Google+ API
4. 创建 OAuth 2.0 客户端 ID
5. 配置授权重定向 URI：`http://localhost:3000/api/auth/callback/google`

### Stripe 支付

```bash
# Stripe 私钥（服务端使用）
STRIPE_SECRET_KEY=sk_test_51xxxxx

# Stripe 公钥（客户端使用）
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51xxxxx

# Stripe Webhook 密钥（用于验证 Webhook 请求）
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

**获取方式**：
1. 登录 [Stripe Dashboard](https://dashboard.stripe.com/)
2. 进入 Developers → API keys
3. 复制 Publishable key 和 Secret key
4. 配置 Webhook：Developers → Webhooks → Add endpoint

**Webhook 配置**：
- URL: `https://your-domain.com/api/stripe/webhook`
- 事件: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`

### AWS SES 邮件服务

```bash
# AWS SES SMTP 主机
AWS_SES_SMTP_HOST=email-smtp.us-west-1.amazonaws.com

# AWS SES SMTP 用户名
AWS_SES_SMTP_USERNAME=AKIAXXXXXXXXXXXXX

# AWS SES SMTP 密码
AWS_SES_SMTP_PASSWORD=xxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 发件人邮箱
AWS_SES_FROM_EMAIL=noreply@vidfab.ai

# 回复邮箱
AWS_SES_REPLY_TO_EMAIL=support@vidfab.ai
```

**获取方式**：
1. 登录 [AWS Console](https://console.aws.amazon.com/)
2. 进入 SES 服务
3. 验证发件人邮箱或域名
4. 创建 SMTP 凭证：SMTP Settings → Create My SMTP Credentials

---

## 应用配置变量

### 通用配置

```bash
# 运行环境：development, production, test
NODE_ENV=production

# 应用完整 URL（用于生成链接、回调等）
NEXT_PUBLIC_APP_URL=http://localhost:3000

# 日志级别：debug, info, warn, error
LOG_LEVEL=info
```

### Redis 配置

```bash
# Redis 连接 URL（Docker 内部使用 redis:6379）
REDIS_URL=redis://localhost:6379

# Redis 主机
REDIS_HOST=localhost

# Redis 端口
REDIS_PORT=6379

# Redis 密码（可选）
REDIS_PASSWORD=

# Redis 数据库编号
REDIS_DB=0
```

**Docker 环境特别说明**：
在 Docker Compose 中，Redis 主机名应该使用服务名 `redis`：
```bash
REDIS_URL=redis://redis:6379
REDIS_HOST=redis
```

### 队列配置

```bash
# BullMQ 队列前缀
QUEUE_PREFIX=vidfab-video-processing

# 队列并发数（同时处理的任务数）
QUEUE_CONCURRENCY=3

# 最大重试次数
QUEUE_MAX_RETRIES=3

# 重试延迟（毫秒）
QUEUE_RETRY_DELAY=60000
```

---

## Docker 特定配置

### docker-compose.yml 需要的变量

docker-compose.yml 在构建时需要这些变量：

```bash
# 构建时必需
NODE_ENV=production
NEXT_PUBLIC_AUTH_GOOGLE_ENABLED=true
NEXT_PUBLIC_AUTH_GOOGLE_ONE_TAP_ENABLED=true
NEXT_PUBLIC_AUTH_GOOGLE_ID=827684711935-xxx.apps.googleusercontent.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 容器端口配置

```bash
# 应用端口
PORT=3000

# 主机绑定地址
HOST=0.0.0.0
```

---

## 环境变量优先级

变量读取顺序（后者覆盖前者）：

1. `.env` - Docker Compose 构建时使用
2. `.env.local` - 本地开发时使用（不会被 Git 追踪）
3. `.env.development` - 开发环境特定配置
4. `.env.production` - 生产环境特定配置
5. 系统环境变量 - 最高优先级

---

## 变量命名规范

### NEXT_PUBLIC_ 前缀

带有 `NEXT_PUBLIC_` 前缀的变量会被打包到前端代码中：

```bash
# ✅ 可以在前端使用
NEXT_PUBLIC_SUPABASE_URL=xxx

# ❌ 只能在服务端使用
SUPABASE_SERVICE_ROLE_KEY=xxx
```

**安全提示**：永远不要在 `NEXT_PUBLIC_` 变量中存储敏感信息！

### 变量作用域

| 变量前缀 | 可见范围 | 示例 |
|----------|----------|------|
| `NEXT_PUBLIC_` | 前端 + 后端 | `NEXT_PUBLIC_APP_URL` |
| 无前缀 | 仅后端 | `SUPABASE_SERVICE_ROLE_KEY` |

---

## 不同环境的配置示例

### 本地开发

```bash
# .env.local
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000

# 使用 Supabase 测试项目
NEXT_PUBLIC_SUPABASE_URL=https://test-project.supabase.co

# 使用 Stripe 测试密钥
STRIPE_SECRET_KEY=sk_test_xxxxx
```

### 测试环境

```bash
# .env.staging
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://staging.vidfab.ai
NEXTAUTH_URL=https://staging.vidfab.ai

# 使用 Supabase 测试项目
NEXT_PUBLIC_SUPABASE_URL=https://staging-project.supabase.co

# 使用 Stripe 测试密钥
STRIPE_SECRET_KEY=sk_test_xxxxx
```

### 生产环境

```bash
# .env.production
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://vidfab.ai
NEXTAUTH_URL=https://vidfab.ai

# 使用 Supabase 生产项目
NEXT_PUBLIC_SUPABASE_URL=https://prod-project.supabase.co

# 使用 Stripe 生产密钥
STRIPE_SECRET_KEY=sk_live_xxxxx
```

---

## 安全检查清单

### ✅ 必须做的

- [ ] `.env*` 文件已添加到 `.gitignore`
- [ ] 生产环境使用强密钥（至少 32 字符）
- [ ] `NEXT_PUBLIC_` 变量不包含敏感信息
- [ ] 服务端密钥（如 `SUPABASE_SERVICE_ROLE_KEY`）不使用 `NEXT_PUBLIC_` 前缀
- [ ] 不同环境使用不同的密钥和数据库
- [ ] `.env` 文件权限设置为 600 (`chmod 600 .env`)

### ❌ 禁止做的

- [ ] 提交 `.env` 或 `.env.local` 到 Git
- [ ] 在代码中硬编码密钥
- [ ] 在前端代码中使用私有密钥
- [ ] 在日志中打印敏感信息
- [ ] 使用生产密钥进行本地开发

---

## 故障排查

### 问题：应用启动时提示变量未定义

**检查步骤**：
```bash
# 1. 确认文件存在
ls -la .env .env.local

# 2. 检查变量是否存在
grep "VARIABLE_NAME" .env.local

# 3. 检查变量格式（不要有引号）
# ✅ 正确
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ❌ 错误
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 问题：Docker 构建失败

**解决方案**：
```bash
# 确保 .env 文件存在且包含构建时需要的变量
cat .env

# 如果不存在，从 .env.local 提取
grep "^NEXT_PUBLIC_" .env.local > .env
grep "^NODE_ENV" .env.local >> .env
grep "^SUPABASE_SERVICE_ROLE_KEY" .env.local >> .env
```

### 问题：前端无法访问环境变量

**原因**：变量没有 `NEXT_PUBLIC_` 前缀

**解决方案**：
```bash
# ❌ 错误 - 前端无法访问
SUPABASE_URL=xxx

# ✅ 正确 - 前端可以访问
NEXT_PUBLIC_SUPABASE_URL=xxx
```

---

## 相关文档

- [部署指南](./deployment-guide.md)
- [Docker 修复总结](./docker-fixes-summary.md)
- [环境变量模板](../.env.example)

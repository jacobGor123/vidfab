# 邮箱验证码系统配置指南

本文档详细说明如何为VidFab项目配置生产就绪的邮箱验证码系统。

## 系统概述

VidFab的邮箱验证码系统具有以下特性：

- **基于Redis存储**：验证码存储在Redis中，支持Docker环境
- **多邮件服务提供商**：支持AWS SES、SendGrid、Resend、通用SMTP
- **完整的安全措施**：频率限制、IP限制、防暴力破解
- **生产就绪**：错误处理、日志记录、监控

## 快速开始

1. **确保Redis运行**：系统依赖Redis存储验证码
2. **配置邮件服务**：选择并配置一个邮件服务提供商
3. **设置环境变量**：在`.env.local`中添加相应配置
4. **测试功能**：使用API测试验证码发送和验证

## 支持的邮件服务提供商

### 1. AWS SES (推荐用于生产环境)

AWS SES是最经济可靠的选择，特别适合大规模邮件发送。

```bash
# AWS SES 配置
AWS_SES_SMTP_HOST=email-smtp.us-west-1.amazonaws.com
AWS_SES_SMTP_USERNAME=your_aws_access_key_id
AWS_SES_SMTP_PASSWORD=your_aws_secret_access_key
AWS_SES_FROM_EMAIL=noreply@yourdomain.com
AWS_SES_REPLY_TO_EMAIL=support@yourdomain.com

# 通用邮件配置（可选，覆盖默认值）
EMAIL_FROM_NAME=VidFab AI
EMAIL_FROM_ADDRESS=noreply@yourdomain.com
EMAIL_REPLY_TO=support@yourdomain.com
```

**配置步骤：**

1. 登录AWS控制台，进入SES服务
2. 验证发送域名或邮箱地址
3. 创建SMTP凭证
4. 如果在沙盒模式，申请生产访问权限
5. 设置发送限制和声誉监控

**费用：** 每1000封邮件$0.10，前62,000封免费（如果从EC2发送）

### 2. SendGrid

SendGrid提供强大的邮件API和分析功能。

```bash
# SendGrid 配置
SENDGRID_API_KEY=your_sendgrid_api_key

# 通用邮件配置
EMAIL_FROM_NAME=VidFab AI
EMAIL_FROM_ADDRESS=noreply@yourdomain.com
EMAIL_REPLY_TO=support@yourdomain.com
```

**配置步骤：**

1. 注册SendGrid账户
2. 创建API密钥（Mail Send权限）
3. 验证发送域名
4. 配置域名认证（SPF/DKIM）

**费用：** 免费计划每月100封，付费计划从$19.95/月开始

### 3. Resend

Resend是新兴的开发者友好邮件服务。

```bash
# Resend 配置
RESEND_API_KEY=your_resend_api_key

# 通用邮件配置
EMAIL_FROM_NAME=VidFab AI
EMAIL_FROM_ADDRESS=noreply@yourdomain.com
EMAIL_REPLY_TO=support@yourdomain.com
```

**配置步骤：**

1. 注册Resend账户
2. 创建API密钥
3. 添加并验证发送域名
4. 配置DNS记录

**费用：** 免费计划每月3,000封，付费计划从$20/月开始

### 4. 通用SMTP

支持任何SMTP服务器，包括Gmail、Outlook、自建邮件服务器等。

```bash
# SMTP 配置
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_app_password

# 通用邮件配置
EMAIL_FROM_NAME=VidFab AI
EMAIL_FROM_ADDRESS=your_email@gmail.com
EMAIL_REPLY_TO=your_email@gmail.com
```

**常见SMTP配置：**

- **Gmail**: smtp.gmail.com:587 (需要应用密码)
- **Outlook**: smtp-mail.outlook.com:587
- **Yahoo**: smtp.mail.yahoo.com:587

## Redis配置

系统依赖Redis存储验证码和频率限制数据。

```bash
# Redis 配置（Docker环境）
REDIS_URL=redis://redis:6379
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Redis 配置（本地环境）
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
```

## 完整的环境变量配置示例

```bash
# ===========================================
# VidFab AI - 邮箱验证码系统配置
# ===========================================

# Redis配置（必需）
REDIS_URL=redis://redis:6379
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_DB=0

# 邮件服务配置（选择其中一种）
# -------------------------------------------

# 选项1：AWS SES（推荐）
AWS_SES_SMTP_HOST=email-smtp.us-west-1.amazonaws.com
AWS_SES_SMTP_USERNAME=AKIAUGMXBDOHJKV5IL7Q
AWS_SES_SMTP_PASSWORD=BNrg58LuB4h8yOCIM22YcuszXL873G7r7mjpmpvo+x+5
AWS_SES_FROM_EMAIL=noreply@vidfab.ai
AWS_SES_REPLY_TO_EMAIL=support@vidfab.ai

# 选项2：SendGrid
# SENDGRID_API_KEY=your_sendgrid_api_key

# 选项3：Resend
# RESEND_API_KEY=your_resend_api_key

# 选项4：通用SMTP
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USERNAME=your_email@gmail.com
# SMTP_PASSWORD=your_app_password

# 通用邮件配置
EMAIL_FROM_NAME=VidFab AI
EMAIL_FROM_ADDRESS=noreply@vidfab.ai
EMAIL_REPLY_TO=support@vidfab.ai

# 应用配置
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 系统安全特性

### 频率限制

- **发送限制**：每个邮箱4分钟内只能发送一次验证码
- **验证限制**：每个IP 15分钟内最多10次验证尝试
- **每日限制**：每个邮箱每天最多20个验证码

### 验证码安全

- **6位随机数字**：使用加密安全的随机数生成
- **5分钟有效期**：验证码自动过期
- **单次使用**：验证成功后立即删除
- **尝试限制**：每个验证码最多3次尝试

### 反滥用机制

- **IP黑名单**：异常IP自动加入黑名单
- **邮箱黑名单**：滥用邮箱自动封禁24小时
- **速度检测**：异常请求频率自动封禁

## API使用方法

### 发送验证码

```bash
POST /api/auth/send-verification-code
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**成功响应：**
```json
{
  "success": true,
  "message": "Verification code sent successfully",
  "expires_in": 300,
  "email_sent": true,
  "provider": "aws-ses"
}
```

**错误响应：**
```json
{
  "success": false,
  "error": "Please wait 3 minute(s) before requesting another code"
}
```

### 验证验证码

```bash
POST /api/auth/verify-code-login
Content-Type: application/json

{
  "email": "user@example.com",
  "code": "123456"
}
```

**成功响应：**
```json
{
  "success": true,
  "message": "Email verified successfully",
  "verified_token": "verified-abc123...",
  "email": "user@example.com",
  "verified_at": "2024-01-01T00:00:00.000Z"
}
```

**错误响应：**
```json
{
  "success": false,
  "error": "Invalid verification code. 2 attempt(s) remaining.",
  "remaining_attempts": 2
}
```

## Docker环境部署

确保docker-compose.yml包含Redis服务：

```yaml
services:
  app:
    build: .
    environment:
      - REDIS_URL=redis://redis:6379
      - AWS_SES_SMTP_USERNAME=${AWS_SES_SMTP_USERNAME}
      - AWS_SES_SMTP_PASSWORD=${AWS_SES_SMTP_PASSWORD}
      - AWS_SES_FROM_EMAIL=${AWS_SES_FROM_EMAIL}
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

## 监控和故障排除

### 日志监控

系统提供详细的日志输出：

```bash
# 查看应用日志
docker-compose logs app

# 查看Redis日志
docker-compose logs redis

# 实时监控
docker-compose logs -f app
```

### 健康检查

```bash
# 检查Redis连接
curl http://localhost:3000/api/health

# 测试邮件服务（可通过代码实现）
# 系统会在启动时自动检测邮件服务配置
```

### 常见问题

1. **Redis连接失败**
   - 检查Redis服务是否运行
   - 确认REDIS_URL配置正确
   - 检查网络连接

2. **邮件发送失败**
   - 验证邮件服务凭证
   - 检查发送域名是否已验证
   - 确认邮箱地址格式正确

3. **频率限制过于严格**
   - 检查Redis中的限制数据
   - 可通过代码调整限制参数
   - 重启应用清除内存限制

## 生产环境建议

1. **使用AWS SES或SendGrid**：比免费SMTP更可靠
2. **设置域名验证**：提高邮件送达率
3. **监控发送量**：避免触发服务商限制
4. **定期备份Redis**：保护用户验证状态
5. **设置告警**：监控系统异常和滥用

## 成本估算

**AWS SES + Redis**：
- 每月10,000封邮件：约$1
- Redis Cloud 30MB：免费
- 总计：约$1/月

**SendGrid**：
- 每月10,000封邮件：$19.95
- Redis Cloud 30MB：免费
- 总计：约$20/月

**建议**：对于小规模应用使用AWS SES，大规模应用可考虑SendGrid的高级功能。
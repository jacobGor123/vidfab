# Docker 环境下 Node-Cron 定时任务部署指南

## 📋 概述

本项目使用 `node-cron` 实现博客文章的自动化生成和发布。定时任务在 Docker 容器内运行,无需外部 cron 或调度服务。

## ✅ 已完成的配置

### 1. Next.js Instrumentation Hook

**文件**: `instrumentation.ts`
```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initBlogSystem } = await import('./lib/blog/init')
    initBlogSystem() // 启动定时任务
  }
}
```

**配置**: `next.config.mjs`
```javascript
experimental: {
  instrumentationHook: true, // 启用 instrumentation
}
```

### 2. Dockerfile 时区配置

**文件**: `Dockerfile` (第 47-53 行)
```dockerfile
# Install tzdata for timezone support
RUN apk add --no-cache curl ffmpeg tzdata

# Set timezone to Asia/Shanghai (Beijing Time)
ENV TZ=Asia/Shanghai
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone
```

### 3. Cron 任务配置

**文件**: `lib/blog/cron-service.ts`
```typescript
// 每天早上 10:00 (北京时间) 自动生成和发布文章
autoGenerateTask = cron.schedule('0 10 * * *', async () => {
  await autoGenerateAndPublishArticle()
}, {
  timezone: 'Asia/Shanghai'
})
```

## 🚀 部署流程

### 方式 1: Docker Compose 部署 (推荐)

```bash
# 1. 确保 .env 文件存在并包含所有必需的环境变量
cp .env.local .env

# 2. 构建并启动容器
docker-compose up -d --build

# 3. 查看日志确认定时任务已启动
docker-compose logs -f app | grep "定时任务"
```

**预期输出**:
```
🚀 启动博客定时任务...
✅ 定时任务已启动:
  → 自动生成文章: 每天 10:00 Asia/Shanghai (北京时间)
```

### 方式 2: 直接使用 Docker

```bash
# 1. 构建镜像
docker build -t vidfab-app .

# 2. 运行容器
docker run -d \
  --name vidfab-app \
  --env-file .env \
  -p 3000:3000 \
  --restart unless-stopped \
  vidfab-app

# 3. 查看日志
docker logs -f vidfab-app | grep "定时任务"
```

## ⏰ 定时任务执行时间

| 时区 | Cron 表达式 | 执行时间 |
|------|------------|---------|
| Asia/Shanghai | `0 10 * * *` | 每天 10:00 AM |

## 🔍 验证定时任务运行状态

### 1. 检查容器日志

```bash
# Docker Compose
docker-compose logs -f app

# Docker
docker logs -f vidfab-app
```

**查找关键日志**:
- `🚀 启动博客定时任务...` - 任务已注册
- `⏰ 定时任务触发: 自动生成文章` - 定时任务执行
- `🎉 AI 自动生成文章任务完成!` - 任务成功

### 2. 检查容器时区

```bash
docker exec -it vidfab-app date
# 应该显示: Wed Dec  4 10:00:00 CST 2025
```

### 3. 手动触发测试 (不等待定时)

```bash
# 进入容器
docker exec -it vidfab-app sh

# 手动运行测试脚本
cd /app
npm run tsx scripts/blog/test-auto-generate.ts --auto
```

## 📊 监控和日志

### 1. 实时监控日志

```bash
# 只显示定时任务相关日志
docker-compose logs -f app | grep -E "定时|自动生成|选题|发布"
```

### 2. 日志持久化

Docker Compose 已配置日志挂载:
```yaml
volumes:
  - ./logs:/app/logs  # 宿主机 logs/ 目录
```

### 3. 健康检查

```bash
# 查看容器健康状态
docker-compose ps

# 手动健康检查
curl http://localhost:3000/api/health
```

## 🐛 常见问题排查

### 问题 1: 定时任务未启动

**症状**: 日志中没有 `🚀 启动博客定时任务...`

**排查步骤**:
```bash
# 1. 检查 instrumentation.ts 是否被执行
docker logs vidfab-app | grep "instrumentation\|初始化"

# 2. 检查 Next.js 配置
docker exec -it vidfab-app cat /app/next.config.mjs | grep instrumentationHook

# 3. 重启容器
docker-compose restart app
```

### 问题 2: 时区不正确

**症状**: 定时任务在错误的时间执行

**解决方案**:
```bash
# 1. 验证容器时区
docker exec -it vidfab-app date

# 2. 如果不是 CST (China Standard Time),重新构建
docker-compose down
docker-compose up -d --build
```

### 问题 3: 定时任务执行但失败

**症状**: 日志显示 `❌ AI 自动生成文章任务失败`

**排查步骤**:
```bash
# 1. 查看完整错误信息
docker logs vidfab-app | grep -A 20 "任务失败"

# 2. 检查环境变量
docker exec -it vidfab-app env | grep -E "ANTHROPIC|SUPABASE|WAVESPEED"

# 3. 手动测试 API 连接
docker exec -it vidfab-app npm run tsx scripts/blog/test-query-published.ts
```

## 🔧 高级配置

### 1. 自定义执行时间

修改 `lib/blog/cron-service.ts`:
```typescript
// 每天 14:30 执行
autoGenerateTask = cron.schedule('30 14 * * *', ...)

// 每周一、三、五 10:00 执行
autoGenerateTask = cron.schedule('0 10 * * 1,3,5', ...)

// 每小时执行一次
autoGenerateTask = cron.schedule('0 * * * *', ...)
```

### 2. 多个定时任务

在 `lib/blog/cron-service.ts` 中添加:
```typescript
let publishScheduledTask: cron.ScheduledTask | null = null

export function startBlogCronJobs() {
  // 任务1: 自动生成文章 (每天 10:00)
  autoGenerateTask = cron.schedule('0 10 * * *', ...)

  // 任务2: 发布预定文章 (每小时)
  publishScheduledTask = cron.schedule('0 * * * *', async () => {
    // 发布预定文章的逻辑
  })
}
```

### 3. 禁用定时任务

通过环境变量控制:

**方法 1**: 修改 `lib/blog/init.ts`
```typescript
export function initBlogSystem() {
  if (process.env.DISABLE_BLOG_CRON === 'true') {
    console.log('⚠️  博客定时任务已禁用')
    return
  }
  startBlogCronJobs()
}
```

**方法 2**: 在 `.env` 中添加
```bash
DISABLE_BLOG_CRON=true
```

## 📝 部署清单

部署前确认:

- [x] `instrumentation.ts` 已创建并配置
- [x] `next.config.mjs` 启用了 `instrumentationHook`
- [x] `Dockerfile` 安装了 `tzdata` 并设置了时区
- [x] `lib/blog/cron-service.ts` 配置了正确的 cron 表达式
- [x] `.env` 文件包含所有必需的 API 密钥
- [x] `docker-compose.yml` 配置了日志挂载

## 🎯 验收测试

部署后执行以下测试:

```bash
# 1. 检查容器状态
docker-compose ps
# 预期: vidfab-app 显示 "Up" 状态

# 2. 检查定时任务启动日志
docker-compose logs app | grep "定时任务已启动"
# 预期: 显示 "✅ 定时任务已启动"

# 3. 检查时区
docker exec -it vidfab-app date
# 预期: 显示北京时间 (CST)

# 4. 手动触发测试
docker exec -it vidfab-app npm run tsx scripts/blog/test-auto-generate.ts --auto
# 预期: 生成并发布一篇文章

# 5. 等待第二天 10:00 AM 验证自动执行
docker-compose logs -f app | grep "定时任务触发"
```

## 🔒 安全建议

1. **API 密钥保护**: 确保 `.env` 文件不提交到 Git
2. **容器权限**: 使用非 root 用户运行 (Dockerfile 已配置)
3. **网络隔离**: 生产环境使用 Docker 网络隔离
4. **日志脱敏**: 不要在日志中输出敏感信息

## 📚 相关文件

- `instrumentation.ts` - Next.js 启动钩子
- `lib/blog/init.ts` - 博客系统初始化
- `lib/blog/cron-service.ts` - Cron 任务定义
- `Dockerfile` - 容器构建配置
- `docker-compose.yml` - 容器编排配置

## 💡 最佳实践

1. **日志监控**: 定期检查日志,确保任务正常执行
2. **错误告警**: 配置失败通知 (邮件/Slack/钉钉)
3. **性能监控**: 监控任务执行时间和资源消耗
4. **备份策略**: 定期备份数据库和生成的内容
5. **灰度发布**: 先在测试环境验证,再部署到生产

## 🔄 更新部署

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 重新构建并部署
docker-compose down
docker-compose up -d --build

# 3. 验证定时任务
docker-compose logs -f app | grep "定时任务"
```

---

**文档版本**: 1.0
**最后更新**: 2025-12-04
**维护者**: VidFab 团队

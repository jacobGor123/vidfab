# 分镜图 502 错误诊断与修复

## 问题现象

线上环境生成分镜图后，图片一直显示 502 错误。

## 根本原因

分镜图下载依赖 BullMQ Worker，但 Worker 可能未运行或任务处理失败。

## 架构说明

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Vercel    │─────▶│ Upstash Redis│◀─────│  Railway    │
│  (Next.js)  │      │   (Queue)    │      │  (Worker)   │
└─────────────┘      └──────────────┘      └─────────────┘
      │                                            │
      │ 1. 生成分镜图 → 入队下载任务                │
      │                                            │
      └──────────────────────────────────────────┘
         2. Worker 从队列中取任务 → 下载图片到 CDN
```

## 诊断步骤

### 1. 检查 Vercel 环境变量

访问 Vercel 项目设置 → Environment Variables，确认：

- ✅ `ENABLE_QUEUE=true`（启用队列系统）
- ✅ `UPSTASH_REDIS_REST_URL`（Redis REST API URL）
- ✅ `UPSTASH_REDIS_REST_TOKEN`（Redis REST API Token）
- ✅ `REDIS_URL` 或 `UPSTASH_REDIS_URL`（Redis Protocol URL for BullMQ）

### 2. 检查 Railway Worker 状态

访问 Railway 项目面板：

1. **检查服务是否运行**
   - 查看 Deployments 是否成功
   - 查看 Metrics 中的 CPU/Memory 使用率（如果为 0 说明未运行）

2. **查看日志**
   ```
   Railway Dashboard → Deployments → Logs
   ```

   正常日志应该包含：
   ```
   ✅ BullMQ Worker connected to Redis
   🔄 Listening for jobs on queue: video-agent
   📥 Processing job: storyboard_download_batch_xxx
   ```

3. **常见错误**
   - `ECONNREFUSED` → Redis 连接失败，检查 `REDIS_URL`
   - `Authentication failed` → Redis Token 错误
   - `Job failed: fetch failed` → BytePlus API 错误（见下一节）

### 3. 检查 Railway 环境变量

确认以下环境变量已配置：

- ✅ `REDIS_URL`（与 Vercel 相同的 Upstash Redis URL）
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`
- ✅ `CLOUDINARY_CLOUD_NAME`
- ✅ `CLOUDINARY_API_KEY`
- ✅ `CLOUDINARY_API_SECRET`

### 4. 手动测试下载任务

在 Railway 日志中查找 BytePlus URL 错误：

```
[ProxyImage] Upstream failed: {
  status: 403,  // 签名错误
  status: 404,  // 文件不存在
  status: 401,  // 未授权
}
```

如果看到这些错误，说明 BytePlus API 本身有问题。

### 5. 测试队列连接

在本地运行以下测试脚本：

```bash
# 1. 确保环境变量加载
source .env.local

# 2. 启动 Worker
pnpm worker

# 3. 观察日志
# 应该看到 "✅ BullMQ Worker connected to Redis"
```

## 快速修复方案

### 方案 A：重启 Railway Worker

1. Railway Dashboard → 选择 Worker 服务
2. 点击 "Redeploy"
3. 等待 1-2 分钟
4. 查看日志确认启动成功

### 方案 B：手动触发下载（临时方案）

访问以下 URL 手动触发下载 cron：

```
https://your-domain.vercel.app/api/cron/download-pending-storyboards
Authorization: Bearer <CRON_SECRET>
```

或使用 curl：

```bash
curl -X GET "https://your-domain.vercel.app/api/cron/download-pending-storyboards" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### 方案 C：降级为同步生成（不推荐）

如果无法修复 Worker，可以临时禁用队列：

1. Vercel 环境变量设置 `ENABLE_QUEUE=false`
2. 重新部署
3. 分镜图将在 API 响应时同步生成（但可能超时）

## 长期优化建议

### 1. 添加健康检查端点

创建 `/api/health/worker` 端点：

```typescript
// app/api/health/worker/route.ts
export async function GET() {
  const { videoQueueManager } = await import('@/lib/queue/queue-manager')

  const stats = await videoQueueManager.getQueueStats()

  return Response.json({
    healthy: stats.waiting < 100,
    stats
  })
}
```

### 2. 添加 Worker 监控告警

在 Railway 中配置：
- CPU 使用率告警
- 内存使用率告警
- 进程崩溃告警

### 3. 改进错误提示

在前端显示更友好的错误信息：
- "Storyboard is being processed, please refresh in a few minutes"
- "Download failed, click to retry"

## 验证修复

1. 生成新的分镜图
2. 查看 Railway 日志，确认任务被处理
3. 等待 10-30 秒，刷新页面
4. 分镜图应该从 CDN 加载（不再经过代理）

## 问题排查日志

记录本次问题的排查过程：

- [ ] Vercel `ENABLE_QUEUE` 环境变量
- [ ] Railway Worker 部署状态
- [ ] Railway Worker 日志
- [ ] Upstash Redis 连接状态
- [ ] BytePlus API 返回的错误码
- [ ] Cloudinary 配置

---

**创建时间**：2026-02-09
**最后更新**：2026-02-09

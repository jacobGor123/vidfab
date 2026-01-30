# Railway 线上环境部署清单

## 🚀 部署健康检查到 Railway

### 第一步：推送代码到 Git

```bash
# 1. 查看修改的文件
git status

# 应该看到：
# modified:   worker/queue-worker.ts
# new file:   lib/services/video-agent/job-health-checker.ts
# new file:   app/api/video-agent/admin/reset-stuck-job/route.ts

# 2. 提交更改
git add worker/queue-worker.ts
git add lib/services/video-agent/job-health-checker.ts
git add app/api/video-agent/admin/reset-stuck-job/route.ts

git commit -m "feat: add job health checker and auto-recovery for zombie tasks

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# 3. 推送到远程仓库
git push origin main
```

### 第二步：Railway 自动部署

Railway 检测到 Git 推送后会自动：
1. ✅ 拉取最新代码
2. ✅ 运行 `pnpm install`
3. ✅ 重启 Worker 进程
4. ✅ 健康检查守护进程自动启动

### 第三步：验证部署成功

#### 3.1 查看 Railway 日志

登录 Railway Dashboard → 选择 Worker 服务 → 查看 Logs

**预期输出**：
```
🚀 Starting VidFab BullMQ Worker...
Environment: production
[HealthCheck] 🚀 Starting health check daemon (every 5 minutes)...
[HealthCheck] 🏥 Starting job health check...
[HealthCheck] ✅ No zombie jobs found
✅ Worker started successfully
Waiting for jobs...
```

✅ 如果看到 `[HealthCheck]` 日志，说明健康检查已启动

#### 3.2 验证 Worker 运行状态

在 Railway Dashboard 查看：
- **Status**: `Active` ✅
- **Restarts**: 数字应该较小（< 10）
- **Memory**: < 512MB

#### 3.3 测试管理员 API（可选）

```bash
# 测试重置卡住的任务
curl -X POST https://your-domain.com/api/video-agent/admin/reset-stuck-job \
  -H "Content-Type: application/json" \
  -d '{"projectId": "56479fd4-c0e8-435d-a535-814d3d11a4bb"}'
```

**预期响应**：
```json
{
  "success": true,
  "data": {
    "projectId": "56479fd4-c0e8-435d-a535-814d3d11a4bb",
    "message": "Project reset to failed state. User can retry composition.",
    "previousStatus": {
      "status": "processing",
      "step_6_status": "processing"
    },
    "newStatus": {
      "status": "failed",
      "step_6_status": "failed"
    }
  }
}
```

---

## 🛠️ Railway 特定配置（已完成）

### `railway.json` 配置

```json
{
  "deploy": {
    "startCommand": "pnpm worker",
    "restartPolicyType": "ON_FAILURE",  // ✅ 失败时自动重启
    "restartPolicyMaxRetries": 10       // ✅ 最多重启10次
  }
}
```

**说明**：
- Railway 会在 Worker 崩溃时自动重启（最多10次）
- 如果 10 次重启都失败，Worker 会停止（需要手动重启）
- 健康检查守护进程会在 Worker 启动时自动运行

### 环境变量检查

确保 Railway 环境变量已设置：

| 变量名 | 说明 | 必需 |
|--------|------|------|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 管理员密钥 | ✅ |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL | ✅ |
| `SHOTSTACK_API_KEY` | Shotstack API 密钥 | ✅ |
| `REDIS_HOST` / `UPSTASH_REDIS_URL` | Redis 连接信息 | ✅ |
| `NODE_ENV` | 设置为 `production` | ✅ |

**检查方法**：
Railway Dashboard → 选择 Worker 服务 → Variables

---

## 📊 监控和维护

### 1. 查看健康检查日志

```bash
# Railway CLI（如果已安装）
railway logs --service worker

# 或在 Railway Dashboard 查看
```

**关键日志**：
```
[HealthCheck] 🏥 Starting job health check...
[HealthCheck] ✅ No zombie jobs found

# 如果发现僵尸任务
[HealthCheck] ⚠️ Found 1 zombie job(s):
  - 56479fd4-c0e8-435d-a535-814d3d11a4bb (stuck for 25 minutes)
[HealthCheck] 🔧 Recovering zombie job: 56479fd4-c0e8-435d-a535-814d3d11a4bb
[HealthCheck] ✅ Zombie job marked as failed (user can retry)
```

### 2. Worker 崩溃告警

**Railway 内置告警**：
- Railway Dashboard → Settings → Notifications
- 配置 Email/Slack 通知

**推荐告警**：
- ✅ Deployment Failed
- ✅ Service Crashed
- ✅ High Memory Usage

### 3. 手动重启 Worker

**方法1：Railway Dashboard**
- 选择 Worker 服务 → Settings → Restart

**方法2：Railway CLI**
```bash
railway service restart worker
```

---

## 🚨 紧急修复卡住的任务

### 立即修复（当前卡住的项目）

```bash
# 使用管理员 API 重置
curl -X POST https://your-domain.com/api/video-agent/admin/reset-stuck-job \
  -H "Content-Type: application/json" \
  -d '{"projectId": "56479fd4-c0e8-435d-a535-814d3d11a4bb"}'
```

然后刷新前端页面，点击"Retry Composition"重新触发合成。

---

## 🎯 部署后效果

| 场景 | 恢复时间 | 机制 |
|------|---------|------|
| Worker 崩溃 | **< 30 秒** | Railway 自动重启 |
| 僵尸任务（数据库卡住） | **5 分钟** | 健康检查自动恢复 |
| 用户感知超时 | **20 分钟** | 前端超时提示 + 重试按钮 |

---

## ✅ 部署验证清单

- [ ] 代码已推送到 Git 仓库
- [ ] Railway 自动部署成功（查看 Deployments）
- [ ] Worker 日志显示健康检查启动
- [ ] 环境变量检查完成
- [ ] 管理员 API 测试成功（可选）
- [ ] 前端超时提示已部署（刷新前端验证）

---

## 🔗 相关资源

- [Railway 官方文档](https://docs.railway.app/)
- [Railway CLI 安装](https://docs.railway.app/develop/cli)
- [治根方案完整文档](./video-agent-reliability-solution.md)

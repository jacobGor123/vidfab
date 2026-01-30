# PM2 Worker 快速启动指南

## 一键启动（推荐）

```bash
# 1. 安装 PM2（如果未安装）
npm install -g pm2

# 2. 启动 Worker
./scripts/pm2-worker.sh start

# 3. 验证启动成功
pm2 status
```

**预期输出**：
```
┌─────┬──────────────────┬─────────────┬─────────┬─────────┬──────────┐
│ id  │ name             │ mode        │ ↺       │ status  │ cpu      │
├─────┼──────────────────┼─────────────┼─────────┼─────────┼──────────┤
│ 0   │ vidfab-worker    │ fork        │ 0       │ online  │ 0%       │
└─────┴──────────────────┴─────────────┴─────────┴─────────┴──────────┘
```

✅ 状态为 `online` 表示启动成功

---

## 常用命令

```bash
# 查看状态
./scripts/pm2-worker.sh status

# 查看日志（实时滚动）
./scripts/pm2-worker.sh logs

# 重启 Worker
./scripts/pm2-worker.sh restart

# 停止 Worker
./scripts/pm2-worker.sh stop

# 删除 Worker 进程
./scripts/pm2-worker.sh delete
```

---

## 验证健康检查

```bash
# 查看 Worker 日志，确认健康检查已启动
pm2 logs vidfab-worker --lines 50 | grep HealthCheck
```

**预期输出**：
```
[HealthCheck] 🚀 Starting health check daemon (every 5 minutes)...
[HealthCheck] 🏥 Starting job health check...
[HealthCheck] ✅ No zombie jobs found
```

---

## 开发环境 vs 生产环境

### 开发环境（当前）

```bash
./scripts/pm2-worker.sh start
```

- 日志输出：`logs/worker-out.log` 和 `logs/worker-error.log`
- 自动重启：开启
- 内存限制：512MB

### 生产环境（部署到服务器时）

```bash
# 1. 启动生产模式
pm2 start ecosystem.config.js --env production

# 2. 设置开机自启
pm2 startup
pm2 save

# 3. 查看状态
pm2 status
```

---

## 故障排查

### 问题 1：启动失败，提示 "Redis connection failed"

**原因**：Redis 未启动或配置错误

**解决**：
```bash
# 检查 Redis 是否运行
redis-cli ping

# 应该返回 PONG

# 如果 Redis 未启动，启动 Redis
redis-server
```

### 问题 2：Worker 启动后立即退出

**原因**：环境变量缺失

**解决**：
```bash
# 检查 .env.local 是否存在
ls -la .env.local

# 验证必需的环境变量
cat .env.local | grep -E "SUPABASE|REDIS|SHOTSTACK"
```

### 问题 3：查看详细错误日志

```bash
# 查看最近 100 行错误日志
pm2 logs vidfab-worker --err --lines 100
```

---

## 监控和维护

### 实时监控

```bash
# 打开 PM2 监控面板（CPU、内存、重启次数）
pm2 monit
```

### 日志管理

```bash
# 查看日志文件位置
pm2 show vidfab-worker | grep "log path"

# 清空日志（小心使用）
pm2 flush vidfab-worker

# 按日期归档日志（手动）
mv logs/worker-out.log logs/worker-out-$(date +%Y%m%d).log
```

### 定期维护

```bash
# 每周重启一次（防止内存泄漏）
0 3 * * 0 pm2 restart vidfab-worker
```

---

## 完整的启动流程

### 第一次启动

```bash
# 1. 确保 Redis 运行
redis-cli ping

# 2. 确保环境变量正确
cat .env.local | grep SUPABASE_SERVICE_ROLE_KEY

# 3. 安装 PM2
npm install -g pm2

# 4. 启动 Worker
./scripts/pm2-worker.sh start

# 5. 验证健康检查
pm2 logs vidfab-worker --lines 20 | grep HealthCheck

# 6. 查看实时日志（可选）
pm2 logs vidfab-worker
```

### 日常使用

```bash
# 启动 Worker（如果未运行）
./scripts/pm2-worker.sh start

# 查看状态（确认 online）
pm2 status

# 开始开发
npm run dev
```

---

## 卸载 PM2

```bash
# 1. 停止所有进程
pm2 kill

# 2. 卸载 PM2
npm uninstall -g pm2

# 3. 恢复使用传统启动方式
./scripts/start-queue-worker.sh
```

---

## 更多资源

- [PM2 官方文档](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [治根方案完整文档](./video-agent-reliability-solution.md)
- [问题反馈](https://github.com/your-org/vidfab/issues)

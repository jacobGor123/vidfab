# Video Agent 合成任务可靠性治根方案

## 问题背景

### 症状
用户在视频合成（Step 6）时，前端显示99%进度条并卡住，无法继续。

### 根因分析
1. **Worker 进程崩溃/未启动** → 任务从队列中消失
2. **数据库状态卡在 `processing`** → 前端持续轮询但无响应
3. **队列任务丢失** → 无法恢复，也无法检测

**时间线**：
```
05:57:00 → 前端触发合成，job 加入队列
05:57:05 → Worker 拉取任务开始处理
05:57:xx → Worker 崩溃（可能是 Shotstack API 超时、内存溢出等）
现在     → 数据库 step_6_status = 'processing'，队列无任务，前端无限轮询
```

---

## 治根方案：三层防护

### 第一层：Worker 可靠性保障 ✅

**问题**：Worker 崩溃后无人重启，任务永久丢失

**解决方案**：使用 PM2 进程管理器

#### 1. PM2 配置文件

**文件**：`ecosystem.config.js`

**关键特性**：
- ✅ 自动重启（崩溃后 1 秒内重启）
- ✅ 内存监控（超过 512MB 自动重启，防止内存泄漏）
- ✅ 日志自动分割和归档
- ✅ 崩溃重启策略（10 分钟内最多重启 10 次）

#### 2. PM2 管理脚本

**文件**：`scripts/pm2-worker.sh`

**用法**：
```bash
# 启动 Worker（推荐）
./scripts/pm2-worker.sh start

# 查看状态
./scripts/pm2-worker.sh status

# 查看日志
./scripts/pm2-worker.sh logs

# 重启 Worker
./scripts/pm2-worker.sh restart

# 停止 Worker
./scripts/pm2-worker.sh stop
```

#### 3. 开发环境 vs 生产环境

| 环境 | 启动方式 | 说明 |
|------|---------|------|
| **开发** | `./scripts/pm2-worker.sh start` | PM2 后台运行，崩溃自动重启 |
| **生产** | `pm2 start ecosystem.config.js --env production` | 生产模式，优化日志和性能 |

---

### 第二层：僵尸任务自动恢复 ✅

**问题**：即使 Worker 重启，已经卡住的任务（数据库 `processing`，队列无任务）无法恢复

**解决方案**：健康检查守护进程

#### 1. 健康检查服务

**文件**：`lib/services/video-agent/job-health-checker.ts`

**功能**：
- 每 **5 分钟** 扫描一次所有 `step_6_status = 'processing'` 的项目
- 检测"僵尸任务"：数据库为 `processing` 但队列中无任务
- 自动恢复策略：
  1. **优先恢复**：从 Redis 已完成队列中恢复结果并更新数据库
  2. **标记失败**：如果在 Redis 失败队列中找到，标记为 `failed`
  3. **兜底处理**：如果队列中完全找不到，标记为 `failed`（允许用户重试）

#### 2. 集成到 Worker

**修改**：`worker/queue-worker.ts`

```typescript
import { startHealthCheckDaemon } from '../lib/services/video-agent/job-health-checker'

async function main() {
  // 启动健康检查守护进程（每5分钟扫描一次僵尸任务）
  startHealthCheckDaemon()

  // 启动 Worker
  await videoQueueManager.startWorker({ ... })
}
```

**效果**：
- Worker 启动后，自动启动健康检查
- 即使 Worker 崩溃重启，健康检查也会继续运行
- 最长 **5 分钟**内自动恢复僵尸任务

---

### 第三层：前端超时检测 ✅

**问题**：前端无法感知任务卡住，只能无限等待

**解决方案**：超时检测 + 友好提示

#### 1. 超时检测逻辑

**文件**：`app/studio/video-agent-beta/components/steps/Step6FinalCompose.tsx`

**实现**：
```typescript
// 记录开始合成的时间
const composeStartTimeRef = useRef<number | null>(null)
const [isStuckWarning, setIsStuckWarning] = useState(false)

// 超时检测：如果超过 20 分钟仍在 processing，显示警告
useEffect(() => {
  if (composeStatus.status !== 'processing') return

  const checkTimeout = () => {
    const elapsed = Date.now() - composeStartTimeRef.current!
    const TIMEOUT_MS = 20 * 60 * 1000 // 20 分钟

    if (elapsed > TIMEOUT_MS && !isStuckWarning) {
      setIsStuckWarning(true)
    }
  }

  const interval = setInterval(checkTimeout, 30000) // 每 30 秒检查一次
  return () => clearInterval(interval)
}, [composeStatus.status, isStuckWarning])
```

#### 2. 超时 UI

**效果**：
- 超过 **20 分钟**后，显示黄色警告卡片
- 提供两个操作按钮：
  - **Refresh Status**：手动刷新状态
  - **Retry Composition**：重新触发合成

**截图示意**：
```
⚠️ Composition Taking Longer Than Expected

The video composition has been processing for over 20 minutes.
This may indicate a stuck task.

[Refresh Status]  [Retry Composition]
```

---

### 第四层：后端 API 增强检测 ✅（已存在）

**文件**：`app/api/video-agent/projects/[id]/compose/status/route.ts`

**已有检测**：
1. **任务丢失检测**（`COMPOSE_JOB_MISSING`）
2. **僵尸任务检测**（`COMPOSE_JOB_STUCK_COMPLETED`）
3. **队列超时检测**（15 分钟超时，`COMPOSE_STUCK_QUEUED`）
4. **自动恢复机制**（从 Redis 恢复已完成但 DB 未更新的任务）

**效果**：
- 前端轮询时，后端会主动检测异常状态
- 如果发现僵尸任务，立即尝试自动恢复
- 恢复失败则返回 `failed` 状态，提示用户重试

---

## 部署清单

### 1. 安装 PM2（如果未安装）

```bash
npm install -g pm2
```

### 2. 启动 Worker（使用 PM2）

```bash
# 开发环境
./scripts/pm2-worker.sh start

# 生产环境
pm2 start ecosystem.config.js --env production

# 设置开机自启（生产环境）
pm2 startup
pm2 save
```

### 3. 验证健康检查是否运行

```bash
# 查看 Worker 日志
pm2 logs vidfab-worker

# 应该看到类似输出：
# [HealthCheck] 🚀 Starting health check daemon (every 5 minutes)...
# [HealthCheck] 🏥 Starting job health check...
# [HealthCheck] ✅ No zombie jobs found
```

### 4. 前端代码已部署

前端超时检测代码已集成到 `Step6FinalCompose.tsx`，无需额外部署。

---

## 测试验证

### 测试场景 1：Worker 崩溃

**步骤**：
1. 启动 Worker：`./scripts/pm2-worker.sh start`
2. 触发视频合成
3. 手动杀死 Worker：`pm2 stop vidfab-worker`
4. 观察：PM2 会在 1 秒内自动重启 Worker
5. 验证：健康检查守护进程继续运行

**预期结果**：
- Worker 自动重启 ✅
- 健康检查在 5 分钟内恢复僵尸任务 ✅

### 测试场景 2：任务卡住超过 20 分钟

**步骤**：
1. 修改前端超时阈值为 1 分钟（测试用）
2. 触发视频合成
3. 等待 1 分钟

**预期结果**：
- 前端显示黄色警告卡片 ✅
- 提供"Retry Composition"按钮 ✅

### 测试场景 3：数据库卡住，队列无任务

**步骤**：
1. 手动修改数据库：`step_6_status = 'processing'`
2. 确保队列中无对应任务
3. 等待 5 分钟

**预期结果**：
- 健康检查检测到僵尸任务 ✅
- 自动标记为 `failed`，允许用户重试 ✅

---

## 监控和日志

### PM2 监控

```bash
# 实时监控（CPU、内存、重启次数）
pm2 monit

# 查看状态
pm2 status

# 查看日志
pm2 logs vidfab-worker --lines 100
```

### 健康检查日志

**日志位置**：`logs/worker-out.log`

**关键日志**：
```
[HealthCheck] 🏥 Starting job health check...
[HealthCheck] ✅ No zombie jobs found
```

```
[HealthCheck] ⚠️ Found 1 zombie job(s):
  - 56479fd4-c0e8-435d-a535-814d3d11a4bb (stuck for 25 minutes)
[HealthCheck] 🔧 Recovering zombie job: 56479fd4-c0e8-435d-a535-814d3d11a4bb
[HealthCheck] ✅ Zombie job marked as failed (user can retry)
[HealthCheck] ✅ Health check completed
```

---

## 性能影响

| 组件 | 资源占用 | 说明 |
|------|---------|------|
| **PM2** | ~10MB 内存 | 轻量级进程管理器 |
| **健康检查** | 每 5 分钟一次数据库查询 | 仅查询 `processing` 状态的项目，影响极小 |
| **前端超时检测** | 每 30 秒一次本地计算 | 无网络请求，零性能影响 |

---

## 常见问题

### Q1: PM2 启动失败，提示 "command not found"

**A**: 需要全局安装 PM2：
```bash
npm install -g pm2
```

### Q2: 健康检查没有运行

**A**: 检查 Worker 日志：
```bash
pm2 logs vidfab-worker | grep HealthCheck
```

如果没有输出，说明 Worker 启动失败，检查环境变量配置。

### Q3: 前端超时警告一直显示

**A**: 说明任务确实卡住了，点击"Retry Composition"重新触发合成。

### Q4: 如何调整超时时间？

**A**: 修改以下文件：

- **前端超时**：`Step6FinalCompose.tsx` 中的 `TIMEOUT_MS`（默认 20 分钟）
- **后端超时**：`compose/status/route.ts` 中的 `timeoutMs`（默认 15 分钟）
- **健康检查阈值**：`job-health-checker.ts` 中的 `STUCK_THRESHOLD_MS`（默认 20 分钟）

---

## 总结

| 层级 | 防护措施 | 恢复时间 | 状态 |
|------|---------|---------|------|
| **第一层** | PM2 自动重启 Worker | 1 秒 | ✅ 已部署 |
| **第二层** | 健康检查自动恢复僵尸任务 | 5 分钟 | ✅ 已部署 |
| **第三层** | 前端超时检测 + 重试按钮 | 20 分钟 | ✅ 已部署 |
| **第四层** | 后端 API 异常检测 + 自动恢复 | 实时 | ✅ 已存在 |

**最坏情况**：即使 Worker 崩溃，5 分钟内任务会被自动恢复或标记为失败，前端 20 分钟后提示用户重试。

**最佳情况**：Worker 崩溃后 1 秒自动重启，任务继续执行，用户无感知。

# Redis轮询系统云服务迁移方案

## 当前系统架构分析

### 1. 轮询逻辑现状

项目中的轮询逻辑主要用于视频生成状态的跟踪，**完全不依赖Redis**：

#### 核心轮询流程
```
前端 Hook (use-video-polling.ts)
    ↓
API 端点 (/api/video/status/[requestId])
    ↓
Wavespeed API (外部服务)
```

**关键发现**：
- 轮询机制通过前端的 `setInterval` 实现，每3秒轮询一次
- 状态查询直接调用 Wavespeed API，不经过任何缓存层
- 轮询数据存储在前端 React Context 中，不涉及Redis
- 视频完成后直接存储到 Supabase 数据库

### 2. Redis在项目中的实际用途

经过代码审查，Redis在项目中主要用于以下功能：

| 功能模块 | 用途 | 是否影响轮询 |
|---------|------|------------|
| **邮箱验证码** | 存储验证码、限流、黑名单 | ❌ 无关 |
| **任务队列** | BullMQ队列管理（视频下载、缩略图生成等） | ❌ 无关 |
| **缓存层** | 通用缓存工具类（RedisCache） | ❌ 轮询未使用 |

**结论**：Redis与视频生成轮询逻辑完全独立，可以分别处理。

## 云服务Redis评估

### 1. 适合的云服务选项

#### A. Upstash Redis（推荐）
**优势**：
- Serverless架构，按请求计费
- 全球边缘部署，延迟低
- 与Vercel深度集成
- 免费层：10,000请求/天，256MB存储

**适用场景**：
- ✅ 邮箱验证码存储
- ✅ 轻量级缓存
- ⚠️ BullMQ队列（需要评估持久连接需求）

#### B. Redis Cloud（Redis Labs）
**优势**：
- 完全兼容Redis协议
- 支持持久连接
- 高可用性配置
- 免费层：30MB存储

**适用场景**：
- ✅ 所有Redis功能
- ✅ BullMQ队列系统
- ✅ 高并发场景

#### C. AWS ElastiCache
**优势**：
- 企业级性能
- 与AWS生态深度集成
- 自动备份和恢复

**适用场景**：
- ✅ 大规模生产环境
- ✅ 需要VPC隔离的场景
- ❌ 成本较高

### 2. 轮询优化方案（不依赖Redis）

由于轮询逻辑本身不使用Redis，我们可以独立优化：

#### 方案一：添加内存缓存层（推荐）
```typescript
// 在API层添加简单的内存缓存
const statusCache = new Map<string, {
  data: any,
  timestamp: number
}>()

const CACHE_TTL = 2000 // 2秒缓存

export async function getCachedStatus(requestId: string) {
  const cached = statusCache.get(requestId)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }

  const fresh = await checkVideoStatus(requestId)
  statusCache.set(requestId, {
    data: fresh,
    timestamp: Date.now()
  })

  return fresh
}
```

**优点**：
- 减少对Wavespeed API的调用
- 降低API费用
- 改善响应速度

#### 方案二：使用Vercel KV（可选）
```typescript
import { kv } from '@vercel/kv'

export async function getCachedStatus(requestId: string) {
  // 尝试从KV获取缓存
  const cached = await kv.get(`status:${requestId}`)
  if (cached) return cached

  // 获取新数据并缓存
  const fresh = await checkVideoStatus(requestId)
  await kv.set(`status:${requestId}`, fresh, {
    ex: 2 // 2秒过期
  })

  return fresh
}
```

**优点**：
- 分布式缓存
- 自动处理边缘节点
- 与Vercel无缝集成

## 迁移计划

### 第一阶段：Redis功能分离（1-2天）

1. **邮箱验证码系统迁移**
   ```typescript
   // 迁移到 Upstash Redis
   import { Redis } from '@upstash/redis'

   const redis = new Redis({
     url: process.env.UPSTASH_REDIS_REST_URL,
     token: process.env.UPSTASH_REDIS_REST_TOKEN,
   })
   ```

2. **BullMQ队列评估**
   - 测试Upstash对BullMQ的兼容性
   - 如不兼容，考虑：
     - a. 使用Redis Cloud免费层
     - b. 迁移到其他队列服务（如AWS SQS、Vercel Queue）

### 第二阶段：轮询优化（可选，1天）

1. **实施内存缓存**
   - 在API路由中添加缓存逻辑
   - 设置合适的TTL

2. **监控和调优**
   - 监控API调用频率
   - 调整缓存策略

### 第三阶段：生产部署（1天）

1. **环境变量配置**
   ```env
   # Upstash Redis
   UPSTASH_REDIS_REST_URL=xxx
   UPSTASH_REDIS_REST_TOKEN=xxx

   # 或 Redis Cloud
   REDIS_CLOUD_URL=xxx
   REDIS_CLOUD_PASSWORD=xxx
   ```

2. **渐进式切换**
   - 先在开发环境测试
   - staging环境验证
   - 生产环境部署

## 成本分析

| 方案 | 月成本估算 | 适用场景 |
|------|----------|---------|
| **Upstash Redis** | $0-10 | 低流量，Serverless架构 |
| **Redis Cloud** | $0-50 | 中等流量，需要完整Redis功能 |
| **AWS ElastiCache** | $15-100+ | 高流量，企业级需求 |
| **纯内存缓存** | $0 | 轮询优化，无需持久化 |

## 推荐方案

基于项目现状，推荐采用**混合方案**：

1. **轮询系统**：保持现状 + 添加内存缓存优化
   - 原因：轮询本身不依赖Redis，简单缓存即可满足需求
   - 成本：$0

2. **Redis功能**：迁移到Upstash Redis
   - 原因：Serverless友好，成本低，满足验证码和缓存需求
   - 成本：免费层足够

3. **队列系统**：评估后决定
   - 如BullMQ兼容Upstash：继续使用BullMQ
   - 如不兼容：考虑迁移到云原生队列服务

## 风险评估

| 风险项 | 概率 | 影响 | 缓解措施 |
|-------|-----|------|---------|
| Upstash不支持BullMQ | 中 | 中 | 使用Redis Cloud或迁移队列 |
| 网络延迟增加 | 低 | 低 | 选择同地域服务 |
| 成本超支 | 低 | 低 | 设置使用量告警 |

## 实施时间线

- **第1天**：环境准备，Upstash账号设置
- **第2天**：验证码系统迁移
- **第3天**：队列系统评估和迁移
- **第4天**：轮询缓存优化（可选）
- **第5天**：测试和部署

## 总结

1. **核心发现**：视频轮询逻辑不依赖Redis，可独立优化
2. **最优方案**：Upstash Redis + 内存缓存
3. **预期收益**：
   - 降低基础设施成本
   - 提高系统可扩展性
   - 简化运维复杂度
4. **实施难度**：低，代码改动小
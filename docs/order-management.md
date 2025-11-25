# 订单管理系统文档

## 概述

本文档说明如何管理和清理用户的订阅订单,包括自动清理过期订单和手动取消订单的功能。

---

## 功能说明

### 1. 自动清理过期 Pending 订单

系统提供了自动清理功能,可以将超过指定时间未支付的 `pending` 订单标记为 `cancelled`。

#### API 端点

**GET/POST `/api/subscription/cleanup-orders`**

- **权限**: 仅管理员可访问
- **参数**:
  - `hours` (可选): 超过多少小时未支付视为过期,默认 24 小时

#### 使用示例

**方式 1: 浏览器访问 (GET)**
```
https://yourdomain.com/api/subscription/cleanup-orders?hours=24
```

**方式 2: curl 命令 (POST)**
```bash
curl -X POST https://yourdomain.com/api/subscription/cleanup-orders \
  -H "Content-Type: application/json" \
  -d '{"hours": 24}'
```

**方式 3: 使用提供的脚本**
```bash
# 清理超过 24 小时未支付的订单
./scripts/cleanup-expired-orders.sh

# 清理超过 48 小时未支付的订单
./scripts/cleanup-expired-orders.sh 48
```

#### 响应示例

```json
{
  "success": true,
  "cleanedCount": 5,
  "hoursThreshold": 24,
  "message": "成功清理 5 个超过 24 小时未支付的订单"
}
```

---

### 2. 用户手动取消订单

用户可以在订单历史列表中取消自己的 `pending` 订单。

#### 功能位置

- **前端组件**: `components/create/orders-history-list.tsx`
- **显示位置**: 订单历史页面
- **适用状态**: 仅 `pending` 状态的订单显示取消按钮

#### UI 说明

- 每个 `pending` 订单右侧会显示一个红色的 **X** 按钮
- 点击按钮会弹出确认对话框
- 确认后订单状态会从 `pending` 变为 `cancelled`
- 取消成功后订单列表自动刷新

#### API 端点

**POST `/api/subscription/orders/[orderId]/cancel`**

- **权限**: 仅订单所有者可取消
- **参数**: 订单 ID (URL 路径参数)

#### 响应示例

```json
{
  "success": true,
  "message": "Order cancelled successfully",
  "orderId": "3f4e9510-7bd5-4a15-8981-134397d60f5e"
}
```

---

## 订单状态说明

| 状态 | 说明 | 可执行操作 |
|------|------|------------|
| `pending` | 订单已创建,等待支付 | 可取消 |
| `processing` | 正在处理支付 | 无法取消 |
| `completed` | 支付完成,订单已完成 | 无法取消 |
| `failed` | 支付失败 | 无法取消 |
| `cancelled` | 订单已取消 | 无操作 |

---

## 部署步骤

### 1. 数据库迁移

首先需要为 `subscription_orders` 表添加 `updated_at` 字段:

```bash
# 在 Supabase SQL Editor 中执行
psql -f lib/database/migrations/add-updated-at-to-subscription-orders.sql

# 或者手动复制 SQL 内容到 Supabase Dashboard 执行
```

### 2. 部署代码

确保以下文件已部署到生产环境:

**后端**:
- `lib/subscription/order-cleanup.ts` - 订单清理服务
- `app/api/subscription/cleanup-orders/route.ts` - 清理订单 API
- `app/api/subscription/orders/[orderId]/cancel/route.ts` - 取消订单 API

**前端**:
- `components/create/orders-history-list.tsx` - 订单列表组件(已更新)

**脚本**:
- `scripts/cleanup-expired-orders.sh` - 清理订单脚本

### 3. 设置定时任务 (可选)

建议设置定时任务自动清理过期订单:

**使用 Vercel Cron Jobs (推荐)**:
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/subscription/cleanup-orders",
      "schedule": "0 2 * * *"
    }
  ]
}
```
这将在每天凌晨 2 点自动清理过期订单。

**使用 Linux Cron**:
```bash
# 编辑 crontab
crontab -e

# 添加以下行 (每天凌晨 2 点执行)
0 2 * * * cd /path/to/vidfab && ./scripts/cleanup-expired-orders.sh >> logs/cleanup.log 2>&1
```

---

## 测试指南

### 测试清理功能

1. 创建测试订单 (不支付,保持 pending 状态)
2. 修改订单的 `created_at` 时间为 25 小时前:
   ```sql
   UPDATE subscription_orders
   SET created_at = NOW() - INTERVAL '25 hours'
   WHERE id = 'your-test-order-id';
   ```
3. 调用清理 API:
   ```bash
   curl -X POST https://localhost:3000/api/subscription/cleanup-orders \
     -H "Content-Type: application/json" \
     -d '{"hours": 24}'
   ```
4. 验证订单状态已变为 `cancelled`

### 测试取消功能

1. 登录用户账号
2. 创建一个测试订单 (不支付)
3. 进入订单历史页面
4. 点击 pending 订单旁的 X 按钮
5. 确认取消
6. 验证订单状态变为 `cancelled`

---

## 常见问题

### Q1: 为什么我看不到取消按钮?

A: 只有 `pending` 状态的订单才会显示取消按钮。已完成、已取消或失败的订单无法取消。

### Q2: 取消订单后能否恢复?

A: 不能。订单一旦取消,状态不可逆转。用户需要重新创建订单。

### Q3: 自动清理会影响正在处理的订单吗?

A: 不会。自动清理只针对 `pending` 状态的订单,并且只清理超过设定时间的订单。

### Q4: 清理订单会发送通知给用户吗?

A: 当前版本不会发送通知。如需通知功能,需要额外开发邮件通知系统。

### Q5: 如何查看清理日志?

A: 查看应用日志或运行清理脚本时的输出。建议将日志重定向到文件:
```bash
./scripts/cleanup-expired-orders.sh >> logs/cleanup.log 2>&1
```

---

## 维护建议

1. **定期监控**: 每周检查一次 pending 订单数量,确保没有异常堆积
2. **日志审查**: 定期查看清理日志,确保自动清理正常运行
3. **用户反馈**: 收集用户对取消功能的反馈,持续优化体验
4. **数据备份**: 清理前建议备份订单数据,以防意外

---

## 相关文件位置

| 文件 | 路径 |
|------|------|
| 订单清理服务 | `lib/subscription/order-cleanup.ts` |
| 清理 API | `app/api/subscription/cleanup-orders/route.ts` |
| 取消订单 API | `app/api/subscription/orders/[orderId]/cancel/route.ts` |
| 前端组件 | `components/create/orders-history-list.tsx` |
| 数据库迁移 | `lib/database/migrations/add-updated-at-to-subscription-orders.sql` |
| 清理脚本 | `scripts/cleanup-expired-orders.sh` |
| 查询脚本 | `scripts/query-user-orders.sh` |

---

最后更新: 2025-11-25

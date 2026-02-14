# 发现记录：脚本创建次数限制系统

## 现有代码结构发现

### 积分系统
- 位置：`lib/video-agent/credits-check.ts` 和 `credits-config.ts`
- 已实现的检查函数：
  - `checkAndDeductCharacterGeneration` - 人物图生成
  - `checkAndDeductStoryboardGeneration` - 分镜图生成
  - `checkAndDeductVideoGeneration` - 视频生成
- 返回格式：`{ canAfford: boolean, error?: string, details?: any }`
- **参考模式：** 可以仿照这个模式实现 `checkAndDeductScriptCreation`

### API 入口点
✅ **YouTube 视频分析入口：**
- 文件：`app/api/video-agent/analyze-video/route.ts`
- 当前实现：只检查余额 ≥ 10 积分，不扣除（第92-105行）
- 实际扣除在后续人物图生成时进行
- **需要修改：** 添加月度次数检查和扣除逻辑（在第105行之后）

✅ **正常创建项目入口：**
- 文件：`app/api/video-agent/projects/route.ts`  
- 当前实现：直接创建项目，无积分/次数检查
- **需要修改：** 添加月度次数检查和扣除逻辑（在第96行之前）

### 订阅系统
✅ **订阅等级配置：**
- 文件：`lib/subscription/pricing-config.ts`
- 等级：`free`, `lite`, `pro`, `premium`
- 月度积分：free=50, lite=300, pro=1000, premium=2000
- 类型定义：`lib/subscription/types.ts`
  - `UserSubscription` 包含 `plan_id`, `credits_remaining` 等字段
  - `PlanId = 'free' | 'lite' | 'pro' | 'premium'`

### 数据库表结构
✅ **users 表：**
- 字段：`uuid`, `subscription_plan`, `credits_remaining`
- 通过 `supabaseAdmin.from(TABLES.USERS)` 访问

✅ **需要创建：script_creation_usage 表**
- 用途：跟踪每个用户每月的脚本创建次数
- 字段设计：
  ```sql
  CREATE TABLE script_creation_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(uuid),
    month TEXT NOT NULL,  -- 格式: 'YYYY-MM'
    count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, month)
  );
  ```

---

## 关键发现

### 2026-02-14 - 月度配额规则设计
**发现内容：**
需要定义每个订阅等级的免费次数配额，并在超额时扣除积分。

**配额表：**
| 订阅等级 | 免费次数/月 | 超额费用 |
|---------|------------|---------|
| Free    | 5次        | 3积分/次 |
| Lite    | 10次       | 3积分/次 |
| Pro     | 20次       | 3积分/次 |
| Premium | 50次       | 3积分/次 |

**实现方案：**
1. 在 `lib/video-agent/script-creation-quota.ts` 中定义配额常量
2. 实现 `getMonthlyQuota(planId)` 函数
3. 实现 `getCurrentUsage(userId, month)` 函数
4. 实现 `checkAndDeductScriptCreation(userId)` 函数

**影响：**
- 需要在两个 API 入口调用检查函数
- 需要前端显示配额使用情况
- 需要错误处理（配额不足/积分不足）

---

### 2026-02-14 - 错误码设计决策
**问题：** 如何区分"配额用完且积分不足"和"积分不足"？

**选项：**
- A) 统一使用 402 Payment Required
- B) 使用 403 Forbidden（配额限制），402 Payment Required（积分不足）

**选择：** 暂定使用选项 A（统一 402）

**理由：**
1. 前端已有 402 错误处理逻辑，可以复用
2. 对用户来说，两种情况的解决方案都是"充值/升级"
3. 可以通过错误消息区分具体原因

**行动：**
- 在 `checkAndDeductScriptCreation` 中返回详细错误消息
- 前端根据 `error.message` 显示不同提示

---

## 技术决策

### 决策1：月度重置逻辑
**选项：**
- A) 定时任务每月1号清零所有记录
- B) 查询时自动判断月份，旧月份数据视为0

**选择：** B - 查询时自动判断

**理由：**
- 无需定时任务，减少复杂度
- 数据保留用于统计分析
- 实现简单：`SELECT count WHERE month = '2026-02'`

---

### 决策2：超额提示方式
**选项：**
- A) 事前提示（弹框确认）："将消耗 3 积分，是否继续？"
- B) 事后扣除（直接扣）：检查通过后直接扣除

**选择：** B - 事后扣除（直接扣）

**理由：**
- 用户体验更流畅，减少点击次数
- 可以在 UI 上提前显示"剩余 X 次免费创建"
- 与现有积分系统保持一致

---

## 待解决问题

1. ✅ 月度重置逻辑应该放在哪里？ → 查询时自动判断
2. ❌ 是否需要定时任务清理旧数据？ → 待定（可以后续优化）
3. ✅ 配额超限时是否需要用户确认？ → 不需要，直接扣除

---

## Phase 1 完成检查清单

- [x] 找到 YouTube 分析 API 入口
- [x] 找到正常创建项目 API 入口
- [x] 查看订阅系统实现
- [x] 查看积分系统实现
- [x] 了解数据库表结构
- [x] 设计新表结构（script_creation_usage）
- [x] 确定技术决策（错误码、月度重置、超额提示）

**下一步：** 进入 Phase 2 - 数据库设计与迁移

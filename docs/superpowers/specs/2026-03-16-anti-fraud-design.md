# 防薅羊毛系统设计文档

**日期**：2026-03-16
**状态**：待实施
**目标**：通过三层独立检查，在新用户积分发放环节阻断批量注册薅羊毛行为，同时将误伤正常用户的概率降至最低。

---

## 背景

系统中发现大量利用不同邮箱领取新用户积分的薅羊毛账号，主要手法：
1. **邮箱别名技巧**：Yandex `+alias`（`user+5@yandex.com`、`user+6@yandex.com`）；Gmail 点号变体（`f.oo@gmail.com` vs `foo@gmail.com`）
2. **同 IP 批量注册**：`think00510~think00532` 等组，同一 IP 10 个账号
3. **设备不变换 IP**：`sky52362000~sky52362006`，同 IP 段 7 个账号顺序注册

> **注意**：`s12345@gmail.com`、`s67890@gmail.com` 这类"前缀+随机数字"的枚举手法，每个邮箱都是真实独立地址，Layer 1 无法覆盖，属于 Layer 2 + Layer 3 的防范范围。

数据库已有 `new_user_ip_grants` 表（12,937 条记录）但代码从未使用，属于完全空置的防护机制。

---

## 设计目标

- **主要目标**：阻断利用多邮箱批量领取新用户积分的行为
- **核心约束**：宁可放过，不误杀——触发防护的结果是"不给积分"，而非封号
- **积分策略**：命中任意防护层 → `credits_remaining = 0`，`is_credit_limited = true`；正常用户不受影响

---

## 架构概览

三层检查独立运行，全部在**积分发放时**触发，而非注册时拦截账号：

```
新用户注册
    │
    ├─ Layer 1: 邮箱规范化去重（同步，saveUser 内，仅覆盖别名技巧）
    ├─ Layer 2: IP 频率限制（同步，saveUser 内）
    └─ Layer 3: 设备指纹（异步，登录后 root layout useEffect 触发）

命中任意层 → credits_remaining = 0，is_credit_limited = true
未命中 → credits_remaining = 200（正常）
```

---

## Layer 1：邮箱规范化去重

### 覆盖范围

Layer 1 **只覆盖邮箱别名技巧**，不覆盖前缀+数字枚举（那类每个都是真实不同的邮箱）。

| 原始邮箱 | 规范化结果 |
|---|---|
| `J.Ohn+test@gmail.com` | `john@gmail.com` |
| `user+5@yandex.com` | `user@yandex.com` |
| `foo.bar@gmail.com` | `foobar@gmail.com` |

**规范化规则**：
1. 全部转小写
2. Gmail：去掉本地部分的所有 `.`（点号）
3. Gmail / Yandex / Outlook / Hotmail / iCloud：去掉 `+` 及其后内容

> 当前版本覆盖 Gmail 点号去除、以及 Gmail/Yandex/Outlook/iCloud 的 `+alias`。其他邮件服务商的别名机制暂不处理。

### 触发条件

规范化后的邮箱在 `users.normalized_email` 中已存在 → 视为重复账号，不发放积分。

### 数据库要求

需要在 `users` 表新增 `normalized_email` 列并建唯一索引（见"数据库变更"章节）。注册时同步写入规范化邮箱。

### 实现文件

`lib/fraud/email-normalizer.ts`

```typescript
export function normalizeEmail(email: string): string
export function isDuplicateNormalizedEmail(normalizedEmail: string): Promise<boolean>
```

---

## Layer 2：IP 频率限制

### 逻辑

使用现有 `new_user_ip_grants` 表（之前从未被代码使用）。

**触发条件**：同一 IP 在过去 **7 天**内已有 **2 次或以上**积分发放记录（`granted = true`）。

选择 2 次而非 1 次，是为保护合理场景：同一家庭/办公室的两个真实用户共享同一出口 IP。

### IP 获取方式（重要）

**不能复用** `getClientIp()`（`lib/ip.ts`）。原因：该函数优先读取 `x-forwarded-for`，而在 Cloudflare 部署环境下，`x-forwarded-for` 可被攻击者在请求中伪造（Cloudflare 会追加而非替换该头），导致 Layer 2 可被轻易绕过。

`ip-checker.ts` 内部必须自行读取请求头，优先级顺序为：
1. `cf-connecting-ip`（Cloudflare 设置，用户无法伪造）
2. `x-real-ip`
3. `x-forwarded-for` 的最后一个 IP（最接近真实来源）
4. fallback: `'unknown'`

### CGNAT / IPv6 说明

CGNAT 环境下一个 IP 可能对应数十用户，2 次上限在极端情况下仍可能误伤，这是有意为之的保守策略（宁可放过）。IPv6 隐私扩展地址每次可能变化，Layer 2 对 IPv6 效果自然打折，由 Layer 3 补充覆盖。

### 原子性要求

用户写入和 IP 记录写入通过 `saveUser()` 内顺序调用保证一致性。若 IP 记录写入失败（如网络抖动），只记录错误日志，不回滚用户创建——用户创建比 IP 记录更重要。

每次新用户注册，无论是否触发限制，都写入 `new_user_ip_grants`：
- 正常：写入 `granted = true` + 发放积分
- 触发：写入 `granted = false` + 不发放积分

### 实现文件

`lib/fraud/ip-checker.ts`（自行读取请求头，不依赖 `getClientIp()`）

**入参方式**：使用 `next/headers` 的 `headers()` 函数（与 `getClientIp()` 相同机制），无需传入 `Request` 或 `IncomingMessage` 对象。这样在 NextAuth jwt callback 环境下也可直接调用，不存在 `IncomingMessage` vs Web `Request` 的类型差异问题。

```typescript
export async function getAntifraudIp(): Promise<string>  // 内部用 headers() 读取，cf-connecting-ip 优先
export function checkIpCreditLimit(ip: string): Promise<boolean>   // true = 超限
export function recordIpGrant(ip: string, userUuid: string, userEmail: string, granted: boolean): Promise<void>
```

---

## Layer 3：设备指纹

### 逻辑

使用 **FingerprintJS 开源版**（前端），在用户**登录后、任意页面渲染时**通过 root layout 的 `useEffect` 异步触发。

**开源版局限性**：在浏览器隐私模式、Safari ITP 下指纹可能漂移，准确率低于 Pro 版。这是可接受的折衷——漏掉一部分薅羊毛账号比误伤真实用户更符合"宁可放过"原则。

### 触发时机

**不在 `unified-auth-modal.tsx` 触发**。原因：modal 中 `handleAuthSuccess` 立即执行 `window.location.href = callbackUrl` 页面跳转，FingerprintJS 异步加载（1-3 秒）会在跳转前被中断或请求被丢弃。

**正确方式**：在 root layout 中新增一个客户端组件 `DeviceFingerprintTracker`，通过 `useEffect` 在**登录后任意页面**触发。触发逻辑：
1. 检查 session 是否存在（`useSession()`）
2. 检查 localStorage 中是否有 `device_check_done` 标记
3. 若未完成：加载 FingerprintJS，生成指纹，POST `/api/user/device-check`
4. 成功后写入 `localStorage.setItem('device_check_done', '1')`

这样无论用哪种方式登录（邮件验证码、Google OAuth、Google One Tap），跳转到任意页面后都会触发一次，且通过 localStorage 保证每个浏览器只调用一次。

### 竞态窗口处理

Layer 3 是异步事后检测，注册完成到指纹上报之间存在 2-5 秒的时间窗口，用户理论上可以在窗口期内消耗积分。**处理策略**：

- 若 `credits_remaining == 200`（积分未消耗）：直接置 0，`is_credit_limited = true`
- 若 `credits_remaining < 200`（积分已部分消耗）：仍然置 0，同时在 `fraud_reason` 中记录已消耗量（如 `device_fingerprint:consumed:6`），供后续人工审查
- 这意味着账号可能短暂用掉了一些积分，这是"宁可放过"策略在 Layer 3 上的体现——不额外追债，只从此刻起停止

### 触发条件

检查 `device_fingerprints` 表：
1. 该指纹**未曾出现**过 → 写入记录，不处理积分（正常通过）
2. 该指纹**已存在**，且历史关联账号中有 `is_credit_limited = false` 的账号 → 将**当前账号**积分清零，标记 `is_credit_limited = true`
3. 该指纹已存在，但历史账号均已是 `is_credit_limited = true` → 当前账号同样清零，不重复追缴历史账号
4. 历史账号已是付费订阅用户（`subscription_plan != 'free'`）→ **不触发**追缴（付费证明了真实性）

### API 端点安全

`/api/user/device-check` 要求：
1. 必须有有效的 NextAuth session（通过 `getServerSession()` 验证，无 session 返回 401）
2. **幂等判断依据为 `user_uuid` 单字段**：若 `device_fingerprints` 中已存在该 `user_uuid` 的任意记录，则直接返回成功，不再插入新记录。这确保同一用户多次调用（如隐私模式与普通模式各登录一次，产生不同指纹）不会引发重复欺诈判断。数据库的 `(fingerprint, user_uuid)` 唯一约束仅用于防止并发竞态下的重复插入，不是业务唯一性的语义。
3. 指纹 hash 由客户端 FingerprintJS 生成，服务端只做存储和比较，不验证格式

### 实现文件

`lib/fraud/device-checker.ts`

```typescript
export function checkAndRecordDevice(fingerprintHash: string, userUuid: string, ip: string): Promise<{ isFraud: boolean }>
```

`app/api/user/device-check/route.ts` — POST 端点，需要 NextAuth session。

新增客户端组件（不新建文件，内联在 root layout 中）：`DeviceFingerprintTracker`。

---

## `saveUser()` 调用路径说明

`saveUser()` 在两处被调用：

1. **正常注册路径**：`auth/config.ts` jwt callback 的 `if (user && user.email && account)` 分支（第 251 行）— 首次登录时触发
2. **补救路径**：同文件第 321-336 行，当 UUID 和邮箱都不在 DB 中时重建用户

Layer 1 + Layer 2 检查写在 `saveUser()` 函数内部，**两条路径均自动经过防欺诈检查**，无需单独处理。

---

## `pending_credits` 交互处理

现有 `saveUser()` 中，新用户积分计算为：`totalCredits = 200 + pending_credits 加成`。

防欺诈检查命中时的处理：
- `credits_remaining` 置 0（无论 pending_credits 计算出多少）
- `pending_credits` 记录依然标记为 `is_claimed = true`（不回滚，避免复杂的补偿逻辑）

---

## 数据库变更

### 1. `users` 表新增三列

```sql
ALTER TABLE public.users
ADD COLUMN is_credit_limited boolean DEFAULT false,
ADD COLUMN normalized_email varchar,
ADD COLUMN fraud_reason varchar;
-- fraud_reason 格式：'email_duplicate' | 'ip_limit' | 'device_fingerprint' | 'device_fingerprint:consumed:N'

CREATE UNIQUE INDEX idx_users_normalized_email ON public.users (normalized_email)
WHERE normalized_email IS NOT NULL;
```

`normalized_email` 对历史用户为 NULL（不影响现有数据），只有新注册用户才写入。

### 2. 新增 `device_fingerprints` 表

```sql
CREATE TABLE public.device_fingerprints (
  id            serial PRIMARY KEY,
  fingerprint   varchar NOT NULL,
  user_uuid     varchar NOT NULL REFERENCES public.users(uuid),
  ip_address    varchar,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX idx_device_fingerprints_fingerprint ON device_fingerprints (fingerprint);
CREATE UNIQUE INDEX idx_device_fingerprints_unique ON device_fingerprints (fingerprint, user_uuid);
```

`(fingerprint, user_uuid)` 唯一约束防止重复插入，前端多次调用幂等安全。

### 3. `new_user_ip_grants` 表新增列

```sql
ALTER TABLE public.new_user_ip_grants
ADD COLUMN IF NOT EXISTS granted boolean DEFAULT true;
```

---

## 代码改动清单

### 新增文件

| 文件 | 职责 | 行数预估 |
|---|---|---|
| `lib/fraud/email-normalizer.ts` | Layer 1 邮箱规范化逻辑 | ~40 |
| `lib/fraud/ip-checker.ts` | Layer 2 IP 频率限制（cf-connecting-ip 优先） | ~60 |
| `lib/fraud/device-checker.ts` | Layer 3 设备指纹逻辑 | ~60 |
| `app/api/user/device-check/route.ts` | Layer 3 API 端点 | ~40 |

### 修改文件

| 文件 | 改动内容 |
|---|---|
| `services/user.ts` | `saveUser()` 新增 Layer 1 + Layer 2 调用；写入 `normalized_email`；命中时 `credits_remaining = 0`，`is_credit_limited = true`，`fraud_reason` |
| `app/(main)/layout.tsx` 或根 layout | 新增内联客户端组件 `DeviceFingerprintTracker`，在 `useEffect` 中触发 Layer 3 |

**总计**：新增 4 个文件，修改 2 个文件，数据库迁移 4 条 SQL。

---

## `is_credit_limited` 对前端的影响

- **当前**：不对用户展示任何提示（静默限制），避免告诉攻击者拦截原因
- **订阅升级后**：付费成功时（`lib/subscription/subscription-service.ts`）清除 `is_credit_limited = false`，订阅积分正常发放
- **不影响**：正常使用功能、登录、浏览——只是没有初始积分

---

## 数据流

```
[注册/登录]
    │
    ├─ saveUser() 调用（同步，两条路径均经过此处）
    │       ├─ normalizeEmail(email) → isDuplicateNormalizedEmail() → Layer 1
    │       ├─ getAntifraudIp() + checkIpCreditLimit(ip) → Layer 2
    │       ├─ 决定 credits_remaining (200 or 0) + fraud_reason
    │       ├─ upsert users（含 normalized_email、is_credit_limited、fraud_reason）
    │       └─ recordIpGrant()（失败只记录日志，不回滚）
    │
    └─ 跳转后任意页面渲染（前端 DeviceFingerprintTracker useEffect）
            ├─ 检查 localStorage 'device_check_done' → 已有则跳过
            ├─ FingerprintJS.load() → 生成 fingerprintHash
            └─ POST /api/user/device-check
                    ├─ getServerSession() 验证登录态
                    ├─ 检查 device_fingerprints 是否已存在该 user_uuid（幂等）
                    └─ checkAndRecordDevice()
                            ├─ 新设备 → INSERT device_fingerprints，不动积分
                            └─ 已知设备（历史合法账号）
                                    └─ UPDATE users SET credits_remaining=0,
                                                        is_credit_limited=true,
                                                        fraud_reason='device_fingerprint[:consumed:N]'
                    └─ 成功后前端写入 localStorage 'device_check_done'
```

---

## 不在本期做的事

- 封号功能（只限积分，不封账号）
- 管理后台查看被限制账号列表
- 申诉 / 解封流程（付费自动解封）
- FingerprintJS Pro 升级
- 前缀+数字枚举检测（需要机器学习或第三方邮箱信誉库）
- `lib/ip.ts` 中 `getClientIp()` 的 Cloudflare 头优先级修复（非本期范围，`ip-checker.ts` 内部自行处理）

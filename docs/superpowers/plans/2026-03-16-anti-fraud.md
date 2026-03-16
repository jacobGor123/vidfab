# Anti-Fraud System Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在新用户积分发放环节加入三层防护（邮箱规范化去重、IP 限频、设备指纹），阻断批量注册薅羊毛，同时不封号、不误伤正常用户。

**Architecture:** Layer 1 + Layer 2 内嵌在 `services/user.ts` 的 `saveUser()` 中同步运行；Layer 3 由前端 root layout 的 `useEffect` 异步触发，调用新 API 端点，事后追缴积分。三层均独立，任意一层命中即将 `credits_remaining` 置 0。

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase (supabaseAdmin), next/headers, NextAuth getServerSession, FingerprintJS 开源版（@fingerprintjs/fingerprintjs）

---

## 文件结构

| 操作 | 文件 | 职责 |
|------|------|------|
| 新建 | `lib/fraud/email-normalizer.ts` | Gmail 点号去除、+alias 去除，规范化邮箱 |
| 新建 | `lib/fraud/ip-checker.ts` | cf-connecting-ip 优先的 IP 读取 + new_user_ip_grants 频率检查 |
| 新建 | `lib/fraud/device-checker.ts` | device_fingerprints 表的读写 + 追缴逻辑 |
| 新建 | `app/api/user/device-check/route.ts` | POST 端点，Layer 3 入口，需要 NextAuth session |
| 修改 | `services/user.ts` | saveUser() 内嵌 Layer 1 + Layer 2，写入新字段 |
| 修改 | `app/layout.tsx` | dynamic import DeviceFingerprintTracker |
| 新建 | `components/auth/device-fingerprint-tracker.tsx` | 'use client' 设备指纹追踪器（Spec 说"内联"，但 Next.js 14 要求 'use client' 组件必须独立文件，dynamic import 是等效实现） |

---

## Chunk 1：数据库迁移

### Task 1：执行数据库迁移 SQL

**Files:**
- Reference: `scripts/run-migration.sh`

- [ ] **Step 1：在 Supabase 控制台或 SQL 编辑器运行以下迁移**

```sql
-- 1. users 表新增三列
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS is_credit_limited boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS normalized_email varchar,
ADD COLUMN IF NOT EXISTS fraud_reason varchar;

-- normalized_email 局部唯一索引（历史数据为 NULL 不影响）
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_normalized_email
ON public.users (normalized_email)
WHERE normalized_email IS NOT NULL;

-- 2. device_fingerprints 新表
CREATE TABLE IF NOT EXISTS public.device_fingerprints (
  id            serial PRIMARY KEY,
  fingerprint   varchar NOT NULL,
  user_uuid     varchar NOT NULL REFERENCES public.users(uuid),
  ip_address    varchar,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_device_fingerprints_fp
ON device_fingerprints (fingerprint);

CREATE UNIQUE INDEX IF NOT EXISTS idx_device_fingerprints_unique
ON device_fingerprints (fingerprint, user_uuid);

-- 3. new_user_ip_grants 新增 granted 列
ALTER TABLE public.new_user_ip_grants
ADD COLUMN IF NOT EXISTS granted boolean DEFAULT true;
```

- [ ] **Step 2：验证迁移成功**

在 Supabase SQL 编辑器运行：
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'users' AND column_name IN ('is_credit_limited','normalized_email','fraud_reason');
-- 应返回 3 行

SELECT table_name FROM information_schema.tables
WHERE table_name = 'device_fingerprints';
-- 应返回 1 行

SELECT column_name FROM information_schema.columns
WHERE table_name = 'new_user_ip_grants' AND column_name = 'granted';
-- 应返回 1 行
```

- [ ] **Step 3：Commit**

```bash
git add -A
git commit -m "feat: anti-fraud DB migration (users columns + device_fingerprints table)"
```

---

## Chunk 2：Layer 1 — 邮箱规范化

### Task 2：实现 email-normalizer.ts

**Files:**
- Create: `lib/fraud/email-normalizer.ts`

- [ ] **Step 1：创建文件**

```typescript
/**
 * 邮箱规范化工具 - Layer 1 防欺诈
 * 去除 Gmail 点号、去除 +alias 后缀，用于检测重复账号
 */
import { supabaseAdmin } from '@/lib/supabase'

// 支持去除 +alias 的邮件域名
const ALIAS_DOMAINS = new Set([
  'gmail.com',
  'yandex.com', 'yandex.ru',
  'outlook.com', 'hotmail.com', 'live.com',
  'icloud.com', 'me.com', 'mac.com',
])

/**
 * 将邮箱规范化为去除点号和别名后的形式
 * 例：J.Ohn+test@gmail.com → john@gmail.com
 */
export function normalizeEmail(email: string): string {
  const lower = email.toLowerCase().trim()
  const atIdx = lower.lastIndexOf('@')
  if (atIdx === -1) return lower

  let local = lower.slice(0, atIdx)
  const domain = lower.slice(atIdx + 1)

  // 去除 +alias 部分（所有支持的域名）
  if (ALIAS_DOMAINS.has(domain)) {
    const plusIdx = local.indexOf('+')
    if (plusIdx !== -1) local = local.slice(0, plusIdx)
  }

  // Gmail：去除本地部分所有点号
  if (domain === 'gmail.com') {
    local = local.replace(/\./g, '')
  }

  return `${local}@${domain}`
}

/**
 * 检查规范化邮箱是否已在数据库中存在
 * @returns true 表示已存在（重复），应触发限制
 */
export async function isDuplicateNormalizedEmail(
  normalizedEmail: string
): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('uuid')
    .eq('normalized_email', normalizedEmail)
    .maybeSingle()

  if (error) {
    console.error('[fraud/email] 查询 normalized_email 失败:', error)
    return false // 查询失败时放行，避免误杀
  }

  return data !== null
}
```

- [ ] **Step 2：类型检查**

```bash
bash scripts/test-types.sh
```

预期：无 TypeScript 错误。

- [ ] **Step 3：手动验证规范化逻辑（在临时脚本中）**

新建 `scripts/test-email-normalizer.ts`（验证后删除）：
```typescript
import { normalizeEmail } from '../lib/fraud/email-normalizer'

const cases = [
  ['J.Ohn+test@gmail.com', 'john@gmail.com'],
  ['foo.bar@gmail.com', 'foobar@gmail.com'],
  ['user+5@yandex.com', 'user@yandex.com'],
  ['USER+alias@outlook.com', 'user@outlook.com'],
  ['normal@example.com', 'normal@example.com'], // 非覆盖域名，不变
]
cases.forEach(([input, expected]) => {
  const result = normalizeEmail(input)
  const pass = result === expected
  console.log(`${pass ? '✅' : '❌'} ${input} → ${result} (expected: ${expected})`)
})
```

运行：`npx tsx scripts/test-email-normalizer.ts`
预期：5 行全部 ✅

验证后删除该脚本。

- [ ] **Step 4：Commit**

```bash
git add lib/fraud/email-normalizer.ts
git commit -m "feat: add email normalizer for Layer 1 fraud detection"
```

---

## Chunk 3：Layer 2 — IP 频率限制

### Task 3：实现 ip-checker.ts

**Files:**
- Create: `lib/fraud/ip-checker.ts`

- [ ] **Step 1：创建文件**

```typescript
/**
 * IP 频率限制 - Layer 2 防欺诈
 * 使用 cf-connecting-ip 优先策略，防止攻击者伪造 x-forwarded-for 绕过
 */
import { headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'

const IP_WINDOW_DAYS = 7
const IP_GRANT_LIMIT = 2 // 同一 IP N 天内最多发放 N 次积分

/**
 * 读取客户端真实 IP，优先使用 Cloudflare 设置的 cf-connecting-ip
 * 注意：不使用 lib/ip.ts 的 getClientIp()，因为它优先读取可伪造的 x-forwarded-for
 */
export async function getAntifraudIp(): Promise<string> {
  try {
    const headersList = await headers()

    // 1. cf-connecting-ip（Cloudflare 设置，用户无法伪造）
    const cfIp = headersList.get('cf-connecting-ip')
    if (cfIp) return cfIp.trim()

    // 2. x-real-ip
    const realIp = headersList.get('x-real-ip')
    if (realIp) return realIp.trim()

    // 3. x-forwarded-for 的最后一个 IP（最接近真实来源）
    const forwarded = headersList.get('x-forwarded-for')
    if (forwarded) {
      const parts = forwarded.split(',')
      return parts[parts.length - 1].trim()
    }

    return 'unknown'
  } catch {
    return 'unknown'
  }
}

/**
 * 检查 IP 是否已超过积分发放限额
 * @returns true 表示已超限，应拒绝发放积分
 */
export async function checkIpCreditLimit(ip: string): Promise<boolean> {
  if (!ip || ip === 'unknown') return false // 未知 IP 时放行

  const windowStart = new Date()
  windowStart.setDate(windowStart.getDate() - IP_WINDOW_DAYS)

  const { count, error } = await supabaseAdmin
    .from('new_user_ip_grants')
    .select('*', { count: 'exact', head: true })
    .eq('ip_address', ip)
    .eq('granted', true)
    .gte('granted_at', windowStart.toISOString())

  if (error) {
    console.error('[fraud/ip] 查询 new_user_ip_grants 失败:', error)
    return false // 查询失败时放行
  }

  return (count ?? 0) >= IP_GRANT_LIMIT
}

/**
 * 记录本次新用户 IP 积分发放情况
 */
export async function recordIpGrant(
  ip: string,
  userUuid: string,
  userEmail: string,
  granted: boolean
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('new_user_ip_grants')
    .insert({
      ip_address: ip,
      user_uuid: userUuid,
      user_email: userEmail,
      granted,
      granted_at: new Date().toISOString(),
    })

  if (error) {
    // 记录失败不阻断主流程，只记录日志
    console.error('[fraud/ip] 写入 new_user_ip_grants 失败:', error)
  }
}
```

- [ ] **Step 2：类型检查**

```bash
bash scripts/test-types.sh
```

预期：无 TypeScript 错误。

- [ ] **Step 3：Commit**

```bash
git add lib/fraud/ip-checker.ts
git commit -m "feat: add IP rate limiter for Layer 2 fraud detection"
```

---

## Chunk 4：Layer 3 后端 — 设备指纹检测

### Task 4：实现 device-checker.ts

**Files:**
- Create: `lib/fraud/device-checker.ts`

- [ ] **Step 1：创建文件**

```typescript
/**
 * 设备指纹检测 - Layer 3 防欺诈（事后追缴）
 * 检查同一设备是否已在其他账号领取过积分
 */
import { supabaseAdmin } from '@/lib/supabase'
import { getIsoTimestr } from '@/lib/time'

interface CheckResult {
  isFraud: boolean
  reason?: string
}

/**
 * 检查设备指纹并记录，若发现欺诈则追缴当前账号积分
 * 幂等：同一 user_uuid 只处理一次
 */
export async function checkAndRecordDevice(
  fingerprintHash: string,
  userUuid: string,
  ip: string
): Promise<CheckResult> {
  // 1. 幂等检查：该 user_uuid 是否已处理过
  const { data: existing } = await supabaseAdmin
    .from('device_fingerprints')
    .select('id')
    .eq('user_uuid', userUuid)
    .maybeSingle()

  if (existing) {
    return { isFraud: false } // 已处理，幂等返回
  }

  // 2. 检查同一指纹是否关联了其他合法账号
  const { data: sameDevice } = await supabaseAdmin
    .from('device_fingerprints')
    .select('user_uuid')
    .eq('fingerprint', fingerprintHash)
    .limit(10)

  let isFraud = false

  if (sameDevice && sameDevice.length > 0) {
    const historicUuids = sameDevice.map(r => r.user_uuid)

    // 检查历史账号中是否有付费账号（付费用户不触发追缴）
    const { data: paidUsers } = await supabaseAdmin
      .from('users')
      .select('uuid')
      .in('uuid', historicUuids)
      .neq('subscription_plan', 'free')

    const hasPaidAccount = (paidUsers?.length ?? 0) > 0

    if (!hasPaidAccount) {
      // 没有付费账号 → 同一设备的所有账号（无论 limited 与否）都算欺诈证据
      // 覆盖 Spec 条件 2（历史有正常免费账号）和条件 3（历史账号全是 limited）
      isFraud = true
    }
    // 若有付费账号 → 不触发（付费证明了真实性，Spec 条件 4）
  }

  // 3. 写入设备指纹记录（无论是否欺诈都记录，供后续分析）
  const { error: insertError } = await supabaseAdmin
    .from('device_fingerprints')
    .insert({
      fingerprint: fingerprintHash,
      user_uuid: userUuid,
      ip_address: ip,
    })

  if (insertError && insertError.code !== '23505') {
    // 23505 = 唯一约束冲突（并发），忽略；其他错误记录日志
    console.error('[fraud/device] 写入 device_fingerprints 失败:', insertError)
  }

  // 4. 若欺诈，追缴积分
  if (isFraud) {
    const { data: currentUser } = await supabaseAdmin
      .from('users')
      .select('credits_remaining')
      .eq('uuid', userUuid)
      .single()

    const consumed = currentUser
      ? 200 - (currentUser.credits_remaining ?? 200)
      : 0

    const fraudReason = consumed > 0
      ? `device_fingerprint:consumed:${consumed}`
      : 'device_fingerprint'

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        credits_remaining: 0,
        is_credit_limited: true,
        fraud_reason: fraudReason,
        updated_at: getIsoTimestr(),
      })
      .eq('uuid', userUuid)

    if (updateError) {
      console.error('[fraud/device] 追缴积分失败:', updateError)
    } else {
      console.log(`[fraud/device] 追缴成功: ${userUuid}, reason: ${fraudReason}`)
    }
  }

  return { isFraud }
}
```

- [ ] **Step 2：类型检查**

```bash
bash scripts/test-types.sh
```

预期：无 TypeScript 错误。

- [ ] **Step 3：Commit**

```bash
git add lib/fraud/device-checker.ts
git commit -m "feat: add device fingerprint checker for Layer 3 fraud detection"
```

### Task 5：实现 /api/user/device-check 端点

**Files:**
- Create: `app/api/user/device-check/route.ts`

- [ ] **Step 1：创建 API 端点**

```typescript
/**
 * POST /api/user/device-check
 * Layer 3 设备指纹检测入口
 * 需要 NextAuth session，幂等，每个 user_uuid 只处理一次
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/auth/config'
import { checkAndRecordDevice } from '@/lib/fraud/device-checker'
import { getAntifraudIp } from '@/lib/fraud/ip-checker'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authConfig)
    if (!session?.user?.uuid) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const fingerprintHash = body?.fingerprintHash

    if (!fingerprintHash || typeof fingerprintHash !== 'string') {
      return NextResponse.json({ success: false, error: 'Missing fingerprintHash' }, { status: 400 })
    }

    const ip = await getAntifraudIp()
    const result = await checkAndRecordDevice(fingerprintHash, session.user.uuid, ip)

    return NextResponse.json({ success: true, isFraud: result.isFraud })
  } catch (error) {
    console.error('[api/user/device-check] 错误:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 2：类型检查**

```bash
bash scripts/test-types.sh
```

预期：无 TypeScript 错误。

- [ ] **Step 3：启动开发服务器，手动测试端点**

```bash
bash scripts/dev.sh
```

未登录时调用（预期 401）：
```bash
curl -X POST http://localhost:3000/api/user/device-check \
  -H "Content-Type: application/json" \
  -d '{"fingerprintHash":"test123"}'
# 预期：{"success":false,"error":"Unauthorized"}
```

- [ ] **Step 4：Commit**

```bash
git add app/api/user/device-check/route.ts
git commit -m "feat: add /api/user/device-check endpoint for Layer 3"
```

---

## Chunk 5：Layer 1 + Layer 2 接入 saveUser()

### Task 6：修改 services/user.ts

**Files:**
- Modify: `services/user.ts`（新用户创建分支，约第 51-100 行）

> 关键位置：`saveUser()` 函数中 `else { // ✅ 新用户` 分支，即注释"✅ 新用户：使用默认值"之后，`upsert` 调用之前。

- [ ] **Step 1：在文件顶部的 import 区域新增两个引用**

在 `services/user.ts` 第 1-8 行的 import 块末尾追加：

```typescript
import { normalizeEmail, isDuplicateNormalizedEmail } from '@/lib/fraud/email-normalizer'
import { getAntifraudIp, checkIpCreditLimit, recordIpGrant } from '@/lib/fraud/ip-checker'
```

- [ ] **Step 2：修改新用户创建分支**

找到 `services/user.ts` 中以下注释所在的 `else` 分支（约第 51 行）：
```typescript
    } else {
      // ✅ 新用户：使用默认值
      console.log(`✨ 创建新用户: ${userUuid}`);
```

在 `console.log` 之后、`const { data: pendingCredits }` 之前，插入防欺诈检查：

```typescript
      // 🛡️ 防欺诈检查 Layer 1 + Layer 2
      const normalizedMail = normalizeEmail(userData.email)
      const [isEmailDup, clientIp] = await Promise.all([
        isDuplicateNormalizedEmail(normalizedMail),
        getAntifraudIp(),
      ])
      const isIpLimited = await checkIpCreditLimit(clientIp)

      const isFraud = isEmailDup || isIpLimited
      if (isFraud) {
        console.warn(
          `[fraud] 新用户积分被限制: ${userData.email}`,
          { isEmailDup, isIpLimited, ip: clientIp }
        )
      }
```

> **⚠️ 重要**：不要修改 `let totalCredits = 200` 那行，也不要修改 `pending_credits` 加成逻辑。`totalCredits` 让它照常计算。欺诈时通过 `userToSave` 对象强制覆盖为 0，确保 `pending_credits` 加成无法绕过防护。

在 `userToSave` 对象里，`credits_remaining: totalCredits` **替换**为：
```typescript
        credits_remaining: isFraud ? 0 : totalCredits, // 🛡️ 强制覆盖，pending_credits 加成无法绕过
        normalized_email: normalizedMail,
        is_credit_limited: isFraud,
        fraud_reason: isFraud
          ? (isEmailDup ? 'email_duplicate' : 'ip_limit')
          : null,
```

在 `userToSave` 对象赋值完成后（仍在 `else { // 新用户 }` 分支内），`upsert` 调用之前，新增 IP 记录写入：

```typescript
      // 🛡️ 记录 IP 积分发放情况，复用上面已计算的 clientIp 和 isFraud
      await recordIpGrant(clientIp, userUuid, userData.email, !isFraud)
```

> ⚠️ 注意：此调用必须在 `else { // 新用户 }` 分支内，直接复用已有的 `clientIp` 和 `isFraud` 变量，**不要重复调用 `getAntifraudIp()`**。

- [ ] **Step 3：类型检查**

```bash
bash scripts/test-types.sh
```

预期：无 TypeScript 错误。如有类型错误，检查 `DatabaseUser` 类型定义（`lib/supabase.ts`）是否包含新增字段，若没有则需添加：
```typescript
// 在 DatabaseUser 类型中添加：
is_credit_limited?: boolean
normalized_email?: string
fraud_reason?: string
```

- [ ] **Step 4：手动验证（开发环境）**

1. 启动开发服务器：`bash scripts/dev.sh`
2. 注册两个使用 alias 的邮箱（如 `test+1@gmail.com` 和 `test+2@gmail.com`）
3. 第二个账号应 `credits_remaining = 0`，`is_credit_limited = true`

在 Supabase SQL 编辑器验证：
```sql
SELECT email, normalized_email, credits_remaining, is_credit_limited, fraud_reason
FROM public.users
WHERE email LIKE 'test+%@gmail.com'
ORDER BY created_at DESC;
```

- [ ] **Step 5：Commit**

```bash
git add services/user.ts
git commit -m "feat: integrate Layer 1 + Layer 2 fraud checks into saveUser()"
```

---

## Chunk 6：Layer 3 前端 — DeviceFingerprintTracker

### Task 7：安装 FingerprintJS 并在 root layout 添加追踪器

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1：安装 FingerprintJS 开源版**

```bash
cd /Users/jacob/Desktop/vidfab && pnpm add @fingerprintjs/fingerprintjs
```

- [ ] **Step 2：在 app/layout.tsx 中新增客户端组件**

在 `app/layout.tsx` 文件顶部的 import 区域末尾，追加：

```typescript
import dynamic from 'next/dynamic'
```

> 注意：`dynamic` 已在文件中 import（第 16 行），跳过此步。

在文件中 `export default function RootLayout` 之前，新增以下客户端组件（直接内联，无需新建文件）：

```typescript
// 🛡️ 防欺诈：设备指纹追踪器（客户端，登录后异步触发）
const DeviceFingerprintTracker = dynamic(
  () => import('@/components/auth/device-fingerprint-tracker').then(m => ({ default: m.DeviceFingerprintTracker })),
  { ssr: false }
)
```

在 `<SessionProvider>` 内、`<GtmAuthTracker />` 之后，加入：
```tsx
<DeviceFingerprintTracker />
```

- [ ] **Step 3：新建 components/auth/device-fingerprint-tracker.tsx**

```typescript
'use client'

/**
 * 设备指纹追踪器 - Layer 3 防欺诈
 * 在用户登录后任意页面触发一次，检测是否为重复设备
 */
import { useEffect } from 'react'
import { useSession } from 'next-auth/react'

const STORAGE_KEY = 'vf_device_check_done'

export function DeviceFingerprintTracker() {
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user?.uuid) return
    if (typeof window === 'undefined') return
    if (localStorage.getItem(STORAGE_KEY)) return // 已完成，跳过

    let cancelled = false

    async function runCheck() {
      try {
        const FingerprintJS = await import('@fingerprintjs/fingerprintjs')
        if (cancelled) return

        const fp = await FingerprintJS.load()
        if (cancelled) return

        const result = await fp.get()
        if (cancelled) return

        await fetch('/api/user/device-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fingerprintHash: result.visitorId }),
        })

        if (!cancelled) {
          localStorage.setItem(STORAGE_KEY, '1')
        }
      } catch (err) {
        // 静默失败，不影响用户体验
        console.debug('[DeviceFingerprintTracker] 指纹检测失败:', err)
      }
    }

    runCheck()
    return () => { cancelled = true }
  }, [status, session?.user?.uuid])

  return null // 无渲染内容
}
```

- [ ] **Step 4：类型检查**

```bash
bash scripts/test-types.sh
```

预期：无 TypeScript 错误。

- [ ] **Step 5：验证前端触发**

1. 启动 dev 服务器：`bash scripts/dev.sh`
2. 登录任意账号
3. 打开浏览器 DevTools → Network 面板
4. 刷新页面，确认出现 `/api/user/device-check` 请求，状态 200
5. 再次刷新，确认不再发出请求（localStorage 标记生效）

- [ ] **Step 6：Commit**

```bash
git add components/auth/device-fingerprint-tracker.tsx app/layout.tsx
git commit -m "feat: add DeviceFingerprintTracker for Layer 3 fraud detection"
```

---

## Chunk 7：端到端验证

### Task 8：全流程手动验证

- [ ] **Step 1：验证 Layer 1（邮箱别名去重）**

1. 注册 `testfraud01@gmail.com`（第一个账号，应得 200 积分）
2. 注册 `testfraud.01+spam@gmail.com`（规范化后与第一个相同）
3. 在 Supabase 查询：
```sql
SELECT email, normalized_email, credits_remaining, is_credit_limited, fraud_reason
FROM public.users
WHERE email IN ('testfraud01@gmail.com', 'testfraud.01+spam@gmail.com');
```
预期：第二个账号 `credits_remaining=0`，`is_credit_limited=true`，`fraud_reason='email_duplicate'`

- [ ] **Step 2：验证 Layer 2（IP 限频）**

1. 用同一浏览器/IP 注册 3 个不同邮箱
2. 前两个应得 200 积分，第三个应得 0
3. 查询 `new_user_ip_grants` 确认记录写入：
```sql
SELECT ip_address, user_email, granted FROM new_user_ip_grants ORDER BY id DESC LIMIT 5;
```

- [ ] **Step 3：验证 Layer 3（设备指纹）**

1. 用无痕模式注册账号 A（200 积分）
2. 清除该无痕窗口 localStorage，用同一无痕窗口注册账号 B
3. 等待 5 秒（Layer 3 异步），查询账号 B 积分：
```sql
SELECT email, credits_remaining, is_credit_limited, fraud_reason
FROM public.users WHERE email = 'testfraud-b@xxx.com';
```
预期：`credits_remaining=0`，`fraud_reason` 包含 `device_fingerprint`

- [ ] **Step 4：验证正常用户不受影响**

1. 注册一个全新邮箱、全新 IP（可用手机热点）
2. 确认 `credits_remaining=200`，`is_credit_limited=false`

- [ ] **Step 5：最终 Commit**

```bash
git add -A
git commit -m "feat: anti-fraud system complete - 3-layer credit protection"
```

---

## 快速参考

| Layer | 触发时机 | 主要文件 | 检查依据 |
|-------|---------|---------|---------|
| 1 邮箱规范化 | saveUser() 同步 | `lib/fraud/email-normalizer.ts` | normalized_email 重复 |
| 2 IP 限频 | saveUser() 同步 | `lib/fraud/ip-checker.ts` | 同 IP 7天内 ≥2 次 |
| 3 设备指纹 | 登录后页面 useEffect | `lib/fraud/device-checker.ts` + `app/api/user/device-check/route.ts` + `components/auth/device-fingerprint-tracker.tsx` | 同设备历史有合法账号 |

**命中任意层**：`credits_remaining = 0`，`is_credit_limited = true`，不封号。

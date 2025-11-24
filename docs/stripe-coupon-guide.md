# Stripe 优惠券使用指南

## 📋 目录

1. [功能概述](#功能概述)
2. [在 Stripe 后台创建优惠券](#在-stripe-后台创建优惠券)
3. [API 调用方式](#api-调用方式)
4. [前端集成示例](#前端集成示例)
5. [优惠券验证逻辑](#优惠券验证逻辑)
6. [数据库记录](#数据库记录)
7. [测试方法](#测试方法)
8. [常见问题](#常见问题)
9. [故障排查](#故障排查)

---

## 功能概述

### 支持的功能

✅ **优惠券自动应用**：前端传递优惠券码，后端验证后自动应用到 Stripe Checkout
✅ **优惠券验证**：检查优惠券有效性、使用次数、过期时间
✅ **手动输入兜底**：如果不传优惠券码，用户可在 Stripe 页面手动输入
✅ **数据记录**：优惠券信息记录到订单 metadata 中

### 技术架构

```
前端 → API (/api/subscription/create-checkout)
        ↓
    验证优惠券 (validateCouponCode)
        ↓
    创建 Checkout Session (带优惠券)
        ↓
    Stripe Checkout 页面（折扣已应用）
```

---

## 在 Stripe 后台创建优惠券

### 步骤 1：登录 Stripe Dashboard

访问：[https://dashboard.stripe.com/](https://dashboard.stripe.com/)

### 步骤 2：创建 Coupon

1. 进入左侧菜单：**Products** → **Coupons**
2. 点击右上角：**+ Create coupon** 按钮

### 步骤 3：配置优惠券参数

#### 基础设置

| 字段 | 说明 | 示例 |
|------|------|------|
| **Name** | 优惠券内部名称（仅后台可见） | `2024 夏季促销` |
| **ID** | 优惠券唯一标识符（可选） | `summer_2024` |

#### 折扣类型

**选项 1：百分比折扣**
```
Percentage discount: 20%
→ 用户支付 80% 的价格
```

**选项 2：固定金额折扣**
```
Fixed amount discount: $5.00
Currency: USD
→ 用户支付价格减 $5
```

#### 持续时间（Duration）

| 类型 | 说明 | 适用场景 |
|------|------|----------|
| **Once** | 只优惠一次 | 首月优惠、新用户折扣 |
| **Forever** | 永久优惠 | 长期折扣、VIP 用户 |
| **Repeating** | 重复 N 个月 | 前 3 个月享受折扣 |

#### 高级设置

| 字段 | 说明 | 示例 |
|------|------|------|
| **Redeem by** | 优惠券过期日期 | `2024-12-31 23:59` |
| **Max number of redemptions** | 最多使用次数 | `100`（前 100 名用户可用） |
| **Minimum order value** | 最低订单金额 | `$20.00`（订单 ≥ $20 才能使用） |

### 步骤 4：创建 Promotion Code

创建完 Coupon 后，需要创建对应的 **Promotion Code**（这是用户实际输入的优惠码）：

1. 在 Coupon 详情页，点击 **+ New promotion code**
2. 设置：
   - **Promotion code**: 用户输入的优惠码（例如：`SUMMER2024`）
   - **Active**: 勾选启用
   - **Customer-facing description**: 优惠说明（可选）
   - **Minimum amount**: 最低金额限制（可选）
   - **Expires at**: 过期时间（可选）
3. 点击 **Create**

### 示例配置

#### 示例 1：新用户首月 20% 折扣
```yaml
Coupon:
  Name: "新用户首月优惠"
  Type: Percentage (20%)
  Duration: Once

Promotion Code:
  Code: "WELCOME20"
  Active: Yes
  Expires at: 2024-12-31
```

#### 示例 2：年付用户立减 $50
```yaml
Coupon:
  Name: "年付优惠"
  Type: Fixed amount ($50.00)
  Duration: Once
  Minimum order value: $100.00

Promotion Code:
  Code: "ANNUAL50"
  Active: Yes
```

#### 示例 3：前 3 个月享 15% 折扣
```yaml
Coupon:
  Name: "前三个月优惠"
  Type: Percentage (15%)
  Duration: Repeating (3 months)

Promotion Code:
  Code: "SAVE3MONTHS"
  Active: Yes
  Max redemptions: 500
```

---

## API 调用方式

### 接口信息

```
POST /api/subscription/create-checkout
Content-Type: application/json
Authorization: 需要用户登录 session
```

### 请求参数

```typescript
{
  plan_id: 'lite' | 'pro' | 'premium',      // 必填：订阅计划
  billing_cycle: 'monthly' | 'annual',      // 必填：计费周期
  success_url?: string,                      // 可选：成功后跳转 URL
  cancel_url?: string,                       // 可选：取消后跳转 URL
  coupon_code?: string                       // 可选：优惠券码
}
```

### 响应格式

#### 成功响应
```json
{
  "success": true,
  "checkout_url": "https://checkout.stripe.com/c/pay/cs_test_...",
  "session_id": "cs_test_a1b2c3..."
}
```

#### 失败响应
```json
{
  "success": false,
  "error": "Invalid or expired coupon code"
}
```

### 错误码说明

| 错误信息 | 原因 | 解决方法 |
|---------|------|---------|
| `Invalid or expired coupon code` | 优惠券不存在或已过期 | 检查优惠券码是否正确，在 Stripe 后台确认状态 |
| `Coupon code has been fully redeemed` | 使用次数已达上限 | 检查优惠券的 Max redemptions 设置 |
| `Coupon code has expired` | 优惠券已过期 | 检查优惠券的 Expires at 设置 |
| `Unauthorized` | 用户未登录 | 确保请求带有有效的 session |
| `Invalid plan selected` | 计划 ID 错误 | 检查 plan_id 参数 |

---

## 前端集成示例

### 示例 1：基础调用

```typescript
// 任何前端页面都可以调用
async function createCheckoutWithCoupon(planId: string, billingCycle: string, couponCode?: string) {
  try {
    const response = await fetch('/api/subscription/create-checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        plan_id: planId,
        billing_cycle: billingCycle,
        coupon_code: couponCode, // 传递优惠券码
      }),
    });

    const data = await response.json();

    if (data.success) {
      // 跳转到 Stripe Checkout（优惠券已自动应用）
      window.location.href = data.checkout_url;
    } else {
      // 显示错误信息
      alert(`Error: ${data.error}`);
    }
  } catch (error) {
    console.error('Failed to create checkout:', error);
    alert('Failed to create checkout session');
  }
}

// 使用示例
createCheckoutWithCoupon('pro', 'monthly', 'SUMMER2024');
```

### 示例 2：从 URL 参数读取优惠券码

```typescript
'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

export default function PricingPage() {
  const searchParams = useSearchParams();
  const couponCode = searchParams.get('coupon'); // 从 URL 读取 ?coupon=SUMMER2024
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async (planId: string, billingCycle: string) => {
    setLoading(true);

    const response = await fetch('/api/subscription/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan_id: planId,
        billing_cycle: billingCycle,
        ...(couponCode && { coupon_code: couponCode }), // 如果有优惠券码则传递
      }),
    });

    const data = await response.json();
    setLoading(false);

    if (data.success) {
      window.location.href = data.checkout_url;
    } else {
      alert(data.error);
    }
  };

  return (
    <div>
      {couponCode && (
        <div className="bg-green-100 p-4 rounded mb-4">
          优惠券码：<strong>{couponCode}</strong> 已自动应用
        </div>
      )}

      <button onClick={() => handleSubscribe('pro', 'monthly')}>
        订阅 Pro 计划
      </button>
    </div>
  );
}
```

### 示例 3：优惠券输入框

```typescript
'use client';

import { useState } from 'react';

export default function CouponInput() {
  const [couponCode, setCouponCode] = useState('');
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState('');

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;

    setValidating(true);
    setError('');

    const response = await fetch('/api/subscription/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan_id: 'pro',
        billing_cycle: 'monthly',
        coupon_code: couponCode,
      }),
    });

    const data = await response.json();
    setValidating(false);

    if (data.success) {
      // 跳转到 Stripe Checkout
      window.location.href = data.checkout_url;
    } else {
      // 显示错误
      setError(data.error);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label>优惠券码</label>
        <input
          type="text"
          value={couponCode}
          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
          placeholder="输入优惠券码（例如：SUMMER2024）"
          className="border p-2 rounded w-full"
        />
      </div>

      {error && (
        <div className="text-red-500">{error}</div>
      )}

      <button
        onClick={handleApplyCoupon}
        disabled={validating || !couponCode.trim()}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        {validating ? '验证中...' : '应用优惠券并结账'}
      </button>
    </div>
  );
}
```

### 示例 4：营销活动页面

```typescript
// 场景：用户点击营销邮件中的链接 → 访问 /pricing?campaign=summer&coupon=SUMMER2024
'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function CampaignPricing() {
  const searchParams = useSearchParams();
  const campaign = searchParams.get('campaign');
  const coupon = searchParams.get('coupon');
  const [discount, setDiscount] = useState<string | null>(null);

  useEffect(() => {
    // 可以根据活动显示不同的折扣信息
    if (campaign === 'summer' && coupon === 'SUMMER2024') {
      setDiscount('Summer Sale: 20% OFF');
    }
  }, [campaign, coupon]);

  const handleSubscribe = async (planId: string) => {
    const response = await fetch('/api/subscription/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan_id: planId,
        billing_cycle: 'monthly',
        coupon_code: coupon,
      }),
    });

    const data = await response.json();
    if (data.success) {
      window.location.href = data.checkout_url;
    }
  };

  return (
    <div>
      {discount && (
        <div className="bg-yellow-100 border-2 border-yellow-400 p-6 rounded-lg mb-6">
          <h2 className="text-2xl font-bold mb-2">🎉 {discount}</h2>
          <p>使用优惠券码：<code className="bg-white px-2 py-1 rounded">{coupon}</code></p>
        </div>
      )}

      <button onClick={() => handleSubscribe('pro')}>
        订阅 Pro 计划 {discount && '（享受折扣）'}
      </button>
    </div>
  );
}
```

---

## 优惠券验证逻辑

### 验证流程

```typescript
// 文件：lib/subscription/stripe-config.ts
export async function validateCouponCode(code: string): Promise<{
  valid: boolean;
  promotionCodeId?: string;
  discountAmount?: number;
  discountPercent?: number;
  error?: string;
}> {
  try {
    // 1. 查询 Stripe 中的 Promotion Code
    const promotionCodes = await stripe.promotionCodes.list({
      code: code,
      active: true,
      limit: 1,
    });

    if (promotionCodes.data.length === 0) {
      return {
        valid: false,
        error: 'Invalid or expired coupon code'
      };
    }

    const promotionCode = promotionCodes.data[0];

    // 2. 检查使用次数限制
    if (promotionCode.max_redemptions &&
        promotionCode.times_redeemed >= promotionCode.max_redemptions) {
      return {
        valid: false,
        error: 'Coupon code has been fully redeemed'
      };
    }

    // 3. 检查有效期
    if (promotionCode.expires_at && promotionCode.expires_at * 1000 < Date.now()) {
      return {
        valid: false,
        error: 'Coupon code has expired'
      };
    }

    // 4. 获取折扣信息
    const coupon = promotionCode.coupon;
    let discountAmount: number | undefined;
    let discountPercent: number | undefined;

    if (coupon.amount_off) {
      discountAmount = coupon.amount_off; // 固定金额折扣（分）
    }
    if (coupon.percent_off) {
      discountPercent = coupon.percent_off; // 百分比折扣
    }

    return {
      valid: true,
      promotionCodeId: promotionCode.id,
      discountAmount,
      discountPercent,
    };
  } catch (error) {
    console.error('Error validating coupon code:', error);
    return {
      valid: false,
      error: 'Failed to validate coupon code'
    };
  }
}
```

### 应用优惠券到 Checkout

```typescript
// 文件：lib/subscription/stripe-config.ts
export async function createCheckoutSession({
  customerId,
  planName,
  amount,
  billingCycle,
  successUrl,
  cancelUrl,
  userUuid,
  planId,
  promotionCodeId, // ← 优惠券 ID
}: {
  // ... 参数类型
  promotionCodeId?: string;
}): Promise<Stripe.Checkout.Session> {
  const sessionConfig: Stripe.Checkout.SessionCreateParams = {
    customer: customerId,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: { name: planName },
          unit_amount: amount,
          recurring: {
            interval: billingCycle === 'monthly' ? 'month' : 'year',
          },
        },
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    // ... 其他配置
  };

  // 关键逻辑：有优惠券码自动应用，否则显示输入框
  if (promotionCodeId) {
    sessionConfig.discounts = [{
      promotion_code: promotionCodeId,
    }];
  } else {
    sessionConfig.allow_promotion_codes = true;
  }

  const session = await stripe.checkout.sessions.create(sessionConfig);
  return session;
}
```

---

## 数据库记录

### 订单表记录

优惠券信息会记录到 `subscription_orders` 表的 `metadata` 字段中：

```json
{
  "plan_name": "Pro",
  "dynamic_product_name": "VidFab Pro - Monthly",
  "amount_cents": 2900,
  "coupon": {
    "code": "SUMMER2024",
    "discountAmount": 500,
    "discountPercent": null
  },
  "checkout_session_id": "cs_test_a1b2c3...",
  "checkout_url": "https://checkout.stripe.com/..."
}
```

### 查询优惠券使用记录

```sql
-- 查询使用了优惠券的订单
SELECT
  id,
  user_uuid,
  plan_id,
  amount_cents,
  metadata->>'coupon' as coupon_info,
  status,
  created_at
FROM subscription_orders
WHERE metadata ? 'coupon'
ORDER BY created_at DESC;

-- 统计特定优惠券的使用情况
SELECT
  metadata->'coupon'->>'code' as coupon_code,
  COUNT(*) as usage_count,
  SUM(amount_cents) as total_amount,
  AVG(amount_cents) as avg_amount
FROM subscription_orders
WHERE metadata ? 'coupon'
  AND status = 'completed'
GROUP BY metadata->'coupon'->>'code'
ORDER BY usage_count DESC;
```

---

## 测试方法

### 1. 单元测试优惠券验证

```typescript
// tests/coupon-validation.test.ts
import { validateCouponCode } from '@/lib/subscription/stripe-config';

describe('Coupon Validation', () => {
  it('should validate a valid coupon code', async () => {
    const result = await validateCouponCode('TESTCODE20');

    expect(result.valid).toBe(true);
    expect(result.promotionCodeId).toBeDefined();
    expect(result.discountPercent).toBe(20);
  });

  it('should reject invalid coupon code', async () => {
    const result = await validateCouponCode('INVALIDCODE');

    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid or expired coupon code');
  });

  it('should reject expired coupon code', async () => {
    const result = await validateCouponCode('EXPIRED2023');

    expect(result.valid).toBe(false);
    expect(result.error).toBe('Coupon code has expired');
  });
});
```

### 2. API 端到端测试

```bash
# 测试有效优惠券
curl -X POST http://localhost:3000/api/subscription/create-checkout \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "plan_id": "pro",
    "billing_cycle": "monthly",
    "coupon_code": "SUMMER2024"
  }'

# 期望响应：
# {
#   "success": true,
#   "checkout_url": "https://checkout.stripe.com/...",
#   "session_id": "cs_test_..."
# }

# 测试无效优惠券
curl -X POST http://localhost:3000/api/subscription/create-checkout \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "plan_id": "pro",
    "billing_cycle": "monthly",
    "coupon_code": "INVALID"
  }'

# 期望响应：
# {
#   "success": false,
#   "error": "Invalid or expired coupon code"
# }
```

### 3. Stripe 测试模式优惠券

在 Stripe 测试模式下创建测试优惠券：

```yaml
测试优惠券 1:
  Code: "TEST20"
  Type: 20% off
  Duration: Once

测试优惠券 2:
  Code: "SAVE10"
  Type: $10.00 off
  Duration: Forever

测试优惠券 3:
  Code: "EXPIRED"
  Type: 50% off
  Duration: Once
  Expires at: 2023-12-31 (已过期)
```

### 4. 完整支付流程测试

1. ✅ 创建测试优惠券 `TEST20`（20% 折扣）
2. ✅ 前端调用 API，传递 `coupon_code: "TEST20"`
3. ✅ API 返回 `success: true` 和 `checkout_url`
4. ✅ 打开 Stripe Checkout 页面
5. ✅ 确认页面显示折扣：
   ```
   Pro Plan - Monthly: $29.00
   Discount (TEST20): -$5.80
   Total: $23.20
   ```
6. ✅ 使用测试卡完成支付：`4242 4242 4242 4242`
7. ✅ 检查数据库订单记录是否包含优惠券信息
8. ✅ 验证 Stripe Dashboard 中是否记录了优惠券使用

---

## 常见问题

### Q1：优惠券码不区分大小写吗？

**A：** Stripe 的优惠券码是**区分大小写**的。建议：
- 创建优惠券时使用大写（例如：`SUMMER2024`）
- 前端输入时自动转换为大写：`couponCode.toUpperCase()`

### Q2：用户可以同时使用多个优惠券吗？

**A：** 不可以。Stripe 每个 Checkout Session 只支持一个优惠券。如果需要叠加折扣，需要在创建优惠券时计算好最终折扣率。

### Q3：优惠券可以用于订阅续费吗？

**A：** 取决于优惠券的 **Duration** 设置：
- `Once`：只优惠首次支付
- `Forever`：每次续费都优惠
- `Repeating`：前 N 次续费优惠

### Q4：如何限制优惠券只能给新用户使用？

**A：** 有两种方式：
1. **后端逻辑**：在 `validateCouponCode` 中检查用户的订阅历史
2. **Stripe 设置**：在优惠券的 `Customer eligibility` 中设置 `New customers only`

```typescript
// 示例：限制新用户
if (coupon_code === 'NEWUSER20') {
  // 检查用户是否有历史订阅
  const { data: existingOrders } = await supabaseAdmin
    .from('subscription_orders')
    .select('id')
    .eq('user_uuid', userUuid)
    .eq('status', 'completed')
    .limit(1);

  if (existingOrders && existingOrders.length > 0) {
    return {
      success: false,
      error: 'This coupon is only available for new customers',
    };
  }
}
```

### Q5：优惠券使用后可以退款吗？

**A：** 可以。在 Stripe Dashboard 中退款时，优惠券会自动恢复使用次数（如果设置了 `max_redemptions`）。

### Q6：如何统计优惠券的 ROI？

**A：** 查询订单表，计算优惠券带来的收入：

```sql
SELECT
  metadata->'coupon'->>'code' as coupon_code,
  COUNT(*) as orders,
  SUM(amount_cents) / 100.0 as total_revenue_usd,
  AVG(amount_cents) / 100.0 as avg_order_value_usd
FROM subscription_orders
WHERE
  metadata ? 'coupon'
  AND status = 'completed'
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY metadata->'coupon'->>'code'
ORDER BY total_revenue_usd DESC;
```

---

## 故障排查

### 问题 1：API 返回 "Invalid or expired coupon code"

**可能原因：**
- 优惠券码拼写错误（注意大小写）
- 优惠券在 Stripe 后台未激活（Active = No）
- 优惠券已过期（检查 Expires at）
- 使用次数已达上限（检查 Max redemptions）

**排查步骤：**
1. 登录 Stripe Dashboard
2. 进入 **Products** → **Coupons**
3. 搜索优惠券码
4. 检查状态：
   - ✅ Active = Yes
   - ✅ Expires at 未过期
   - ✅ Times redeemed < Max redemptions

### 问题 2：Stripe Checkout 页面没有显示折扣

**可能原因：**
- 优惠券码未成功传递到后端
- 后端验证失败但前端未处理错误
- Promotion Code ID 错误

**排查步骤：**
1. 打开浏览器开发者工具（F12）
2. 查看 Network 面板中的 API 请求
3. 检查请求 body 是否包含 `coupon_code`
4. 检查响应是否 `success: true`
5. 查看后端日志中的错误信息

### 问题 3：优惠券验证很慢

**可能原因：**
- Stripe API 调用延迟
- 未使用缓存

**优化方案：**

```typescript
// 添加缓存机制
import NodeCache from 'node-cache';
const couponCache = new NodeCache({ stdTTL: 300 }); // 5 分钟缓存

export async function validateCouponCode(code: string) {
  // 先检查缓存
  const cached = couponCache.get(code);
  if (cached) {
    return cached;
  }

  // 调用 Stripe API
  const result = await stripe.promotionCodes.list({ code, active: true });

  // 存入缓存
  if (result.data.length > 0) {
    couponCache.set(code, result);
  }

  return result;
}
```

### 问题 4：优惠券在订单表中没有记录

**可能原因：**
- 订单创建时 metadata 未正确保存
- 数据库 metadata 字段类型错误（应该是 JSONB）

**排查步骤：**
```sql
-- 检查订单表结构
\d subscription_orders

-- 查看最近的订单
SELECT id, metadata FROM subscription_orders
ORDER BY created_at DESC
LIMIT 5;
```

### 问题 5：测试模式的优惠券在生产环境无法使用

**原因：**
Stripe 的测试模式和生产模式数据是**完全隔离**的。

**解决方法：**
1. 在 Stripe 生产模式下重新创建优惠券
2. 确保使用正确的 API Key：
   - 测试：`sk_test_...`
   - 生产：`sk_live_...`

---

## 附录

### A. 相关文件清单

| 文件路径 | 说明 |
|---------|------|
| `app/api/subscription/create-checkout/route.ts` | API 端点，接收优惠券码 |
| `lib/subscription/stripe-config.ts` | Stripe 配置，优惠券验证逻辑 |
| `lib/subscription/subscription-service.ts` | 订阅服务，优惠券业务逻辑 |
| `lib/subscription/types.ts` | TypeScript 类型定义 |

### B. Stripe API 文档链接

- [Promotion Codes API](https://stripe.com/docs/api/promotion_codes)
- [Coupons API](https://stripe.com/docs/api/coupons)
- [Checkout Session Discounts](https://stripe.com/docs/api/checkout/sessions/create#create_checkout_session-discounts)

### C. 优惠券命名建议

| 场景 | 命名示例 | 说明 |
|------|---------|------|
| 季节促销 | `SUMMER2024`, `WINTER20` | 简洁明了 |
| 节日优惠 | `NEWYEAR25`, `BLACKFRIDAY` | 易于记忆 |
| 新用户 | `WELCOME20`, `NEWUSER` | 表明适用人群 |
| 会员专属 | `VIP50`, `PREMIUM10` | 区分用户等级 |
| 限时活动 | `FLASH24H`, `WEEKEND15` | 强调紧迫性 |
| 推荐奖励 | `REFERRAL20`, `INVITE10` | 明确来源 |

---

**文档版本**：v1.0
**最后更新**：2024-11-17
**维护者**：VidFab 开发团队

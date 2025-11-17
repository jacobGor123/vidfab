# VidFab 优惠券实现完整指南

## 概述

VidFab 的优惠券实现采用了 **Stripe 原生优惠券系统**，用户在 Stripe Checkout 页面直接输入优惠券码。本文档提供完整的实现细节和扩展建议。

---

## 1. 优惠券在支付流程中的位置

### 1.1 完整的支付流程

```
用户浏览定价页面
    ↓
选择计划和计费周期（月付/年付）
    ↓
点击 "Get Started" 或 "Subscribe" 按钮
    ↓
【步骤1】前端调用：POST /api/subscription/create-checkout
    ↓
【步骤2】后端返回 checkout_url
    ↓
【步骤3】前端重定向到 Stripe Checkout 页面
    ↓
【步骤4】用户在 Stripe 页面输入优惠券码  ← 优惠券在这里！
    ↓
【步骤5】Stripe 验证优惠券并应用折扣
    ↓
【步骤6】用户输入支付信息并完成支付
    ↓
【步骤7】Stripe 触发 webhook: checkout.session.completed
    ↓
【步骤8】后端处理 webhook，更新用户状态和积分
    ↓
【步骤9】用户重定向回应用，显示成功提示
```

### 1.2 优惠券的关键点

- **位置**: Stripe Checkout 页面（不在 VidFab 前端）
- **输入方式**: 用户在 Stripe 页面的"优惠券"输入框中输入
- **验证**: 由 Stripe 完全处理
- **折扣应用**: 自动应用到最终价格

---

## 2. 当前实现详解

### 2.1 启用优惠券的代码

**文件**: `/lib/subscription/stripe-config.ts`

**关键配置**:
```typescript
// 第 110-173 行
export async function createCheckoutSession({
  customerId,
  planName,
  amount,
  currency = 'usd',
  billingCycle,
  successUrl,
  cancelUrl,
  userUuid,
  planId,
}): Promise<Stripe.Checkout.Session> {
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: currency,
          product_data: {
            name: planName,
          },
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
    subscription_data: {
      metadata: {
        user_uuid: userUuid,
        plan_id: planId,
        billing_cycle: billingCycle,
      },
    },
    metadata: {
      user_uuid: userUuid,
      plan_id: planId,
      billing_cycle: billingCycle,
    },
    allow_promotion_codes: true,  // ← 这一行启用了优惠券支持
    billing_address_collection: 'auto',
    customer_update: {
      address: 'auto',
      name: 'auto',
    },
  });

  return session;
}
```

**解释**:
- `allow_promotion_codes: true` - 这是唯一需要的配置
- Stripe 会在 Checkout 页面自动显示"优惠券"输入框
- Stripe 会自动验证输入的优惠券码

### 2.2 创建 Checkout 的完整流程

**文件**: `/lib/subscription/subscription-service.ts` (第 34-153 行)

```typescript
async createCheckoutSession(
  userUuid: string,
  request: CreateCheckoutSessionRequest
): Promise<CreateCheckoutSessionResponse> {
  try {
    const { plan_id, billing_cycle, success_url, cancel_url } = request

    // 验证计划
    if (plan_id === 'free') {
      return {
        success: false,
        error: 'Cannot create checkout session for free plan',
      }
    }

    const planConfig = getPlanConfig(plan_id)
    if (!planConfig) {
      return {
        success: false,
        error: 'Invalid plan selected',
      }
    }

    // 获取用户信息
    const { data: user, error: userError } = await supabaseAdmin
      .from(TABLES.USERS)
      .select('email, nickname')
      .eq('uuid', userUuid)
      .single()

    if (userError || !user) {
      return {
        success: false,
        error: 'User not found',
      }
    }

    // 创建或获取 Stripe 客户
    const stripeCustomer = await createOrGetStripeCustomer(
      user.email,
      user.nickname,
      { user_uuid: userUuid }
    )

    // 准备产品信息
    const planName = `VidFab ${planConfig.name} - ${billing_cycle === 'monthly' ? 'Monthly' : 'Annual'}`
    const amount = planConfig.price[billing_cycle]

    // 创建订单记录（在数据库中保存订单）
    const { data: order, error: orderError } = await supabaseAdmin
      .from('subscription_orders')
      .insert({
        user_uuid: userUuid,
        order_type: 'subscription',
        plan_id,
        billing_cycle,
        amount_cents: amount,  // 优惠券后的实际金额由 Stripe 处理
        credits_included: billing_cycle === 'annual' ? planConfig.credits * 12 : planConfig.credits,
        status: 'pending',
        stripe_customer_id: stripeCustomer.id,
        metadata: {
          plan_name: planConfig.name,
          dynamic_product_name: planName,
          amount_cents: amount,
        },
      })
      .select()
      .single()

    if (orderError) {
      console.error('Error creating order:', orderError)
      return {
        success: false,
        error: 'Failed to create order',
      }
    }

    // 创建 Stripe Checkout Session
    // 这里会包含 allow_promotion_codes: true
    const session = await createCheckoutSession({
      customerId: stripeCustomer.id,
      planName,
      amount,
      currency: 'usd',
      billingCycle: billing_cycle,
      successUrl: success_url || `${process.env.NEXT_PUBLIC_APP_URL}/create?tool=my-profile&payment_success=true&session_id={CHECKOUT_SESSION_ID}&plan=${plan_id}`,
      cancelUrl: cancel_url || `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
      userUuid,
      planId: plan_id,
    })

    // 更新订单记录，保存 Checkout Session ID
    await supabaseAdmin
      .from('subscription_orders')
      .update({
        stripe_checkout_session_id: session.id,
        metadata: {
          ...order.metadata,
          checkout_session_id: session.id,
          checkout_url: session.url,
        },
      })
      .eq('id', order.id)

    return {
      success: true,
      checkout_url: session.url!,
      session_id: session.id,
    }

  } catch (error: any) {
    console.error('Error creating checkout session:', error)
    return {
      success: false,
      error: error.message || 'Failed to create checkout session',
    }
  }
}
```

**关键点**:
1. 订单记录中的 `amount_cents` 是原始价格（不含优惠券折扣）
2. Stripe 会在其系统中处理优惠券，最终收费金额由 Stripe 决定
3. Webhook 中获取的 Session 对象会包含最终的折扣后金额

### 2.3 Webhook 中的优惠券处理

**文件**: `/app/api/subscription/webhook/route.ts`

```typescript
export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const signature = headers().get('stripe-signature')

    if (!signature) {
      console.error('[WEBHOOK] Missing Stripe signature')
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      )
    }

    // 验证 webhook 签名（重要！）
    let event: Stripe.Event
    try {
      event = verifyWebhookSignature(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      )
    } catch (err: any) {
      console.error('[WEBHOOK] Signature verification failed:', err.message)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    // 处理 checkout.session.completed 事件
    // 此时 Stripe 已经处理了优惠券，金额已折扣
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSession(event.data.object as Stripe.Checkout.Session)
        // event.data.object 中包含的信息：
        // - payment_status: 'paid' (已支付)
        // - amount_subtotal: 原始金额
        // - amount_total: 最终金额（如果有优惠券，已应用折扣）
        // - total_details: 包含折扣详情
        break
      // ... 其他事件处理
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
```

---

## 3. Checkout Session 中的优惠券信息

当用户在 Stripe Checkout 页面应用优惠券码后，最终的 Checkout Session 对象会包含以下信息：

### 3.1 Stripe 返回的数据结构

```typescript
interface StripeCheckoutSession {
  id: string;
  object: 'checkout.session';
  
  // 支付信息
  payment_status: 'paid' | 'unpaid' | 'no_payment_required';
  
  // 金额信息
  amount_subtotal: number;  // 原始金额（单位：分）
  amount_total: number;     // 最终金额（应用优惠券后）
  
  // 优惠券/折扣信息
  total_details: {
    amount_discount: number;  // 折扣金额
    amount_shipping: number;
    amount_tax: number;
  };
  
  // 此字段在应用优惠券后会被填充
  discounts?: Array<{
    object: 'discount';
    coupon: {
      id: string;
      object: 'coupon';
      percent_off?: number;
      amount_off?: number;
      // ... 其他优惠券信息
    };
    // ... 其他折扣信息
  }>;
  
  // 其他字段...
  customer: string;
  subscription: string;
  metadata: {
    user_uuid: string;
    plan_id: string;
    billing_cycle: string;
  };
}
```

### 3.2 在 handleCheckoutSession 中访问优惠券信息

**文件**: `/lib/subscription/checkout-handler.ts`

```typescript
export async function handleCheckoutSession(session: Stripe.Checkout.Session): Promise<void> {
  try {
    // 检查支付状态
    if (session.payment_status !== 'paid') {
      console.log('[CHECKOUT] Payment not completed, skipping')
      return
    }

    // 获取优惠券信息（如果有）
    const discountAmount = session.total_details?.amount_discount || 0
    const finalAmount = session.amount_total || 0
    const originalAmount = session.amount_subtotal || 0

    if (discountAmount > 0) {
      console.log('[CHECKOUT] Discount applied:', {
        originalAmount: originalAmount / 100,
        discountAmount: discountAmount / 100,
        finalAmount: finalAmount / 100,
        discountPercent: ((discountAmount / originalAmount) * 100).toFixed(2) + '%'
      })
    }

    // 获取 metadata
    const userUuid = session.metadata?.user_uuid
    const planId = session.metadata?.plan_id
    const billingCycle = session.metadata?.billing_cycle

    if (!userUuid || !planId) {
      console.error('[CHECKOUT] Missing required metadata:', { userUuid, planId })
      return
    }

    const subscriptionId = session.subscription as string
    if (!subscriptionId) {
      console.error('[CHECKOUT] No subscription ID in session')
      return
    }

    // 获取用户
    const user = await getUserByUuid(userUuid)
    if (!user) {
      console.error('[CHECKOUT] User not found:', userUuid)
      return
    }

    // 计算积分
    const PLAN_CREDITS: Record<string, number> = {
      'lite': 300,
      'pro': 1000,
      'premium': 2000,
    }

    const creditsToAdd = PLAN_CREDITS[planId] || 0
    const currentCredits = user.credits_remaining || 0
    const newCreditsBalance = currentCredits + creditsToAdd

    // 更新用户
    const updateData = {
      subscription_plan: planId,
      subscription_status: 'active',
      subscription_stripe_id: subscriptionId,
      credits_remaining: newCreditsBalance,
      updated_at: new Date().toISOString(),
    }

    await updateUser(userUuid, updateData)

    console.log(`✅ [CHECKOUT] User updated: ${userUuid}`, {
      credits: `${currentCredits} → ${newCreditsBalance}`,
      discount: discountAmount > 0 ? `$${(discountAmount / 100).toFixed(2)}` : 'none'
    })

    // 更新订单状态
    const { supabaseAdmin, TABLES } = await import('@/lib/supabase')

    await supabaseAdmin
      .from('subscription_orders')
      .update({
        status: 'completed',
        stripe_subscription_id: subscriptionId,
        stripe_checkout_session_id: session.id,
        completed_at: new Date().toISOString(),
        // 可以在 metadata 中记录优惠券信息
        metadata: {
          discount_amount: discountAmount,
          final_amount: finalAmount,
          original_amount: originalAmount,
        },
      })
      .eq('user_uuid', userUuid)
      .eq('status', 'pending')
      .select()

  } catch (error: any) {
    console.error('[CHECKOUT] Error handling checkout session:', error)
    throw error
  }
}
```

---

## 4. 在 Stripe Dashboard 中创建优惠券

### 4.1 Coupon vs Promotion Code

Stripe 有两种优惠券类型：

#### Coupon（优惠券）
- 在 Stripe Dashboard 的 "Products" → "Coupons" 中创建
- 可以设置固定折扣或百分比折扣
- 可以设置过期时间
- 可以限制使用次数
- 示例：创建一个 "SAVE20" 优惠券，20% 折扣

#### Promotion Code（推广代码）
- 在 Stripe Dashboard 的 "Products" → "Promotion codes" 中创建
- 是关联到 Coupon 的客户友好型代码
- 可以设置不同的推广规则
- 示例：创建一个推广代码 "VIDFAB2024"，关联到 "SAVE20" 优惠券

### 4.2 Stripe Dashboard 操作步骤

**创建 Coupon**:
1. 登录 [Stripe Dashboard](https://dashboard.stripe.com)
2. 进入 "Products" → "Coupons"
3. 点击 "Create coupon"
4. 选择折扣类型：
   - Percentage: 20%
   - Fixed amount: $10.00
5. 设置有效期（可选）
6. 设置最大使用次数（可选）
7. 点击 "Create coupon"

**创建 Promotion Code**:
1. 进入 "Products" → "Promotion codes"
2. 点击 "Create promotion code"
3. 选择关联的 Coupon
4. 输入 promotion code（如 "VIDFAB2024"）
5. 设置有效期
6. 点击 "Create"

---

## 5. 高级实现：前端优惠券验证

如果需要在前端显示优惠券预览（优惠后的价格），可以实现以下功能：

### 5.1 添加优惠券验证 API

**新文件**: `/app/api/subscription/validate-coupon/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Coupon code required' },
        { status: 400 }
      );
    }

    // 搜索 Promotion Code
    const promos = await stripe.promotionCodes.list({
      code: code.toUpperCase(),
      limit: 1,
    });

    if (promos.data.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Coupon code not found' },
        { status: 400 }
      );
    }

    const promo = promos.data[0];

    // 检查 Promotion Code 是否活跃
    if (!promo.active) {
      return NextResponse.json(
        { success: false, error: 'Coupon code is not active' },
        { status: 400 }
      );
    }

    // 获取关联的 Coupon 信息
    const coupon = await stripe.coupons.retrieve(promo.coupon.id as string);

    // 检查 Coupon 是否有效
    if (!coupon.valid) {
      return NextResponse.json(
        { success: false, error: 'Coupon is no longer valid' },
        { status: 400 }
      );
    }

    // 返回优惠券信息
    return NextResponse.json({
      success: true,
      coupon: {
        code: code.toUpperCase(),
        percent_off: coupon.percent_off,
        amount_off: coupon.amount_off,
        duration: coupon.duration,
        max_redemptions: coupon.max_redemptions,
        times_redeemed: coupon.times_redeemed,
        valid: coupon.valid,
      },
    });

  } catch (error: any) {
    console.error('Error validating coupon:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 5.2 在前端使用优惠券验证

**修改**: `/app/(main)/pricing/pricing-client.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import toast from 'react-hot-toast'

export default function PricingPage() {
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null)
  const [validatingCoupon, setValidatingCoupon] = useState(false)

  // 验证优惠券
  const validateCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error('Please enter a coupon code')
      return
    }

    setValidatingCoupon(true)
    try {
      const response = await fetch('/api/subscription/validate-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode }),
      })

      const data = await response.json()

      if (data.success) {
        setAppliedCoupon(data.coupon)
        toast.success(`✅ Coupon "${data.coupon.code}" applied!`)
      } else {
        setAppliedCoupon(null)
        toast.error(data.error || 'Invalid coupon code')
      }
    } catch (error: any) {
      console.error('Error validating coupon:', error)
      toast.error('Failed to validate coupon')
    } finally {
      setValidatingCoupon(false)
    }
  }

  // 计算折扣后的价格
  const getDiscountedPrice = (price: number, coupon: any) => {
    if (!coupon) return price

    if (coupon.percent_off) {
      return price * (1 - coupon.percent_off / 100)
    } else if (coupon.amount_off) {
      return Math.max(0, price - coupon.amount_off)
    }

    return price
  }

  // 渲染优惠券输入框
  return (
    <div>
      {/* ... 其他内容 ... */}

      {/* 优惠券输入框 */}
      <div className="my-8 p-4 bg-gray-900 rounded-lg border border-gray-700">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Have a coupon code?
        </label>
        <div className="flex gap-2">
          <Input
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
            placeholder="Enter coupon code..."
            disabled={validatingCoupon}
            className="bg-gray-800 border-gray-600"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                validateCoupon()
              }
            }}
          />
          <Button
            onClick={validateCoupon}
            disabled={validatingCoupon || !couponCode.trim()}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {validatingCoupon ? 'Validating...' : 'Apply'}
          </Button>
        </div>

        {/* 显示应用的优惠券信息 */}
        {appliedCoupon && (
          <div className="mt-3 p-3 bg-green-500/10 border border-green-500/30 rounded text-green-400 text-sm">
            {appliedCoupon.percent_off && (
              <p>Discount: {appliedCoupon.percent_off}% off</p>
            )}
            {appliedCoupon.amount_off && (
              <p>Discount: ${(appliedCoupon.amount_off / 100).toFixed(2)} off</p>
            )}
            {appliedCoupon.duration === 'repeating' && (
              <p className="text-xs mt-1">
                Valid for {appliedCoupon.duration_in_months} months
              </p>
            )}
          </div>
        )}
      </div>

      {/* ... 显示计划卡片时，如果有优惠券，显示折扣后的价格 ... */}
    </div>
  )
}
```

---

## 6. 数据库中记录优惠券信息

### 6.1 在订单表中记录优惠券

**修改订单 metadata**:

在 `/lib/subscription/checkout-handler.ts` 中，可以这样记录优惠券信息：

```typescript
// 更新订单时记录优惠券信息
await supabaseAdmin
  .from('subscription_orders')
  .update({
    status: 'completed',
    stripe_subscription_id: subscriptionId,
    stripe_checkout_session_id: session.id,
    completed_at: new Date().toISOString(),
    
    // 在 metadata 中记录优惠券详情
    metadata: {
      original_amount: session.amount_subtotal,
      final_amount: session.amount_total,
      discount_amount: session.total_details?.amount_discount || 0,
      
      // 如果需要记录优惠券代码，可以这样：
      coupon_code: session.discounts?.[0]?.coupon?.id || null,
      coupon_percent_off: session.discounts?.[0]?.coupon?.percent_off || null,
      coupon_amount_off: session.discounts?.[0]?.coupon?.amount_off || null,
    },
  })
  .eq('user_uuid', userUuid)
  .eq('status', 'pending')
```

### 6.2 创建优惠券使用记录表

如需详细跟踪优惠券使用，可以创建专门的表：

```sql
-- 新表：coupon_usage
CREATE TABLE public.coupon_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_uuid UUID NOT NULL REFERENCES public.users(uuid),
  coupon_code TEXT NOT NULL,
  coupon_id TEXT NOT NULL,  -- Stripe Coupon ID
  
  -- 折扣信息
  discount_type TEXT NOT NULL,  -- 'percent' | 'fixed'
  discount_value NUMERIC NOT NULL,  -- 20 表示 20% 或 20 美元
  
  -- 订单信息
  order_id UUID REFERENCES public.subscription_orders(id),
  subscription_id TEXT,  -- Stripe Subscription ID
  checkout_session_id TEXT,  -- Stripe Session ID
  
  -- 金额信息
  original_amount INTEGER NOT NULL,  -- 原始金额（分）
  discount_amount INTEGER NOT NULL,  -- 折扣金额（分）
  final_amount INTEGER NOT NULL,    -- 最终金额（分）
  
  -- 时间
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- 索引
  FOREIGN KEY (user_uuid) REFERENCES public.users(uuid)
);

CREATE INDEX idx_coupon_usage_user ON public.coupon_usage(user_uuid);
CREATE INDEX idx_coupon_usage_code ON public.coupon_usage(coupon_code);
CREATE INDEX idx_coupon_usage_created ON public.coupon_usage(created_at);
```

---

## 7. 最佳实践

### 7.1 优惠券码命名规范

```
VIDFAB2024Q1   - 2024 第一季度活动
VIDFAB_SAVE20  - 保存 20% 的通用代码
INFLUENCER_30  - 影响者专属，30% 折扣
NEWUSER_FIRST  - 新用户首次购买折扣
EARLYBIRD_25   - 早期用户优惠，25% 折扣
```

### 7.2 安全考虑

1. **不在前端暴露 Coupon ID**
   - 使用 Promotion Code（用户友好的代码）
   - 不要将 Stripe Coupon ID 发送给前端

2. **验证优惠券在服务器端**
   - 在 API 端验证，而不是在前端
   - 防止用户篡改优惠券

3. **记录审计日志**
   ```typescript
   // 在处理优惠券时记录日志
   console.log('[COUPON]', {
     user_uuid: userUuid,
     coupon_code: coupon?.id,
     discount_amount: discountAmount,
     timestamp: new Date().toISOString(),
   })
   ```

4. **监控异常使用**
   - 监控单个用户的优惠券使用次数
   - 检测异常的折扣模式

### 7.3 客户体验

1. **清晰的折扣展示**
   ```typescript
   // 在结账前显示最终价格
   Original: $29.99/month
   Discount: -$6.00 (20% off)
   Final: $23.99/month
   ```

2. **实时验证反馈**
   - 验证时显示加载状态
   - 成功时显示折扣详情
   - 失败时显示错误原因

3. **优惠券提示**
   - 在适当的时机提示用户输入优惠券（但不要强制）
   - 显示可用的优惠券类型（如果有营销活动）

---

## 8. 故障排查

### 问题 1: 优惠券在 Checkout 页面不显示

**原因**:
- `allow_promotion_codes` 未设置为 true

**解决**:
检查 `/lib/subscription/stripe-config.ts` 第 164 行
```typescript
allow_promotion_codes: true,  // 确保这一行存在
```

### 问题 2: 优惠券验证失败

**原因**:
- Coupon/Promotion Code 在 Stripe Dashboard 中不存在
- Coupon/Promotion Code 已过期或停用

**解决**:
1. 登录 Stripe Dashboard
2. 检查 "Products" → "Coupons" 和 "Promotion codes"
3. 确保代码存在且为活跃状态
4. 检查有效期设置

### 问题 3: Webhook 中无法获取折扣信息

**原因**:
- Webhook 接收的 Session 对象不包含折扣信息

**解决**:
使用以下方式在 webhook 中获取完整信息：
```typescript
// 从 Stripe 重新获取 Session（包含完整信息）
const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
  expand: ['discount', 'line_items'],
});

// 现在 fullSession 包含完整的折扣信息
const discountAmount = fullSession.total_details?.amount_discount || 0;
```

---

## 9. 相关 Stripe 文档链接

- [Stripe Coupons API](https://stripe.com/docs/api/coupons)
- [Stripe Promotion Codes](https://stripe.com/docs/api/promotion_codes)
- [Checkout Session with Discounts](https://stripe.com/docs/payments/checkout/discounts)
- [Webhook Events](https://stripe.com/docs/api/events/types)

---

## 10. 总结

### 当前状态
✅ 优惠券已在 Stripe Checkout 页面启用
✅ 用户可以输入优惠券码
✅ Stripe 自动处理验证和折扣应用

### 可选增强功能
- 前端优惠券验证 API
- 优惠券使用统计
- 营销活动管理
- 自动优惠券代码生成

### 关键文件
- `/lib/subscription/stripe-config.ts` - Stripe 配置
- `/lib/subscription/checkout-handler.ts` - Webhook 处理
- `/app/api/subscription/create-checkout/route.ts` - Checkout API
- `/app/(main)/pricing/pricing-client.tsx` - 定价页面


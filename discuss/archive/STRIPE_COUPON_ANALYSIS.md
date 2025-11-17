# VidFab Stripe 支付和优惠券实现分析

## 1. 项目结构概览

### 核心文件位置
```
/lib/subscription/              # 订阅系统核心逻辑
  ├── stripe-config.ts          # Stripe 配置和 API 调用
  ├── checkout-handler.ts       # Checkout 会话处理
  ├── subscription-service.ts   # 订阅业务逻辑
  ├── pricing-config.ts         # 定价和积分配置
  └── types.ts                  # TypeScript 类型定义

/app/api/subscription/          # 后端 API 端点
  ├── create-checkout/route.ts  # 创建 Checkout 会话
  ├── webhook/route.ts          # Stripe Webhook 处理
  ├── status/route.ts           # 获取订阅状态
  ├── manage/route.ts           # 管理订阅（升级、降级）
  ├── cancel/route.ts           # 取消订阅
  └── credits/                  # Credits 相关 API

/components/subscription/       # 订阅相关组件
  └── upgrade-dialog.tsx        # 升级对话框

/app/(main)/pricing/            # 定价页面
  └── pricing-client.tsx        # 定价页面逻辑

/hooks/
  └── use-subscription.ts       # 订阅状态管理 Hook

/components/
  └── payment-success-handler.tsx  # 支付成功处理
```

---

## 2. Stripe 支付流程详解

### 2.1 Stripe 初始化配置

**文件**: `/lib/subscription/stripe-config.ts` (行 1-30)

```typescript
import Stripe from 'stripe';

// 初始化Stripe客户端
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-09-30.acacia',
  typescript: true,
});

// Stripe 价格 ID 配置
export const STRIPE_PRICE_IDS = {
  lite: {
    monthly: process.env.STRIPE_PRICE_LITE_MONTHLY || 'price_lite_monthly',
    annual: process.env.STRIPE_PRICE_LITE_ANNUAL || 'price_lite_annual',
  },
  pro: {
    monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || 'price_pro_monthly',
    annual: process.env.STRIPE_PRICE_PRO_ANNUAL || 'price_pro_annual',
  },
  premium: {
    monthly: process.env.STRIPE_PRICE_PREMIUM_MONTHLY || 'price_premium_monthly',
    annual: process.env.STRIPE_PRICE_PREMIUM_ANNUAL || 'price_premium_annual',
  },
};
```

**关键点**:
- 使用环境变量存储 Stripe API Key
- 定义了三个付费计划：Lite、Pro、Premium
- 每个计划都有月付和年付两种选项

### 2.2 创建 Checkout 会话 - 支持优惠券码

**文件**: `/lib/subscription/stripe-config.ts` (行 110-173)

```typescript
/**
 * 创建Checkout会话 - 使用动态产品创建
 */
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
    allow_promotion_codes: true,  // ✅ 关键：允许优惠券码
    billing_address_collection: 'auto',
    customer_update: {
      address: 'auto',
      name: 'auto',
    },
  });

  return session;
}
```

**关键点**:
- **`allow_promotion_codes: true`** - 这是支持优惠券的关键配置
- 支持客户输入优惠券码（Coupon/Promotion Code）
- 使用动态产品创建，金额直接传递给 Stripe

---

## 3. 优惠券码流程

### 3.1 优惠券支持现状

✅ **已启用**: Stripe 结算页面上已启用优惠券支持
- 配置：`allow_promotion_codes: true`（见 stripe-config.ts 行 164）
- 效果：用户在 Stripe Checkout 页面可以输入优惠券码
- Stripe 会在结算页面显示"优惠券"输入框

### 3.2 优惠券码如何传递

**注意**: 当前实现中，**优惠券码不是通过前端传递给后端的**，而是由 Stripe 在结算页面处理。

流程：
```
前端 (pricing-client.tsx)
  ↓
发送 createCheckoutSession 请求
  ↓
后端 (/api/subscription/create-checkout/route.ts)
  ↓
调用 createCheckoutSession() 函数
  ↓
创建 Stripe Checkout Session（包含 allow_promotion_codes: true）
  ↓
返回 checkout_url
  ↓
用户重定向到 Stripe Checkout 页面
  ↓
用户可以在 Stripe 页面输入优惠券码
  ↓
Stripe 处理优惠券（应用折扣）
  ↓
用户完成支付
  ↓
Webhook: checkout.session.completed
```

**目前的设计**:
- 前端不需要发送优惠券码给后端
- 优惠券的应用、验证、折扣计算都由 Stripe 处理
- 后端只需要启用 `allow_promotion_codes: true` 即可

---

## 4. 前端实现详解

### 4.1 定价页面 - 处理订阅流程

**文件**: `/app/(main)/pricing/pricing-client.tsx` (行 164-223)

```typescript
const handleSubscribe = async (planId: 'lite' | 'pro' | 'premium') => {
  if (!session) {
    window.location.href = '/auth/signin'
    return
  }

  setSubscribing(planId)

  // GTM 事件跟踪
  const plan = SUBSCRIPTION_PLANS[planId]
  const value = annual ? plan.price.annual / 100 : plan.price.monthly / 100
  trackBeginCheckout(planId, annual ? 'annual' : 'monthly', value)

  try {
    const useTestMode = process.env.NEXT_PUBLIC_STRIPE_TEST_MODE === 'true'
    const endpoint = useTestMode
      ? '/api/subscription/create-checkout-test'
      : '/api/subscription/create-checkout'

    // 发送请求创建 Checkout 会话
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        plan_id: planId,
        billing_cycle: annual ? 'annual' : 'monthly',
        cancel_url: `${window.location.origin}/pricing`,
      }),
    })

    const data = await response.json()

    if (data.success && data.checkout_url) {
      // 跳转到 Stripe Checkout 页面
      window.location.href = data.checkout_url
    } else {
      alert(`Failed to start checkout process: ${data.error || 'Unknown error'}`)
    }
  } catch (error) {
    console.error('Error creating checkout session:', error)
    alert('Failed to start checkout process. Please try again.')
  } finally {
    setSubscribing(null)
  }
}
```

**关键点**:
- 不传递优惠券码给后端
- 依赖 Stripe 的客户端处理
- 使用 GTM 事件跟踪支付流程

### 4.2 升级对话框组件

**文件**: `/components/subscription/upgrade-dialog.tsx` (行 52-65)

```typescript
const handleUpgrade = async (planId: PlanId) => {
  if (!session?.user?.uuid || isUpgrading) return

  setIsUpgrading(true)
  try {
    await upgradeSubscription(planId, billingCycle)
    // 升级成功后会跳转到Stripe结账页面
  } catch (error: any) {
    console.error('升级失败:', error)
  } finally {
    setIsUpgrading(false)
  }
}
```

### 4.3 支付成功处理组件

**文件**: `/components/payment-success-handler.tsx` (全文)

```typescript
export function PaymentSuccessHandler() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const paymentSuccess = searchParams.get('payment_success')
    const plan = searchParams.get('plan')
    const sessionId = searchParams.get('session_id')

    if (paymentSuccess === 'true' && plan) {
      const toastKey = `payment-success-${sessionId || 'default'}`
      if (sessionStorage.getItem(toastKey)) {
        return
      }

      const planDisplayNames = {
        'lite': 'Lite',
        'pro': 'Pro',
        'premium': 'Premium'
      }

      const displayName = planDisplayNames[plan as keyof typeof planDisplayNames] || plan.charAt(0).toUpperCase() + plan.slice(1)

      toast.success(
        `🎉 Payment Successful! Welcome to VidFab ${displayName}! Your subscription is now active.`,
        { duration: 6000 }
      )

      sessionStorage.setItem(toastKey, 'shown')

      // 清理 URL 参数
      setTimeout(() => {
        const newUrl = window.location.pathname
        window.history.replaceState({}, '', newUrl)
      }, 1000)
    }
  }, [searchParams])

  return null
}
```

---

## 5. 后端 API 实现

### 5.1 创建 Checkout 会话 API

**文件**: `/app/api/subscription/create-checkout/route.ts`

```typescript
export async function POST(req: NextRequest) {
  try {
    // 验证用户身份
    const session = await getServerSession(authOptions)
    if (!session?.user?.uuid) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 解析请求体
    const body = await req.json()
    const validatedData = createCheckoutSchema.parse(body)

    // 创建checkout会话
    const result = await subscriptionService.createCheckoutSession(
      session.user.uuid,
      validatedData
    )

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      checkout_url: result.checkout_url,
      session_id: result.session_id,
    })
  } catch (error: any) {
    console.error('Error creating checkout session:', error)
    // ... 错误处理
  }
}
```

### 5.2 订阅服务 - 创建 Checkout 会话

**文件**: `/lib/subscription/subscription-service.ts` (行 34-153)

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

    // 创建或获取Stripe客户
    const stripeCustomer = await createOrGetStripeCustomer(
      user.email,
      user.nickname,
      { user_uuid: userUuid }
    )

    // 准备动态产品信息
    const planName = `VidFab ${planConfig.name} - ${billing_cycle === 'monthly' ? 'Monthly' : 'Annual'}`
    const amount = planConfig.price[billing_cycle]

    // 创建订单记录
    const { data: order, error: orderError } = await supabaseAdmin
      .from('subscription_orders')
      .insert({
        user_uuid: userUuid,
        order_type: 'subscription',
        plan_id,
        billing_cycle,
        amount_cents: amount,
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

    // 创建Stripe checkout会话
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

    // 更新订单记录
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

### 5.3 Webhook 处理

**文件**: `/app/api/subscription/webhook/route.ts` (行 1-72)

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

    // 验证webhook签名
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

    // 处理订阅事件
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSession(event.data.object as Stripe.Checkout.Session)
        break
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription)
        break
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
      default:
        console.log(`[WEBHOOK] Unhandled event type: ${event.type}`)
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

**关键点**:
- 验证 Webhook 签名（安全）
- 处理多个事件类型
- `checkout.session.completed` 是最重要的事件

### 5.4 Checkout 会话完成处理

**文件**: `/lib/subscription/checkout-handler.ts` (行 22-105)

```typescript
export async function handleCheckoutSession(session: Stripe.Checkout.Session): Promise<void> {
  try {
    // 检查支付状态
    if (session.payment_status !== 'paid') {
      console.log('[CHECKOUT] Payment not completed, skipping')
      return
    }

    // 从 session.metadata 获取信息
    let userUuid: string | undefined
    let planId: string | undefined
    let billingCycle: string | undefined

    if (session.metadata && Object.keys(session.metadata).length > 0) {
      userUuid = session.metadata.user_uuid
      planId = session.metadata.plan_id
      billingCycle = session.metadata.billing_cycle
    }

    if (!userUuid || !planId) {
      console.error('[CHECKOUT] Missing required metadata:', { userUuid, planId })
      return
    }

    const subscriptionId = session.subscription as string
    if (!subscriptionId) {
      console.error('[CHECKOUT] No subscription ID in session')
      return
    }

    console.log('[CHECKOUT] Processing payment:', {
      userUuid,
      planId,
      billingCycle,
      subscriptionId,
      sessionId: session.id,
    })

    // 获取用户信息
    const user = await getUserByUuid(userUuid)
    if (!user) {
      console.error('[CHECKOUT] User not found:', userUuid)
      return
    }

    // 计算要增加的积分
    const creditsToAdd = PLAN_CREDITS[planId] || 0
    if (creditsToAdd === 0) {
      console.error('[CHECKOUT] Unknown plan:', planId)
      return
    }

    // 更新用户表
    const currentCredits = user.credits_remaining || 0
    const newCreditsBalance = currentCredits + creditsToAdd

    const updateData = {
      subscription_plan: planId,
      subscription_status: 'active',
      subscription_stripe_id: subscriptionId,
      credits_remaining: newCreditsBalance,
      updated_at: getIsoTimestr(),
    }

    await updateUser(userUuid, updateData)

    console.log(`✅ [CHECKOUT] User updated: ${userUuid}, credits: ${currentCredits} → ${newCreditsBalance}`)

    // 更新订单状态
    const { supabaseAdmin, TABLES } = await import('@/lib/supabase')
    // ... 订单更新逻辑
  } catch (error: any) {
    console.error('[CHECKOUT] Error handling checkout session:', error)
    throw error
  }
}
```

**重要**: 这个函数处理支付完成后的所有逻辑，包括：
- 验证支付状态
- 获取用户信息
- 更新积分
- 更新订单状态

---

## 6. 数据库模型

### 6.1 订阅订单表

**类型**: `/lib/subscription/types.ts` (行 52-72)

```typescript
export interface SubscriptionOrder {
  id: string
  user_uuid: string
  order_type: 'subscription' | 'upgrade' | 'downgrade' | 'renewal'
  plan_id: PlanId
  billing_cycle: BillingCycle
  amount_cents: number
  currency: string
  credits_included: number
  status: OrderStatus
  stripe_payment_intent_id?: string
  stripe_subscription_id?: string
  stripe_customer_id?: string
  stripe_checkout_session_id?: string  // Checkout Session ID
  period_start?: string
  period_end?: string
  created_at: string
  completed_at?: string
  metadata: Record<string, any>  // 可以存储优惠券信息
  notes?: string
}
```

### 6.2 用户表相关字段

- `subscription_plan`: PlanId - 当前订阅计划
- `subscription_status`: SubscriptionStatus - 订阅状态
- `subscription_stripe_id`: string - Stripe Subscription ID
- `credits_remaining`: number - 剩余积分

---

## 7. 优惠券码实现建议

### 7.1 当前状态

✅ **已支持的功能**:
- Stripe Checkout 页面上可以输入优惠券码
- Stripe 自动处理折扣计算
- Stripe 自动应用折扣到最终价格

### 7.2 增强功能建议（如需实现）

如果需要在前端显示优惠券折扣信息或实现自定义优惠券逻辑，可以：

#### 方案 1: 使用 Stripe Promotion Codes API

```typescript
// 在 stripe-config.ts 中添加函数
export async function validatePromotionCode(code: string): Promise<{
  valid: boolean;
  discountPercent?: number;
  discountAmount?: number;
  error?: string;
}> {
  try {
    // 列出所有 Promotion Codes
    const promos = await stripe.promotionCodes.list({
      code: code,
      limit: 1,
    });

    if (promos.data.length === 0) {
      return { valid: false, error: 'Promotion code not found' };
    }

    const promo = promos.data[0];
    const coupon = await stripe.coupons.retrieve(promo.coupon.id as string);

    return {
      valid: promo.active && coupon.valid,
      discountPercent: coupon.percent_off,
      discountAmount: coupon.amount_off,
    };
  } catch (error: any) {
    return { valid: false, error: error.message };
  }
}
```

#### 方案 2: 在前端显示优惠券预览（需要调用验证 API）

```typescript
// 在定价页面中添加优惠券输入框
const [couponCode, setCouponCode] = useState('');
const [couponInfo, setCouponInfo] = useState<any>(null);

const validateCoupon = async (code: string) => {
  const response = await fetch('/api/subscription/validate-coupon', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });

  const data = await response.json();
  if (data.success) {
    setCouponInfo(data.couponInfo);
  } else {
    setCouponInfo(null);
    toast.error(data.error);
  }
};
```

#### 方案 3: 在创建 Checkout 时传递优惠券码

```typescript
// 修改 createCheckoutSession 函数的参数
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
  couponCode, // 新增参数
}: {
  // ... 其他参数
  couponCode?: string;
}): Promise<Stripe.Checkout.Session> {
  const session = await stripe.checkout.sessions.create({
    // ... 其他配置
    discounts: couponCode ? [{
      coupon: couponCode, // 如果是 Coupon ID
      // 或者
      // promotion_code: couponCode, // 如果是 Promotion Code
    }] : undefined,
  });

  return session;
}
```

---

## 8. API 端点总结

### 8.1 订阅相关端点

| 端点 | 方法 | 功能 | 是否支持优惠券 |
|------|------|------|----------------|
| `/api/subscription/create-checkout` | POST | 创建 Checkout 会话 | ✅ 是（在 Stripe 页面） |
| `/api/subscription/status` | GET | 获取订阅状态 | - |
| `/api/subscription/manage` | POST | 升级/降级订阅 | ✅ 是（在 Stripe 页面） |
| `/api/subscription/cancel` | POST | 取消订阅 | - |
| `/api/subscription/webhook` | POST | Stripe Webhook | - |
| `/api/subscription/verify-payment` | POST | 验证支付（开发用） | - |

### 8.2 Credits 相关端点

| 端点 | 方法 | 功能 |
|------|------|------|
| `/api/subscription/credits/check` | POST | 检查 Credits 可用性 |
| `/api/subscription/credits/reserve` | POST | 预留 Credits |
| `/api/subscription/credits/consume` | POST | 消费 Credits |
| `/api/subscription/credits/release` | POST | 释放预留 Credits |

---

## 9. 环境变量配置

需要设置以下环境变量：

```env
# Stripe API Keys
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Stripe 价格 ID（可选，会使用默认值）
STRIPE_PRICE_LITE_MONTHLY=price_lite_monthly
STRIPE_PRICE_LITE_ANNUAL=price_lite_annual
STRIPE_PRICE_PRO_MONTHLY=price_pro_monthly
STRIPE_PRICE_PRO_ANNUAL=price_pro_annual
STRIPE_PRICE_PREMIUM_MONTHLY=price_premium_monthly
STRIPE_PRICE_PREMIUM_ANNUAL=price_premium_annual

# 应用 URL
NEXT_PUBLIC_APP_URL=https://vidfab.ai

# 测试模式（可选）
NEXT_PUBLIC_STRIPE_TEST_MODE=false
```

---

## 10. 关键代码片段快速查找

### 10.1 启用优惠券的关键行

**文件**: `lib/subscription/stripe-config.ts`
**行号**: 164
```typescript
allow_promotion_codes: true,
```

### 10.2 创建用户的关键函数

**文件**: `lib/subscription/stripe-config.ts`
**行号**: 82-105
```typescript
export async function createOrGetStripeCustomer(...)
```

### 10.3 处理支付完成的关键函数

**文件**: `lib/subscription/checkout-handler.ts`
**行号**: 22-105
```typescript
export async function handleCheckoutSession(...)
```

### 10.4 前端调用 Checkout API 的关键代码

**文件**: `app/(main)/pricing/pricing-client.tsx`
**行号**: 164-223
```typescript
const handleSubscribe = async (planId) => { ... }
```

---

## 11. 数据流图

```
┌─────────────────────────────────────────────────────────────────┐
│                       用户在定价页面                              │
│                  点击 "Subscribe" 按钮                           │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
        ┌─────────────────────────────────────────┐
        │ POST /api/subscription/create-checkout   │
        │ Body: {                                  │
        │   plan_id: 'pro',                       │
        │   billing_cycle: 'monthly'              │
        │ }                                        │
        └────────────┬────────────────────────────┘
                     │
                     ▼
        ┌──────────────────────────────────────┐
        │ subscriptionService.createCheckout   │
        │ Session()                            │
        │                                      │
        │ 1. 验证用户和计划                      │
        │ 2. 获取/创建 Stripe Customer        │
        │ 3. 创建订单记录（pending）           │
        │ 4. 调用 createCheckoutSession()     │
        └────────────┬─────────────────────────┘
                     │
                     ▼
        ┌──────────────────────────────────────┐
        │ Stripe.checkout.sessions.create()    │
        │                                      │
        │ 关键配置:                             │
        │ - allow_promotion_codes: true        │
        │ - mode: 'subscription'               │
        │ - metadata: { user_uuid, plan_id }   │
        └────────────┬─────────────────────────┘
                     │
                     ▼
     ┌───────────────────────────────────────┐
     │ 返回 Checkout URL 给前端               │
     │ 前端重定向到 Stripe Checkout 页面      │
     └────────────┬────────────────────────────┘
                  │
                  ▼
     ┌────────────────────────────────────┐
     │  Stripe Checkout 页面              │
     │  ├─ 输入信用卡信息                  │
     │  ├─ 输入优惠券码 ✅                 │
     │  └─ 完成支付                        │
     └────────────┬─────────────────────────┘
                  │
                  ▼
     ┌────────────────────────────────────┐
     │ Stripe Webhook: checkout.session   │
     │ .completed                         │
     └────────────┬─────────────────────────┘
                  │
                  ▼
     ┌──────────────────────────────────────┐
     │ handleCheckoutSession()              │
     │                                      │
     │ 1. 验证支付状态（paid）              │
     │ 2. 从 metadata 获取 user_uuid      │
     │ 3. 更新用户积分                      │
     │ 4. 更新订单状态 (completed)        │
     │ 5. 记录订阅变更                      │
     └────────────┬──────────────────────────┘
                  │
                  ▼
     ┌──────────────────────────────────────┐
     │ 用户重定向到成功页面                   │
     │ 显示成功提示信息                      │
     └──────────────────────────────────────┘
```

---

## 12. 故障排查

### 常见问题

1. **优惠券码未在 Checkout 页面显示**
   - 检查 `allow_promotion_codes: true` 是否设置
   - 确保在 Stripe Dashboard 中创建了 Coupon/Promotion Code

2. **Webhook 未被触发**
   - 检查 Webhook Secret 是否正确
   - 检查 Stripe Dashboard 的 Webhook 配置
   - 查看 API logs 中的事件

3. **支付完成但用户积分未更新**
   - 检查 Webhook 签名验证
   - 检查数据库中的 metadata 是否正确
   - 查看后端日志中的错误信息

4. **价格计算错误**
   - 确保金额以分（cents）为单位
   - 检查 billing_cycle 参数是否正确（'monthly' 或 'annual'）

---

## 13. 相关文件清单

```
完整支付系统涉及的文件：

核心逻辑:
✓ /lib/subscription/stripe-config.ts (307 行)
✓ /lib/subscription/checkout-handler.ts (176 行)
✓ /lib/subscription/subscription-service.ts (817 行)
✓ /lib/subscription/pricing-config.ts (246 行)
✓ /lib/subscription/types.ts (264 行)

API 端点:
✓ /app/api/subscription/create-checkout/route.ts (70 行)
✓ /app/api/subscription/webhook/route.ts (198 行)
✓ /app/api/subscription/status/route.ts (50 行)
✓ /app/api/subscription/manage/route.ts (128 行)
✓ /app/api/subscription/verify-payment/route.ts (115 行)
✓ /app/api/subscription/cancel/route.ts

前端:
✓ /app/(main)/pricing/pricing-client.tsx (674 行)
✓ /components/subscription/upgrade-dialog.tsx (236 行)
✓ /components/payment-success-handler.tsx (62 行)
✓ /hooks/use-subscription.ts (317 行)

总计: ~4000 行代码实现完整的 Stripe 支付系统
```

---

## 14. 总结

### 现状
- ✅ Stripe 集成完整
- ✅ 优惠券支持已启用（前端可在 Stripe 页面输入）
- ✅ 支付流程完整（创建 Checkout → 支付 → Webhook 处理 → 更新用户状态）
- ✅ 积分系统完整

### 优惠券的实现方式
当前采用的是 **Stripe 原生优惠券处理方式**：
- Stripe 在 Checkout 页面提供优惠券输入框
- 用户输入优惠券码
- Stripe 验证并应用折扣
- 前端和后端无需关心优惠券逻辑

### 如需增强
可以实现：
1. 前端优惠券预览（调用验证 API）
2. 自定义优惠券码格式
3. 优惠券使用统计和分析
4. 优惠券过期管理


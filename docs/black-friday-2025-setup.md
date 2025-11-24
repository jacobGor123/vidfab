# Black Friday 2025 页面使用指南

## 📋 概述

黑五活动页面已完全开发完成，包含以下功能：
- ✅ Hero 区域（大标题 + 倒计时 + CTA）
- ✅ 月付套餐（Lite 10% OFF, Pro 20% OFF, Premium 10% OFF）
- ✅ 年付套餐（全部 20% OFF）
- ✅ CTA 行动号召区域
- ✅ 案例轮播展示（5个分类）
- ✅ 全站顶部横幅（可关闭）
- ✅ 自动优惠券应用机制

## 🚀 快速启动

### 1. 环境变量已配置

`.env.local` 文件已更新，包含以下配置：

```env
# Black Friday 2025 Configuration
NEXT_PUBLIC_BLACK_FRIDAY_ENABLED=true
NEXT_PUBLIC_BLACK_FRIDAY_END_DATE=2025-11-30T23:59:59Z

# Coupon Codes
NEXT_PUBLIC_BF2025_COUPON_LITE_MONTHLY=BF2025_LITE_10
NEXT_PUBLIC_BF2025_COUPON_PRO_MONTHLY=BF2025_PRO_20
NEXT_PUBLIC_BF2025_COUPON_PREMIUM_MONTHLY=BF2025_PREMIUM_10

NEXT_PUBLIC_BF2025_COUPON_LITE_ANNUAL=BF2025_ANNUAL_LITE
NEXT_PUBLIC_BF2025_COUPON_PRO_ANNUAL=BF2025_ANNUAL_PRO
NEXT_PUBLIC_BF2025_COUPON_PREMIUM_ANNUAL=BF2025_ANNUAL_PREMIUM
```

### 2. 访问页面

启动开发服务器后，访问：
```
http://localhost:3000/black-friday-sale-2025
```

## 🎯 Stripe 优惠券配置（重要！）

在页面上线前，**必须**在 Stripe Dashboard 中创建以下优惠券：

### 月付优惠券

| 优惠券码 | 折扣 | Duration | 适用套餐 |
|---------|------|----------|---------|
| `BF2025-LITE-10` | 10% OFF | Once | Lite 月付 |
| `BF2025-PRO-20` | 20% OFF | Once | Pro 月付 |
| `BF2025-PREMIUM-10` | 10% OFF | Once | Premium 月付 |

### 年付优惠券

| 优惠券码 | 折扣 | Duration | 适用套餐 |
|---------|------|----------|---------|
| `BF2025-ANNUAL-LITE` | 20% OFF | Once | Lite 年付 |
| `BF2025-ANNUAL-PRO` | 20% OFF | Once | Pro 年付 |
| `BF2025-ANNUAL-PREMIUM` | 20% OFF | Once | Premium 年付 |

### 创建步骤

1. 登录 [Stripe Dashboard](https://dashboard.stripe.com/)
2. 进入 **Products** → **Coupons**
3. 点击 **"+ Create coupon"**
4. 配置参数：
   - **Name**: 内部名称（如 "Black Friday 2025 - Pro 20%"）
   - **Type**: Percentage discount
   - **Percentage**: 对应折扣百分比（10 或 20）
   - **Duration**: Once
   - **Active**: Yes
5. 创建后，点击 **"+ New promotion code"**
6. 输入对应的优惠券码（如 `BF2025-PRO-20`）
7. 点击 **"Create"**

重复以上步骤创建所有 6 个优惠券。

## 📁 项目文件结构

```
lib/black-friday/
├── coupons.ts                     # 优惠券配置和工具函数
└── showcase-data.ts               # 案例数据获取逻辑

components/black-friday/
├── BlackFridayHero.tsx            # Hero 区域
├── BlackFridayCountdown.tsx       # 倒计时组件
├── BlackFridayPlanCard.tsx        # 套餐卡片组件
├── BlackFridayMonthlyPlans.tsx    # 月付套餐
├── BlackFridayAnnualPlans.tsx     # 年付套餐
├── BlackFridayCTA.tsx             # CTA 行动号召
├── BlackFridayShowcase.tsx        # 案例轮播
└── BlackFridayBanner.tsx          # 全站横幅

app/(main)/black-friday-sale-2025/
└── page.tsx                       # 黑五主页面
```

## 🎨 页面设计特点

### 1. Hero 区域
- 黑五主题渐变背景
- 动态粒子效果
- 倒计时器（自动计算到活动结束时间）
- 平滑滚动到套餐区域

### 2. 套餐展示
- **月付套餐**：
  - Lite: 10% OFF（蓝色主题）
  - Pro: 20% OFF（紫色主题 + BEST CHOICE 标签）
  - Premium: 10% OFF（青色主题）
- **年付套餐**：
  - 全部 20% OFF
  - 显示年付总价和年节省金额

### 3. 案例轮播
- 5个分类：Creators, Product Demo, Marketing, Education, Social Media
- 从 `/api/discover` 自动获取数据
- 支持视频悬停播放
- 客户端缓存（5分钟）

### 4. 全站横幅
- 固定在页面顶部
- 跑马灯动画效果
- 可关闭（使用 localStorage 记住状态）
- 自动检测活动是否进行中

## 🔧 功能说明

### 自动优惠券应用

点击 "Check Out" 按钮时，系统会：
1. 自动获取对应套餐的优惠券码
2. 调用 `/api/subscription/create-checkout` API
3. 传递 `coupon_code` 参数
4. 跳转到 Stripe Checkout 页面（折扣已自动应用）

代码示例：
```typescript
const couponCode = getCouponCode('pro', 'monthly') // "BF2025_PRO_20"

await fetch('/api/subscription/create-checkout', {
  method: 'POST',
  body: JSON.stringify({
    plan_id: 'pro',
    billing_cycle: 'monthly',
    coupon_code: couponCode  // 自动应用优惠券
  })
})
```

### 倒计时功能

倒计时根据 `NEXT_PUBLIC_BLACK_FRIDAY_END_DATE` 环境变量自动计算：
- 显示剩余天数、小时、分钟、秒
- 活动结束后显示 "Sale Ended"
- 客户端实时更新

### 横幅关闭机制

横幅使用 `localStorage` 记住用户关闭状态：
- Key: `bf2025_banner_dismissed`
- Value: `"true"` 表示已关闭
- 清除浏览器缓存后横幅会重新显示

## 🎯 上线检查清单

### 上线前必做：
- [ ] 在 Stripe Dashboard 创建所有 6 个优惠券
- [ ] 验证优惠券码与 `.env.local` 配置一致
- [ ] 测试月付和年付的 Checkout 流程
- [ ] 确认折扣正确应用到 Stripe Checkout 页面
- [ ] 检查案例轮播数据是否正常加载
- [ ] 测试横幅关闭功能

### 上线后验证：
- [ ] 访问 `https://vidfab.ai/black-friday-sale-2025`
- [ ] 确认倒计时显示正确
- [ ] 测试各套餐的购买流程
- [ ] 验证 GTM 事件追踪（如已配置）
- [ ] 检查移动端显示效果

## 📱 响应式设计

页面已适配所有设备：
- **Desktop (≥1024px)**: 3列网格布局
- **Tablet (768-1023px)**: 2列网格布局
- **Mobile (<768px)**: 1列堆叠布局

## 🎭 活动控制

### 启用/禁用活动

修改 `.env.local` 文件：

```env
# 启用活动
NEXT_PUBLIC_BLACK_FRIDAY_ENABLED=true

# 禁用活动（横幅和页面都会隐藏）
NEXT_PUBLIC_BLACK_FRIDAY_ENABLED=false
```

### 修改活动结束时间

```env
# 设置为 2025 年 11 月 30 日 23:59:59 UTC
NEXT_PUBLIC_BLACK_FRIDAY_END_DATE=2025-11-30T23:59:59Z

# 或者其他时间（ISO 8601 格式）
NEXT_PUBLIC_BLACK_FRIDAY_END_DATE=2025-12-05T00:00:00Z
```

## 🐛 故障排查

### 问题 1：优惠券无效

**原因**：Stripe 中没有创建对应的优惠券码

**解决方法**：
1. 登录 Stripe Dashboard
2. 检查 Products → Coupons
3. 确认优惠券码与 `.env.local` 中的配置一致
4. 确保优惠券状态为 Active

### 问题 2：案例轮播没有数据

**原因**：`/api/discover` 返回空数据

**解决方法**：
1. 检查 `discover_videos` 表中是否有数据
2. 确认数据的 `status` 字段为 `'active'`
3. 查看浏览器控制台是否有 API 错误

### 问题 3：横幅不显示

**原因**：活动未启用或已被用户关闭

**解决方法**：
1. 检查 `NEXT_PUBLIC_BLACK_FRIDAY_ENABLED` 是否为 `true`
2. 清除浏览器 localStorage（删除 `bf2025_banner_dismissed`）
3. 确认活动结束时间未过期

### 问题 4：倒计时显示 00:00:00

**原因**：活动结束时间已过期

**解决方法**：
更新 `NEXT_PUBLIC_BLACK_FRIDAY_END_DATE` 为未来时间

## 📊 性能优化

页面已实施以下优化：
- ✅ 案例数据客户端缓存（sessionStorage, 5分钟）
- ✅ 图片/视频懒加载
- ✅ 组件代码分割
- ✅ 最小化 API 请求次数

## 🎉 完成！

黑五活动页面已完全就绪，只需：
1. 在 Stripe 中创建优惠券
2. 测试购买流程
3. 正式上线

如有问题，请参考 `/docs/stripe-coupon-guide.md` 获取更多优惠券配置帮助。

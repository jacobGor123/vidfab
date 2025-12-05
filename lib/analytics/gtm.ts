/**
 * Google Tag Manager (GTM) 和 GA4 事件跟踪工具函数
 */

// 全局 gtag 函数类型声明
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

/**
 * 购买转化事件 - GA4 标准 purchase 事件
 * @param planId 套餐ID (lite, pro, premium)
 * @param billingCycle 计费周期 (monthly, annual)
 * @param value 交易金额 (美元)
 * @param transactionId 交易ID
 */
export function trackPurchase(
  planId: string,
  billingCycle: 'monthly' | 'annual',
  value: number,
  transactionId: string
) {
  if (typeof window !== 'undefined' && window.gtag) {
    // GA4 标准 purchase 事件
    window.gtag('event', 'purchase', {
      transaction_id: transactionId,
      value: value,
      currency: 'USD',
      items: [
        {
          item_id: `${planId}_${billingCycle}`,
          item_name: `${planId.toUpperCase()} Plan - ${billingCycle === 'annual' ? 'Annual' : 'Monthly'}`,
          item_category: 'subscription',
          item_variant: billingCycle,
          price: value,
          quantity: 1
        }
      ],
      // 自定义维度
      plan_id: planId,
      billing_cycle: billingCycle
    });

    console.log('✅ GTM Purchase Event Tracked:', {
      planId,
      billingCycle,
      value,
      transactionId
    });
  }
}

/**
 * 用户注册事件 - GA4 标准 sign_up 事件
 * @param method 注册方式 (email, google)
 * @param userId 用户ID (可选)
 */
export function trackSignUp(method: 'email' | 'google', userId?: string) {
  if (typeof window !== 'undefined' && window.gtag) {
    // GA4 标准 sign_up 事件
    window.gtag('event', 'sign_up', {
      method: method,
      ...(userId && { user_id: userId })
    });

    console.log('✅ GTM Sign Up Event Tracked:', { method, userId });
  }
}

/**
 * 用户登录事件 - GA4 标准 login 事件
 * @param method 登录方式 (email, google)
 */
export function trackLogin(method: 'email' | 'google') {
  if (typeof window !== 'undefined' && window.gtag) {
    // GA4 标准 login 事件
    window.gtag('event', 'login', {
      method: method
    });

    console.log('✅ GTM Login Event Tracked:', { method });
  }
}

/**
 * 开始结账事件 - GA4 标准 begin_checkout 事件
 * @param planId 套餐ID
 * @param billingCycle 计费周期
 * @param value 预计金额
 * @param source 触发来源 (pricing_page, credit_insufficient, etc.)
 */
export function trackBeginCheckout(
  planId: string,
  billingCycle: 'monthly' | 'annual',
  value: number,
  source: string = 'unknown'
) {
  if (typeof window !== 'undefined' && window.gtag) {
    // GA4 标准 begin_checkout 事件
    window.gtag('event', 'begin_checkout', {
      currency: 'USD',
      value: value,
      items: [
        {
          item_id: `${planId}_${billingCycle}`,
          item_name: `${planId.toUpperCase()} Plan - ${billingCycle === 'annual' ? 'Annual' : 'Monthly'}`,
          item_category: 'subscription',
          price: value,
          quantity: 1
        }
      ],
      // 自定义维度
      plan_id: planId,
      billing_cycle: billingCycle,
      source: source
    });

    console.log('✅ GTM Begin Checkout Event Tracked:', {
      planId,
      billingCycle,
      value,
      source
    });
  }
}

/**
 * 查看套餐详情事件 - GA4 标准 view_item 事件
 * @param planId 套餐ID
 * @param value 套餐价格
 */
export function trackViewPlan(planId: string, value: number) {
  if (typeof window !== 'undefined' && window.gtag) {
    // GA4 标准 view_item 事件
    window.gtag('event', 'view_item', {
      currency: 'USD',
      value: value,
      items: [
        {
          item_id: planId,
          item_name: `${planId.toUpperCase()} Plan`,
          item_category: 'subscription',
          price: value
        }
      ]
    });

    console.log('✅ GTM View Plan Event Tracked:', { planId, value });
  }
}

/**
 * 套餐价格切换事件 (月付/年付)
 * @param billingCycle 当前计费周期
 */
export function trackBillingToggle(billingCycle: 'monthly' | 'annual') {
  if (typeof window !== 'undefined' && window.gtag) {
    // 自定义事件
    window.gtag('event', 'billing_toggle', {
      billing_cycle: billingCycle
    });

    console.log('✅ GTM Billing Toggle Event Tracked:', { billingCycle });
  }
}

/**
 * 取消订阅事件
 * @param planId 取消的套餐ID
 */
export function trackCancelSubscription(planId: string) {
  if (typeof window !== 'undefined' && window.gtag) {
    // 自定义事件
    window.gtag('event', 'cancel_subscription', {
      plan_id: planId
    });

    console.log('✅ GTM Cancel Subscription Event Tracked:', { planId });
  }
}

/**
 * 页面浏览事件 - GA4 会自动跟踪,此函数用于手动触发
 * @param pageTitle 页面标题
 * @param pagePath 页面路径
 */
export function trackPageView(pageTitle: string, pagePath: string) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'page_view', {
      page_title: pageTitle,
      page_path: pagePath
    });

    console.log('✅ GTM Page View Event Tracked:', { pageTitle, pagePath });
  }
}

/**
 * 访问价格页事件
 */
export function trackViewPricingPage() {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'view_pricing_page', {});

    console.log('✅ GTM View Pricing Page Event Tracked');
  }
}

/**
 * 点击升级按钮事件
 * @param planFrom 当前套餐 (free, lite, pro)
 */
export function trackUpgradeClick(planFrom: string) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'upgrade_click', {
      plan_from: planFrom
    });

    console.log('✅ GTM Upgrade Click Event Tracked:', { planFrom });
  }
}

/**
 * 点击进入文生视频功能
 */
export function trackUseTextToVideo() {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'use_text_to_video', {});

    console.log('✅ GTM Use Text-to-Video Event Tracked');
  }
}

/**
 * 点击进入图生视频功能
 */
export function trackUseImageToVideo() {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'use_image_to_video', {});

    console.log('✅ GTM Use Image-to-Video Event Tracked');
  }
}

/**
 * 点击进入文生图片功能
 */
export function trackUseTextToImage() {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'use_text_to_image', {});

    console.log('✅ GTM Use Text-to-Image Event Tracked');
  }
}

/**
 * 点击进入图生图片功能
 */
export function trackUseImageToImage() {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'use_image_to_image', {});

    console.log('✅ GTM Use Image-to-Image Event Tracked');
  }
}

/**
 * 点击进入AI特效模板功能
 */
export function trackUseAiEffect() {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'use_ai_effect', {});

    console.log('✅ GTM Use AI Effect Event Tracked');
  }
}

/**
 * 使用AI特效模板事件
 * @param effectId 特效ID
 */
export function trackApplyAiEffect(effectId: string) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'apply_ai_effect', {
      effect_id: effectId
    });

    console.log('✅ GTM Apply AI Effect Event Tracked:', { effectId });
  }
}

/**
 * 点击查看套餐事件
 */
export function trackViewSubscription() {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'view_subscription', {});

    console.log('✅ GTM View Subscription Event Tracked');
  }
}

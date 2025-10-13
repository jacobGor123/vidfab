/**
 * VidFab订阅系统定价配置
 * 基于用户需求的完整定价策略
 */

export const SUBSCRIPTION_PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    credits: 50,
    price: { monthly: 0, annual: 0 },
    features: [
      'Get started with AI video creation — simple and risk-free',
      '50 credits per month',
      'Basic AI video generation (480p/720p)',
      'Video effects library',
      'Community support',
      'Videos deleted after 24 hours'
    ],
    limits: {
      models: ['seedance-v1-pro-t2v-480p', 'seedance-v1-pro-t2v-720p', 'video-effects'],
      concurrent_jobs: 1,
      storage_days: 1,
      max_resolution: '720p'
    }
  },
  lite: {
    id: 'lite',
    name: 'Lite',
    credits: 300,
    price: { monthly: 999, annual: 9588 }, // $9.99/月，$95.88/年 ($7.99/月)
    features: [
      'Essential toolkit for creators who want quality without limits',
      '300 credits/month',
      'Remove watermarks',
      'Priority processing',
      'HD exports (1080p)',
      '50+ AI effects',
      'Email support',
      'Perfect for content creators seeking professional-looking videos'
    ],
    limits: {
      models: ['seedance-v1-pro-t2v', 'video-effects'],
      concurrent_jobs: 4,
      storage_days: 30,
      max_resolution: '1080p'
    }
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    credits: 1000,
    price: { monthly: 2999, annual: 28999 }, // $29.99/月，$289.99/年 ($24.17/月)
    features: [
      'Advanced video production suite for professionals and studios',
      '1000 credits/month',
      'Advanced effects library',
      'Batch processing',
      'Custom branding (logo & styles)',
      'Priority support',
      'Full commercial license',
      'Designed for professionals producing at scale with brand consistency'
    ],
    limits: {
      models: ['seedance-v1-pro-t2v', 'video-effects', 'veo3-fast'],
      concurrent_jobs: 4,
      storage_days: 90,
      max_resolution: '1080p'
    }
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    credits: 2000,
    price: { monthly: 5999, annual: 65988 }, // $59.99/月，$659.88/年 ($54.99/月)
    features: [
      'Advanced video production suite for professionals and studios',
      '2000 credits/month',
      'Advanced effects library',
      'Batch processing',
      'Custom branding (logo & styles)',
      'Priority support',
      'Full commercial license',
      'Designed for professionals producing at scale with brand consistency'
    ],
    limits: {
      models: ['seedance-v1-pro-t2v', 'video-effects', 'veo3-fast'],
      concurrent_jobs: 4,
      storage_days: 365,
      max_resolution: '1080p'
    }
  }
} as const;

export const CREDITS_CONSUMPTION = {
  // Seedance模型消耗
  'seedance-v1-pro-t2v': {
    '480p-5s': 10,
    '480p-10s': 20,
    '720p-5s': 20,
    '720p-10s': 40,
    '1080p-5s': 40,
    '1080p-10s': 80
  },
  // Veo3高级模型
  'veo3-fast': {
    '720p-5s': 70,
    '720p-8s': 100,
    '720p-10s': 130,
    '1080p-5s': 90,
    '1080p-8s': 130,
    '1080p-10s': 170
  },
  // 视频特效
  'video-effects': {
    '4s': 30
  }
} as const;

export const MODEL_ACCESS = {
  free: ['seedance-v1-pro-t2v-480p', 'seedance-v1-pro-t2v-720p', 'video-effects'],
  lite: ['seedance-v1-pro-t2v', 'video-effects'],
  pro: ['seedance-v1-pro-t2v', 'video-effects', 'veo3-fast'],
  premium: ['seedance-v1-pro-t2v', 'video-effects', 'veo3-fast']
} as const;

export const CONCURRENT_LIMITS = {
  free: 1,
  lite: 4,
  pro: 4,
  premium: 4
} as const;

export const STORAGE_DAYS = {
  free: 1,
  lite: 30,
  pro: 90,
  premium: 365
} as const;

// Stripe产品ID配置 (需要在Stripe中创建对应产品)
export const STRIPE_PRODUCTS = {
  lite_monthly: 'price_lite_monthly',
  lite_annual: 'price_lite_annual',
  pro_monthly: 'price_pro_monthly',
  pro_annual: 'price_pro_annual',
  premium_monthly: 'price_premium_monthly',
  premium_annual: 'price_premium_annual'
} as const;

// 获取计划配置的辅助函数
export function getPlanConfig(planId: keyof typeof SUBSCRIPTION_PLANS) {
  return SUBSCRIPTION_PLANS[planId];
}

// 前端模型名称到积分配置模型名称的映射
const MODEL_NAME_MAPPING: Record<string, string> = {
  // Text-to-Video 映射
  'vidfab-q1': 'seedance-v1-pro-t2v',
  'vidfab-pro': 'veo3-fast',
  'veo3-fast-t2v': 'veo3-fast',
  'default': 'seedance-v1-pro-t2v',

  // Image-to-Video 映射
  'vidfab-q1-i2v': 'seedance-v1-pro-t2v',
  'vidfab-pro-i2v': 'veo3-fast',
  'veo3-fast-i2v': 'veo3-fast',

  // Video Effects 映射
  'video-effects': 'video-effects',

  // 向后兼容映射（处理历史数据中的旧模型名称）
  'vidu-q1': 'seedance-v1-pro-t2v',
  'vidu-q1-i2v': 'seedance-v1-pro-t2v',

  // 直接映射（兼容已有的正确名称）
  'seedance-v1-pro-t2v': 'seedance-v1-pro-t2v',
  'veo3-fast': 'veo3-fast'
};

// 计算credits消耗的辅助函数
export function calculateCreditsRequired(
  model: string,
  resolution: string,
  duration: string | number
): number {
  // 映射模型名称
  const mappedModel = MODEL_NAME_MAPPING[model] || model;

  // 标准化 duration 格式
  const durationStr = typeof duration === 'number' ? `${duration}s` : duration;

  // 根据映射后的模型名称计算积分
  if (mappedModel === 'seedance-v1-pro-t2v') {
    const key = `${resolution}-${durationStr}` as keyof typeof CREDITS_CONSUMPTION['seedance-v1-pro-t2v'];
    const credits = CREDITS_CONSUMPTION['seedance-v1-pro-t2v'][key];

    if (!credits) {
      // 提供默认值以防止0积分问题
      if (resolution === '480p' && durationStr === '5s') return 10;
      if (resolution === '720p' && durationStr === '5s') return 20;
      if (resolution === '1080p' && durationStr === '5s') return 40;
      return 10; // 最基础的默认值
    }

    return credits;
  }

  if (mappedModel === 'veo3-fast') {
    const key = `${resolution}-${durationStr}` as keyof typeof CREDITS_CONSUMPTION['veo3-fast'];
    const credits = CREDITS_CONSUMPTION['veo3-fast'][key];

    if (!credits) {
      // 提供默认值
      if (resolution === '720p' && durationStr === '5s') return 70;
      if (resolution === '1080p' && durationStr === '5s') return 90;
      return 70; // 默认值
    }

    return credits;
  }

  if (mappedModel === 'video-effects') {
    // 视频特效没有分辨率概念，直接使用时长
    const credits = CREDITS_CONSUMPTION['video-effects'][durationStr as keyof typeof CREDITS_CONSUMPTION['video-effects']] || 30;
    // 视频特效默认30积分
    return credits || 30;
  }
  return 0;
}

// 检查用户是否可以访问模型
export function canAccessModel(userPlan: keyof typeof SUBSCRIPTION_PLANS, model: string): boolean {
  return MODEL_ACCESS[userPlan].includes(model);
}

// 获取套餐的年付折扣率
export function getAnnualDiscount(planId: keyof typeof SUBSCRIPTION_PLANS): number {
  if (planId === 'free') return 0;

  const plan = SUBSCRIPTION_PLANS[planId];
  const monthlyTotal = plan.price.monthly * 12;
  const annualPrice = plan.price.annual;

  return Math.round((1 - annualPrice / monthlyTotal) * 100);
}
/**
 * VidFab订阅系统定价配置
 * 基于用户需求的完整定价策略
 */

export const SUBSCRIPTION_PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    credits: 100,
    price: { monthly: 0, annual: 0 },
    description: 'Get started with AI video creation — simple and risk-free.',
    features: [
      'Initial 100 credits',
      'About 33 images or 10 videos (480p)',
      '5 free script creations & analyses',
      'Export with watermark',
      'Basic resolution (480p and 720p)',
      '24-hour retention for creations',
    ],
    limits: {
      models: ['seedance-v1-pro-t2v-480p', 'seedance-v1-pro-t2v-720p', 'video-effects'],
      concurrent_jobs: 1,
      storage_days: 1,
      max_resolution: '720p'
    }
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    credits: 1500,
    price: { monthly: 2999, annual: 28999 }, // $29.99/月，$289.99/年 ($24.17/月)
    description: 'Advanced video production suite for professionals and studios.',
    features: [
      '1500 credits reset monthly',
      'About 500 images or 150 videos (480p)',
      '20 free script creations & analyses/month',
      'Watermark-free exports',
      'Advanced AI models',
      'Access to HD resolution (up to 1080P)',
      '4 concurrent generation',
      'Priority support',
      'Cancel anytime',
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
    credits: 3500,
    price: { monthly: 5999, annual: 65988 }, // $59.99/月，$659.88/年 ($54.99/月)
    description: 'For organizations that need the most powerful video creation capabilities.',
    features: [
      '3500 credits reset monthly',
      'About 1166 images or 350 videos (480p)',
      '50 free script creations & analyses/month',
      'Watermark-free exports',
      'Advanced AI models',
      'Access to HD resolution (up to 1080P)',
      '4 concurrent generation',
      'Dedicated support',
      'Cancel anytime',
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
  // Veo3高级模型 (no-audio / with-audio)
  'veo3-fast': {
    '720p-4s': 40,
    '720p-6s': 60,
    '720p-8s': 80,
    '1080p-4s': 70,
    '1080p-6s': 90,
    '1080p-8s': 110,
    '720p-4s-audio': 60,
    '720p-6s-audio': 80,
    '720p-8s-audio': 100,
    '1080p-4s-audio': 90,
    '1080p-6s-audio': 110,
    '1080p-8s-audio': 130,
  },
  // Sora 2 模型（积分只与时长相关）
  'sora-2': {
    '4s': 40,
    '8s': 80,
    '12s': 120,
  },
  // 视频特效
  'video-effects': {
    '4s': 30
  }
} as const;

export const MODEL_ACCESS = {
  free: ['seedance-v1-pro-t2v-480p', 'seedance-v1-pro-t2v-720p', 'video-effects'],
  pro: ['seedance-v1-pro-t2v', 'video-effects', 'veo3-fast'],
  premium: ['seedance-v1-pro-t2v', 'video-effects', 'veo3-fast']
} as const;

export const CONCURRENT_LIMITS = {
  free: 1,
  pro: 4,
  premium: 4
} as const;

export const STORAGE_DAYS = {
  free: 1,
  pro: 90,
  premium: 365
} as const;

// Stripe产品ID配置 (需要在Stripe中创建对应产品)
export const STRIPE_PRODUCTS = {
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
  'sora-2': 'sora-2',
  'kling-3': 'kling-3',
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
  duration: string | number,
  audio?: boolean
): number {
  // 映射模型名称
  const mappedModel = MODEL_NAME_MAPPING[model] || model;

  // 标准化 duration 格式
  const durationStr = typeof duration === 'number' ? `${duration}s` : duration;

  // 根据映射后的模型名称计算积分
  if (mappedModel === 'seedance-v1-pro-t2v') {
    // Seedance 1.5 Pro: 按时长线性计算（与 video agent credits-config 一致）
    // 480p: 2积分/s, 720p: 4积分/s, 1080p: 8积分/s
    const rateMap: Record<string, number> = { '480p': 2, '720p': 4, '1080p': 8 }
    const rate = rateMap[resolution] ?? 4
    const durationNum = parseInt(durationStr)
    const base = Math.ceil(rate * durationNum)
    return audio ? base * 3 : base
  }

  if (mappedModel === 'veo3-fast') {
    const audioSuffix = audio ? '-audio' : ''
    const key = `${resolution}-${durationStr}${audioSuffix}` as keyof typeof CREDITS_CONSUMPTION['veo3-fast'];
    const credits = CREDITS_CONSUMPTION['veo3-fast'][key];

    if (!credits) {
      const d = parseInt(durationStr)
      if (audio) {
        if (resolution === '720p') return d <= 4 ? 60 : d <= 6 ? 80 : 100
        if (resolution === '1080p') return d <= 4 ? 90 : d <= 6 ? 110 : 130
      } else {
        if (resolution === '720p') return d <= 4 ? 40 : d <= 6 ? 60 : 80
        if (resolution === '1080p') return d <= 4 ? 70 : d <= 6 ? 90 : 110
      }
      return 40;
    }

    return credits;
  }

  if (mappedModel === 'sora-2') {
    const key = durationStr as keyof typeof CREDITS_CONSUMPTION['sora-2']
    return CREDITS_CONSUMPTION['sora-2'][key] ?? 40
  }

  if (mappedModel === 'kling-3') {
    const d = parseInt(durationStr)
    return audio ? d * 15 : d * 10
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
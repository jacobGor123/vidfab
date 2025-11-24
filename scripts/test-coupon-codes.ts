/**
 * 测试黑五优惠券码是否在 Stripe 中配置成功
 * 运行方式：npx tsx scripts/test-coupon-codes.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import Stripe from 'stripe';

// 加载 .env.local 环境变量
config({ path: resolve(__dirname, '../.env.local') });

// 初始化 Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-09-30.acacia',
  typescript: true,
});

/**
 * 验证优惠券码
 */
async function validateCouponCode(code: string): Promise<{
  valid: boolean;
  promotionCodeId?: string;
  discountPercent?: number;
  error?: string;
}> {
  try {
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
    const coupon = promotionCode.coupon;

    return {
      valid: true,
      promotionCodeId: promotionCode.id,
      discountPercent: coupon.percent_off || undefined,
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

const COUPON_CODES = [
  // 月付优惠券
  { code: 'BF2025-LITE-10', expectedDiscount: 10, plan: 'Lite Monthly' },
  { code: 'BF2025-PRO-20', expectedDiscount: 20, plan: 'Pro Monthly' },
  { code: 'BF2025-PREMIUM-10', expectedDiscount: 10, plan: 'Premium Monthly' },

  // 年付优惠券
  { code: 'BF2025-ANNUAL-LITE', expectedDiscount: 20, plan: 'Lite Annual' },
  { code: 'BF2025-ANNUAL-PRO', expectedDiscount: 20, plan: 'Pro Annual' },
  { code: 'BF2025-ANNUAL-PREMIUM', expectedDiscount: 20, plan: 'Premium Annual' },
];

async function testCouponCodes() {
  console.log('🎯 开始测试黑五优惠券码...\n');

  let successCount = 0;
  let failCount = 0;

  for (const { code, expectedDiscount, plan } of COUPON_CODES) {
    try {
      console.log(`📋 测试: ${code} (${plan})`);

      const result = await validateCouponCode(code);

      if (result.valid) {
        if (result.discountPercent === expectedDiscount) {
          console.log(`  ✅ 验证成功！折扣: ${result.discountPercent}%`);
          console.log(`  📌 Promotion Code ID: ${result.promotionCodeId}`);
          successCount++;
        } else {
          console.log(`  ⚠️  优惠券有效，但折扣不匹配！`);
          console.log(`     预期: ${expectedDiscount}%, 实际: ${result.discountPercent}%`);
          failCount++;
        }
      } else {
        console.log(`  ❌ 验证失败: ${result.error}`);
        failCount++;
      }

      console.log(''); // 空行
    } catch (error) {
      console.log(`  💥 错误: ${error instanceof Error ? error.message : String(error)}`);
      console.log('');
      failCount++;
    }
  }

  console.log('='.repeat(60));
  console.log('📊 测试结果汇总:');
  console.log(`  ✅ 成功: ${successCount} / ${COUPON_CODES.length}`);
  console.log(`  ❌ 失败: ${failCount} / ${COUPON_CODES.length}`);
  console.log('='.repeat(60));

  if (successCount === COUPON_CODES.length) {
    console.log('\n🎉 所有优惠券码配置正确！');
    process.exit(0);
  } else {
    console.log('\n⚠️  部分优惠券码配置有问题，请检查 Stripe Dashboard。');
    process.exit(1);
  }
}

// 运行测试
testCouponCodes().catch((error) => {
  console.error('💥 测试脚本执行失败:', error);
  process.exit(1);
});

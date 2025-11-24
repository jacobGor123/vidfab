/**
 * 列出 Stripe 中所有的优惠券和 Promotion Codes
 * 用于调试优惠券配置问题
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

async function listAllCoupons() {
  console.log('🔍 正在检查 Stripe 配置...\n');

  // 检查 API Key 模式
  const apiKey = process.env.STRIPE_SECRET_KEY || '';
  if (apiKey.startsWith('sk_test_')) {
    console.log('✅ 使用 Stripe 测试模式 (Test Mode)');
  } else if (apiKey.startsWith('sk_live_')) {
    console.log('⚠️  使用 Stripe 生产模式 (Live Mode)');
  } else {
    console.log('❌ API Key 格式不正确');
  }
  console.log('');

  try {
    // 列出所有 Coupons
    console.log('📋 所有 Coupons:');
    console.log('='.repeat(80));
    const coupons = await stripe.coupons.list({ limit: 100 });

    if (coupons.data.length === 0) {
      console.log('  ⚠️  没有找到任何 Coupon');
    } else {
      coupons.data.forEach((coupon, index) => {
        console.log(`  ${index + 1}. ID: ${coupon.id}`);
        console.log(`     Name: ${coupon.name || '(无名称)'}`);
        console.log(`     Discount: ${coupon.percent_off ? `${coupon.percent_off}%` : `$${coupon.amount_off! / 100}`}`);
        console.log(`     Duration: ${coupon.duration}`);
        console.log(`     Valid: ${coupon.valid ? '是' : '否'}`);
        console.log('');
      });
    }
    console.log('');

    // 列出所有 Promotion Codes
    console.log('🎟️  所有 Promotion Codes:');
    console.log('='.repeat(80));
    const promotionCodes = await stripe.promotionCodes.list({ limit: 100 });

    if (promotionCodes.data.length === 0) {
      console.log('  ⚠️  没有找到任何 Promotion Code');
      console.log('  💡 提示：Promotion Code 是用户输入的优惠券码，需要在创建 Coupon 后单独添加');
    } else {
      promotionCodes.data.forEach((promoCode, index) => {
        const coupon = promoCode.coupon;
        console.log(`  ${index + 1}. Code: "${promoCode.code}"`);
        console.log(`     Promotion Code ID: ${promoCode.id}`);
        console.log(`     Coupon ID: ${coupon.id}`);
        console.log(`     Discount: ${coupon.percent_off ? `${coupon.percent_off}%` : `$${coupon.amount_off! / 100}`}`);
        console.log(`     Active: ${promoCode.active ? '是' : '否'}`);
        console.log(`     Times Redeemed: ${promoCode.times_redeemed}`);
        if (promoCode.max_redemptions) {
          console.log(`     Max Redemptions: ${promoCode.max_redemptions}`);
        }
        if (promoCode.expires_at) {
          const expiryDate = new Date(promoCode.expires_at * 1000);
          console.log(`     Expires At: ${expiryDate.toISOString()}`);
        }
        console.log('');
      });
    }

    console.log('='.repeat(80));
    console.log('📊 统计:');
    console.log(`  Coupons: ${coupons.data.length}`);
    console.log(`  Promotion Codes: ${promotionCodes.data.length}`);
    console.log('');

    // 检查黑五优惠券
    console.log('🎯 检查黑五优惠券码:');
    console.log('='.repeat(80));
    const expectedCodes = [
      'BF2025-LITE-10',
      'BF2025-PRO-20',
      'BF2025-PREMIUM-10',
      'BF2025-ANNUAL-LITE',
      'BF2025-ANNUAL-PRO',
      'BF2025-ANNUAL-PREMIUM',
    ];

    const foundCodes = promotionCodes.data.map(pc => pc.code);

    expectedCodes.forEach(code => {
      const found = foundCodes.includes(code);
      console.log(`  ${found ? '✅' : '❌'} ${code}`);
    });

    console.log('');
    console.log('💡 提示：');
    console.log('  - 确保你在正确的 Stripe 模式下创建优惠券（测试模式 vs 生产模式）');
    console.log('  - Promotion Code 区分大小写');
    console.log('  - 需要先创建 Coupon，然后添加 Promotion Code');

  } catch (error) {
    console.error('❌ 错误:', error instanceof Error ? error.message : String(error));
  }
}

listAllCoupons();

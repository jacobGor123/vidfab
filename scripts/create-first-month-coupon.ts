/**
 * 一次性脚本：在 Stripe 中创建 Pro 首月优惠 Coupon
 *
 * Pro 月付正常价 $29.99，首月 $9.90，折扣金额 = 2009 分
 * duration: once → 仅作用于首张发票，次月自动恢复原价
 *
 * 运行方式：
 *   npx tsx scripts/create-first-month-coupon.ts
 *
 * 运行成功后，将输出的 coupon ID 写入环境变量：
 *   STRIPE_PRO_FIRST_MONTH_COUPON_ID=<coupon_id>
 */

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-09-30.acacia',
});

// Pro 月付价格：$29.99 = 2999 分，目标首月价：$9.90 = 990 分
const PRO_MONTHLY_CENTS = 2999;
const FIRST_MONTH_CENTS = 990;
const DISCOUNT_CENTS = PRO_MONTHLY_CENTS - FIRST_MONTH_CENTS; // 2009

async function createFirstMonthCoupon() {
  console.log('🎟️  创建 Pro 首月优惠 Coupon...');
  console.log(`   原价: $${(PRO_MONTHLY_CENTS / 100).toFixed(2)}`);
  console.log(`   首月: $${(FIRST_MONTH_CENTS / 100).toFixed(2)}`);
  console.log(`   折扣: $${(DISCOUNT_CENTS / 100).toFixed(2)}`);

  try {
    const coupon = await stripe.coupons.create({
      name: 'Pro First Month Promo',
      amount_off: DISCOUNT_CENTS,
      currency: 'usd',
      duration: 'once', // 仅首张发票生效，次月恢复原价
      metadata: {
        purpose: 'pro_first_month',
        created_by: 'create-first-month-coupon script',
      },
    });

    console.log('\n✅ Coupon 创建成功！');
    console.log(`   Coupon ID : ${coupon.id}`);
    console.log(`   Name      : ${coupon.name}`);
    console.log(`   Amount off: $${((coupon.amount_off ?? 0) / 100).toFixed(2)}`);
    console.log(`   Duration  : ${coupon.duration}`);
    console.log(`   Valid     : ${coupon.valid}`);
    console.log('\n📋 请将以下内容写入 .env.local / 生产环境变量：');
    console.log(`   STRIPE_PRO_FIRST_MONTH_COUPON_ID=${coupon.id}`);
  } catch (error: any) {
    console.error('❌ 创建失败:', error.message);
    process.exit(1);
  }
}

createFirstMonthCoupon();

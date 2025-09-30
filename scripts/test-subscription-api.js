/**
 * 测试订阅API和前端积分显示问题
 */

const { SubscriptionService } = require('../lib/subscription/subscription-service');

async function testSubscriptionAPI() {
  console.log('🧪 测试订阅API和积分显示问题...');

  try {
    const subscriptionService = new SubscriptionService();

    // 测试有积分的用户UUID（从之前的测试中获得）
    const testUsers = [
      'ithermocraft@hotmail.com', // 1300积分用户
      'jsdasww593@gmail.com',     // 2910积分用户
      '13b23625-0790-40ef-95c4-a4afc5913e10', // 10积分用户
    ];

    for (const userIdentifier of testUsers) {
      console.log(`\n📋 测试用户: ${userIdentifier}`);

      // 根据输入类型确定是email还是UUID
      const isUUID = userIdentifier.includes('-');
      let userUuid = userIdentifier;

      if (!isUUID) {
        // 如果是email，需要先查询UUID
        const { supabaseAdmin, TABLES } = require('../lib/supabase');

        const { data: user, error } = await supabaseAdmin
          .from(TABLES.USERS)
          .select('uuid, email, credits_remaining')
          .eq('email', userIdentifier)
          .single();

        if (error || !user) {
          console.error(`❌ 找不到用户 ${userIdentifier}:`, error?.message);
          continue;
        }

        userUuid = user.uuid;
        console.log(`  UUID: ${userUuid}`);
        console.log(`  积分 (直接查询): ${user.credits_remaining}`);
      }

      // 测试订阅服务API
      try {
        console.log('  🔄 调用 getUserSubscriptionStatus...');
        const result = await subscriptionService.getUserSubscriptionStatus(userUuid);

        if (result.success) {
          console.log('  ✅ API调用成功!');
          console.log(`    - 套餐: ${result.subscription.plan_id}`);
          console.log(`    - 状态: ${result.subscription.status}`);
          console.log(`    - 积分余额: ${result.credits_remaining}`);
          console.log(`    - 积分总数: ${result.subscription.credits_total}`);

          // 检查积分是否一致
          if (result.credits_remaining > 0) {
            console.log('  🎉 发现有积分的用户，积分显示正常!');
          } else {
            console.log('  ⚠️  积分为0，检查是否有积分丢失问题');
          }
        } else {
          console.log('  ❌ API调用失败:', result.error);
        }
      } catch (apiError) {
        console.error('  💥 API调用出错:', apiError.message);
      }
    }

    // 额外测试：模拟前端hook的行为
    console.log('\n🌐 模拟前端API调用 (/api/subscription/status)...');

    // 这里我们模拟一个API测试，检查具体的数据流
    const { supabaseAdmin, TABLES } = require('../lib/supabase');

    // 查找有最多积分的用户进行测试
    const { data: topCreditUser, error: topError } = await supabaseAdmin
      .from(TABLES.USERS)
      .select('uuid, email, credits_remaining, subscription_plan, subscription_status')
      .gt('credits_remaining', 0)
      .order('credits_remaining', { ascending: false })
      .limit(1)
      .single();

    if (topError || !topCreditUser) {
      console.error('❌ 无法找到有积分的用户进行测试');
      return;
    }

    console.log(`\n🏆 选择最高积分用户进行详细测试:`);
    console.log(`  Email: ${topCreditUser.email}`);
    console.log(`  UUID: ${topCreditUser.uuid}`);
    console.log(`  积分: ${topCreditUser.credits_remaining}`);
    console.log(`  套餐: ${topCreditUser.subscription_plan}`);
    console.log(`  状态: ${topCreditUser.subscription_status}`);

    const finalResult = await subscriptionService.getUserSubscriptionStatus(topCreditUser.uuid);

    console.log('\n📊 最终API结果:');
    console.log(JSON.stringify(finalResult, null, 2));

    if (finalResult.success && finalResult.credits_remaining > 0) {
      console.log('\n🎉 API测试成功！积分数据正常，前端应该能够正确显示');
      console.log(`💰 用户 ${topCreditUser.email} 有 ${finalResult.credits_remaining} 积分`);
    } else {
      console.log('\n❌ API测试失败，存在数据问题');
    }

  } catch (error) {
    console.error('💥 测试过程中发生致命错误:', error);
  }
}

// 执行测试
testSubscriptionAPI().catch(console.error);
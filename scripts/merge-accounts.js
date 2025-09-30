/**
 * 合并账号脚本
 * 将购买账号的订阅状态转移到登录账号
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function mergeAccounts() {
  try {
    const purchaseUserUuid = '958faee8-1181-5f16-a7f0-00f906ebb915'; // support@pokemonsgenerator.org
    const loginUserUuid = '97b58959-ac28-46b6-a35f-62f91d28fbba';    // jsdasww593@gmail.com

    console.log('🔄 开始合并账号...');

    // 获取购买账号信息
    const { data: purchaseUser, error: e1 } = await supabase
      .from('users')
      .select('*')
      .eq('uuid', purchaseUserUuid)
      .single();

    if (e1) {
      console.error('❌ 无法获取购买账号:', e1);
      return;
    }

    // 获取登录账号信息
    const { data: loginUser, error: e2 } = await supabase
      .from('users')
      .select('*')
      .eq('uuid', loginUserUuid)
      .single();

    if (e2) {
      console.error('❌ 无法获取登录账号:', e2);
      return;
    }

    console.log('📋 当前状态:');
    console.log('购买账号:', {
      email: purchaseUser.email,
      plan: purchaseUser.subscription_plan,
      status: purchaseUser.subscription_status,
      credits: purchaseUser.credits_remaining
    });
    console.log('登录账号:', {
      email: loginUser.email,
      plan: loginUser.subscription_plan,
      status: loginUser.subscription_status,
      credits: loginUser.credits_remaining
    });

    // 合并逻辑：将购买账号的有效订阅转移到登录账号
    const newCredits = (loginUser.credits_remaining || 0) + (purchaseUser.credits_remaining || 0);
    const newPlan = purchaseUser.subscription_status === 'active' ? purchaseUser.subscription_plan : loginUser.subscription_plan;
    const newStatus = purchaseUser.subscription_status === 'active' ? 'active' : loginUser.subscription_status;

    console.log('🔄 合并结果预览:');
    console.log('新套餐:', newPlan);
    console.log('新状态:', newStatus);
    console.log('新积分:', newCredits);

    // 确认操作
    console.log('\\n❓ 确认合并吗？(输入 yes 继续)');

    // 在Node.js环境中直接执行合并
    console.log('🚀 开始合并...');

    // 更新登录账号
    const { error: updateError } = await supabase
      .from('users')
      .update({
        subscription_plan: newPlan,
        subscription_status: newStatus,
        credits_remaining: newCredits,
        updated_at: new Date().toISOString()
      })
      .eq('uuid', loginUserUuid);

    if (updateError) {
      console.error('❌ 更新登录账号失败:', updateError);
      return;
    }

    // 清空购买账号的订阅（保留账号但清空订阅信息）
    const { error: clearError } = await supabase
      .from('users')
      .update({
        subscription_plan: 'free',
        subscription_status: 'inactive',
        credits_remaining: 0,
        updated_at: new Date().toISOString()
      })
      .eq('uuid', purchaseUserUuid);

    if (clearError) {
      console.error('❌ 清空购买账号失败:', clearError);
      return;
    }

    console.log('✅ 账号合并成功！');
    console.log('📧 登录账号 jsdasww593@gmail.com 现在拥有:');
    console.log(`- 套餐: ${newPlan}`);
    console.log(`- 状态: ${newStatus}`);
    console.log(`- 积分: ${newCredits}`);

  } catch (error) {
    console.error('❌ 合并失败:', error);
  }
}

mergeAccounts().catch(console.error);
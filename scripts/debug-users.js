const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsers() {
  try {
    console.log('🔍 检查购买用户:');
    const { data: purchaseUser, error: e1 } = await supabase
      .from('users')
      .select('*')
      .eq('uuid', '958faee8-1181-5f16-a7f0-00f906ebb915')
      .single();

    if (e1 && e1.code !== 'PGRST116') {
      console.error('Error:', e1);
    } else if (purchaseUser) {
      console.log('Purchase User:', {
        uuid: purchaseUser.uuid,
        email: purchaseUser.email,
        nickname: purchaseUser.nickname,
        subscription_plan: purchaseUser.subscription_plan,
        subscription_status: purchaseUser.subscription_status,
        credits_remaining: purchaseUser.credits_remaining,
        created_at: purchaseUser.created_at
      });
    } else {
      console.log('❌ Purchase User not found');
    }

    console.log('\n🔍 检查登录用户:');
    const { data: loginUser, error: e2 } = await supabase
      .from('users')
      .select('*')
      .eq('uuid', '97b58959-ac28-46b6-a35f-62f91d28fbba')
      .single();

    if (e2 && e2.code !== 'PGRST116') {
      console.error('Error:', e2);
    } else if (loginUser) {
      console.log('Login User:', {
        uuid: loginUser.uuid,
        email: loginUser.email,
        nickname: loginUser.nickname,
        subscription_plan: loginUser.subscription_plan,
        subscription_status: loginUser.subscription_status,
        credits_remaining: loginUser.credits_remaining,
        created_at: loginUser.created_at
      });
    } else {
      console.log('❌ Login User not found');
    }

    console.log('\n🔍 检查邮箱 jsdasww593@gmail.com 的所有用户:');
    const { data: emailUsers, error: e3 } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'jsdasww593@gmail.com');

    if (e3) {
      console.error('Error:', e3);
    } else {
      console.log(`Found ${emailUsers.length} users with this email:`);
      emailUsers.forEach((user, index) => {
        console.log(`User ${index + 1}:`, {
          uuid: user.uuid,
          email: user.email,
          nickname: user.nickname,
          subscription_plan: user.subscription_plan,
          subscription_status: user.subscription_status,
          credits_remaining: user.credits_remaining,
          created_at: user.created_at
        });
      });
    }

  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

checkUsers().catch(console.error);
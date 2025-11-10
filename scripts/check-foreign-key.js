/**
 * 检查 user_images 表的外键约束定义
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkForeignKey() {
  try {
    // 使用 PostgreSQL 系统表查询外键约束
    const { data: constraints, error } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT
          tc.constraint_name,
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = 'user_images';
      `
    });

    if (error) {
      console.log('⚠️  RPC method not available, trying direct query...\n');

      // 如果 RPC 不可用,尝试直接查询表结构
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('uuid')
        .limit(1);

      const { data: images, error: imagesError } = await supabase
        .from('user_images')
        .select('user_id')
        .limit(1);

      console.log('📊 Table access test:');
      console.log(`  users table: ${usersError ? '❌ ' + usersError.message : '✅ accessible'}`);
      console.log(`  user_images table: ${imagesError ? '❌ ' + imagesError.message : '✅ accessible'}`);

      // 检查 users 表的主键
      const targetUserId = '97b58959-ac28-46b6-a35f-62f91d28fbba';

      const { data: userByUuid, error: uuidError } = await supabase
        .from('users')
        .select('uuid, email')
        .eq('uuid', targetUserId)
        .maybeSingle();

      console.log(`\n🔍 User lookup by uuid:`, {
        found: !!userByUuid,
        error: uuidError?.message || null,
        data: userByUuid
      });

      // 尝试插入一条测试记录到 user_images
      console.log(`\n🧪 Attempting test insert into user_images...`);

      const { data: testInsert, error: insertError } = await supabase
        .from('user_images')
        .insert({
          user_id: targetUserId,
          wavespeed_request_id: 'test-' + Date.now(),
          original_url: 'https://test.com/test.jpg',
          storage_url: 'https://test.com/test.jpg',
          prompt: 'Test image',
          model: 'test',
          generation_type: 'text-to-image',
          status: 'completed'
        })
        .select()
        .maybeSingle();

      if (insertError) {
        console.log('❌ Test insert failed:', {
          code: insertError.code,
          message: insertError.message,
          details: insertError.details
        });
      } else {
        console.log('✅ Test insert succeeded:', testInsert);

        // 删除测试记录
        await supabase
          .from('user_images')
          .delete()
          .eq('id', testInsert.id);

        console.log('✅ Test record cleaned up');
      }

      return;
    }

    console.log('✅ Foreign key constraints for user_images:\n');
    constraints.forEach(c => {
      console.log(`Constraint: ${c.constraint_name}`);
      console.log(`  Table: ${c.table_name}.${c.column_name}`);
      console.log(`  References: ${c.foreign_table_name}.${c.foreign_column_name}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Exception:', error);
  }
}

checkForeignKey().then(() => process.exit(0));

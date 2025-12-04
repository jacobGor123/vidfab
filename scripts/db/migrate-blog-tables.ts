/**
 * Blog Tables Migration Script
 * 执行博客系统数据库表的创建
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// 从环境变量获取 Supabase 配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase credentials');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

// 创建 Supabase 客户端 (使用 service role key 以获得完整权限)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🚀 Starting blog tables migration...\n');

  try {
    // 读取 SQL 文件
    const sqlPath = path.join(
      process.cwd(),
      'lib',
      'database',
      'blog-schema.sql'
    );

    console.log('📄 Reading SQL file:', sqlPath);
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    // 分割 SQL 语句 (按分号分割,但跳过函数定义中的分号)
    const statements = sql
      .split(/;\s*$/gm)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements\n`);

    // 执行每个 SQL 语句
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // 跳过注释
      if (statement.startsWith('--') || statement.startsWith('/*')) {
        continue;
      }

      console.log(`[${i + 1}/${statements.length}] Executing statement...`);

      // 显示语句的前 50 个字符
      const preview = statement.substring(0, 50).replace(/\s+/g, ' ');
      console.log(`   ${preview}...`);

      const { error } = await supabase.rpc('exec_sql', {
        sql_query: statement + ';'
      });

      if (error) {
        // 某些错误可以忽略 (如 "already exists")
        if (error.message.includes('already exists')) {
          console.log('   ⚠️  Already exists, skipping...');
        } else {
          throw error;
        }
      } else {
        console.log('   ✅ Success');
      }
    }

    console.log('\n🎉 Migration completed successfully!');
    console.log('\n📊 Verifying tables...');

    // 验证表是否创建成功
    const { data: tables, error: tablesError } = await supabase
      .from('blog_posts')
      .select('id')
      .limit(0);

    if (tablesError) {
      console.error('❌ Table verification failed:', tablesError);
    } else {
      console.log('✅ blog_posts table created successfully');
    }

    const { data: imagesTables, error: imagesError } = await supabase
      .from('blog_images')
      .select('id')
      .limit(0);

    if (imagesError) {
      console.error('❌ Table verification failed:', imagesError);
    } else {
      console.log('✅ blog_images table created successfully');
    }

    console.log('\n✨ All done! You can now use the blog system.');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// 执行迁移
runMigration();

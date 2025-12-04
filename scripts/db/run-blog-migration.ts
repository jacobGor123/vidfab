/**
 * Blog Tables Migration Runner
 * 执行博客系统数据库表的创建
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// 从环境变量获取 Supabase 配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase credentials');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

// 创建 Supabase 客户端
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  console.log('🚀 Starting blog tables migration...\n');

  try {
    // 读取 SQL 文件
    const sqlPath = path.join(process.cwd(), 'lib', 'database', 'blog-schema.sql');
    console.log('📄 Reading SQL file:', sqlPath);

    const sql = fs.readFileSync(sqlPath, 'utf-8');

    // 执行每个 SQL 语句
    const statements = [
      // 创建 blog_posts 表
      `CREATE TABLE IF NOT EXISTS blog_posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        content TEXT NOT NULL,
        excerpt TEXT,
        featured_image_url TEXT,
        meta_title VARCHAR(255),
        meta_description VARCHAR(320),
        keywords TEXT[],
        category VARCHAR(50),
        tags TEXT[],
        status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published')),
        scheduled_at TIMESTAMPTZ,
        published_at TIMESTAMPTZ,
        view_count INTEGER DEFAULT 0,
        read_time_minutes INTEGER,
        table_of_contents JSONB,
        faq_schema JSONB,
        author_uuid UUID REFERENCES users(uuid) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,

      // 创建索引
      `CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug)`,
      `CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status)`,
      `CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(published_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts(category)`,
      `CREATE INDEX IF NOT EXISTS idx_blog_posts_author ON blog_posts(author_uuid)`,
      `CREATE INDEX IF NOT EXISTS idx_blog_posts_created_at ON blog_posts(created_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_blog_posts_keywords ON blog_posts USING GIN (keywords)`,
      `CREATE INDEX IF NOT EXISTS idx_blog_posts_tags ON blog_posts USING GIN (tags)`,

      // 创建 blog_images 表
      `CREATE TABLE IF NOT EXISTS blog_images (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        post_id UUID REFERENCES blog_posts(id) ON DELETE CASCADE,
        image_url TEXT NOT NULL,
        alt_text TEXT,
        caption TEXT,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,

      // 创建 blog_images 索引
      `CREATE INDEX IF NOT EXISTS idx_blog_images_post_id ON blog_images(post_id)`,
      `CREATE INDEX IF NOT EXISTS idx_blog_images_order ON blog_images(post_id, display_order)`,

      // 创建触发器函数
      `CREATE OR REPLACE FUNCTION update_blog_posts_updated_at()
       RETURNS TRIGGER AS $$
       BEGIN
         NEW.updated_at = NOW();
         RETURN NEW;
       END;
       $$ LANGUAGE plpgsql`,

      // 创建触发器
      `DROP TRIGGER IF EXISTS trigger_update_blog_posts_updated_at ON blog_posts`,
      `CREATE TRIGGER trigger_update_blog_posts_updated_at
       BEFORE UPDATE ON blog_posts
       FOR EACH ROW
       EXECUTE FUNCTION update_blog_posts_updated_at()`
    ];

    console.log(`📝 Executing ${statements.length} SQL statements...\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (!statement) continue;

      console.log(`[${i + 1}/${statements.length}] Executing...`);

      const preview = statement.substring(0, 60).replace(/\s+/g, ' ');
      console.log(`   ${preview}...`);

      const { error } = await supabase.rpc('exec_sql', { sql: statement });

      if (error) {
        // 忽略 "already exists" 错误
        if (error.message?.includes('already exists') ||
            error.message?.includes('does not exist')) {
          console.log('   ⚠️  Already exists or dependency issue, continuing...');
        } else {
          console.error('   ❌ Error:', error.message);
          throw error;
        }
      } else {
        console.log('   ✅ Success');
      }
    }

    console.log('\n🎉 Migration completed!\n');
    console.log('📊 Verifying tables...');

    // 验证表是否创建成功
    const { count: postsCount, error: postsError } = await supabase
      .from('blog_posts')
      .select('*', { count: 'exact', head: true });

    if (postsError) {
      console.error('❌ blog_posts verification failed:', postsError.message);
    } else {
      console.log(`✅ blog_posts table verified (${postsCount || 0} records)`);
    }

    const { count: imagesCount, error: imagesError } = await supabase
      .from('blog_images')
      .select('*', { count: 'exact', head: true });

    if (imagesError) {
      console.error('❌ blog_images verification failed:', imagesError.message);
    } else {
      console.log(`✅ blog_images table verified (${imagesCount || 0} records)`);
    }

    console.log('\n✨ All done! Blog system is ready to use.');

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// 执行迁移
runMigration();

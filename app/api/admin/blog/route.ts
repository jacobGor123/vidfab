/**
 * Admin Blog API - 主路由
 * GET: 获取博客列表（带分页和筛选）
 * POST: 创建新博客文章
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { supabaseAdmin } from '@/lib/supabase';
import type { BlogPost } from '@/models/blog';

/**
 * GET /api/admin/blog
 * 获取博客文章列表（带分页和筛选）
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const category = searchParams.get('category') || '';
    const status = searchParams.get('status') || 'all';
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const offset = (page - 1) * limit;

    // 构建查询
    let query = supabaseAdmin
      .from('blog_posts')
      .select('*', { count: 'exact' });

    // 筛选条件
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }
    if (status !== 'all') {
      query = query.eq('status', status);
    }
    if (search) {
      query = query.or(`title.ilike.%${search}%,excerpt.ilike.%${search}%`);
    }

    // 排序
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // 分页
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('查询 blog_posts 失败:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        hasMore: offset + limit < (count || 0),
      },
    });
  } catch (error: any) {
    console.error('GET /api/admin/blog 失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '获取博客列表失败' },
      { status: error.status || 500 }
    );
  }
}

/**
 * POST /api/admin/blog
 * 创建新博客文章
 */
export async function POST(request: NextRequest) {
  try {
    const adminUser = await requireAdmin();
    const body = await request.json();

    // 验证必需字段
    if (!body.title || !body.content) {
      return NextResponse.json(
        { success: false, error: '标题和内容不能为空' },
        { status: 400 }
      );
    }

    // 生成 slug (如果没有提供)
    const slug = body.slug || generateSlug(body.title);

    // 检查 slug 是否已存在
    const { data: existingPost } = await supabaseAdmin
      .from('blog_posts')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existingPost) {
      return NextResponse.json(
        { success: false, error: `Slug "${slug}" 已存在,请使用其他标题` },
        { status: 400 }
      );
    }

    // 计算阅读时间
    const readTimeMinutes = calculateReadTime(body.content);

    // 准备数据
    const postData: Partial<BlogPost> = {
      title: body.title,
      slug,
      content: body.content,
      excerpt: body.excerpt || null,
      featured_image_url: body.featured_image_url || null,
      meta_title: body.meta_title || null,
      meta_description: body.meta_description || null,
      keywords: body.keywords || null,
      category: body.category || null,
      tags: body.tags || null,
      status: body.status || 'draft',
      scheduled_at: body.scheduled_at || null,
      published_at: body.status === 'published' ? new Date().toISOString() : null,
      read_time_minutes: readTimeMinutes,
      table_of_contents: body.table_of_contents || null,
      faq_schema: body.faq_schema || null,
      author_uuid: adminUser.uuid,
    };

    // 插入数据库
    const { data, error } = await supabaseAdmin
      .from('blog_posts')
      .insert(postData)
      .select()
      .single();

    if (error) {
      console.error('创建博客文章失败:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    console.log('✅ 博客文章创建成功:', data.id, data.title);

    return NextResponse.json({
      success: true,
      data,
      message: '博客文章创建成功',
    });
  } catch (error: any) {
    console.error('POST /api/admin/blog 失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '创建博客文章失败' },
      { status: error.status || 500 }
    );
  }
}

/**
 * 生成 URL 友好的 slug
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    // 移除特殊字符
    .replace(/[^a-z0-9\s-]/g, '')
    // 空格和多个连字符转为单个连字符
    .replace(/[\s-]+/g, '-')
    // 移除首尾连字符
    .replace(/^-+|-+$/g, '');
}

/**
 * 计算阅读时间（分钟）
 * 基于 200 words/min
 */
function calculateReadTime(htmlContent: string): number {
  // 移除 HTML 标签
  const text = htmlContent.replace(/<[^>]*>/g, ' ');
  // 计算单词数
  const wordCount = text.split(/\s+/).filter((word) => word.length > 0).length;
  // 计算分钟数（向上取整）
  return Math.ceil(wordCount / 200) || 1;
}

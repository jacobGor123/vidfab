/**
 * Admin Blog API - 单条博客路由
 * GET: 获取单条博客详情
 * PUT: 更新博客文章
 * DELETE: 删除博客文章
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { supabaseAdmin } from '@/lib/supabase';
import type { BlogPost } from '@/models/blog';

/**
 * GET /api/admin/blog/[id]
 * 获取单条博客详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();

    const { data, error } = await supabaseAdmin
      .from('blog_posts')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { success: false, error: '博客文章不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error('GET /api/admin/blog/[id] 失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '获取博客文章失败' },
      { status: error.status || 500 }
    );
  }
}

/**
 * PUT /api/admin/blog/[id]
 * 更新博客文章
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    const body = await request.json();

    // 检查文章是否存在
    const { data: existingPost } = await supabaseAdmin
      .from('blog_posts')
      .select('id, slug, status')
      .eq('id', params.id)
      .single();

    if (!existingPost) {
      return NextResponse.json(
        { success: false, error: '博客文章不存在' },
        { status: 404 }
      );
    }

    // 如果修改了 slug,检查新 slug 是否冲突
    if (body.slug && body.slug !== existingPost.slug) {
      const { data: conflictPost } = await supabaseAdmin
        .from('blog_posts')
        .select('id')
        .eq('slug', body.slug)
        .neq('id', params.id)
        .single();

      if (conflictPost) {
        return NextResponse.json(
          { success: false, error: `Slug "${body.slug}" 已被其他文章使用` },
          { status: 400 }
        );
      }
    }

    // 计算阅读时间（如果内容有更新）
    let readTimeMinutes = body.read_time_minutes;
    if (body.content) {
      readTimeMinutes = calculateReadTime(body.content);
    }

    // 准备更新数据
    const updateData: Partial<BlogPost> = {
      ...body,
      read_time_minutes: readTimeMinutes,
    };

    // 如果状态改为 published,设置发布时间
    if (body.status === 'published' && existingPost.status !== 'published') {
      updateData.published_at = new Date().toISOString();
    }

    // 移除不应该被更新的字段
    delete (updateData as any).id;
    delete (updateData as any).created_at;
    delete (updateData as any).author_uuid;

    // 执行更新
    const { data, error } = await supabaseAdmin
      .from('blog_posts')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('更新博客文章失败:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    console.log('✅ 博客文章更新成功:', data.id, data.title);

    return NextResponse.json({
      success: true,
      data,
      message: '博客文章更新成功',
    });
  } catch (error: any) {
    console.error('PUT /api/admin/blog/[id] 失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '更新博客文章失败' },
      { status: error.status || 500 }
    );
  }
}

/**
 * DELETE /api/admin/blog/[id]
 * 删除博客文章
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();

    // 检查文章是否存在
    const { data: existingPost } = await supabaseAdmin
      .from('blog_posts')
      .select('id, title')
      .eq('id', params.id)
      .single();

    if (!existingPost) {
      return NextResponse.json(
        { success: false, error: '博客文章不存在' },
        { status: 404 }
      );
    }

    // 执行删除（会自动级联删除关联的 blog_images）
    const { error } = await supabaseAdmin
      .from('blog_posts')
      .delete()
      .eq('id', params.id);

    if (error) {
      console.error('删除博客文章失败:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    console.log('✅ 博客文章删除成功:', params.id, existingPost.title);

    return NextResponse.json({
      success: true,
      message: '博客文章删除成功',
    });
  } catch (error: any) {
    console.error('DELETE /api/admin/blog/[id] 失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '删除博客文章失败' },
      { status: error.status || 500 }
    );
  }
}

/**
 * 计算阅读时间（分钟）
 */
function calculateReadTime(htmlContent: string): number {
  const text = htmlContent.replace(/<[^>]*>/g, ' ');
  const wordCount = text.split(/\s+/).filter((word) => word.length > 0).length;
  return Math.ceil(wordCount / 200) || 1;
}

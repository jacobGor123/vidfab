/**
 * Admin Blog 编辑页面
 * 编辑现有的博客文章
 */

import { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import { isCurrentUserAdmin } from '@/lib/admin/auth';
import { getBlogPostById } from '@/models/blog';
import BlogForm from '@/components/admin/blog/blog-form';

export const metadata: Metadata = {
  title: 'Edit Blog Post | Admin',
  description: 'Edit blog post',
};

export const dynamic = 'force-dynamic';

interface EditBlogPageProps {
  params: {
    id: string;
  };
}

export default async function EditBlogPage({ params }: EditBlogPageProps) {
  // 验证管理员权限
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    redirect('/');
  }

  // 获取文章数据
  const post = await getBlogPostById(params.id);

  if (!post) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">编辑博客文章</h1>
        <p className="mt-2 text-gray-600">编辑文章: {post.title}</p>
      </div>

      <BlogForm initialData={post} isEdit />
    </div>
  );
}

/**
 * Admin Blog 创建页面
 * 创建新的博客文章
 */

import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { isCurrentUserAdmin } from '@/lib/admin/auth';
import BlogForm from '@/components/admin/blog/blog-form';

export const metadata: Metadata = {
  title: 'Create Blog Post | Admin',
  description: 'Create a new blog post',
};

export const dynamic = 'force-dynamic';

export default async function CreateBlogPage() {
  // 验证管理员权限
  const { isAdmin } = await isCurrentUserAdmin();
  if (!isAdmin) {
    redirect('/');
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">创建博客文章</h1>
        <p className="mt-2 text-gray-600">填写下面的表单创建新文章</p>
      </div>

      <BlogForm />
    </div>
  );
}

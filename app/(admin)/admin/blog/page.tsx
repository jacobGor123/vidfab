/**
 * Admin Blog 页面
 * 管理博客文章
 */

import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { isCurrentUserAdmin } from '@/lib/admin/auth';
import BlogListClient from '@/components/admin/blog/blog-list-client';

export const metadata: Metadata = {
  title: 'Blog Management | Admin',
  description: 'Manage blog posts',
};

export const dynamic = 'force-dynamic';

export default async function AdminBlogPage() {
  // 验证管理员权限
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    redirect('/');
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Blog Management</h1>
        <p className="mt-2 text-gray-600">
          Create and manage blog posts for VidFab.ai
        </p>
      </div>

      <BlogListClient />
    </div>
  );
}

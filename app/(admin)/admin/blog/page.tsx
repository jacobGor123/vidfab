/**
 * Admin Blog 页面
 * 管理博客文章
 */

import { Metadata } from 'next';
import AdminPageHeader from '@/components/admin/admin-page-header';
import BlogListClient from '@/components/admin/blog/blog-list-client';

export const metadata: Metadata = {
  title: 'Blog Management | Admin',
  description: 'Manage blog posts',
};

export const dynamic = 'force-dynamic';

export default async function AdminBlogPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Blog"
        description="Create and manage VidFab.ai blog posts."
      />
      <BlogListClient />
    </div>
  );
}

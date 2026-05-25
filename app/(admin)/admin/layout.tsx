/**
 * Admin Dashboard Layout
 * Provides navigation and layout for admin pages
 */

import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { isCurrentUserAdmin } from '@/lib/admin/auth';
import SidebarNav from '@/components/admin/sidebar-nav';
import AdminPageTransition from '@/components/admin/admin-page-transition';
import { ArrowLeft } from 'lucide-react';

// 🔥 Force dynamic rendering - disable caching for admin pages
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check if user is admin
  const isAdmin = await isCurrentUserAdmin();

  if (!isAdmin) {
    redirect('/');
  }

  return (
    <div className="admin-shell min-h-screen bg-slate-50 pt-20 text-slate-950">
      {/* Sidebar */}
      <aside className="fixed left-0 top-20 bottom-0 hidden w-64 flex-shrink-0 overflow-y-auto border-r border-slate-200 bg-white lg:flex">
        <div className="flex flex-col h-full">
          {/* Logo/Title */}
          <div className="border-b border-slate-200 p-5">
            <h1 className="text-base font-semibold text-slate-950">VidFab Admin</h1>
            <p className="mt-1 text-xs text-slate-500">Management Console</p>
          </div>

          {/* Navigation */}
          <SidebarNav />

          {/* Back to Site */}
          <div className="border-t border-slate-200 p-4">
            <Link
              href="/"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Site
            </Link>
          </div>
        </div>
      </aside>

      <div className="lg:ml-64">
        <div className="sticky top-20 z-20 border-b border-slate-200 bg-slate-50/95 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <h1 className="text-sm font-semibold text-slate-950">VidFab Admin</h1>
              <p className="text-xs text-slate-500">Management Console</p>
            </div>
            <Link
              href="/"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Site
            </Link>
          </div>
          <SidebarNav variant="mobile" />
        </div>

        {/* Main Content */}
        <main className="overflow-auto">
          <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <AdminPageTransition>{children}</AdminPageTransition>
          </div>
        </main>
      </div>
    </div>
  );
}

/**
 * Admin Dashboard Layout
 * Provides navigation and layout for admin pages
 */

import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { isCurrentUserAdmin } from '@/lib/admin/auth';
import SidebarNav from '@/components/admin/sidebar-nav';

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
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 pt-20">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex-shrink-0 fixed left-0 top-20 bottom-0 overflow-y-auto shadow-sm">
        <div className="flex flex-col h-full">
          {/* Logo/Title with brand gradient */}
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500">
            <h1 className="text-xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-xs text-white/90 mt-1">Management Console</p>
          </div>

          {/* Navigation */}
          <SidebarNav />

          {/* Back to Site */}
          <div className="p-4 border-t border-gray-200">
            <Link
              href="/"
              className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 hover:text-purple-600 rounded-lg hover:bg-purple-50 transition-colors"
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Site
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto ml-64">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}

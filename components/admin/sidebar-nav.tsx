/**
 * Admin Sidebar Navigation
 * Client component for active link highlighting
 */

'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  Clapperboard,
  FileText,
  Film,
  ListChecks,
  ShoppingCart,
  Users,
} from 'lucide-react';

const navItems = [
  {
    href: '/admin/analytics',
    label: 'Analytics',
    icon: BarChart3,
  },
  {
    href: '/admin/users',
    label: 'Users',
    icon: Users,
  },
  {
    href: '/admin/paid-orders',
    label: 'Orders',
    icon: ShoppingCart,
  },
  {
    href: '/admin/tasks',
    label: 'Tasks',
    icon: ListChecks,
  },
  {
    href: '/admin/blog',
    label: 'Blog',
    icon: FileText,
  },
  {
    href: '/admin/discover',
    label: 'Discover',
    icon: Clapperboard,
  },
  {
    href: '/admin/video-agent',
    label: 'Video Agent',
    icon: Film,
  },
];

interface SidebarNavProps {
  variant?: 'sidebar' | 'mobile';
}

export default function SidebarNav({ variant = 'sidebar' }: SidebarNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isMobile = variant === 'mobile';

  return (
    <nav
      className={
        isMobile
          ? 'flex gap-2 overflow-x-auto px-4 py-3'
          : 'flex-1 space-y-1.5 px-3 py-4'
      }
    >
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={false}
            onPointerEnter={() => router.prefetch(item.href)}
            onTouchStart={() => router.prefetch(item.href)}
            onFocus={() => router.prefetch(item.href)}
            className={
              isMobile
                ? `inline-flex h-9 shrink-0 items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors ${
                    isActive
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`
                : `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                  }`
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

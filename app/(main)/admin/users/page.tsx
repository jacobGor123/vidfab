/**
 * Users Admin Page
 * Displays all users in a table format
 */

import React from 'react';
import { getUsers } from '@/models/user';
import TableSlot from '@/components/dashboard/slots/table';
import { Table as TableSlotType } from '@/types/slots/table';
import { TableColumn } from '@/types/blocks/table';
import Image from 'next/image';

// 🔥 Force dynamic rendering - disable caching for admin pages
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Note: Removed edge runtime - NextAuth requires Node.js runtime

export default async function UsersPage() {
  // Fetch users from database
  const users = await getUsers(1, 100);

  if (!users) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Failed to load users. Please try again later.</p>
      </div>
    );
  }

  // Define table columns
  const columns: TableColumn[] = [
    {
      name: 'uuid',
      title: 'UUID',
      className: 'font-mono text-xs w-24',
      callback: (row) => (
        <span className="truncate block" title={row.uuid}>
          {row.uuid.substring(0, 8)}...
        </span>
      ),
    },
    {
      name: 'avatar_url',
      title: 'Avatar',
      className: 'w-16',
      callback: (row) => {
        if (!row.avatar_url) {
          return (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-200 to-blue-200 flex items-center justify-center">
              <span className="text-xs font-semibold text-purple-700">
                {row.nickname?.charAt(0)?.toUpperCase() || row.email?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
          );
        }
        return (
          <Image
            src={row.avatar_url}
            alt={row.nickname || 'User avatar'}
            width={40}
            height={40}
            className="rounded-full object-cover"
            unoptimized
          />
        );
      },
    },
    {
      name: 'email',
      title: 'Email',
      className: 'font-medium',
    },
    {
      name: 'nickname',
      title: 'Name',
      callback: (row) => row.nickname || '-',
    },
    {
      name: 'signin_provider',
      title: 'Provider',
      className: 'w-24',
      callback: (row) => {
        const provider = row.signin_provider || 'email';
        const colors: Record<string, string> = {
          google: 'bg-red-100 text-red-800 border-red-200',
          github: 'bg-gray-100 text-gray-800 border-gray-200',
          email: 'bg-blue-100 text-blue-800 border-blue-200',
        };
        const color = colors[provider] || 'bg-gray-100 text-gray-800 border-gray-200';

        return (
          <span className={`px-2 py-0.5 rounded text-xs font-medium border ${color}`}>
            {provider}
          </span>
        );
      },
    },
    {
      name: 'subscription_plan',
      title: 'Plan',
      className: 'w-20',
      callback: (row) => {
        const plan = row.subscription_plan || 'free';
        const colors: Record<string, string> = {
          free: 'bg-gray-100 text-gray-800 border-gray-200',
          lite: 'bg-blue-100 text-blue-800 border-blue-200',
          pro: 'bg-purple-100 text-purple-800 border-purple-200',
          premium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        };
        const color = colors[plan] || colors.free;

        return (
          <span className={`px-2 py-0.5 rounded text-xs font-medium border ${color} uppercase`}>
            {plan}
          </span>
        );
      },
    },
    {
      name: 'credits_remaining',
      title: 'Credits',
      className: 'w-20 text-right',
      callback: (row) => {
        const credits = row.credits_remaining ?? 0;
        return <span className="font-mono text-sm">{credits}</span>;
      },
    },
    {
      name: 'email_verified',
      title: 'Verified',
      className: 'w-20',
      callback: (row) => {
        return row.email_verified ? (
          <span className="text-green-600">✓</span>
        ) : (
          <span className="text-gray-400">✗</span>
        );
      },
    },
    {
      name: 'created_at',
      title: 'Created At',
      className: 'w-40',
      callback: (row) => {
        const date = new Date(row.created_at);
        return (
          <span className="text-xs text-gray-600">
            {date.toLocaleDateString()} {date.toLocaleTimeString()}
          </span>
        );
      },
    },
  ];

  // Assemble table slot
  const table: TableSlotType = {
    title: `All Users (${users.length})`,
    description: 'Manage and view all registered users',
    columns,
    data: users,
  };

  return (
    <div>
      <TableSlot {...table} />
    </div>
  );
}

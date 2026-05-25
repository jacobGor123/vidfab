/**
 * Paid Orders Admin Page
 * Displays all paid orders in a table format
 */

import React from 'react';
import { getPaidOrders, getPaidOrdersSummary } from '@/models/order';
import TableSlot from '@/components/dashboard/slots/table';
import { Table as TableSlotType } from '@/types/slots/table';
import { TableColumn } from '@/types/blocks/table';
import UsersPagination from '@/components/admin/users-pagination';
import AdminPageHeader from '@/components/admin/admin-page-header';
import {
  ADMIN_STATS_TIMEZONE_LABEL,
  formatAdminDateTime,
  formatAdminUtcTitle,
} from '@/lib/admin/datetime';

// 🔥 Force dynamic rendering - disable caching for admin pages
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Note: Removed edge runtime - NextAuth requires Node.js runtime

interface PaidOrdersPageProps {
  searchParams: {
    page?: string;
  };
}

export default async function PaidOrdersPage({ searchParams }: PaidOrdersPageProps) {
  const currentPage = Number(searchParams.page) || 1;
  const pageSize = 50;
  const requestedPage = Math.max(1, currentPage);
  const [summary, requestedOrders] = await Promise.all([
    getPaidOrdersSummary(),
    getPaidOrders(requestedPage, pageSize),
  ]);
  const totalPages = Math.ceil(summary.count / pageSize);
  const validPage = Math.max(1, Math.min(currentPage, totalPages || 1));

  const orders =
    validPage === requestedPage
      ? requestedOrders
      : await getPaidOrders(validPage, pageSize);

  if (!orders) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Failed to load orders. Please try again later.</p>
      </div>
    );
  }

  // Define table columns
  const columns: TableColumn[] = [
    {
      name: 'order_no',
      title: 'Order No',
      className: 'font-mono text-xs w-32',
    },
    {
      name: 'paid_email',
      title: 'Paid Email',
      className: 'font-medium',
    },
    {
      name: 'product_name',
      title: 'Product',
      className: 'w-40',
    },
    {
      name: 'amount',
      title: 'Amount',
      className: 'w-24 text-right',
      callback: (row) => {
        const amount = row.amount || 0;
        return (
          <span className="font-mono font-bold text-green-700">
            ${amount.toFixed(2)}
          </span>
        );
      },
    },
    {
      name: 'interval',
      title: 'Interval',
      className: 'w-24',
      callback: (row) => {
        const interval = row.interval || 'one-time';
        const colors: Record<string, string> = {
          'one-time': 'bg-gray-100 text-gray-800 border-gray-200',
          'month': 'bg-blue-100 text-blue-800 border-blue-200',
          'year': 'bg-purple-100 text-purple-800 border-purple-200',
        };
        const color = colors[interval] || colors['one-time'];

        const labels: Record<string, string> = {
          'one-time': 'One-time',
          'month': 'Monthly',
          'year': 'Yearly',
        };
        const label = labels[interval] || interval;

        return (
          <span className={`px-2 py-0.5 rounded text-xs font-medium border ${color}`}>
            {label}
          </span>
        );
      },
    },
    {
      name: 'status',
      title: 'Status',
      className: 'w-20',
      callback: (row) => {
        return (
          <span className="px-2 py-0.5 rounded text-xs font-medium border bg-green-100 text-green-800 border-green-200">
            PAID
          </span>
        );
      },
    },
    {
      name: 'paid_at',
      title: `Payment Completed (${ADMIN_STATS_TIMEZONE_LABEL})`,
      className: 'w-40',
      callback: (row) => {
        if (!row.paid_at) return <span className="text-gray-400 text-xs">-</span>;

        return (
          <span
            className="text-xs text-gray-600"
            title={formatAdminUtcTitle(row.paid_at)}
          >
            {formatAdminDateTime(row.paid_at)}
          </span>
        );
      },
    },
    {
      name: 'user_created_at',
      title: `User Registered (${ADMIN_STATS_TIMEZONE_LABEL})`,
      className: 'w-40',
      callback: (row) => {
        if (!row.user_created_at) return <span className="text-gray-400 text-xs">-</span>;

        return (
          <span
            className="text-xs text-gray-600"
            title={formatAdminUtcTitle(row.user_created_at)}
          >
            {formatAdminDateTime(row.user_created_at)}
          </span>
        );
      },
    },
  ];

  // Assemble table slot
  const table: TableSlotType = {
    title: 'Completed Orders',
    description: `Total Revenue: $${summary.totalRevenue.toFixed(2)} - Page ${validPage} of ${totalPages || 1}`,
    columns,
    data: orders,
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Paid Orders"
        description="Completed subscription and credit purchases."
        meta={
          <span className="rounded-md border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
            ${summary.totalRevenue.toFixed(2)} revenue
          </span>
        }
      />

      <TableSlot {...table} />
      <UsersPagination
        currentPage={validPage}
        totalPages={totalPages}
        baseUrl="/admin/paid-orders"
      />
    </div>
  );
}

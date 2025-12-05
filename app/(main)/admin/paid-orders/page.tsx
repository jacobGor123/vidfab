/**
 * Paid Orders Admin Page
 * Displays all paid orders in a table format
 */

import React from 'react';
import { getPaidOrders } from '@/models/order';
import TableSlot from '@/components/dashboard/slots/table';
import { Table as TableSlotType } from '@/types/slots/table';
import { TableColumn } from '@/types/blocks/table';

// 🔥 Force dynamic rendering - disable caching for admin pages
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Note: Removed edge runtime - NextAuth requires Node.js runtime

export default async function PaidOrdersPage() {
  // Fetch paid orders from database
  const orders = await getPaidOrders(1, 100);

  if (!orders) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Failed to load orders. Please try again later.</p>
      </div>
    );
  }

  // Calculate total revenue
  const totalRevenue = orders.reduce((sum, order) => sum + (order.amount || 0), 0);

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
      title: 'Paid At',
      className: 'w-40',
      callback: (row) => {
        if (!row.paid_at) return <span className="text-gray-400 text-xs">-</span>;

        const date = new Date(row.paid_at);
        return (
          <span className="text-xs text-gray-600">
            {date.toLocaleDateString()} {date.toLocaleTimeString()}
          </span>
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
    title: `Paid Orders (${orders.length})`,
    description: `Total Revenue: $${totalRevenue.toFixed(2)}`,
    columns,
    data: orders,
  };

  return (
    <div>
      <TableSlot {...table} />
    </div>
  );
}

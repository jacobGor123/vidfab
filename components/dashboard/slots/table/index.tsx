/**
 * Table Slot Component
 * Reusable table component with customizable columns and rendering
 */

import React from 'react';
import TableBlock from '@/components/blocks/table';
import { Table as TableSlotType } from '@/types/slots/table';

interface TableSlotProps extends TableSlotType {}

export default function TableSlot({
  title,
  description,
  columns = [],
  data = [],
  empty_message = 'No data available',
  pagination,
}: TableSlotProps) {
  return (
    <div className="w-full space-y-4">
      {/* Header */}
      {(title || description) && (
        <div className="space-y-2">
          {title && (
            <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          )}
          {description && (
            <p className="text-muted-foreground">{description}</p>
          )}
        </div>
      )}

      {/* Table */}
      <TableBlock columns={columns} data={data} emptyMessage={empty_message} />

      {/* Pagination (if provided) */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <div className="text-sm text-muted-foreground">
            Showing {((pagination.currentPage - 1) * pagination.pageSize) + 1} to{' '}
            {Math.min(pagination.currentPage * pagination.pageSize, pagination.totalItems)} of{' '}
            {pagination.totalItems} results
          </div>
          <div className="flex items-center space-x-2">
            <button
              disabled={pagination.currentPage === 1}
              className="px-3 py-1 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent"
            >
              Previous
            </button>
            <span className="text-sm">
              Page {pagination.currentPage} of {pagination.totalPages}
            </span>
            <button
              disabled={pagination.currentPage === pagination.totalPages}
              className="px-3 py-1 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

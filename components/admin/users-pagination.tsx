/**
 * Users Pagination Component
 * Client-side pagination navigation for users list
 */

'use client';

import React from 'react';
import Link from 'next/link';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

interface UsersPaginationProps {
  currentPage: number;
  totalPages: number;
  baseUrl?: string;
}

export default function UsersPagination({
  currentPage,
  totalPages,
  baseUrl = '/admin/users',
}: UsersPaginationProps) {
  // 如果只有一页,不显示分页
  if (totalPages <= 1) {
    return null;
  }

  const getPageUrl = (page: number) => {
    return `${baseUrl}?page=${page}`;
  };

  // 生成页码数组 (智能省略)
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    const showMax = 7; // 最多显示7个页码按钮

    if (totalPages <= showMax) {
      // 如果总页数小于等于7,显示所有页码
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // 总是显示第一页
      pages.push(1);

      if (currentPage > 3) {
        pages.push('ellipsis');
      }

      // 显示当前页附近的页码
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('ellipsis');
      }

      // 总是显示最后一页
      pages.push(totalPages);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex justify-center py-6">
      {/* 分页导航 */}
      <Pagination>
        <PaginationContent>
          {/* 上一页 */}
          <PaginationItem>
            {currentPage > 1 ? (
              <Link href={getPageUrl(currentPage - 1)} passHref legacyBehavior>
                <PaginationPrevious />
              </Link>
            ) : (
              <PaginationPrevious className="pointer-events-none opacity-50" />
            )}
          </PaginationItem>

          {/* 页码按钮 */}
          {pageNumbers.map((page, index) => (
            <PaginationItem key={`page-${index}`}>
              {page === 'ellipsis' ? (
                <PaginationEllipsis />
              ) : (
                <Link href={getPageUrl(page)} passHref legacyBehavior>
                  <PaginationLink isActive={currentPage === page}>
                    {page}
                  </PaginationLink>
                </Link>
              )}
            </PaginationItem>
          ))}

          {/* 下一页 */}
          <PaginationItem>
            {currentPage < totalPages ? (
              <Link href={getPageUrl(currentPage + 1)} passHref legacyBehavior>
                <PaginationNext />
              </Link>
            ) : (
              <PaginationNext className="pointer-events-none opacity-50" />
            )}
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}

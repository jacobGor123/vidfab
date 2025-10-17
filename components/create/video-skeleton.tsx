/**
 * Video Assets Loading Skeleton
 * Provides smooth loading experience for my-assets page
 */

import { Card, CardContent } from "@/components/ui/card"

interface VideoSkeletonProps {
  count?: number
}

export function VideoSkeleton({ count = 3 }: VideoSkeletonProps) {
  return (
    <div className="h-screen flex flex-col p-6">
      {/* Fixed Header: Stats Skeleton */}
      <div className="flex-none mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-gray-950 border border-gray-800 rounded-lg p-4">
              <div className="h-8 bg-gray-800 rounded mb-2 animate-pulse"></div>
              <div className="h-4 bg-gray-800 rounded w-24 animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Scrollable Content: Assets List Skeleton */}
      <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2 pb-10">
        {Array.from({ length: count }).map((_, index) => (
          <Card key={index} className="bg-gray-950 border-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {/* Thumbnail Skeleton */}
                  <div className="w-20 h-14 bg-gray-800 rounded-lg animate-pulse"></div>

                  {/* Video Info Skeleton */}
                  <div className="flex-1">
                    <div className="h-5 bg-gray-800 rounded mb-2 w-64 animate-pulse"></div>
                    <div className="flex items-center space-x-4">
                      <div className="h-4 bg-gray-800 rounded w-20 animate-pulse"></div>
                      <div className="h-4 bg-gray-800 rounded w-8 animate-pulse"></div>
                      <div className="h-4 bg-gray-800 rounded w-16 animate-pulse"></div>
                      <div className="h-4 bg-gray-800 rounded w-20 animate-pulse"></div>
                      <div className="h-4 bg-gray-800 rounded w-12 animate-pulse"></div>
                    </div>
                  </div>

                  {/* Status Badge Skeleton */}
                  <div className="h-6 bg-gray-800 rounded-full w-20 animate-pulse"></div>
                </div>

                {/* Actions Skeleton */}
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gray-800 rounded animate-pulse"></div>
                  <div className="w-8 h-8 bg-gray-800 rounded animate-pulse"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Fixed Footer: Pagination Skeleton */}
      <div className="flex-none pt-4">
        <div className="flex justify-center">
          <div className="h-10 bg-gray-800 rounded w-32 animate-pulse"></div>
        </div>
      </div>
    </div>
  )
}

export function EmptyVideosSkeleton() {
  return (
    <div className="h-screen flex flex-col p-6">
      {/* Fixed Header: Stats Skeleton */}
      <div className="flex-none mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-gray-950 border border-gray-800 rounded-lg p-4">
              <div className="h-8 bg-gray-800 rounded mb-2 animate-pulse"></div>
              <div className="h-4 bg-gray-800 rounded w-24 animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Scrollable Content: Empty State Skeleton */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-10 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-gray-800 rounded-full mx-auto mb-6 animate-pulse"></div>
          <div className="h-6 bg-gray-800 rounded w-32 mx-auto mb-2 animate-pulse"></div>
          <div className="h-4 bg-gray-800 rounded w-48 mx-auto mb-6 animate-pulse"></div>
          <div className="h-10 bg-gray-800 rounded w-36 mx-auto animate-pulse"></div>
        </div>
      </div>
    </div>
  )
}
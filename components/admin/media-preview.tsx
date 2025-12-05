/**
 * Media Preview Component
 * Displays image/video thumbnails with click-to-enlarge functionality
 */

'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';

interface MediaPreviewProps {
  src: string | null | undefined;
  type: 'image' | 'video';
  alt?: string;
  placeholder?: string;
}

export default function MediaPreview({
  src,
  type,
  alt = '',
  placeholder = 'No content',
}: MediaPreviewProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!src) {
    return (
      <div className="w-24 h-16 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
        <span className="text-xs text-gray-400">{placeholder}</span>
      </div>
    );
  }

  return (
    <>
      {/* Thumbnail */}
      <div
        className="relative w-24 h-16 cursor-pointer group overflow-hidden rounded border border-gray-200 dark:border-gray-700 hover:border-primary transition-all"
        onClick={() => setIsOpen(true)}
      >
        {type === 'image' ? (
          <Image
            src={src}
            alt={alt}
            fill
            className="object-cover group-hover:scale-110 transition-transform"
            unoptimized
          />
        ) : (
          <video
            src={src}
            className="w-full h-full object-cover"
            muted
            playsInline
            preload="metadata"
          />
        )}
        {/* Hover overlay with icon */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
          <svg
            className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7"
            />
          </svg>
        </div>
      </div>

      {/* Fullscreen Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <div className="flex flex-col items-center gap-4 p-4">
            {type === 'image' ? (
              <div className="relative w-full" style={{ minHeight: '400px' }}>
                <Image
                  src={src}
                  alt={alt}
                  width={1200}
                  height={800}
                  className="w-full h-auto rounded-lg"
                  unoptimized
                />
              </div>
            ) : (
              <video
                src={src}
                controls
                autoPlay
                loop
                className="w-full max-h-[70vh] rounded-lg"
              />
            )}
            {alt && <p className="text-sm text-gray-500">{alt}</p>}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

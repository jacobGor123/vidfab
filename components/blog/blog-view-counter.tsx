'use client';

import { useEffect, useRef, useState } from 'react';
import { Eye } from 'lucide-react';

const VIEW_TTL_MS = 30 * 60 * 1000;

interface BlogViewCounterProps {
  slug: string;
  initialViewCount?: number | null;
}

interface CachedView {
  at: number;
  count?: number;
}

function readCachedView(key: string): CachedView | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CachedView;
    if (!parsed || typeof parsed.at !== 'number') return null;

    return parsed;
  } catch {
    return null;
  }
}

function writeCachedView(key: string, value: CachedView): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage can be unavailable in private browsing or strict contexts.
  }
}

export function BlogViewCounter({
  slug,
  initialViewCount = 0,
}: BlogViewCounterProps) {
  const [viewCount, setViewCount] = useState(initialViewCount || 0);
  const trackedSlugRef = useRef<string | null>(null);

  useEffect(() => {
    if (!slug || trackedSlugRef.current === slug) return;
    trackedSlugRef.current = slug;

    const cacheKey = `vidfab:blog-view:${slug}`;
    const now = Date.now();
    const cached = readCachedView(cacheKey);

    if (cached && now - cached.at < VIEW_TTL_MS) {
      if (typeof cached.count === 'number') {
        setViewCount((current) => Math.max(current, cached.count || 0));
      }
      return;
    }

    let cancelled = false;

    async function trackView() {
      try {
        const response = await fetch(
          `/api/blog/${encodeURIComponent(slug)}/view`,
          {
            method: 'POST',
            credentials: 'same-origin',
            keepalive: true,
            cache: 'no-store',
          }
        );

        if (!response.ok) return;

        const data = (await response.json()) as {
          success?: boolean;
          view_count?: number;
        };

        if (!data.success) return;

        const nextCount =
          typeof data.view_count === 'number' ? data.view_count : viewCount;

        if (!cancelled) {
          setViewCount((current) => Math.max(current, nextCount));
        }

        writeCachedView(cacheKey, {
          at: Date.now(),
          count: nextCount,
        });
      } catch (error) {
        console.warn('[BlogViewCounter] Failed to track view:', error);
      }
    }

    trackView();

    return () => {
      cancelled = true;
    };
  }, [slug, viewCount]);

  if (!viewCount || viewCount < 1) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Eye className="w-4 h-4" />
      <span>{viewCount.toLocaleString()} views</span>
    </div>
  );
}

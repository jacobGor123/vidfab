/**
 * Blog Card Component
 * 博客卡片组件 - 用于博客列表页面
 */

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Calendar, Clock, Eye, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { enUS } from 'date-fns/locale';

interface BlogCardProps {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  featured_image_url?: string;
  category?: string;
  published_at: string;
  read_time_minutes?: number;
  view_count?: number;
}

export function BlogCard({
  title,
  slug,
  excerpt,
  featured_image_url,
  category,
  published_at,
  read_time_minutes,
  view_count,
}: BlogCardProps) {
  const defaultImage = 'https://static.vidfab.ai/public/images/blog-default.jpg';

  return (
    <Link href={`/blog/${slug}`} className="group block">
      <article className="h-full bg-brand-gray-800/70 backdrop-blur-md border border-brand-gray-700 rounded-xl overflow-hidden shadow-apple-soft transition-all duration-300 ease-apple hover:bg-brand-gray-700/90 hover:shadow-apple-medium hover:border-brand-purple-DEFAULT/30">
        {/* Featured Image */}
        <div className="relative aspect-video overflow-hidden">
          <Image
            src={featured_image_url || defaultImage}
            alt={title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-brand-purple-DEFAULT/10 to-brand-pink-DEFAULT/10 pointer-events-none" />

          {/* Category Badge */}
          {category && (
            <div className="absolute top-4 left-4">
              <span className="inline-block px-3 py-1 text-xs font-semibold uppercase bg-gradient-to-r from-brand-pink-DEFAULT/20 to-brand-purple-DEFAULT/20 backdrop-blur-sm text-brand-purple-DEFAULT rounded-full border border-brand-purple-DEFAULT/30">
                {category}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-3">
          {/* Title */}
          <h3 className="text-xl font-heading font-semibold text-white leading-tight line-clamp-2 group-hover:text-gradient-brand transition-all">
            {title}
          </h3>

          {/* Excerpt */}
          {excerpt && (
            <p className="text-sm text-gray-300 leading-relaxed line-clamp-3">
              {excerpt}
            </p>
          )}

          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 pt-2">
            {/* Published Date */}
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <time dateTime={published_at}>
                {formatDistanceToNow(new Date(published_at), {
                  addSuffix: true,
                  locale: enUS,
                })}
              </time>
            </div>

            {/* Read Time */}
            {read_time_minutes && (
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{read_time_minutes} min read</span>
              </div>
            )}

            {/* View Count */}
            {view_count !== undefined && view_count > 0 && (
              <div className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                <span>{view_count.toLocaleString()}</span>
              </div>
            )}

            {/* Read More Arrow */}
            <div className="ml-auto text-brand-purple-DEFAULT group-hover:translate-x-1 transition-transform">
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}

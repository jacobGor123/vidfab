/**
 * Blog List Page
 * 博客列表页面 - 展示所有已发布的博客文章
 */

import './blog.css';
import { Metadata } from 'next';
import { getBlogPosts } from '@/models/blog';
import { BlogCard } from '@/components/blog/blog-card';
import { BookOpen } from 'lucide-react';
import Image from 'next/image';
import { StructuredData } from '@/components/seo/structured-data';
import { getBlogSchema, getItemListSchema } from '@/lib/seo/structured-data';

export const metadata: Metadata = {
  title: 'Blog | VidFab AI - Latest Updates & Guides',
  description:
    'Discover the latest AI video generation tutorials, product updates, and creative guides from VidFab AI.',
  keywords: [
    'AI video',
    'video generation',
    'tutorials',
    'guides',
    'VidFab blog',
  ],
  alternates: {
    canonical: '/blog',
  },
  openGraph: {
    title: 'Blog | VidFab AI - Latest Updates & Guides',
    description: 'Discover the latest AI video generation tutorials, product updates, and creative guides from VidFab AI.',
    type: 'website',
    url: '/blog',
    siteName: 'VidFab AI',
    images: [
      {
        url: '/og-image.webp',
        width: 1200,
        height: 630,
        alt: 'VidFab AI Blog',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blog | VidFab AI - Latest Updates & Guides',
    description: 'Discover the latest AI video generation tutorials, product updates, and creative guides from VidFab AI.',
    images: ['/og-image.webp'],
  },
};

// ISR - Revalidate every hour
export const revalidate = 3600;

export default async function BlogPage() {
  // Fetch all published posts
  const posts = await getBlogPosts({
    status: 'published',
  });

  const displayPosts = posts || [];

  // Generate structured data for SEO
  const blogSchema = getBlogSchema(
    displayPosts.slice(0, 10).map(post => ({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      published_at: post.published_at,
    }))
  );

  const itemListSchema = displayPosts.length > 0 ? getItemListSchema(
    displayPosts.map(post => ({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      featured_image_url: post.featured_image_url,
    }))
  ) : null;

  return (
    <div className="relative min-h-screen bg-black text-white">
      {/* Structured Data for SEO */}
      <StructuredData data={itemListSchema ? [blogSchema, itemListSchema] : [blogSchema]} />
      {/* Hero Section */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            {/* Icon */}
            <div className="inline-flex items-center gap-2 mb-4">
              <Image
                src="/cta-icon.svg"
                alt=""
                width={24}
                height={24}
                className="w-6 h-6"
              />
              <span className="text-lg font-semibold bg-gradient-to-r from-[#E34C9B] via-[#AC4FFF] via-[#7254FF] via-[#497CFF] to-[#3EDEFB] bg-clip-text text-transparent">
                VidFab Blog
              </span>
            </div>

            {/* Title */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-heading font-bold text-white leading-tight">
              Latest Updates & Guides
            </h1>

            {/* Subtitle */}
            <p className="text-lg sm:text-xl text-gray-300 leading-relaxed max-w-2xl mx-auto">
              Discover tutorials, product updates, and creative inspiration for
              AI video generation
            </p>
          </div>
        </div>
      </section>

      {/* Blog Posts Grid */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          {displayPosts.length === 0 ? (
            // Empty State
            <div className="max-w-md mx-auto text-center py-20">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-brand-gray-800/50 border border-brand-gray-700 mb-6">
                <BookOpen className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-2xl font-heading font-semibold text-white mb-3">
                No posts yet
              </h3>
              <p className="text-gray-400">
                Check back soon for new content!
              </p>
            </div>
          ) : (
            // Posts Grid
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {displayPosts.map((post) => (
                <BlogCard key={post.id} {...post} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

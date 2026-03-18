/**
 * Blog Post Detail Page
 * 博客文章详情页面
 */

import '../blog.css';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  getBlogPostBySlug,
  getBlogPosts,
  incrementBlogViewCount,
} from '@/models/blog';
import { BlogContent } from '@/components/blog/blog-content';
import { BlogCard } from '@/components/blog/blog-card';
import { ShareButton } from '@/components/blog/share-button';
import { TableOfContents } from '@/components/blog/table-of-contents';
import { extractHeadings } from '@/lib/blog/toc';
import {
  Calendar,
  Clock,
  Eye,
  ArrowLeft,
  BookOpen,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { StructuredData } from '@/components/seo/structured-data';
import {
  getBlogPostingSchema,
  getBreadcrumbSchema,
} from '@/lib/seo/structured-data';

// ISR - Revalidate every hour
export const revalidate = 3600;

interface BlogPostPageProps {
  params: {
    slug: string;
  };
}

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const post = await getBlogPostBySlug(params.slug);

  if (!post) {
    return {
      title: 'Post Not Found | VidFab AI',
    };
  }

  const metaTitle = post.meta_title || post.title;
  const metaDescription =
    post.meta_description || post.excerpt || 'Read more on VidFab AI Blog';
  const keywords = post.keywords || [];

  return {
    title: `${metaTitle} | VidFab AI Blog`,
    description: metaDescription,
    keywords: keywords,
    alternates: {
      canonical: `/blog/${params.slug}`,
    },
    openGraph: {
      title: metaTitle,
      description: metaDescription,
      type: 'article',
      url: `/blog/${params.slug}`,
      siteName: 'VidFab AI',
      publishedTime: post.published_at || undefined,
      modifiedTime: post.updated_at || post.published_at || undefined,
      authors: post.author_name ? [post.author_name] : undefined,
      images: post.featured_image_url
        ? [
            {
              url: post.featured_image_url,
              width: 1200,
              height: 630,
              alt: post.title,
            },
          ]
        : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: metaTitle,
      description: metaDescription,
      images: post.featured_image_url ? [post.featured_image_url] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const post = await getBlogPostBySlug(params.slug);

  if (!post) {
    notFound();
  }

  // Increment view count (async, don't wait)
  incrementBlogViewCount(post.id).catch((err) =>
    console.error('Failed to increment view count:', err)
  );

  // Fetch related posts (same category, exclude current)
  const relatedPosts = await getBlogPosts({
    status: 'published',
    category: post.category || undefined,
    limit: 3,
  });

  const filteredRelatedPosts = relatedPosts?.filter((p) => p.id !== post.id);

  // 提取文章标题（用于 TOC）
  const headings = extractHeadings(post.content);

  const defaultImage = 'https://static.vidfab.ai/public/images/blog-default.jpg';

  // Generate structured data for SEO
  const blogPostingSchema = getBlogPostingSchema({
    title: post.title,
    excerpt: post.excerpt,
    content: post.content,
    slug: post.slug,
    author_name: post.author_name,
    published_at: post.published_at,
    updated_at: post.updated_at,
    featured_image_url: post.featured_image_url,
    category: post.category,
    tags: post.tags,
    keywords: post.keywords,
  });

  // Generate breadcrumb structured data
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Blog', url: '/blog' },
    ...(post.category ? [{ name: post.category, url: `/blog?category=${post.category}` }] : []),
    { name: post.title, url: `/blog/${post.slug}` },
  ]);

  return (
    <div className="relative min-h-screen bg-black text-white">
      {/* Structured Data for SEO */}
      <StructuredData data={[blogPostingSchema, breadcrumbSchema]} />

      {/* Back Button */}
      <div className="container mx-auto px-4 pt-24 md:pt-20">
        <div className="max-w-4xl mx-auto lg:ml-72 xl:ml-80">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Blog</span>
          </Link>
        </div>
      </div>

      {/* Article Header */}
      <article className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto lg:ml-72 xl:ml-80">
            {/* Table of Contents */}
            <TableOfContents headings={headings} />
            {/* Category Badge */}
            {post.category && (
              <div className="mb-6">
                <span className="inline-block px-3 py-1 text-xs font-semibold uppercase bg-gradient-to-r from-brand-pink-DEFAULT/20 to-brand-purple-DEFAULT/20 backdrop-blur-sm text-brand-purple-DEFAULT rounded-full border border-brand-purple-DEFAULT/30">
                  {post.category}
                </span>
              </div>
            )}

            {/* Title */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-heading font-bold text-white leading-tight mb-6">
              {post.title}
            </h1>

            {/* Excerpt */}
            {post.excerpt && (
              <p className="text-xl text-gray-300 leading-relaxed mb-8">
                {post.excerpt}
              </p>
            )}

            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-4 md:gap-6 text-sm text-gray-400 mb-8 pb-8 border-b border-brand-gray-700">
              {/* Author */}
              {post.author_name && (
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-purple-DEFAULT to-brand-pink-DEFAULT flex items-center justify-center text-white font-semibold">
                    {post.author_name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-white">{post.author_name}</span>
                </div>
              )}

              {/* Published Date */}
              {post.published_at && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <time dateTime={post.published_at}>
                    {formatDistanceToNow(new Date(post.published_at), {
                      addSuffix: true,
                      locale: enUS,
                    })}
                  </time>
                </div>
              )}

              {/* Read Time */}
              {post.read_time_minutes && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{post.read_time_minutes} min read</span>
                </div>
              )}

              {/* View Count */}
              {post.view_count !== undefined && post.view_count > 0 && (
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  <span>{post.view_count.toLocaleString()} views</span>
                </div>
              )}

              {/* Share Button */}
              <ShareButton title={post.title} excerpt={post.excerpt} />
            </div>

            {/* Featured Image */}
            {post.featured_image_url && (
              <div className="relative aspect-video rounded-xl overflow-hidden mb-12 shadow-xl">
                <Image
                  src={post.featured_image_url}
                  alt={post.title}
                  fill
                  className="object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-br from-brand-purple-DEFAULT/10 to-brand-pink-DEFAULT/10 pointer-events-none" />
              </div>
            )}

            {/* Article Content */}
            <div className="mb-16">
              <BlogContent content={post.content} />
            </div>

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-8 border-t border-brand-gray-700">
                <span className="text-sm text-gray-400 font-medium">Tags:</span>
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-block px-3 py-1 text-xs bg-brand-gray-800/50 border border-brand-gray-700 text-gray-300 rounded-full hover:border-brand-purple-DEFAULT/30 transition-colors"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </article>

      {/* Related Posts */}
      {filteredRelatedPosts && filteredRelatedPosts.length > 0 && (
        <section className="py-16 border-t border-brand-gray-700">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto lg:ml-72 xl:ml-80">
              <div className="flex items-center gap-3 mb-8">
                <BookOpen className="w-6 h-6 text-brand-purple-DEFAULT" />
                <h2 className="text-2xl md:text-3xl font-heading font-bold text-white">
                  Related Articles
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredRelatedPosts.slice(0, 3).map((relatedPost) => (
                  <BlogCard key={relatedPost.id} {...relatedPost} />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

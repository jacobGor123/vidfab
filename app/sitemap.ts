/**
 * Dynamic sitemap for every public localized page and published blog post.
 */

import type { MetadataRoute } from 'next'
import { getPublishedBlogPostsForSitemap } from '@/models/blog-sitemap'
import { buildSitemap } from '@/lib/seo/sitemap-builder'

// Keep new and updated blog posts discoverable without querying Supabase per request.
export const revalidate = 300

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const blogPosts = await getPublishedBlogPostsForSitemap()
  return buildSitemap(blogPosts)
}

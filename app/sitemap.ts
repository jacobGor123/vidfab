/**
 * Dynamic Sitemap Configuration
 *
 * This file generates the sitemap.xml for the website.
 * It includes all static pages and can be extended to include dynamic content.
 */

import { MetadataRoute } from 'next'
import { getBlogPosts } from '@/models/blog'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://vidfab.com'
  const currentDate = new Date()

  // Static pages with their metadata
  const staticPages = [
    {
      route: '',
      changeFrequency: 'daily' as const,
      priority: 1,
    },
    {
      route: '/pricing',
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    {
      route: '/text-to-video',
      changeFrequency: 'weekly' as const,
      priority: 0.85,
    },
    {
      route: '/image-to-video',
      changeFrequency: 'weekly' as const,
      priority: 0.85,
    },
    {
      route: '/text-to-image',
      changeFrequency: 'weekly' as const,
      priority: 0.85,
    },
    {
      route: '/image-to-image',
      changeFrequency: 'weekly' as const,
      priority: 0.85,
    },
    {
      route: '/ai-video-effects',
      changeFrequency: 'weekly' as const,
      priority: 0.85,
    },
    {
      route: '/about',
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
    {
      route: '/contact',
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
    {
      route: '/privacy',
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
    {
      route: '/terms-of-service',
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
    {
      route: '/studio/discover',
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    {
      route: '/blog',
      changeFrequency: 'daily' as const,
      priority: 0.85,
    },
  ]

  const staticRoutes = staticPages.map(page => ({
    url: `${baseUrl}${page.route}`,
    lastModified: currentDate,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }))

  // Blog posts - Dynamic content
  let blogRoutes: MetadataRoute.Sitemap = []
  try {
    const blogPosts = await getBlogPosts({
      status: 'published',
    })

    if (blogPosts && blogPosts.length > 0) {
      blogRoutes = blogPosts.map(post => ({
        url: `${baseUrl}/blog/${post.slug}`,
        lastModified: post.updated_at ? new Date(post.updated_at) : post.published_at ? new Date(post.published_at) : currentDate,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }))
    }
  } catch (error) {
    console.error('Failed to fetch blog posts for sitemap:', error)
  }

  return [...staticRoutes, ...blogRoutes]
}

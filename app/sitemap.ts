/**
 * Dynamic Sitemap Configuration
 *
 * This file generates the sitemap.xml for the website.
 * It includes all static pages and can be extended to include dynamic content.
 */

import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
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
      route: '/create',
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
  ]

  const staticRoutes = staticPages.map(page => ({
    url: `${baseUrl}${page.route}`,
    lastModified: currentDate,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }))

  // Future: Add dynamic content here
  // Example: Blog posts, user profiles, etc.
  /*
  const dynamicRoutes = await getDynamicContent().then(items =>
    items.map(item => ({
      url: `${baseUrl}${item.path}`,
      lastModified: new Date(item.updatedAt),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))
  )
  */

  return [...staticRoutes]
}

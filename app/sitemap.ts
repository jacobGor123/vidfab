/**
 * Dynamic Sitemap Configuration
 *
 * This file generates the sitemap.xml for the website.
 * Includes all static pages and blog posts across all locales.
 */

import { MetadataRoute } from 'next'
import { getBlogPosts } from '@/models/blog'
import { routing } from '@/i18n/routing'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://vidfab.ai'
const nonDefaultLocales = routing.locales.filter(l => l !== routing.defaultLocale)

/**
 * 为给定路径生成 alternates.languages 映射（用于 sitemap hreflang）
 */
function buildAlternates(route: string): Record<string, string> {
  const languages: Record<string, string> = {}
  for (const locale of nonDefaultLocales) {
    languages[locale] = `${baseUrl}/${locale}${route}`
  }
  return languages
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const currentDate = new Date()

  // Static pages
  const staticPages = [
    { route: '',                 changeFrequency: 'daily'   as const, priority: 1.0  },
    { route: '/pricing',         changeFrequency: 'weekly'  as const, priority: 0.9  },
    { route: '/text-to-video',   changeFrequency: 'weekly'  as const, priority: 0.85 },
    { route: '/image-to-video',  changeFrequency: 'weekly'  as const, priority: 0.85 },
    { route: '/text-to-image',   changeFrequency: 'weekly'  as const, priority: 0.85 },
    { route: '/image-to-image',  changeFrequency: 'weekly'  as const, priority: 0.85 },
    { route: '/ai-video-effects',changeFrequency: 'weekly'  as const, priority: 0.85 },
    { route: '/about',           changeFrequency: 'monthly' as const, priority: 0.7  },
    { route: '/contact',         changeFrequency: 'monthly' as const, priority: 0.7  },
    // /blog 仅英文，单独处理（不加 alternates）

    { route: '/privacy',         changeFrequency: 'monthly' as const, priority: 0.5  },
    { route: '/terms-of-service',changeFrequency: 'monthly' as const, priority: 0.5  },
    // 注意：/studio/* 页面不应出现在 sitemap 中（用户工作台，需要登录）
  ]

  const staticRoutes: MetadataRoute.Sitemap = staticPages.map(page => ({
    url: `${baseUrl}${page.route}`,
    lastModified: currentDate,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
    alternates: {
      languages: buildAlternates(page.route),
    },
  }))

  // Blog posts — dynamic content
  let blogRoutes: MetadataRoute.Sitemap = []
  try {
    const blogPosts = await getBlogPosts({ status: 'published' })

    if (blogPosts && blogPosts.length > 0) {
      blogRoutes = blogPosts.map(post => ({
        url: `${baseUrl}/blog/${post.slug}`,
        lastModified: post.updated_at
          ? new Date(post.updated_at)
          : post.published_at
            ? new Date(post.published_at)
            : currentDate,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
        // 博客文章仅有英文版本，不添加 alternates 避免指向不存在的多语言 URL
      }))
    }
  } catch (error) {
    console.error('Failed to fetch blog posts for sitemap:', error)
  }

  // /blog 列表页仅英文，不添加 alternates
  const blogListRoute: MetadataRoute.Sitemap = [{
    url: `${baseUrl}/blog`,
    lastModified: currentDate,
    changeFrequency: 'daily' as const,
    priority: 0.85,
  }]

  return [...staticRoutes, ...blogListRoute, ...blogRoutes]
}

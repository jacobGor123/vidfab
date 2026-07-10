import type { MetadataRoute } from 'next'
import { routing } from '@/i18n/routing'
import { getAlternateLinks, getLocalizedUrl } from '@/lib/seo/alternate-links'
import { englishOnlyPublicRoutes } from '@/lib/seo/english-only-routes'

export interface SitemapBlogPost {
  slug: string
}

export const localizedSitemapRoutes = Array.from(
  new Set([
    '',
    '/pricing',
    '/text-to-video',
    '/image-to-video',
    '/text-to-image',
    '/image-to-image',
    '/ai-video-effects',
    '/tools/veo3',
    '/tools/kling3',
  ]),
)

export function buildLocalizedSitemapEntries(): MetadataRoute.Sitemap {
  return localizedSitemapRoutes.flatMap((route) => {
    const languages = getAlternateLinks(route)

    return routing.locales.map((locale) => ({
      url: getLocalizedUrl(route, locale),
      alternates: { languages },
    }))
  })
}

export function buildEnglishOnlySitemapEntries(): MetadataRoute.Sitemap {
  return englishOnlyPublicRoutes.map((route) => ({
    url: getLocalizedUrl(route, routing.defaultLocale),
  }))
}

export function buildBlogSitemapEntries(posts: SitemapBlogPost[]): MetadataRoute.Sitemap {
  return posts.map((post) => ({
    url: getLocalizedUrl(`/blog/${post.slug}`, routing.defaultLocale),
  }))
}

export function buildSitemap(posts: SitemapBlogPost[]): MetadataRoute.Sitemap {
  const localizedEntries = buildLocalizedSitemapEntries()
  const englishOnlyEntries = buildEnglishOnlySitemapEntries()
  const blogEntries = buildBlogSitemapEntries(posts)
  const blogListEntry: MetadataRoute.Sitemap[number] = {
    url: getLocalizedUrl('/blog', routing.defaultLocale),
  }

  return [...localizedEntries, ...englishOnlyEntries, blogListEntry, ...blogEntries]
}

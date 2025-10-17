/**
 * Robots.txt Configuration
 *
 * This file generates the robots.txt for controlling search engine crawlers.
 */

import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://vidfab.com'

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',           // Disallow API routes
          '/admin/',         // Disallow admin routes
          '/_next/',         // Disallow Next.js internals
          '/private/',       // Disallow private routes
          '/(auth)/',        // Disallow auth routes
          '/subscription/',  // Disallow subscription internal routes
        ],
      },
      // Block AI crawlers that don't respect content licensing
      {
        userAgent: 'GPTBot',
        disallow: '/',
      },
      {
        userAgent: 'ChatGPT-User',
        disallow: '/',
      },
      {
        userAgent: 'CCBot',
        disallow: '/',
      },
      {
        userAgent: 'anthropic-ai',
        disallow: '/',
      },
      {
        userAgent: 'Claude-Web',
        disallow: '/',
      },
      // Allow major search engines explicitly
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/api/', '/admin/', '/_next/', '/private/', '/(auth)/'],
      },
      {
        userAgent: 'Bingbot',
        allow: '/',
        disallow: ['/api/', '/admin/', '/_next/', '/private/', '/(auth)/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}

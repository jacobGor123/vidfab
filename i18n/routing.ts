/**
 * Routing Configuration for VidFab AI Video Platform
 */
import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';
import { locales, defaultLocale } from './locale';

export const routing = defineRouting({
  // A list of all locales that are supported
  locales,

  // Used when no locale matches
  defaultLocale,

  // The locale prefix strategy
  localePrefix: 'as-needed', // Only add prefix for non-default locales

  // Alternative hosts for different locales (optional)
  // domains: [
  //   {
  //     domain: 'vidfab.com',
  //     defaultLocale: 'en'
  //   },
  //   {
  //     domain: 'vidfab.cn',
  //     defaultLocale: 'zh'
  //   }
  // ],

  // Pathnames that can be localized (optional)
  pathnames: {
    '/': '/',
    '/login': '/login',
    '/signup': '/signup',
    '/dashboard': '/dashboard',
    '/pricing': '/pricing',
    '/features': '/features',
    '/how-it-works': '/how-it-works',
    '/profile': '/profile',
    '/settings': '/settings',
    '/video/generate': '/video/generate',
    '/video/enhance': '/video/enhance',
    '/video/convert': '/video/convert',
    '/video/history': '/video/history',
    '/subscription': '/subscription',
    '/support': '/support',
    '/privacy': '/privacy',
    '/terms': '/terms',
    // Add more paths as needed for the AI video platform
  } as const
});

// Lightweight wrappers around Next.js' navigation APIs
// that will consider the routing configuration
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);

export type Pathnames = keyof typeof routing.pathnames;
export type Pathname = typeof routing.pathnames[Pathnames];
/**
 * Middleware for VidFab AI Video Platform
 * Handles i18n locale detection (next-intl) + authentication (getToken)
 *
 * Logic:
 * - Static assets and API routes: skip all middleware
 * - Admin routes (/admin/*): skip locale detection (English-only internal tooling)
 * - Studio routes: rewrite to /create?tool=xxx (before locale detection)
 * - All other routes: run next-intl locale detection/redirect
 * - Auth pages (/login, /signup): redirect to studio if already logged in
 * - Protected routes: redirect to login if not authenticated
 */
import createMiddleware from 'next-intl/middleware';
import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

// Auth routes - redirect to studio if already logged in
const AUTH_ROUTES = ['/login', '/signup'];

// Protected routes (matched after stripping locale prefix)
const PROTECTED_ROUTES = ['/profile', '/settings', '/video', '/subscription'];

function getStrippedPath(pathname: string): string {
  // Strip non-default locale prefixes: /zh/foo → /foo, /ja/foo → /foo
  const nonDefaultLocales = routing.locales.filter(l => l !== routing.defaultLocale);
  const pattern = new RegExp(`^\\/(${nonDefaultLocales.join('|')})(\/|$)`);
  return pathname.replace(pattern, '/');
}

function isAuthPath(stripped: string): boolean {
  return AUTH_ROUTES.some(r => stripped === r || stripped.startsWith(r + '/'));
}

function isProtectedPath(stripped: string): boolean {
  return PROTECTED_ROUTES.some(r => stripped.startsWith(r));
}

function isStaticAsset(pathname: string): boolean {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/_vercel') ||
    pathname.includes('.')
  );
}

export default async function middleware(req: NextRequest) {
  const { nextUrl } = req;
  const pathname = nextUrl.pathname;

  // 1. Skip for static assets
  if (isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  // 2. Skip for API routes
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // 3. Admin routes: skip locale detection (always English, no locale prefix)
  if (pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  // 4. Studio rewrite (runs before intl, preserves browser URL for GA4 tracking)
  // Handles both /studio/path and /{locale}/studio/path (e.g. /zh/studio/discover)
  const strippedForStudio = getStrippedPath(pathname);
  const isStudioRoute = pathname.startsWith('/studio/') || strippedForStudio.startsWith('/studio/');

  if (isStudioRoute) {
    // studioSegment is always /studio/... without locale prefix
    const studioSegment = pathname.startsWith('/studio/') ? pathname : strippedForStudio;

    // Detect locale: URL prefix takes priority, then cookie, then default
    const nonDefaultLocales = routing.locales.filter(l => l !== routing.defaultLocale);
    const localeMatch = pathname.match(new RegExp(`^\\/(${nonDefaultLocales.join('|')})(\/|$)`));
    const cookieLocale = req.cookies.get('NEXT_LOCALE')?.value;
    const activeLocale = localeMatch?.[1] || (cookieLocale && routing.locales.includes(cookieLocale as any) ? cookieLocale : null) || routing.defaultLocale;

    // Special pages have real page.tsx files at app/studio/plans and app/studio/video-agent-beta.
    // Rewrite locale-prefixed requests to the unprefixed versions so they match the file system.
    // Inject x-next-intl-locale so getLocale() in app/studio/layout.tsx returns the correct locale.
    const specialPaths = ['/studio/video-agent-beta', '/studio/plans'];
    if (specialPaths.some(p => studioSegment.startsWith(p))) {
      const rewriteTarget = studioSegment + (nextUrl.search || '');
      const reqHeaders = new Headers(req.headers);
      reqHeaders.set('x-next-intl-locale', activeLocale);
      if (!pathname.startsWith('/studio/')) {
        return NextResponse.rewrite(
          new URL(rewriteTarget, nextUrl.origin),
          { request: { headers: reqHeaders } }
        );
      }
      // Pathname already starts with /studio/ — still inject locale header
      return NextResponse.next({ request: { headers: reqHeaders } });
    }

    // Tool path → query param mapping
    const toolMap: Record<string, string> = {
      discover: 'discover',
      'text-to-video': 'text-to-video',
      'image-to-video': 'image-to-video',
      'ai-video-effects': 'video-effects',
      'text-to-image': 'text-to-image',
      'image-to-image': 'image-to-image',
      'my-assets': 'my-assets',
      plans: 'my-profile',
    };

    const pathParts = studioSegment.split('/').filter(Boolean);
    const toolPath = pathParts[1];
    const tool = toolMap[toolPath] || 'discover';

    // Always include locale in the rewrite target so Next.js can match app/[locale]/(main)/create/
    const rewriteUrl = new URL(`/${activeLocale}/create`, nextUrl.origin);
    rewriteUrl.searchParams.set('tool', tool);
    // Preserve existing query params (prompt, model, etc.)
    nextUrl.searchParams.forEach((value, key) => rewriteUrl.searchParams.set(key, value));

    return NextResponse.rewrite(rewriteUrl);
  }

  // 5. Run next-intl middleware (locale detection + redirect)
  const intlResponse = intlMiddleware(req);

  // Determine detected locale for injecting into header
  const detectedLocale =
    intlResponse?.cookies.get('NEXT_LOCALE')?.value ||
    req.cookies.get('NEXT_LOCALE')?.value ||
    routing.defaultLocale;

  // Use intl response or create fresh one
  const response = intlResponse || NextResponse.next();

  // Inject locale into response header for root layout to read
  response.headers.set('x-next-intl-locale', detectedLocale);

  // 6. Auth and protected route logic (after locale detection)
  const stripped = getStrippedPath(pathname);
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // Auth pages: redirect to studio if already logged in
  if (isAuthPath(stripped)) {
    if (token) {
      return NextResponse.redirect(new URL('/studio/discover', nextUrl.origin));
    }
    return response;
  }

  // Protected routes: redirect to login if not authenticated
  if (isProtectedPath(stripped)) {
    if (!token) {
      const localePrefix = detectedLocale === routing.defaultLocale ? '' : `/${detectedLocale}`;
      const loginUrl = new URL(`${localePrefix}/login`, nextUrl.origin);
      loginUrl.searchParams.set('callbackUrl', encodeURIComponent(pathname + (nextUrl.search || '')));
      return NextResponse.redirect(loginUrl);
    }
    return response;
  }

  return response;
}

export const config = {
  // Include studio/* so rewrite logic runs; studio routes exit early before intl
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)', '/'],
};

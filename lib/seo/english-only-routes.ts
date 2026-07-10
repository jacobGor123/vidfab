export const englishOnlyPublicRoutes = [
  '/about',
  '/contact',
  '/privacy',
  '/terms-of-service',
  '/tools/ai-kiss-video-generator',
  '/tools/ai-dance-video-generator',
  '/tools/ai-hug-video-generator',
  '/tools/photo-to-video-ai-generator',
  '/tools/ai-video-prompt-generator',
  '/tools/ai-storyboard-generator',
  '/tools/ai-tiktok-video-generator',
  '/tools/ai-youtube-shorts-generator',
] as const

const englishOnlyPublicRouteSet = new Set<string>(englishOnlyPublicRoutes)

export function isEnglishOnlyPublicPath(pathname: string): boolean {
  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname

  return englishOnlyPublicRouteSet.has(normalizedPath)
}

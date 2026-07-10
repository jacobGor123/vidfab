// lib/seo/alternate-links.ts
import { routing } from '@/i18n/routing';

const BASE_URL = (process.env.NEXT_PUBLIC_BASE_URL || 'https://vidfab.ai').replace(/\/+$/, '');

function normalizePath(path: string): string {
  const trimmedPath = path.trim();

  if (!trimmedPath || trimmedPath === '/') {
    return '';
  }

  const pathWithLeadingSlash = trimmedPath.startsWith('/')
    ? trimmedPath
    : `/${trimmedPath}`;

  return pathWithLeadingSlash.replace(/\/+$/, '');
}

export function getLocalizedUrl(path: string, locale: string): string {
  const localePrefix = locale === routing.defaultLocale ? '' : `/${locale}`;
  return `${BASE_URL}${localePrefix}${normalizePath(path)}`;
}

/**
 * 生成 hreflang alternate 链接映射
 * @param path 路径（不含 locale 前缀），如 '/pricing'
 * @returns hreflang map，包含所有 locale 及 x-default
 *
 * 示例：getAlternateLinks('/pricing')
 * → {
 *     en: 'https://vidfab.ai/pricing',
 *     zh: 'https://vidfab.ai/zh/pricing',
 *     ja: 'https://vidfab.ai/ja/pricing',
 *     de: 'https://vidfab.ai/de/pricing',
 *     'x-default': 'https://vidfab.ai/pricing',
 *   }
 */
export function getAlternateLinks(path: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const locale of routing.locales) {
    result[locale] = getLocalizedUrl(path, locale);
  }
  // x-default points to the default locale (English)
  result['x-default'] = getLocalizedUrl(path, routing.defaultLocale);
  return result;
}

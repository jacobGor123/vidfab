// lib/seo/alternate-links.ts
import { routing } from '@/i18n/routing';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://vidfab.ai';

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
    const prefix = locale === routing.defaultLocale ? '' : `/${locale}`;
    result[locale] = `${BASE_URL}${prefix}${path}`;
  }
  // x-default points to the default locale (English)
  result['x-default'] = `${BASE_URL}${path}`;
  return result;
}

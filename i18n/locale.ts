// i18n/locale.ts
export const locales = ['en', 'zh', 'ja', 'de'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export const localeMetadata: Record<Locale, {
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  region: string;
}> = {
  en: { name: 'English', nativeName: 'English', direction: 'ltr', region: 'US' },
  zh: { name: 'Chinese (Simplified)', nativeName: '简体中文', direction: 'ltr', region: 'CN' },
  ja: { name: 'Japanese', nativeName: '日本語', direction: 'ltr', region: 'JP' },
  de: { name: 'German', nativeName: 'Deutsch', direction: 'ltr', region: 'DE' },
};

export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}

export function getLocaleMetadata(locale: Locale) {
  return localeMetadata[locale];
}

export function getPreferredLocale(acceptLanguage?: string): Locale {
  if (!acceptLanguage) return defaultLocale;
  const languages = acceptLanguage
    .split(',')
    .map(lang => {
      const [code, q] = lang.trim().split(';q=');
      return { code: code.toLowerCase().split('-')[0], quality: q ? parseFloat(q) : 1 };
    })
    .sort((a, b) => b.quality - a.quality);
  for (const { code } of languages) {
    if (isValidLocale(code)) return code;
  }
  return defaultLocale;
}
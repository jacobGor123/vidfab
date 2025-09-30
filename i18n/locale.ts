/**
 * Locale Configuration for VidFab AI Video Platform
 */

// Supported locales
export const locales = ['en'] as const;
export type Locale = (typeof locales)[number];

// Default locale
export const defaultLocale: Locale = 'en';

// Locale metadata
export const localeMetadata: Record<Locale, {
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  region: string;
}> = {
  en: {
    name: 'English',
    nativeName: 'English',
    direction: 'ltr',
    region: 'US',
  },
  // Future locales can be added here:
  // zh: {
  //   name: 'Chinese (Simplified)',
  //   nativeName: '简体中文',
  //   direction: 'ltr',
  //   region: 'CN',
  // },
  // es: {
  //   name: 'Spanish',
  //   nativeName: 'Español',
  //   direction: 'ltr',
  //   region: 'ES',
  // },
  // fr: {
  //   name: 'French',
  //   nativeName: 'Français',
  //   direction: 'ltr',
  //   region: 'FR',
  // },
  // ja: {
  //   name: 'Japanese',
  //   nativeName: '日本語',
  //   direction: 'ltr',
  //   region: 'JP',
  // },
  // ko: {
  //   name: 'Korean',
  //   nativeName: '한국어',
  //   direction: 'ltr',
  //   region: 'KR',
  // },
  // de: {
  //   name: 'German',
  //   nativeName: 'Deutsch',
  //   direction: 'ltr',
  //   region: 'DE',
  // },
};

// Helper functions
export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}

export function getLocaleMetadata(locale: Locale) {
  return localeMetadata[locale];
}

export function getPreferredLocale(acceptLanguage?: string): Locale {
  if (!acceptLanguage) return defaultLocale;

  // Parse Accept-Language header
  const languages = acceptLanguage
    .split(',')
    .map(lang => {
      const [code, q] = lang.trim().split(';q=');
      return {
        code: code.toLowerCase().split('-')[0], // Get base language code
        quality: q ? parseFloat(q) : 1,
      };
    })
    .sort((a, b) => b.quality - a.quality);

  // Find best matching supported locale
  for (const { code } of languages) {
    if (isValidLocale(code)) {
      return code;
    }
  }

  return defaultLocale;
}
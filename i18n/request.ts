/**
 * Next-intl Request Configuration for VidFab AI Video Platform
 * Loads messages from namespace-based JSON files with English fallback
 */
import { getRequestConfig } from 'next-intl/server';
import { defaultLocale, isValidLocale, type Locale } from './locale';

const NAMESPACES = ['common', 'home', 'pricing', 'about', 'contact', 'tools', 'video-tools', 'text-to-video', 'image-to-video', 'ai-video-effects'];

async function loadMessages(locale: Locale) {
  const entries = await Promise.all(
    NAMESPACES.map(async (ns) => {
      try {
        const mod = await import(`../messages/${locale}/${ns}.json`);
        return [ns, mod.default] as const;
      } catch {
        try {
          const mod = await import(`../messages/en/${ns}.json`);
          return [ns, mod.default] as const;
        } catch {
          // Return empty object if even English fallback fails
          console.warn(`[i18n] Missing translation namespace: ${ns}`);
          return [ns, {}] as const;
        }
      }
    })
  );
  return Object.fromEntries(entries);
}

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !isValidLocale(locale)) {
    locale = defaultLocale;
  }

  return {
    locale,
    messages: await loadMessages(locale as Locale),
    timeZone: 'UTC',
    formats: {
      dateTime: {
        short: { day: 'numeric', month: 'short', year: 'numeric' },
      },
      number: {
        currency: { style: 'currency', currency: 'USD' },
      },
    },
  };
});

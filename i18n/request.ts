/**
 * Next-intl Request Configuration for VidFab AI Video Platform
 */
import { getRequestConfig } from 'next-intl/server';
import { headers } from 'next/headers';
import { defaultLocale, isValidLocale, getPreferredLocale, type Locale } from './locale';

export default getRequestConfig(async ({ requestLocale }) => {
  // Validate that the incoming `locale` parameter is valid
  let locale = await requestLocale;

  if (!locale || !isValidLocale(locale)) {
    // Fallback: try to detect from Accept-Language header
    try {
      const headersList = headers();
      const acceptLanguage = headersList.get('accept-language');
      locale = getPreferredLocale(acceptLanguage || undefined);
    } catch {
      locale = defaultLocale;
    }
  }

  const validLocale = locale as Locale;

  return {
    locale: validLocale,
    messages: (await import(`../messages/${validLocale}.json`)).default,
    timeZone: 'UTC', // Can be configured per user preference later
    formats: {
      dateTime: {
        short: {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        }
      },
      number: {
        currency: {
          style: 'currency',
          currency: 'USD', // Can be configured per user preference later
        }
      }
    }
  };
});
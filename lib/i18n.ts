import en from '@/locales/en.json'
import textToVideoEn from '@/locales/text-to-video/en.json'
import imageToVideoEn from '@/locales/image-to-video/en.json'
import aiVideoEffectsEn from '@/locales/ai-video-effects/en.json'

export type Language = 'en'

export type PageKey = 'homepage' | 'text-to-video' | 'image-to-video' | 'ai-video-effects'

const translations = {
  en
} as const

// Page-specific translations
const pageTranslations = {
  en: {
    'text-to-video': textToVideoEn,
    'image-to-video': imageToVideoEn,
    'ai-video-effects': aiVideoEffectsEn,
  }
} as const

export function useTranslation(lang: Language = 'en') {
  return {
    t: (key: string) => {
      const keys = key.split('.')
      let value: any = translations[lang]

      for (const k of keys) {
        value = value?.[k]
      }

      return value || key
    },
    locale: lang,
    translations: translations[lang]
  }
}

export function usePageTranslation(page: PageKey, lang: Language = 'en') {
  return {
    t: (key: string) => {
      const keys = key.split('.')
      let value: any = page === 'homepage'
        ? translations[lang]
        : pageTranslations[lang][page as 'text-to-video' | 'image-to-video' | 'ai-video-effects']

      for (const k of keys) {
        value = value?.[k]
      }

      return value || key
    },
    locale: lang,
    translations: page === 'homepage'
      ? translations[lang]
      : pageTranslations[lang][page as 'text-to-video' | 'image-to-video' | 'ai-video-effects']
  }
}

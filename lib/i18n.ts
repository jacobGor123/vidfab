import en from '@/locales/en.json'

export type Language = 'en'

const translations = {
  en
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
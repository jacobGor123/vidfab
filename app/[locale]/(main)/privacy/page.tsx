import { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import PrivacyClient from './privacy-client'
import { privacyMetadata } from '@/lib/seo/metadata'

export const metadata: Metadata = privacyMetadata

// 🔥 强制动态渲染，避免预渲染时 usePathname 错误
export const dynamic = 'force-dynamic'

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <PrivacyClient />
}

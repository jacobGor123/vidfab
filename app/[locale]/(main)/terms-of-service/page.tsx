import { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import TermsClient from './terms-client'
import { termsOfServiceMetadata } from '@/lib/seo/metadata'

export const metadata: Metadata = termsOfServiceMetadata

// 🔥 强制动态渲染，避免预渲染时 usePathname 错误
export const dynamic = 'force-dynamic'

export default async function TermsOfServicePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <TermsClient />
}

import { Metadata } from 'next'
import TermsClient from './terms-client'
import { termsOfServiceMetadata } from '@/lib/seo/metadata'

export const metadata: Metadata = termsOfServiceMetadata

// 🔥 强制动态渲染，避免预渲染时 usePathname 错误
export const dynamic = 'force-dynamic'

export default function TermsOfServicePage() {
  return <TermsClient />
}

import { Metadata } from 'next'
import ContactClient from './contact-client'
import { contactMetadata } from '@/lib/seo/metadata'

export const metadata: Metadata = contactMetadata

// 🔥 强制动态渲染，避免预渲染时 usePathname 错误
export const dynamic = 'force-dynamic'

export default function ContactPage() {
  return <ContactClient />
}

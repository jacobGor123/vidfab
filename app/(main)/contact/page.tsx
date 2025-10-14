import { Metadata } from 'next'
import ContactClient from './contact-client'
import { contactMetadata } from '@/lib/seo/metadata'

export const metadata: Metadata = contactMetadata

export default function ContactPage() {
  return <ContactClient />
}

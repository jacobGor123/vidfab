import { Metadata } from 'next'
import PricingPageClient from './pricing-client'
import { pricingMetadata } from '@/lib/seo/metadata'
import { StructuredData } from '@/components/seo/structured-data'
import { getFAQSchema, getProductSchema } from '@/lib/seo/structured-data'

export const metadata: Metadata = pricingMetadata

// 🔥 强制动态渲染，避免预渲染时 usePathname 错误
export const dynamic = 'force-dynamic'

export default function PricingPage() {
  // FAQ structured data for pricing page
  const pricingFAQs = [
    {
      question: "Can I change plans later?",
      answer: "Yes, you can upgrade or downgrade your plan at any time. When upgrading, credits are added to your account immediately."
    },
    {
      question: "What happens if I exceed my monthly credits?",
      answer: "When you use all your credits, you'll be prompted to upgrade to a higher plan. No video generation will be possible until credits are renewed or plan is upgraded."
    },
    {
      question: "How do credits work?",
      answer: "Different AI models and video settings consume different amounts of credits. For example, generating a 480p 5-second video costs 10 credits, while 1080p 10-second video costs 80 credits."
    },
    {
      question: "What payment methods do you accept?",
      answer: "We accept all major credit cards through Stripe. Annual plans offer significant savings compared to monthly billing."
    }
  ]

  return (
    <>
      <StructuredData data={[
        getFAQSchema(pricingFAQs),
        getProductSchema({
          name: "VidFab Pro Plan",
          description: "Advanced video production suite for professionals and studios",
          price: 29.99,
          currency: "USD"
        })
      ]} />
      <PricingPageClient />
    </>
  )
}

import { Metadata } from 'next'
import { SpaceBackground } from '@/components/space-background'
import { BlackFridayHero } from '@/components/black-friday/BlackFridayHero'
import { BlackFridayMonthlyPlans } from '@/components/black-friday/BlackFridayMonthlyPlans'
import { BlackFridayAnnualPlans } from '@/components/black-friday/BlackFridayAnnualPlans'
import { BlackFridayShowcaseWrapper } from '@/components/black-friday/BlackFridayShowcaseWrapper'

export const metadata: Metadata = {
  title: 'Black Friday Sale 2025 - Save up to 20% OFF | VidFab AI',
  description: 'Don\'t miss out on our Black Friday sale! Get up to 20% OFF on all VidFab AI video creation plans. Limited time offer. Create stunning AI-powered videos with advanced features and HD quality.',
  keywords: ['black friday', 'cyber monday', 'ai video', 'video generation', 'discount', 'sale', 'vidfab'],
  openGraph: {
    title: 'Black Friday Magic - Save up to 20% on AI Video Creation!',
    description: 'Unleash your creativity with VidFab AI. Black Friday Sale - Up to 20% OFF on all plans!',
    type: 'website',
    url: 'https://vidfab.ai/black-friday-sale-2025',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Black Friday Sale - Up to 20% OFF | VidFab AI',
    description: 'Create stunning AI videos with VidFab. Black Friday special - Save up to 20%!',
  },
  robots: {
    index: true,
    follow: true,
  }
}

export default function BlackFridaySalePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      {/* Background */}
      <SpaceBackground />

      {/* Main Content */}
      <main className="relative z-10">
        {/* Hero Section */}
        <BlackFridayHero />

        {/* Monthly Plans Section */}
        <BlackFridayMonthlyPlans />

        {/* Annual Plans Section */}
        <BlackFridayAnnualPlans />

        {/* CTA Section with Dynamic Videos */}
        <BlackFridayShowcaseWrapper />

        {/* Footer Space */}
        <div className="py-12" />
      </main>
    </div>
  )
}

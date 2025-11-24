/**
 * SEO Metadata Configuration Utilities
 *
 * This file contains helper functions to generate page-specific metadata
 */

import { Metadata } from 'next'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://vidfab.com'

interface PageMetadataProps {
  title: string
  description: string
  path: string
  keywords?: string[]
  ogImage?: string
  twitterImage?: string
}

/**
 * Generate page-specific metadata
 */
export function generatePageMetadata({
  title,
  description,
  path,
  keywords = [],
  ogImage = '/og-image.jpg',
  twitterImage = '/twitter-image.jpg',
}: PageMetadataProps): Metadata {
  const url = `${baseUrl}${path}`

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      type: 'website',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [twitterImage],
    },
  }
}

/**
 * Homepage Metadata
 */
export const homeMetadata: Metadata = generatePageMetadata({
  title: 'VidFab - AI Video Platform | Transform Your Videos with AI',
  description: 'Transform your videos with cutting-edge AI technology. Create, enhance, and convert videos effortlessly with VidFab. Generate videos from text, images, or apply stunning AI effects.',
  path: '/',
  keywords: [
    'AI video generator',
    'text to video',
    'image to video',
    'AI video effects',
    'video creation platform',
    'AI video editing',
  ],
})

/**
 * Pricing Page Metadata
 */
export const pricingMetadata: Metadata = generatePageMetadata({
  title: 'Pricing Plans - Affordable AI Video Creation',
  description: 'Choose the perfect plan for your AI video creation needs. Start free, upgrade anytime. Simple, transparent pricing with no hidden fees. From free to enterprise plans.',
  path: '/pricing',
  keywords: [
    'VidFab pricing',
    'AI video pricing',
    'video creation plans',
    'subscription plans',
    'video editing pricing',
  ],
})

/**
 * Features Page Metadata
 */
export const featuresMetadata: Metadata = generatePageMetadata({
  title: 'Features - AI-Powered Video Creation Tools',
  description: 'Explore VidFab\'s powerful AI video creation features. Text to video, image to video, AI effects, and more. Professional video tools for everyone.',
  path: '/features',
  keywords: [
    'AI video features',
    'video creation tools',
    'AI video effects',
    'video editing features',
    'text to video features',
  ],
})

/**
 * Text to Video Page Metadata
 */
export const textToVideoMetadata: Metadata = generatePageMetadata({
  title: 'Text to Video - Generate Videos from Text with AI',
  description: 'Transform your text descriptions into stunning videos using AI. Simply describe what you want, and VidFab will create professional videos in minutes.',
  path: '/text-to-video',
  keywords: [
    'text to video',
    'AI text to video',
    'generate video from text',
    'text video generator',
    'AI video from text',
  ],
})

/**
 * Image to Video Page Metadata
 */
export const imageToVideoMetadata: Metadata = generatePageMetadata({
  title: 'Image to Video - Turn Images into Videos with AI',
  description: 'Convert your images into dynamic videos with AI. Upload your photos and let VidFab bring them to life with stunning animations and effects.',
  path: '/image-to-video',
  keywords: [
    'image to video',
    'AI image to video',
    'photo to video',
    'image video generator',
    'animate images',
  ],
})

/**
 * Text to Image Page Metadata
 */
export const textToImageMetadata: Metadata = generatePageMetadata({
  title: 'Text to Image - Generate Images from Text with AI',
  description: 'Transform your text prompts into stunning images using AI. Simply describe what you want, and VidFab will create unique visuals instantly.',
  path: '/text-to-image',
  keywords: [
    'text to image',
    'AI text to image',
    'generate image from text',
    'text image generator',
    'AI art generator',
    'prompt to picture',
  ],
})

/**
 * Image to Image Page Metadata
 */
export const imageToImageMetadata: Metadata = generatePageMetadata({
  title: 'Image to Image - Transform Images with AI',
  description: 'Reimagine your visuals with AI-powered image transformation. Upload your images and let VidFab create new artistic variations instantly.',
  path: '/image-to-image',
  keywords: [
    'image to image',
    'AI image transformation',
    'image reimagine',
    'AI image editor',
    'image style transfer',
  ],
})

/**
 * AI Video Effects Page Metadata
 */
export const aiVideoEffectsMetadata: Metadata = generatePageMetadata({
  title: 'AI Video Effects - Transform Videos with AI',
  description: 'Apply stunning AI-powered effects to your videos. Choose from hundreds of professional effects and transformations. One-click video enhancement.',
  path: '/ai-video-effects',
  keywords: [
    'AI video effects',
    'video effects AI',
    'video transformation',
    'AI video filters',
    'video enhancement',
  ],
})

/**
 * About Page Metadata
 */
export const aboutMetadata: Metadata = generatePageMetadata({
  title: 'About VidFab - AI Video Platform',
  description: 'Learn about VidFab, the leading AI-powered video creation platform. Our mission is to make professional video creation accessible to everyone.',
  path: '/about',
  keywords: [
    'VidFab about',
    'AI video company',
    'video platform',
    'about VidFab',
  ],
})

/**
 * Contact Page Metadata
 */
export const contactMetadata: Metadata = generatePageMetadata({
  title: 'Contact Us - VidFab Support',
  description: 'Get in touch with VidFab. Contact our support team for help, questions, or feedback. We\'re here to help you create amazing videos.',
  path: '/contact',
  keywords: [
    'VidFab contact',
    'VidFab support',
    'contact VidFab',
    'customer support',
  ],
})

/**
 * How It Works Page Metadata
 */
export const howItWorksMetadata: Metadata = generatePageMetadata({
  title: 'How It Works - Create AI Videos in 3 Simple Steps',
  description: 'Learn how VidFab works. Create professional AI videos in just 3 simple steps: upload, customize, and generate. No video editing experience needed.',
  path: '/how-it-works',
  keywords: [
    'how VidFab works',
    'AI video tutorial',
    'video creation process',
    'how to create AI videos',
  ],
})

/**
 * Privacy Policy Page Metadata
 */
export const privacyMetadata: Metadata = generatePageMetadata({
  title: 'Privacy Policy - VidFab Data Protection',
  description: 'VidFab Privacy Policy. Learn how we collect, use, and protect your personal information. Your privacy and data security are our top priorities.',
  path: '/privacy',
  keywords: [
    'VidFab privacy policy',
    'data protection',
    'privacy',
    'user data',
  ],
})

/**
 * Terms of Service Page Metadata
 */
export const termsOfServiceMetadata: Metadata = generatePageMetadata({
  title: 'Terms of Service - VidFab User Agreement',
  description: 'VidFab Terms of Service. Read our user agreement, acceptable use policy, and service terms. Understand your rights and responsibilities.',
  path: '/terms-of-service',
  keywords: [
    'VidFab terms of service',
    'user agreement',
    'terms and conditions',
    'service terms',
  ],
})

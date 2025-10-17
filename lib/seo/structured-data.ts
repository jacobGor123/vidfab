/**
 * SEO Structured Data (JSON-LD) Generation Functions
 *
 * This file contains functions to generate structured data in JSON-LD format
 * for improved SEO and rich search results.
 */

interface BreadcrumbItem {
  name: string
  url: string
}

interface FAQItem {
  question: string
  answer: string
}

interface ProductOffer {
  name: string
  description: string
  price: number
  currency: string
  billingPeriod?: 'monthly' | 'annual'
}

/**
 * Organization Schema - Describes the company/organization
 */
export function getOrganizationSchema() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://vidfab.com'

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'VidFab',
    description: 'AI-powered video creation and transformation platform',
    url: baseUrl,
    logo: `${baseUrl}/logo/vidfab-logo.png`,
    sameAs: [
      'https://twitter.com/vidfab',
      'https://facebook.com/vidfab',
      'https://linkedin.com/company/vidfab',
      'https://instagram.com/vidfab',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Service',
      email: 'support@vidfab.com',
      availableLanguage: ['English'],
    },
  }
}

/**
 * WebSite Schema - Describes the website and enables search box
 */
export function getWebSiteSchema() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://vidfab.com'

  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'VidFab',
    description: 'Transform your videos with cutting-edge AI technology',
    url: baseUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

/**
 * BreadcrumbList Schema - Navigation breadcrumbs for SEO
 */
export function getBreadcrumbSchema(items: BreadcrumbItem[]) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://vidfab.com'

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${baseUrl}${item.url}`,
    })),
  }
}

/**
 * SoftwareApplication Schema - Describes the application
 */
export function getSoftwareApplicationSchema() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://vidfab.com'

  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'VidFab',
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'AggregateOffer',
      lowPrice: '0',
      highPrice: '99',
      priceCurrency: 'USD',
      offerCount: '4',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '1250',
      bestRating: '5',
      worstRating: '1',
    },
    description: 'AI-powered video creation and transformation platform',
    url: baseUrl,
    screenshot: `${baseUrl}/og-image.jpg`,
  }
}

/**
 * FAQ Schema - Frequently Asked Questions
 */
export function getFAQSchema(faqs: FAQItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }
}

/**
 * Product Schema - Subscription plan/product information
 */
export function getProductSchema(product: ProductOffer) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: product.currency,
      availability: 'https://schema.org/InStock',
      priceValidUntil: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    },
  }
}

/**
 * Service Schema - Service offering description
 */
export function getServiceSchema(service: {
  name: string
  description: string
  serviceType: string
}) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://vidfab.com'

  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: service.name,
    description: service.description,
    serviceType: service.serviceType,
    provider: {
      '@type': 'Organization',
      name: 'VidFab',
      url: baseUrl,
    },
    areaServed: 'Worldwide',
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'AI Video Services',
      itemListElement: [
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Text to Video',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Image to Video',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'AI Video Effects',
          },
        },
      ],
    },
  }
}

/**
 * Video Object Schema - For individual video content
 */
export function getVideoObjectSchema(video: {
  name: string
  description: string
  thumbnailUrl: string
  uploadDate: string
  duration?: string
}) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://vidfab.com'

  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: video.name,
    description: video.description,
    thumbnailUrl: video.thumbnailUrl,
    uploadDate: video.uploadDate,
    duration: video.duration,
    contentUrl: video.thumbnailUrl,
    embedUrl: video.thumbnailUrl,
    publisher: {
      '@type': 'Organization',
      name: 'VidFab',
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/logo/vidfab-logo.png`,
      },
    },
  }
}

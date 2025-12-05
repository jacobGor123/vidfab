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
    screenshot: `${baseUrl}/og-image.webp`,
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
      name: 'AI Video & Image Services',
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
            name: 'Text to Image',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Image to Image',
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

/**
 * BlogPosting Schema - For individual blog posts
 */
export function getBlogPostingSchema(post: {
  title: string
  excerpt?: string
  content: string
  slug: string
  author_name?: string
  published_at?: string
  updated_at?: string
  featured_image_url?: string
  category?: string
  tags?: string[]
  keywords?: string[]
}) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://vidfab.com'
  const postUrl = `${baseUrl}/blog/${post.slug}`

  const schema: any = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt || post.title,
    url: postUrl,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': postUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: 'VidFab',
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/logo/vidfab-logo.png`,
      },
    },
  }

  // Add author if available
  if (post.author_name) {
    schema.author = {
      '@type': 'Person',
      name: post.author_name,
    }
  }

  // Add published date
  if (post.published_at) {
    schema.datePublished = post.published_at
  }

  // Add modified date (fallback to published date)
  schema.dateModified = post.updated_at || post.published_at || new Date().toISOString()

  // Add featured image
  if (post.featured_image_url) {
    schema.image = {
      '@type': 'ImageObject',
      url: post.featured_image_url,
      width: 1200,
      height: 630,
    }
  }

  // Add keywords
  if (post.keywords && post.keywords.length > 0) {
    schema.keywords = post.keywords.join(', ')
  } else if (post.tags && post.tags.length > 0) {
    schema.keywords = post.tags.join(', ')
  }

  // Add article section (category)
  if (post.category) {
    schema.articleSection = post.category
  }

  // Add word count (approximate from content)
  const wordCount = post.content.split(/\s+/).length
  schema.wordCount = wordCount

  return schema
}

/**
 * Blog Schema - For blog listing page
 */
export function getBlogSchema(posts?: Array<{
  title: string
  slug: string
  excerpt?: string
  published_at?: string
}>) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://vidfab.com'

  const schema: any = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'VidFab AI Blog',
    description: 'Latest AI video generation tutorials, product updates, and creative guides',
    url: `${baseUrl}/blog`,
    publisher: {
      '@type': 'Organization',
      name: 'VidFab',
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/logo/vidfab-logo.png`,
      },
    },
  }

  // Add blog posts if provided
  if (posts && posts.length > 0) {
    schema.blogPost = posts.map(post => ({
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.excerpt || post.title,
      url: `${baseUrl}/blog/${post.slug}`,
      datePublished: post.published_at,
    }))
  }

  return schema
}

/**
 * ItemList Schema - For blog post listing
 */
export function getItemListSchema(posts: Array<{
  title: string
  slug: string
  excerpt?: string
  featured_image_url?: string
}>) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://vidfab.com'

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: posts.map((post, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'BlogPosting',
        headline: post.title,
        url: `${baseUrl}/blog/${post.slug}`,
        description: post.excerpt || post.title,
        image: post.featured_image_url,
      },
    })),
  }
}

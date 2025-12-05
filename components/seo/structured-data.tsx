/**
 * Structured Data Component
 *
 * This component renders JSON-LD structured data for SEO purposes.
 * Use this component to embed structured data in your pages.
 */

import React from 'react'

interface StructuredDataProps {
  data: object | object[]
}

/**
 * StructuredData Component
 *
 * Renders one or more JSON-LD structured data scripts
 *
 * @param data - Single schema object or array of schema objects
 *
 * @example
 * ```tsx
 * import { StructuredData } from '@/components/seo/structured-data'
 * import { getOrganizationSchema, getWebSiteSchema } from '@/lib/seo/structured-data'
 *
 * <StructuredData data={[
 *   getOrganizationSchema(),
 *   getWebSiteSchema()
 * ]} />
 * ```
 */
export function StructuredData({ data }: StructuredDataProps) {
  const jsonLd = Array.isArray(data) ? data : [data]

  return (
    <>
      {jsonLd.map((item, index) => (
        <script
          key={`structured-data-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
        />
      ))}
    </>
  )
}

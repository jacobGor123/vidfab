import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { setRequestLocale } from "next-intl/server"
import { SeoToolPage } from "@/components/tools/seo-tool-page"
import { StructuredData } from "@/components/seo/structured-data"
import {
  getSeoToolPageConfig,
  seoToolSlugs,
} from "@/lib/tools/seo-tool-configs"
import {
  getBreadcrumbSchema,
  getFAQSchema,
  getServiceSchema,
} from "@/lib/seo/structured-data"
import { routing } from "@/i18n/routing"
import { getAlternateLinks } from "@/lib/seo/alternate-links"
import { getLocalizedUrl } from "@/lib/seo/metadata"

interface PageProps {
  params: Promise<{
    locale: string
    toolSlug: string
  }>
}

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    seoToolSlugs.map((toolSlug) => ({
      locale,
      toolSlug,
    }))
  )
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, toolSlug } = await params
  const config = getSeoToolPageConfig(toolSlug)

  if (!config) return {}

  const path = `/tools/${config.slug}`
  const url = getLocalizedUrl(path, locale)

  return {
    title: config.metadata.title,
    description: config.metadata.description,
    keywords: config.metadata.keywords,
    openGraph: {
      title: config.metadata.title,
      description: config.metadata.description,
      url,
      type: "website",
    },
    alternates: {
      canonical: url,
      languages: getAlternateLinks(path),
    },
  }
}

export default async function SeoToolRoutePage({ params }: PageProps) {
  const { locale, toolSlug } = await params
  setRequestLocale(locale)

  const config = getSeoToolPageConfig(toolSlug)
  if (!config) notFound()

  return (
    <>
      <StructuredData
        data={[
          getServiceSchema({
            name: config.modelDisplayName,
            description: config.metadata.description,
            serviceType: config.schemaServiceType,
          }),
          getFAQSchema(config.faqs),
          getBreadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Tools", url: "/tools" },
            { name: config.modelDisplayName, url: `/tools/${config.slug}` },
          ]),
        ]}
      />
      <SeoToolPage config={config} />
    </>
  )
}

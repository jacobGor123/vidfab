import { Metadata } from "next"
import Kling3Client from "./kling3-client"
import { setRequestLocale } from 'next-intl/server'
import { getAlternateLinks } from "@/lib/seo/alternate-links"
import { getLocalizedUrl } from "@/lib/seo/metadata"

const path = "/tools/kling3"
const title = "Kling 3.0 AI Video Generator — AI Video That Thinks in Scenes"
const description =
  "Generate cinematic story-driven videos with Kling 3.0. Multi-shot sequencing, native lip-synced audio, character consistency across scenes, and up to 15 seconds per generation — directly in your browser."

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const url = getLocalizedUrl(path, locale)

  return {
    title,
    description,
    openGraph: {
      title,
      description:
        "Access Kling 3.0 directly. Generate scenes with narrative logic — multi-shot sequencing, character consistency, and lip-synced audio, all in one generation.",
      url,
    },
    alternates: {
      canonical: url,
      languages: getAlternateLinks(path),
    },
  }
}

export const dynamic = "force-dynamic"

export default async function Kling3Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  return <Kling3Client />
}

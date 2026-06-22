import type { Metadata } from "next"
import Veo3Client from "./veo3-client"
import { setRequestLocale } from 'next-intl/server'
import { getAlternateLinks } from "@/lib/seo/alternate-links"
import { getLocalizedUrl } from "@/lib/seo/metadata"

const path = "/tools/veo3"
const title = "Veo 3 AI Video Generator — Google Veo 3 Online"
const description =
  "Generate cinematic AI videos directly with Google's Veo 3 model. No waitlist. Native audio, physics-accurate motion, and hyper-precise prompt understanding. Get 100 free credits."

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const url = getLocalizedUrl(path, locale)

  return {
    title,
    description,
    keywords: [
      "Veo 3",
      "Google Veo 3",
      "Veo 3 API",
      "AI video generator",
      "cinematic AI video",
      "text to video AI",
      "Veo 3 playground",
    ],
    openGraph: {
      title,
      description:
        "Experience Google's Veo 3 model directly. No waitlist. Create cinematic AI videos with native audio and physics-accurate motion.",
      url,
    },
    alternates: {
      canonical: url,
      languages: getAlternateLinks(path),
    },
  }
}

export default async function Veo3Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  return <Veo3Client />
}

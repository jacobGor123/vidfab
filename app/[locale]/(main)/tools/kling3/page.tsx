import { Metadata } from "next"
import Kling3Client from "./kling3-client"
import { setRequestLocale } from 'next-intl/server'

export const metadata: Metadata = {
  title: "Kling 3.0 AI Video Generator — AI Video That Thinks in Scenes",
  description:
    "Generate cinematic story-driven videos with Kling 3.0. Multi-shot sequencing, native lip-synced audio, character consistency across scenes, and up to 15 seconds per generation — directly in your browser.",
  openGraph: {
    title: "Kling 3.0 AI Video Generator — AI Video That Thinks in Scenes",
    description:
      "Access Kling 3.0 directly. Generate scenes with narrative logic — multi-shot sequencing, character consistency, and lip-synced audio, all in one generation.",
  },
}

export const dynamic = "force-dynamic"

export default async function Kling3Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  return <Kling3Client />
}

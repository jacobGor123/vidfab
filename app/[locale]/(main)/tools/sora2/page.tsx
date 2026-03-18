import { Metadata } from "next"
import Sora2Client from "./sora2-client"
import { setRequestLocale } from 'next-intl/server'

export const metadata: Metadata = {
  title: "Sora 2 AI Video Generator — OpenAI Sora 2 Online",
  description:
    "Generate stunning cinematic videos with OpenAI Sora 2. Up to 12 seconds, consistent characters, native audio, and physics-accurate world simulation — directly in your browser.",
  openGraph: {
    title: "Sora 2 AI Video Generator — OpenAI Sora 2 Online",
    description:
      "Access OpenAI Sora 2 directly. Generate cinematic videos up to 12 seconds with native audio, consistent characters, and physics-accurate visuals.",
  },
}

export const dynamic = "force-dynamic"

export default async function Sora2Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  return <Sora2Client />
}

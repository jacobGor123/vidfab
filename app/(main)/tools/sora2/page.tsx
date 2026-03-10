import { Metadata } from "next"
import Sora2Client from "./sora2-client"

export const metadata: Metadata = {
  title: "Sora 2 AI Video Generator — OpenAI Sora 2 Online | VidFab",
  description:
    "Generate stunning cinematic videos with OpenAI Sora 2. Up to 12 seconds, consistent characters, native audio, and physics-accurate world simulation — directly in your browser.",
  openGraph: {
    title: "Sora 2 AI Video Generator | VidFab",
    description:
      "Access OpenAI Sora 2 directly. Generate cinematic videos up to 12 seconds with native audio, consistent characters, and physics-accurate visuals.",
  },
}

export const dynamic = "force-dynamic"

export default function Sora2Page() {
  return <Sora2Client />
}

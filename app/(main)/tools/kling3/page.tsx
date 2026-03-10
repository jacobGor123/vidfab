import { Metadata } from "next"
import Kling3Client from "./kling3-client"

export const metadata: Metadata = {
  title: "Kling 3.0 AI Video Generator — AI Video That Thinks in Scenes | VidFab",
  description:
    "Generate cinematic story-driven videos with Kling 3.0. Multi-shot sequencing, native lip-synced audio, character consistency across scenes, and up to 15 seconds per generation — directly in your browser.",
  openGraph: {
    title: "Kling 3.0 AI Video Generator | VidFab",
    description:
      "Access Kling 3.0 directly. Generate scenes with narrative logic — multi-shot sequencing, character consistency, and lip-synced audio, all in one generation.",
  },
}

export const dynamic = "force-dynamic"

export default function Kling3Page() {
  return <Kling3Client />
}

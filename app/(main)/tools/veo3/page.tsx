import type { Metadata } from "next"
import Veo3Client from "./veo3-client"

export const metadata: Metadata = {
  title: "Veo 3 AI Video Generator — Google Veo 3 Online",
  description:
    "Generate cinematic AI videos directly with Google's Veo 3 model. No waitlist. Native audio, physics-accurate motion, and hyper-precise prompt understanding. Get 200 free credits.",
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
    title: "Veo 3 AI Video Generator — Google Veo 3 Online",
    description:
      "Experience Google's Veo 3 model directly. No waitlist. Create cinematic AI videos with native audio and physics-accurate motion.",
    url: "/tools/veo3",
  },
  alternates: {
    canonical: "/tools/veo3",
  },
}

export default function Veo3Page() {
  return <Veo3Client />
}

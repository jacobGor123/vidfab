import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "VidFab AI Video Generator with Stunning Video Effects | Create Easily",
  description: "Transform your videos with AI-powered effects. Our video generator offers cutting-edge video creation tools for stunning results. Try it free!",
}

export default function AIVideoEffectsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

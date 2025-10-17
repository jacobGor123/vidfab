import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "VidFab AI Video Generator: Turn Images to Video Instantly",
  description: "Transform static images into dynamic videos with our powerful AI video generator. Effortless video creation for tech-savvy professionals. Try it now!",
}

export default function ImageToVideoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

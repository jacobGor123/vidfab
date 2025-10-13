import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "VidFab AI Video Generator | Turn Text to Video in Seconds",
  description: "Transform text into professional videos instantly with our AI video generator. Create engaging content effortlessly. Try our text-to-video tool today!",
}

export default function TextToVideoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

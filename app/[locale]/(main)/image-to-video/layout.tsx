import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "VidFab AI Video Generator: Turn Images to Video Instantly",
  description: "Transform static images into dynamic videos with our powerful AI video generator. Effortless video creation for tech-savvy professionals. Try it now!",
}

// 🔥 强制动态渲染，避免预渲染时 usePathname 错误
export const dynamic = 'force-dynamic'

export default function ImageToVideoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "VidFab AI Video Generator | Turn Text to Video in Seconds",
  description: "Transform text into professional videos instantly with our AI video generator. Create engaging content effortlessly. Try our text-to-video tool today!",
}

// 🔥 强制动态渲染，避免预渲染时 usePathname 错误
export const dynamic = 'force-dynamic'

export default function TextToVideoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

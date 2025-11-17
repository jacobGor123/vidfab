import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "VidFab AI Video Generator with Stunning Video Effects | Create Easily",
  description: "Transform your videos with AI-powered effects. Our video generator offers cutting-edge video creation tools for stunning results. Try it free!",
}

// 🔥 强制动态渲染，避免预渲染时 usePathname 错误
export const dynamic = 'force-dynamic'

export default function AIVideoEffectsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

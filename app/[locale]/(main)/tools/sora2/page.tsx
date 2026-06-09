import type { Metadata } from "next"
import { notFound } from "next/navigation"

export const metadata: Metadata = {
  title: "Page Not Found | VidFab AI",
  robots: {
    index: false,
    follow: false,
  },
}

export const dynamic = "force-dynamic"

export default function Sora2Page() {
  notFound()
}

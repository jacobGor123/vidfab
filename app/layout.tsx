import type React from "react"
import type { Metadata } from "next"
import { ThemeProvider } from "@/components/theme-provider"
import { SessionProvider } from "@/components/auth/session-provider"
import { VideoProvider } from "@/lib/contexts/video-context"
import { cn } from "@/lib/utils"
import { openSans } from "@/lib/fonts"
import { Toaster } from "react-hot-toast"
import "./globals.css"

export const metadata: Metadata = {
  title: "VidFab - AI Video Platform",
  description: "Transform your videos with cutting-edge AI technology. Create, enhance, and convert videos effortlessly with VidFab.",
  generator: 'v0.app'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn("min-h-screen bg-background font-sans antialiased", openSans.variable)}>
        <SessionProvider>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
            <VideoProvider>
              {children}
            </VideoProvider>
            <Toaster
              position="bottom-right"
              toastOptions={{
                duration: 3000,
                style: {
                  background: '#1f2937',
                  color: '#f9fafb',
                  border: '1px solid #374151',
                }
              }}
            />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  )
}

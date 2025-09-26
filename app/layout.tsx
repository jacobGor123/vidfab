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
      <head>
        <style dangerouslySetInnerHTML={{
          __html: `
            @font-face {
              font-family: 'Open Sans';
              font-style: normal;
              font-weight: 300 800;
              font-display: swap;
              src: url('/fonts/open-sans-variable.woff2') format('woff2');
            }
            :root {
              --font-open-sans: 'Open Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            }
          `
        }} />
      </head>
      <body className={`min-h-screen bg-background antialiased font-sans ${openSans.variable}`}>
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

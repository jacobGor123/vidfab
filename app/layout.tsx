import type React from "react"
import type { Metadata } from "next"
import { ThemeProvider } from "@/components/theme-provider"
import { SessionProvider } from "@/components/auth/session-provider"
import { VideoProvider } from "@/lib/contexts/video-context"
import { cn } from "@/lib/utils"
import { openSans } from "@/lib/fonts"
import { Toaster } from "react-hot-toast"
import { StructuredData } from "@/components/seo/structured-data"
import { getOrganizationSchema, getWebSiteSchema, getSoftwareApplicationSchema } from "@/lib/seo/structured-data"
import "./globals.css"

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://vidfab.com'),

  title: {
    default: 'VidFab - AI Video Platform | Transform Your Videos with AI',
    template: '%s | VidFab'
  },

  description: 'Transform your videos with cutting-edge AI technology. Create, enhance, and convert videos effortlessly with VidFab. Generate videos from text, images, or apply stunning AI effects.',

  keywords: [
    'AI video generator',
    'text to video',
    'image to video',
    'AI video effects',
    'video creation platform',
    'AI video editing',
    'video transformation',
    'machine learning video',
    'automated video creation',
    'video AI technology'
  ],

  authors: [
    { name: 'VidFab Team' }
  ],

  creator: 'VidFab',
  publisher: 'VidFab',
  generator: 'Next.js',

  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },

  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },

  manifest: '/site.webmanifest',

  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'VidFab',
    title: 'VidFab - AI Video Platform | Transform Your Videos with AI',
    description: 'Transform your videos with cutting-edge AI technology. Create, enhance, and convert videos effortlessly with our powerful AI video platform.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'VidFab AI Video Platform',
      }
    ],
  },

  twitter: {
    card: 'summary_large_image',
    title: 'VidFab - AI Video Platform',
    description: 'Transform your videos with cutting-edge AI technology. Generate videos from text, images, or apply stunning AI effects.',
    images: ['/twitter-image.jpg'],
    creator: '@vidfab',
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  verification: {
    // google: 'your-google-verification-code', // Add when you have it
    // yandex: 'your-yandex-verification-code', // Add when you have it
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Google Tag Manager */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-NYQGR827GS"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-NYQGR827GS');
            `
          }}
        />
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
        <StructuredData data={[
          getOrganizationSchema(),
          getWebSiteSchema(),
          getSoftwareApplicationSchema(),
        ]} />
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

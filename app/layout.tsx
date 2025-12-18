import type React from "react"
import type { Metadata } from "next"
import { ThemeProvider } from "@/components/theme-provider"
import { SessionProvider } from "@/components/auth/session-provider"
import { VideoProvider } from "@/lib/contexts/video-context"
import { ImageProvider } from "@/lib/contexts/image-context"
import { WebVitals } from "@/components/web-vitals"
// import { BlackFridayBanner } from "@/components/black-friday/BlackFridayBanner"
import { cn } from "@/lib/utils"
import { openSans } from "@/lib/fonts"
import { Toaster } from "react-hot-toast"
import { Toaster as SonnerToaster } from "sonner"
import { StructuredData } from "@/components/seo/structured-data"
import { getOrganizationSchema, getWebSiteSchema, getSoftwareApplicationSchema } from "@/lib/seo/structured-data"
import dynamic from 'next/dynamic'
import "./globals.css"

// 动态导入客户端 ProgressBar 包装组件，禁用 SSR
const ProgressBar = dynamic(
  () => import('@/components/progress-bar-wrapper').then((mod) => mod.ProgressBarWrapper),
  { ssr: false }
)

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
        url: '/og-image.webp',
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
    images: ['/twitter-image.webp'],
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
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','GTM-KHJSNV42');`
          }}
        />
        {/* 初始化 gtag 函数 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = gtag;
              gtag('js', new Date());
              gtag('config', 'GTM-KHJSNV42');
            `
          }}
        />
        {/* 字体预加载 - 提高 FCP */}
        <link
          rel="preload"
          href="/fonts/open-sans-variable.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <style dangerouslySetInnerHTML={{
          __html: `
            @font-face {
              font-family: 'Open Sans';
              font-style: normal;
              font-weight: 300 800;
              font-display: swap;
              src: url('/fonts/open-sans-variable.woff2') format('woff2');
              unicode-range: U+0020-007F, U+00A0-00FF;
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
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-KHJSNV42"
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
        {/* End Google Tag Manager (noscript) */}
        <WebVitals />
        {/* <BlackFridayBanner /> */}
        <SessionProvider>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
            <VideoProvider>
              <ImageProvider>
                {children}
                <ProgressBar />
              </ImageProvider>
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
            {/* Sonner Toaster for modern toasts and confirms */}
            <SonnerToaster
              position="top-center"
              richColors
              closeButton
              theme="dark"
            />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  )
}

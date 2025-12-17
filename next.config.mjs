import createNextIntlPlugin from 'next-intl/plugin';
import { withAxiom } from 'next-axiom';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimize for production hydration
  swcMinify: true,
  compress: true,

  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: false, // 🔥 启用图片优化
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com', // Google profile images
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com', // GitHub avatars
      },
      {
        protocol: 'https',
        hostname: 'accounts.google.com', // Google OAuth
      },
      {
        protocol: 'https',
        hostname: 'static.vidfab.ai', // CDN for videos and images
      },
      {
        protocol: 'https',
        hostname: 'ycahbhhuzgixfrljtqmi.supabase.co', // Supabase storage
        pathname: '/storage/v1/object/**',
      },
      // 🔥 注意：CloudFront 图片已在组件层面设置 unoptimized，不经过 Next.js Image Optimizer
      // 以下配置保留作为备用，但实际上 CloudFront 图片会直接使用原始 URL
      {
        protocol: 'https',
        hostname: '*.cloudfront.net', // 支持所有 CloudFront 域名（通配符）
      },
    ],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // 减少图片缓存时间，便于开发调试（生产环境可以增大）
    minimumCacheTTL: 60,
  },
  
  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // Enable experimental features for better performance
  experimental: {
    // Add experimental features here if needed
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
    // Enable instrumentation for blog cron jobs
    instrumentationHook: true,
  },

  // Production build configuration
  ...(process.env.NODE_ENV === 'production' && {
    // Continue build even with warnings in production
    onDemandEntries: {
      // period (in ms) where the server will keep pages in the buffer
      maxInactiveAge: 25 * 1000,
      // number of pages that should be kept simultaneously without being disposed
      pagesBufferLength: 2,
    }
  }),

  // Security headers with Docker and OAuth compatibility
  async headers() {
    const securityHeaders = [
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff',
      },
      {
        key: 'Referrer-Policy',
        value: 'origin-when-cross-origin',
      },
    ];

    // Conditional X-Frame-Options for OAuth
    if (!process.env.DOCKER_ENVIRONMENT) {
      securityHeaders.push({
        key: 'X-Frame-Options',
        value: 'DENY',
      });
    }

    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      // Cache static assets
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/:all*(svg|jpg|jpeg|png|gif|ico|webp|avif)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Allow Google OAuth domains
      {
        source: '/api/auth/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.DOCKER_ENVIRONMENT
              ? '*'
              : 'https://accounts.google.com',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ];
  },
}

// Apply plugins in order: Axiom -> NextIntl
export default withNextIntl(withAxiom(nextConfig));

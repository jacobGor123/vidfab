import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker
  output: 'standalone',

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
    unoptimized: true,
    domains: [
      'localhost',
      '0.0.0.0', // Docker container access
      'lh3.googleusercontent.com', // Google profile images
      'avatars.githubusercontent.com', // GitHub avatars (if needed)
      'accounts.google.com', // Google OAuth
    ],
    formats: ['image/webp', 'image/avif'],
  },
  
  // Enable experimental features for better performance
  experimental: {
    // Add experimental features here if needed
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

export default withNextIntl(nextConfig);

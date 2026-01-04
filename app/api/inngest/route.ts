/**
 * Inngest API Route
 * Serves Inngest functions and handles event execution
 */

import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest/client'

// Import all Inngest functions
import {
  downloadVideo,
  generateThumbnail,
  cleanupTempFiles,
  updateUserQuota,
} from '@/lib/inngest/functions/video-processing'

import { generateBlogArticle } from '@/lib/inngest/functions/blog-generation'

// Export HTTP handlers for Inngest
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    // Video processing functions
    downloadVideo,
    generateThumbnail,
    cleanupTempFiles,
    updateUserQuota,

    // Blog generation function
    generateBlogArticle,
  ],
  signingKey: process.env.INNGEST_SIGNING_KEY!,

  // Enable landing page in development
  landingPage: process.env.NODE_ENV === 'development',
})

/**
 * 404 Not Found Page
 *
 * Custom 404 error page with SEO optimization
 */

import { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Home, Search, ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: '404 - Page Not Found',
  description: 'The page you are looking for could not be found. Return to VidFab homepage or explore our features.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-cyan-900/20" />
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:radial-gradient(white,transparent_85%)] opacity-10" />

      <div className="relative z-10 max-w-2xl mx-auto px-4 text-center">
        {/* 404 Large Text */}
        <h1 className="text-9xl md:text-[200px] font-bold mb-4 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 bg-clip-text text-transparent">
          404
        </h1>

        {/* Error Message */}
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          Page Not Found
        </h2>
        <p className="text-lg text-gray-400 mb-8 max-w-md mx-auto">
          Oops! The page you're looking for doesn't exist. It might have been moved or deleted.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
          <Link href="/">
            <Button className="bg-gradient-to-r from-pink-500 to-purple-500 hover:opacity-90 text-white px-8 py-6 text-lg">
              <Home className="h-5 w-5 mr-2" />
              Go to Homepage
            </Button>
          </Link>
          <Link href="/features">
            <Button variant="outline" className="border-white/20 hover:bg-white/10 px-8 py-6 text-lg">
              <Search className="h-5 w-5 mr-2" />
              Explore Features
            </Button>
          </Link>
        </div>

        {/* Quick Links */}
        <div className="border-t border-white/10 pt-8">
          <p className="text-sm text-gray-500 mb-4">Quick Links</p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/pricing" className="text-sm text-gray-400 hover:text-white transition-colors">
              Pricing
            </Link>
            <Link href="/text-to-video" className="text-sm text-gray-400 hover:text-white transition-colors">
              Text to Video
            </Link>
            <Link href="/image-to-video" className="text-sm text-gray-400 hover:text-white transition-colors">
              Image to Video
            </Link>
            <Link href="/about" className="text-sm text-gray-400 hover:text-white transition-colors">
              About Us
            </Link>
            <Link href="/contact" className="text-sm text-gray-400 hover:text-white transition-colors">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

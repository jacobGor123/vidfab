"use client"

import { useState, useEffect } from "react"
import { LoadingState } from "@/components/loading-state"
import { SkeletonLoader } from "@/components/skeleton-loader"
import { Mail, Linkedin, Twitter, Instagram, Youtube } from "lucide-react"

export default function ContactPage() {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false)
    }, 1000)

    return () => {
      clearTimeout(timer)
    }
  }, [])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <SkeletonLoader type="title" className="mb-12" />
          <SkeletonLoader type="text" count={10} className="mb-4" />
        </div>
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-50">
          <LoadingState message="Loading Contact Information..." />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-20">
      <div className="max-w-4xl mx-auto">
        {/* Hero Title */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 bg-clip-text text-transparent">
            Contact Us
          </h1>
          <p className="text-gray-300 text-lg leading-relaxed max-w-2xl mx-auto">
            We'd love to hear from you! Whether you have questions about our AI Video Generator, need product support, or want to explore partnership opportunities, our team is here to help.
          </p>
        </div>

        {/* Get in Touch Section */}
        <section className="mb-16">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 md:p-10 hover:border-purple-500/30 transition-all duration-300">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-8">
              Get in Touch
            </h2>

            <div className="space-y-6">
              {/* Email Support */}
              <div className="bg-white/5 backdrop-blur-sm border border-white/5 rounded-xl p-6 hover:bg-white/10 transition-all duration-300">
                <div className="flex items-start">
                  <div className="bg-gradient-to-r from-pink-500 to-purple-500 p-3 rounded-xl mr-4 flex-shrink-0">
                    <Mail className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">
                      Email Support
                    </h3>
                    <p className="text-gray-400 text-sm mb-3">
                      Customer Support / Partnerships
                    </p>
                    <a
                      href="mailto:support@vidfab.ai"
                      className="text-purple-400 hover:text-purple-300 transition-colors text-lg font-medium"
                    >
                      support@vidfab.ai
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stay Connected Section */}
        <section>
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 md:p-10 hover:border-cyan-400/30 transition-all duration-300">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Stay Connected
            </h2>
            <p className="text-gray-300 text-lg leading-relaxed mb-8">
              Follow us for the latest AI video tips, product updates, and creative inspiration:
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              {/* LinkedIn */}
              <a
                href="#"
                className="flex items-center p-4 bg-white/5 backdrop-blur-sm border border-white/5 rounded-xl hover:bg-white/10 hover:border-blue-500/30 transition-all duration-300 group"
              >
                <div className="bg-gradient-to-r from-blue-500 to-cyan-400 p-3 rounded-xl mr-4">
                  <Linkedin className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-semibold group-hover:text-blue-400 transition-colors">
                    LinkedIn
                  </h3>
                  <p className="text-gray-400 text-sm">Professional updates</p>
                </div>
              </a>

              {/* Twitter/X */}
              <a
                href="#"
                className="flex items-center p-4 bg-white/5 backdrop-blur-sm border border-white/5 rounded-xl hover:bg-white/10 hover:border-cyan-400/30 transition-all duration-300 group"
              >
                <div className="bg-gradient-to-r from-cyan-400 to-blue-400 p-3 rounded-xl mr-4">
                  <Twitter className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-semibold group-hover:text-cyan-400 transition-colors">
                    Twitter/X
                  </h3>
                  <p className="text-gray-400 text-sm">Quick updates & tips</p>
                </div>
              </a>

              {/* Instagram */}
              <a
                href="#"
                className="flex items-center p-4 bg-white/5 backdrop-blur-sm border border-white/5 rounded-xl hover:bg-white/10 hover:border-pink-500/30 transition-all duration-300 group"
              >
                <div className="bg-gradient-to-r from-pink-500 to-purple-500 p-3 rounded-xl mr-4">
                  <Instagram className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-semibold group-hover:text-pink-400 transition-colors">
                    Instagram
                  </h3>
                  <p className="text-gray-400 text-sm">Visual inspiration</p>
                </div>
              </a>

              {/* YouTube */}
              <a
                href="#"
                className="flex items-center p-4 bg-white/5 backdrop-blur-sm border border-white/5 rounded-xl hover:bg-white/10 hover:border-red-500/30 transition-all duration-300 group"
              >
                <div className="bg-gradient-to-r from-red-500 to-pink-500 p-3 rounded-xl mr-4">
                  <Youtube className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-semibold group-hover:text-red-400 transition-colors">
                    YouTube
                  </h3>
                  <p className="text-gray-400 text-sm">Tutorials & showcases</p>
                </div>
              </a>

              {/* TikTok */}
              <a
                href="#"
                className="flex items-center p-4 bg-white/5 backdrop-blur-sm border border-white/5 rounded-xl hover:bg-white/10 hover:border-purple-500/30 transition-all duration-300 group md:col-span-2"
              >
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-3 rounded-xl mr-4">
                  <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-semibold group-hover:text-purple-400 transition-colors">
                    TikTok
                  </h3>
                  <p className="text-gray-400 text-sm">Short form content & trends</p>
                </div>
              </a>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="mt-16">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-cyan-400/20 blur-2xl rounded-3xl"></div>
            <div className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 text-center">
              <h3 className="text-2xl font-bold text-white mb-4">
                Ready to Create Amazing Videos?
              </h3>
              <p className="text-gray-300 mb-6">
                Start your journey with VidFab AI Video Generator today.
              </p>
              <a
                href="/create"
                className="inline-block px-8 py-4 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 text-white font-semibold rounded-full hover:opacity-90 transition-all duration-300 shadow-lg hover:shadow-purple-500/50"
              >
                Get Started
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

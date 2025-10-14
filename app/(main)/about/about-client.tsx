"use client"

import { useState, useEffect } from "react"
import { LoadingState } from "@/components/loading-state"
import { SkeletonLoader } from "@/components/skeleton-loader"
import { Sparkles, Target, Eye, Wand2 } from "lucide-react"

export default function AboutPage() {
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
        <div className="max-w-6xl mx-auto">
          <SkeletonLoader type="title" className="mb-12" />
          <SkeletonLoader type="text" count={15} className="mb-4" />
        </div>
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-50">
          <LoadingState message="Loading About VidFab..." />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-20">
      <div className="max-w-6xl mx-auto">
        {/* Hero Title with Background */}
        <div className="relative mb-20">
          <div className="absolute inset-0 bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-cyan-400/20 blur-3xl rounded-3xl"></div>
          <div className="relative bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-cyan-400/10 backdrop-blur-sm border border-white/10 rounded-2xl p-12 md:p-16 text-center">
            <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 bg-clip-text text-transparent">
              Welcome to VidFab Story
            </h1>
          </div>
        </div>

        {/* Who We Are Section */}
        <section className="mb-16">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 md:p-10 hover:border-purple-500/30 transition-all duration-300">
            <div className="flex items-center mb-6">
              <h2 className="text-3xl md:text-4xl font-bold text-white">
                Who We Are
              </h2>
            </div>
            <p className="text-gray-300 text-lg leading-relaxed">
              We are an innovation-driven company dedicated to making video creation accessible to everyone through the power of artificial intelligence. Our flagship product, the VidFab AI Video Generator, transforms your text, images, and ideas into professional-quality videos in seconds. We believe that powerful tools should be simple to use, and our platform is built to empower your creativity without complexity.
            </p>
          </div>
        </section>

        {/* Mission and Vision Grid */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {/* Our Mission */}
          <section>
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 md:p-10 h-full hover:border-blue-500/30 transition-all duration-300">
              <div className="flex items-center mb-6">
                <h2 className="text-3xl md:text-4xl font-bold text-white">
                  Our Mission
                </h2>
              </div>
              <p className="text-gray-300 text-lg leading-relaxed">
                Our mission is to democratize video production. We are removing the technical and financial barriers that have traditionally limited access to high-quality content creation. Whether you are a marketer, educator, content creator, or business leader, our comprehensive AI tools help you generate videos that inspire, explain, and engage—faster and more efficiently than ever before.
              </p>
            </div>
          </section>

          {/* Our Vision */}
          <section>
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 md:p-10 h-full hover:border-pink-500/30 transition-all duration-300">
              <div className="flex items-center mb-6">
                <h2 className="text-3xl md:text-4xl font-bold text-white">
                  Our Vision
                </h2>
              </div>
              <p className="text-gray-300 text-lg leading-relaxed">
                We envision a future where AI-generated video is a primary form of digital communication. This new medium is faster to produce, easier to customize, and more impactful than static text or images. By blending human creativity with seamless AI automation, we aim to empower anyone, anywhere, to become a masterful storyteller. Your data stays entirely on your device, ensuring your creative process is secure yet unrestrained.
              </p>
            </div>
          </section>
        </div>

        {/* What We Do Section */}
        <section>
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 md:p-10 hover:border-cyan-400/30 transition-all duration-300">
            <div className="flex items-center mb-6">
              <h2 className="text-3xl md:text-4xl font-bold text-white">
                What We Do
              </h2>
            </div>
            <p className="text-gray-300 text-lg leading-relaxed mb-8">
              VidFab offers a suite of powerful, innovative features designed to bring your vision to life. Our AI video generator simplifies the entire creation process, allowing you to focus on your message.
            </p>

            <div className="space-y-6">
              <div className="bg-white/5 backdrop-blur-sm border border-white/5 rounded-xl p-6 hover:bg-white/10 transition-all duration-300">
                <h3 className="text-xl font-bold text-white mb-3 flex items-center">
                  <span className="bg-gradient-to-r from-pink-500 to-purple-500 text-transparent bg-clip-text mr-3">■</span>
                  Text-to-Video
                </h3>
                <p className="text-gray-300 leading-relaxed ml-7">
                  Turn scripts, articles, or simple prompts into cinematic clips with just a few clicks.
                </p>
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/5 rounded-xl p-6 hover:bg-white/10 transition-all duration-300">
                <h3 className="text-xl font-bold text-white mb-3 flex items-center">
                  <span className="bg-gradient-to-r from-blue-500 to-cyan-400 text-transparent bg-clip-text mr-3">■</span>
                  Image-to-Video
                </h3>
                <p className="text-gray-300 leading-relaxed ml-7">
                  Animate your still photos and bring them to life as dynamic, engaging videos.
                </p>
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/5 rounded-xl p-6 hover:bg-white/10 transition-all duration-300">
                <h3 className="text-xl font-bold text-white mb-3 flex items-center">
                  <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-transparent bg-clip-text mr-3">■</span>
                  AI Video Effects
                </h3>
                <p className="text-gray-300 leading-relaxed ml-7">
                  Enhance your footage with professional-grade filters, seamless transitions, and unique visual styles.
                </p>
              </div>
            </div>

            <div className="mt-8 p-6 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-cyan-400/10 border border-white/10 rounded-xl">
              <p className="text-gray-300 text-lg leading-relaxed text-center">
                We are constantly pioneering new AI models and delivering them directly to you. <span className="text-white font-semibold">More amazing functions are always under development.</span> Stay tuned to see what's next.
              </p>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="mt-20 text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-cyan-400/20 blur-2xl rounded-3xl"></div>
            <div className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 bg-clip-text text-transparent">
                Ready to Start Creating?
              </h2>
              <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto">
                Join thousands of creators who are already transforming their ideas into stunning videos with VidFab AI.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="/create"
                  className="px-8 py-4 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 text-white font-semibold rounded-full hover:opacity-90 transition-all duration-300 shadow-lg hover:shadow-purple-500/50"
                >
                  Start Creating Now
                </a>
                <a
                  href="/pricing"
                  className="px-8 py-4 bg-white/10 backdrop-blur-sm border border-white/20 text-white font-semibold rounded-full hover:bg-white/20 transition-all duration-300"
                >
                  View Pricing
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

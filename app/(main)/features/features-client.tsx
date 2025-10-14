"use client"

import { useState, useEffect } from "react"
import { Navbar } from "@/components/navbar"
import { SpaceBackground } from "@/components/space-background"
import { LoadingState } from "@/components/loading-state"
import { SkeletonLoader } from "@/components/skeleton-loader"
import { Sparkles, Shield, Clock, Zap, Check } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function FeaturesPage() {
  const [loading, setLoading] = useState(true)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }

    window.addEventListener("scroll", handleScroll)

    // Simulate loading
    const timer = setTimeout(() => {
      setLoading(false)
    }, 2000)

    return () => {
      window.removeEventListener("scroll", handleScroll)
      clearTimeout(timer)
    }
  }, [])

  if (loading) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-black text-white">
        <SpaceBackground />
        <Navbar scrolled={scrolled} />
        <div className="container mx-auto px-4 pt-32 pb-20">
          <div className="max-w-4xl mx-auto">
            <SkeletonLoader type="title" className="mb-6" />
            <SkeletonLoader type="text" count={3} className="mb-12" />

            <div className="grid md:grid-cols-3 gap-8">
              <SkeletonLoader type="card" />
              <SkeletonLoader type="card" />
              <SkeletonLoader type="card" />
              <SkeletonLoader type="card" />
              <SkeletonLoader type="card" />
              <SkeletonLoader type="card" />
            </div>
          </div>
        </div>
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-50">
          <LoadingState message="Loading Features..." />
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <SpaceBackground />
      <Navbar scrolled={scrolled} />

      <main>
        <div className="container mx-auto px-4 pt-32 pb-20">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 bg-clip-text text-transparent">
              Features Engineered for Insight
            </h1>
            <p className="text-lg text-gray-300">
              Explore the tools that power NeuralArchive, designed to turn raw data into refined knowledge.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 group hover:bg-white/10 transition-colors">
              <div className="mb-4 p-3 bg-gradient-to-br from-pink-500/20 to-purple-500/20 rounded-full w-fit">
                <Sparkles className="h-6 w-6 text-pink-500" />
              </div>
              <h3 className="text-xl font-bold mb-3 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-pink-500 group-hover:via-purple-500 group-hover:to-cyan-400 transition-colors">
                AI-Powered Research
              </h3>
              <p className="text-gray-400">
                Leverage advanced AI models to analyze complex topics and generate comprehensive research reports.
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 group hover:bg-white/10 transition-colors">
              <div className="mb-4 p-3 bg-gradient-to-br from-purple-500/20 to-cyan-400/20 rounded-full w-fit">
                <Zap className="h-6 w-6 text-purple-500" />
              </div>
              <h3 className="text-xl font-bold mb-3 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-pink-500 group-hover:via-purple-500 group-hover:to-cyan-400 transition-colors">
                Knowledge Graph Visualization
              </h3>
              <p className="text-gray-400">
                Visualize complex relationships and uncover hidden connections within your research data through
                interactive knowledge graphs.
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 group hover:bg-white/10 transition-colors">
              <div className="mb-4 p-3 bg-gradient-to-br from-cyan-400/20 to-pink-500/20 rounded-full w-fit">
                <Shield className="h-6 w-6 text-cyan-400" />
              </div>
              <h3 className="text-xl font-bold mb-3 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-pink-500 group-hover:via-purple-500 group-hover:to-cyan-400 transition-colors">
                Fact Verification
              </h3>
              <p className="text-gray-400">
                Our system cross-references information from multiple sources to ensure accuracy and reliability of
                research findings.
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 group hover:bg-white/10 transition-colors">
              <div className="mb-4 p-3 bg-gradient-to-br from-pink-500/20 to-purple-500/20 rounded-full w-fit">
                <Clock className="h-6 w-6 text-pink-500" />
              </div>
              <h3 className="text-xl font-bold mb-3 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-pink-500 group-hover:via-purple-500 group-hover:to-cyan-400 transition-colors">
                Real-Time Processing
              </h3>
              <p className="text-gray-400">
                Get research results quickly with our optimized processing pipeline that works in real-time to deliver
                insights.
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 group hover:bg-white/10 transition-colors">
              <div className="mb-4 p-3 bg-gradient-to-br from-purple-500/20 to-cyan-400/20 rounded-full w-fit">
                <Zap className="h-6 w-6 text-purple-500" />
              </div>
              <h3 className="text-xl font-bold mb-3 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-pink-500 group-hover:via-purple-500 group-hover:to-cyan-400 transition-colors">
                Multi-Stage Processing
              </h3>
              <p className="text-gray-400">
                Your query goes through multiple specialized AI agents, each contributing their expertise to the final
                result.
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 group hover:bg-white/10 transition-colors">
              <div className="mb-4 p-3 bg-gradient-to-br from-cyan-400/20 to-pink-500/20 rounded-full w-fit">
                <Check className="h-6 w-6 text-cyan-400" />
              </div>
              <h3 className="text-xl font-bold mb-3 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-pink-500 group-hover:via-purple-500 group-hover:to-cyan-400 transition-colors">
                Source Citations
              </h3>
              <p className="text-gray-400">
                Every piece of information is backed by verifiable sources, providing transparency and trust in your
                research.
              </p>
            </div>
          </div>

          <div className="max-w-4xl mx-auto mb-20">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-8">
              <h2 className="text-2xl md:text-3xl font-bold mb-6 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 bg-clip-text text-transparent">
                Feature Comparison
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="py-4 px-2 text-left">Feature</th>
                      <th className="py-4 px-2 text-center">Basic</th>
                      <th className="py-4 px-2 text-center">Pro</th>
                      <th className="py-4 px-2 text-center">Enterprise</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-white/10">
                      <td className="py-4 px-2">AI Research</td>
                      <td className="py-4 px-2 text-center">
                        <Check className="h-5 w-5 text-pink-500 mx-auto" />
                      </td>
                      <td className="py-4 px-2 text-center">
                        <Check className="h-5 w-5 text-purple-500 mx-auto" />
                      </td>
                      <td className="py-4 px-2 text-center">
                        <Check className="h-5 w-5 text-cyan-400 mx-auto" />
                      </td>
                    </tr>
                    <tr className="border-b border-white/10">
                      <td className="py-4 px-2">Knowledge Graph</td>
                      <td className="py-4 px-2 text-center">
                        <Check className="h-5 w-5 text-pink-500 mx-auto" />
                      </td>
                      <td className="py-4 px-2 text-center">
                        <Check className="h-5 w-5 text-purple-500 mx-auto" />
                      </td>
                      <td className="py-4 px-2 text-center">
                        <Check className="h-5 w-5 text-cyan-400 mx-auto" />
                      </td>
                    </tr>
                    <tr className="border-b border-white/10">
                      <td className="py-4 px-2">Advanced Fact Verification</td>
                      <td className="py-4 px-2 text-center">-</td>
                      <td className="py-4 px-2 text-center">
                        <Check className="h-5 w-5 text-purple-500 mx-auto" />
                      </td>
                      <td className="py-4 px-2 text-center">
                        <Check className="h-5 w-5 text-cyan-400 mx-auto" />
                      </td>
                    </tr>
                    <tr className="border-b border-white/10">
                      <td className="py-4 px-2">Priority Processing</td>
                      <td className="py-4 px-2 text-center">-</td>
                      <td className="py-4 px-2 text-center">
                        <Check className="h-5 w-5 text-purple-500 mx-auto" />
                      </td>
                      <td className="py-4 px-2 text-center">
                        <Check className="h-5 w-5 text-cyan-400 mx-auto" />
                      </td>
                    </tr>
                    <tr className="border-b border-white/10">
                      <td className="py-4 px-2">Custom Data Sources</td>
                      <td className="py-4 px-2 text-center">-</td>
                      <td className="py-4 px-2 text-center">-</td>
                      <td className="py-4 px-2 text-center">
                        <Check className="h-5 w-5 text-cyan-400 mx-auto" />
                      </td>
                    </tr>
                    <tr>
                      <td className="py-4 px-2">API Access</td>
                      <td className="py-4 px-2 text-center">-</td>
                      <td className="py-4 px-2 text-center">-</td>
                      <td className="py-4 px-2 text-center">
                        <Check className="h-5 w-5 text-cyan-400 mx-auto" />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-6 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 bg-clip-text text-transparent">
              Ready to Redefine Your Research Process?
            </h2>
            <p className="text-lg text-gray-300 mb-8">
              Sign up now and turn your toughest questions into comprehensive insights.
            </p>
            <Button className="bg-gradient-to-r from-pink-500 to-cyan-400 text-white px-8 py-6 text-lg group relative overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-cyan-400/30">
              <Sparkles className="h-5 w-5 mr-2 transition-all duration-300 group-hover:rotate-12 relative z-10 text-white group-hover:text-gray-900" />
              <span className="relative z-10">Get Started Now</span>
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-pink-500 opacity-0 group-hover:opacity-100 transition-all duration-500 -z-10"></div>
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}

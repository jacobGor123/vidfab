"use client"

import { useState, useEffect } from "react"
import { Navbar } from "@/components/navbar"
import { SpaceBackground } from "@/components/space-background"
import { LoadingState } from "@/components/loading-state"
import { SkeletonLoader } from "@/components/skeleton-loader"
import { Brain, Search, BookOpen, ArrowRight, CheckCircle } from "lucide-react"

export default function HowItWorksPage() {
  const [loading, setLoading] = useState(true)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }

    window.addEventListener("scroll", handleScroll)

    //* Simulate loading
    const timer = setTimeout(() => {
      setLoading(false)
    }, 1750)

    return () => {
      window.removeEventListener("scroll", handleScroll)
      clearTimeout(timer)
    }
  }, [])

  if (loading) {
    return (
      <section className="relative min-h-screen overflow-hidden bg-black text-white">
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
            </div>
          </div>
        </div>
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-50">
          <LoadingState message="Loading How It Works..." />
        </div>
      </section>
    )
  }

  return (
    <section className="relative min-h-screen overflow-hidden bg-black text-white">
      <SpaceBackground />
      <Navbar scrolled={scrolled} />
      <main>
        <div className="container mx-auto px-4 pt-32 pb-20">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 bg-clip-text text-transparent">
              How Our AI Research Process Works
            </h1>
            <p className="text-lg text-gray-300">
              Follow your query's journey through our sophisticated, multi-stage AI workflow to see how we deliver
              comprehensive, accurate, and structured results.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-20">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 to-pink-300" />
              <div className="mb-4 p-3 bg-pink-500/20 rounded-full w-fit">
                <Brain className="h-6 w-6 text-pink-500" />
              </div>
              <h3 className="text-xl font-bold mb-3">AI Researcher</h3>
              <p className="text-gray-400 mb-4">
                Our primary AI researcher analyzes your query, breaks it down into components, and formulates a research
                strategy.
              </p>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-pink-500 mr-2 shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-300">Query analysis and decomposition</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-pink-500 mr-2 shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-300">Research strategy formulation</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-pink-500 mr-2 shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-300">Initial knowledge assessment</span>
                </li>
              </ul>
              <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight className="h-5 w-5 text-pink-500" />
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-purple-300" />
              <div className="mb-4 p-3 bg-purple-500/20 rounded-full w-fit">
                <Search className="h-6 w-6 text-purple-500" />
              </div>
              <h3 className="text-xl font-bold mb-3">Search Engine</h3>
              <p className="text-gray-400 mb-4">
                Our specialized search tool gathers information from various sources, filtering and prioritizing
                relevant data.
              </p>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-purple-500 mr-2 shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-300">Multi-source information gathering</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-purple-500 mr-2 shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-300">Relevance filtering and ranking</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-purple-500 mr-2 shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-300">Data extraction and organization</span>
                </li>
              </ul>
              <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight className="h-5 w-5 text-purple-500" />
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-cyan-300" />
              <div className="mb-4 p-3 bg-cyan-400/20 rounded-full w-fit">
                <BookOpen className="h-6 w-6 text-cyan-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">Senior Researcher</h3>
              <p className="text-gray-400 mb-4">
                Our senior researcher synthesizes findings, validates information, and structures the final report.
              </p>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-cyan-400 mr-2 shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-300">Information synthesis and validation</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-cyan-400 mr-2 shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-300">Structured report generation</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-cyan-400 mr-2 shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-300">Quality assurance and fact-checking</span>
                </li>
              </ul>
              <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight className="h-5 w-5 text-cyan-400" />
              </div>
            </div>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-8">
              <h2 className="text-2xl md:text-3xl font-bold mb-6 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 bg-clip-text text-transparent">
                The Research Journey
              </h2>

              <div className="space-y-8">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-shrink-0 flex items-start">
                    <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center">
                      <span className="text-pink-500 font-bold">1</span>
                    </div>
                    <div className="ml-4 h-full w-px bg-gradient-to-b from-pink-500 to-purple-500 hidden md:block"></div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">Query Submission</h3>
                    <p className="text-gray-400">
                      You submit your research query through our intuitive interface. Our system immediately begins
                      processing your request, breaking it down into key components and research areas.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-shrink-0 flex items-start">
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <span className="text-purple-500 font-bold">2</span>
                    </div>
                    <div className="ml-4 h-full w-px bg-gradient-to-b from-purple-500 to-cyan-400 hidden md:block"></div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">Multi-Stage Processing</h3>
                    <p className="text-gray-400">
                      Your query passes through our three specialized AI agents: the AI Researcher for initial analysis,
                      the Search Engine for data gathering, and the Senior Researcher for synthesis and validation.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-shrink-0 flex items-start">
                    <div className="w-10 h-10 rounded-full bg-cyan-400/20 flex items-center justify-center">
                      <span className="text-cyan-400 font-bold">3</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">Results Delivery</h3>
                    <p className="text-gray-400">
                      The final results are delivered as a dynamic knowledge graph and a structured report, complete
                      with citations and visual aids to enhance understanding.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </section>
  )
}

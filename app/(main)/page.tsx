"use client"

import { useState, useEffect } from "react"
import { Navbar } from "@/components/navbar"
import { Hero } from "@/components/hero"
import { WorkflowSection } from "@/components/workflow-section"
import { FeaturesSection } from "@/components/features-section"
import { KnowledgeGraphVisualization } from "@/components/features/knowledge-graph-visualization"
import { LoadingState } from "@/components/loading-state"
import { SkeletonLoader } from "@/components/skeleton-loader"

export default function Home() {
  const [scrolled, setScrolled] = useState(false)
  const [resultReady, setResultReady] = useState(false)
  const [queryInput, setQueryInput] = useState("")
  const [loading, setLoading] = useState(true)

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

  const handleQuerySubmit = (query: string) => {
    setQueryInput(query)
    // Simulate processing time
    setTimeout(() => {
      setResultReady(true)
      setQueryInput(query)
    }, 3000)
  }

  if (loading) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-black text-white">
        <div className="absolute top-0 left-0 right-0 z-50">
          <Navbar scrolled={scrolled} />
        </div>
        {/* Keep the existing SkeletonLoader structure for the page content */}
        <div className="container mx-auto px-4 pt-32 pb-20">
          <div className="max-w-4xl mx-auto text-center">
            <SkeletonLoader type="title" className="mx-auto mb-6" />
            <SkeletonLoader type="text" count={3} className="mx-auto mb-12" />

            <div className="max-w-3xl mx-auto relative">
              <SkeletonLoader type="text" className="h-16 rounded-lg mb-10" />
            </div>

            <div className="flex flex-wrap justify-center gap-4 mb-20">
              <SkeletonLoader className="h-10 w-40 rounded-full" />
              <SkeletonLoader className="h-10 w-40 rounded-full" />
              <SkeletonLoader className="h-10 w-40 rounded-full" />
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <SkeletonLoader type="card" />
              <SkeletonLoader type="card" />
              <SkeletonLoader type="card" />
            </div>
          </div>
        </div>
        {/* Updated LoadingState message */}
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-50">
          <LoadingState message="Initializing NeuralArchive Platform..." />
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      {/* Navbar - Fixed positioning for overlay */}
      <div className="absolute top-0 left-0 right-0 z-50">
        <Navbar scrolled={scrolled} />
      </div>

      <main>
        {/* Hero - Full screen */}
        <div className="relative min-h-screen">
          <Hero onQuerySubmit={handleQuerySubmit} />
        </div>

        {/* Content sections */}
        <div className="relative z-10 bg-black">
          <div className="container mx-auto px-4 py-20">
            {resultReady && queryInput ? (
              <KnowledgeGraphVisualization
                query={queryInput}
                onNewSearch={() => {
                  setResultReady(false)
                  setQueryInput("")
                }}
              />
            ) : (
              <>
                <WorkflowSection />
                <FeaturesSection />
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

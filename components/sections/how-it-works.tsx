"use client"

import { useState, useEffect, useCallback } from "react"
import { LazyVideo } from "@/components/common/lazy-video"
import { cn } from "@/lib/utils"
import { FileText, MousePointerClick, Sparkles, Download } from "lucide-react"

export interface Step {
  id: string
  number: string
  title: string
  description: string
  video: string
  icon: React.ComponentType<{ className?: string }>
}

const defaultSteps: Step[] = [
  {
    id: "step-1",
    number: "1",
    title: "Enter your scripts",
    description: "Type or paste your video script, ideas, or descriptions. Be as detailed or simple as you like.",
    video: "/placeholder/how-it-works-step-1.mp4",
    icon: FileText,
  },
  {
    id: "step-2",
    number: "2",
    title: "Click the button to generate",
    description: "Hit the generate button and let our AI start processing your creative vision.",
    video: "/placeholder/how-it-works-step-2.mp4",
    icon: MousePointerClick,
  },
  {
    id: "step-3",
    number: "3",
    title: "Process with AI",
    description: "Our powerful AI models analyze your input and generate high-quality video content in seconds.",
    video: "/placeholder/how-it-works-step-3.mp4",
    icon: Sparkles,
  },
  {
    id: "step-4",
    number: "4",
    title: "View the video online and download for use",
    description: "Preview your generated video, make adjustments if needed, and download for immediate use.",
    video: "/placeholder/how-it-works-step-4.mp4",
    icon: Download,
  },
]

interface HowItWorksProps {
  steps?: Step[]
  className?: string
  autoPlayInterval?: number
  subtitle?: string
}

export function HowItWorks({ steps = defaultSteps, className, autoPlayInterval = 5000, subtitle }: HowItWorksProps) {
  const [activeStep, setActiveStep] = useState(steps[0].id)
  const [isUserInteracting, setIsUserInteracting] = useState(false)

  useEffect(() => {
    if (isUserInteracting) return

    const interval = setInterval(() => {
      const currentIndex = steps.findIndex((step) => step.id === activeStep)
      const nextIndex = (currentIndex + 1) % steps.length
      setActiveStep(steps[nextIndex].id)
    }, autoPlayInterval)

    return () => clearInterval(interval)
  }, [activeStep, autoPlayInterval, isUserInteracting, steps])

  const handleUserInteraction = useCallback(() => {
    setIsUserInteracting(true)
    const timeout = setTimeout(() => {
      setIsUserInteracting(false)
    }, 10000)
    return () => clearTimeout(timeout)
  }, [])

  const handleStepChange = (stepId: string) => {
    setActiveStep(stepId)
    handleUserInteraction()
  }

  const activeStepData = steps.find((step) => step.id === activeStep) || steps[0]

  return (
    <section className={cn("py-20 relative overflow-hidden bg-black", className)}>
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-heading font-extrabold mb-4 text-white">
            How It Works
          </h2>
          {subtitle && (
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              {subtitle}
            </p>
          )}
        </div>

        <div className="grid lg:grid-cols-2 gap-12 max-w-7xl mx-auto lg:items-center">
          {/* Left: Compact Steps */}
          <div className="order-2 lg:order-1 space-y-2">
            {steps.map((step) => {
              const Icon = step.icon
              const isActive = activeStep === step.id

              return (
                <div
                  key={step.id}
                  className={cn(
                    "rounded-lg border-2 transition-all duration-300 cursor-pointer",
                    isActive
                      ? "border-brand-purple-DEFAULT bg-brand-gray-800/70 shadow-xl p-6"
                      : "border-brand-gray-700 bg-brand-gray-900/50 hover:border-brand-gray-600 p-4"
                  )}
                  onClick={() => handleStepChange(step.id)}
                >
                  <div className="flex items-center gap-4">
                    {/* Number Badge */}
                    <div
                      className={cn(
                        "flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all",
                        isActive
                          ? "bg-gradient-to-r from-brand-purple-DEFAULT to-brand-pink-DEFAULT text-white scale-110"
                          : "bg-brand-gray-800 text-gray-400"
                      )}
                    >
                      {step.number}
                    </div>

                    {/* Title & Icon */}
                    <div className="flex-1 min-w-0">
                      <h3
                        className={cn(
                          "font-semibold transition-colors",
                          isActive ? "text-white text-lg" : "text-gray-300 text-base"
                        )}
                      >
                        {step.title}
                      </h3>
                    </div>

                    {/* Icon */}
                    <Icon
                      className={cn(
                        "flex-shrink-0 w-6 h-6 transition-all",
                        isActive ? "text-brand-purple-DEFAULT" : "text-gray-600"
                      )}
                    />
                  </div>

                  {/* Expandable Description - Only for active step */}
                  {isActive && (
                    <div className="mt-4 pl-16 pr-10">
                      <p className="text-gray-300 text-sm leading-relaxed animate-in fade-in slide-in-from-top-2 duration-300">
                        {step.description}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Right: Video */}
          <div className="order-1 lg:order-2">
            <div className="lg:sticky lg:top-24">
              <div className="relative aspect-video rounded-xl overflow-hidden border-2 border-brand-gray-700 bg-brand-gray-900/50 shadow-2xl">
                <LazyVideo
                  key={activeStepData.id}
                  src={activeStepData.video}
                  alt={activeStepData.title}
                  className="absolute inset-0"
                  autoPlay={true}
                  loop={true}
                  muted={true}
                />

                {/* Minimal Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

                {/* Step Badge */}
                <div className="absolute top-6 right-6 pointer-events-none">
                  <div className="px-4 py-2 rounded-full bg-black/70 backdrop-blur-sm border border-white/20">
                    <span className="text-white text-sm font-semibold">
                      Step {activeStepData.number} of {steps.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-6 bg-brand-gray-800 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-brand-purple-DEFAULT to-brand-pink-DEFAULT transition-all duration-500"
                  style={{
                    width: `${((steps.findIndex((s) => s.id === activeStep) + 1) / steps.length) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-brand-purple-DEFAULT/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-brand-cyan-DEFAULT/10 rounded-full blur-3xl pointer-events-none" />
    </section>
  )
}

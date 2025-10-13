"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel"
import { cn } from "@/lib/utils"
import { FileText, MousePointerClick, Sparkles, Download, Upload, ImageIcon } from "lucide-react"

export interface Step {
  id: string
  number: string
  title: string
  description: string
  image: string
  icon: React.ComponentType<{ className?: string }>
}

const defaultSteps: Step[] = [
  {
    id: "step-1",
    number: "1",
    title: "Enter your scripts",
    description: "Type or paste your video script, ideas, or descriptions. Be as detailed or simple as you like.",
    image: "/placeholder/how-it-works-step-1.jpg",
    icon: FileText,
  },
  {
    id: "step-2",
    number: "2",
    title: "Click the button to generate",
    description: "Hit the generate button and let our AI start processing your creative vision.",
    image: "/placeholder/how-it-works-step-2.jpg",
    icon: MousePointerClick,
  },
  {
    id: "step-3",
    number: "3",
    title: "Process with AI",
    description: "Our powerful AI models analyze your input and generate high-quality video content in seconds.",
    image: "/placeholder/how-it-works-step-3.jpg",
    icon: Sparkles,
  },
  {
    id: "step-4",
    number: "4",
    title: "View the video online and download for use",
    description: "Preview your generated video, make adjustments if needed, and download for immediate use.",
    image: "/placeholder/how-it-works-step-4.jpg",
    icon: Download,
  },
]

interface HowItWorksProps {
  steps?: Step[]
  className?: string
  autoPlayInterval?: number
}

export function HowItWorks({ steps = defaultSteps, className, autoPlayInterval = 5000 }: HowItWorksProps) {
  const [activeStep, setActiveStep] = useState(steps[0].id)
  const [carouselApi, setCarouselApi] = useState<CarouselApi>()
  const [isUserInteracting, setIsUserInteracting] = useState(false)

  // Sync carousel with active tab
  useEffect(() => {
    if (!carouselApi) return

    const stepIndex = steps.findIndex((step) => step.id === activeStep)
    if (stepIndex !== -1) {
      carouselApi.scrollTo(stepIndex)
    }
  }, [activeStep, carouselApi])

  // Auto-play functionality
  useEffect(() => {
    if (isUserInteracting) return

    const interval = setInterval(() => {
      const currentIndex = steps.findIndex((step) => step.id === activeStep)
      const nextIndex = (currentIndex + 1) % steps.length
      setActiveStep(steps[nextIndex].id)
    }, autoPlayInterval)

    return () => clearInterval(interval)
  }, [activeStep, autoPlayInterval, isUserInteracting])

  // Handle user interaction - pause auto-play temporarily
  const handleUserInteraction = useCallback(() => {
    setIsUserInteracting(true)

    // Resume auto-play after 10 seconds of inactivity
    const timeout = setTimeout(() => {
      setIsUserInteracting(false)
    }, 10000)

    return () => clearTimeout(timeout)
  }, [])

  const handleTabChange = (value: string) => {
    setActiveStep(value)
    handleUserInteraction()
  }

  return (
    <section className={cn("py-20 relative overflow-hidden bg-black", className)}>
      <div className="container mx-auto px-4">
        {/* Title */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-heading font-extrabold mb-4 text-white">
            How It Works
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Create professional videos in four simple steps
          </p>
        </div>

        {/* Content Grid - Mobile: Stack, Desktop: Side by Side */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 max-w-7xl mx-auto lg:items-center">
          {/* Left: Steps Tabs */}
          <div className="order-2 lg:order-1">
            <Tabs value={activeStep} onValueChange={handleTabChange} className="w-full">
              <TabsList className="hidden">
                {steps.map((step) => (
                  <TabsTrigger key={step.id} value={step.id}>
                    {step.title}
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* Custom Tab Navigation */}
              <div className="space-y-4">
                {steps.map((step, index) => {
                  const Icon = step.icon
                  const isActive = activeStep === step.id

                  return (
                    <Card
                      key={step.id}
                      className={cn(
                        "cursor-pointer transition-all duration-300 border-2",
                        "hover:border-brand-purple-DEFAULT/50 hover:bg-brand-gray-800/50",
                        isActive
                          ? "border-brand-purple-DEFAULT bg-brand-gray-800/70 shadow-xl"
                          : "border-brand-gray-700 bg-brand-gray-900/50"
                      )}
                      onClick={() => handleTabChange(step.id)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          {/* Step Number & Icon */}
                          <div className="flex-shrink-0">
                            <div
                              className={cn(
                                "w-12 h-12 rounded-full flex items-center justify-center",
                                "transition-all duration-300",
                                isActive
                                  ? "bg-gradient-to-r from-brand-purple-DEFAULT to-brand-pink-DEFAULT"
                                  : "bg-brand-gray-800"
                              )}
                            >
                              <Icon
                                className={cn(
                                  "w-6 h-6 transition-colors",
                                  isActive ? "text-white" : "text-gray-400"
                                )}
                              />
                            </div>
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span
                                className={cn(
                                  "text-sm font-bold",
                                  isActive ? "text-brand-purple-DEFAULT" : "text-gray-500"
                                )}
                              >
                                STEP {step.number}
                              </span>
                            </div>
                            <h3
                              className={cn(
                                "text-lg font-semibold mb-2 transition-colors",
                                isActive ? "text-white" : "text-gray-300"
                              )}
                            >
                              {step.title}
                            </h3>
                            <p
                              className={cn(
                                "text-sm transition-colors leading-relaxed",
                                isActive ? "text-gray-300" : "text-gray-500"
                              )}
                            >
                              {step.description}
                            </p>
                          </div>

                          {/* Active Indicator */}
                          {isActive && (
                            <div className="flex-shrink-0">
                              <div className="w-2 h-2 rounded-full bg-brand-purple-DEFAULT animate-pulse" />
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </Tabs>
          </div>

          {/* Right: Carousel */}
          <div className="order-1 lg:order-2">
            <div>
              <Carousel
                setApi={setCarouselApi}
                opts={{
                  align: "start",
                  loop: true,
                }}
                className="w-full"
              >
                <CarouselContent>
                  {steps.map((step) => (
                    <CarouselItem key={step.id}>
                      <div className="relative aspect-video rounded-xl overflow-hidden border-2 border-brand-gray-700 bg-brand-gray-900/50">
                        <Image
                          src={step.image}
                          alt={step.title}
                          fill
                          className="object-cover"
                          sizes="(max-width: 1024px) 100vw, 50vw"
                          priority={step.id === steps[0].id}
                        />

                        {/* Image Overlay with Step Info */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-6">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                              <span className="text-white font-bold text-sm">{step.number}</span>
                            </div>
                            <h4 className="text-white font-semibold text-lg">{step.title}</h4>
                          </div>
                        </div>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>

              {/* Progress Indicators */}
              <div className="flex justify-center gap-2 mt-6">
                {steps.map((step) => (
                  <button
                    key={step.id}
                    onClick={() => handleTabChange(step.id)}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-300",
                      activeStep === step.id
                        ? "w-8 bg-gradient-to-r from-brand-purple-DEFAULT to-brand-pink-DEFAULT"
                        : "w-1.5 bg-brand-gray-700 hover:bg-brand-gray-600"
                    )}
                    aria-label={`Go to ${step.title}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Background Decoration */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-brand-purple-DEFAULT/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-brand-cyan-DEFAULT/10 rounded-full blur-3xl pointer-events-none" />
    </section>
  )
}

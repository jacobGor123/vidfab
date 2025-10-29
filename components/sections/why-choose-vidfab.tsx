"use client"

import { cn } from "@/lib/utils"
import { Sparkles, Settings, Target, DollarSign, Globe, CheckCircle, ArrowRight } from "lucide-react"
import Link from "next/link"

interface ReasonItem {
  icon: React.ReactNode
  title: string
  description: string
  linkText?: string
  linkUrl?: string
}

interface WhyChooseVidFabProps {
  title?: string
  reasons?: ReasonItem[]
  className?: string
}

const defaultReasons: ReasonItem[] = [
  {
    icon: <Sparkles className="h-5 w-5" />,
    title: "AI-Powered Simplicity",
    description: "Achieve video creation with just a few clicks."
  },
  {
    icon: <Settings className="h-5 w-5" />,
    title: "Multiple Creation Options",
    description: "Generate videos with texts, images, or AI effects. Select the method that best suits your needs."
  },
  {
    icon: <Target className="h-5 w-5" />,
    title: "Perfect for Every Purpose",
    description: "Whether for marketing, demos, or personal social use, VidFab makes it easy."
  },
  {
    icon: <DollarSign className="h-5 w-5" />,
    title: "Affordable Solutions with Clear Pricing",
    description: "Access high-quality results at a budget-friendly price, with no hidden fees.",
    linkText: "Pricing",
    linkUrl: "/pricing"
  },
  {
    icon: <Globe className="h-5 w-5" />,
    title: "No Downloads Needed",
    description: "Create videos directly from your browser."
  }
]

export function WhyChooseVidFab({
  title = "Why Choose VidFab?",
  reasons = defaultReasons,
  className
}: WhyChooseVidFabProps) {
  return (
    <section className={cn("py-20", className)}>
      <div className="container mx-auto px-4">
        {/* Two Column Layout - 方案 2 */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center max-w-7xl mx-auto">

          {/* Left Column - Heading & Intro */}
          <div className="text-center lg:text-left">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-heading font-extrabold mb-6 text-white leading-tight">
              {title}
            </h2>

            <p className="text-lg md:text-xl text-gray-300 leading-relaxed mb-8">
              VidFab combines cutting-edge AI technology with user-friendly design to deliver professional video creation at your fingertips.
            </p>

            {/* Feature Highlights */}
            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3 text-gray-200">
                <CheckCircle className="h-6 w-6 text-brand-purple-DEFAULT flex-shrink-0" />
                <span className="text-base">Trusted by 10,000+ creators worldwide</span>
              </div>
              <div className="flex items-center gap-3 text-gray-200">
                <CheckCircle className="h-6 w-6 text-brand-purple-DEFAULT flex-shrink-0" />
                <span className="text-base">Generate videos in minutes, not hours</span>
              </div>
              <div className="flex items-center gap-3 text-gray-200">
                <CheckCircle className="h-6 w-6 text-brand-purple-DEFAULT flex-shrink-0" />
                <span className="text-base">Enterprise-grade security & privacy</span>
              </div>
            </div>

            {/* CTA Button */}
            <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
              <Link
                href="/create"
                className="group inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#8A2BE2] to-[#00E5E5] text-white text-lg font-bold rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
              >
                <Sparkles className="h-5 w-5 group-hover:rotate-12 transition-transform duration-300" />
                Start for Free
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
              </Link>
            </div>
          </div>

          {/* Right Column - Reasons List */}
          <div className="space-y-6">
            {reasons.map((reason, index) => (
              <div
                key={index}
                className={cn(
                  "group relative",
                  "bg-brand-gray-800/50 backdrop-blur-md border border-brand-gray-700",
                  "rounded-xl p-6 shadow-apple-soft",
                  "transition-all duration-300 ease-apple",
                  "hover:bg-brand-gray-700/70 hover:shadow-apple-medium hover:border-brand-purple-DEFAULT/50",
                  "hover:translate-x-2"
                )}
              >
                {/* Timeline Dot */}
                <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-brand-purple-DEFAULT rounded-full border-4 border-black opacity-0 lg:opacity-100" />

                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="flex-shrink-0 p-3 rounded-lg bg-gradient-to-br from-brand-purple-DEFAULT/20 to-brand-pink-DEFAULT/20 group-hover:from-brand-purple-DEFAULT/30 group-hover:to-brand-pink-DEFAULT/30 transition-all duration-300">
                    <div className="text-brand-purple-DEFAULT">
                      {reason.icon}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <h3 className="text-lg font-heading font-semibold text-white mb-2 group-hover:text-brand-purple-DEFAULT transition-colors">
                      {reason.title}
                    </h3>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {reason.description}
                      {reason.linkText && reason.linkUrl && (
                        <>
                          {" "}
                          <Link
                            href={reason.linkUrl}
                            className="text-brand-purple-DEFAULT hover:text-brand-pink-DEFAULT transition-colors underline decoration-brand-purple-DEFAULT/50 hover:decoration-brand-pink-DEFAULT underline-offset-2 font-medium"
                          >
                            {reason.linkText}
                          </Link>
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

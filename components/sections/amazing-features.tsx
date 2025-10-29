"use client"

import { Users, Zap, Clock, FolderOpen, Cpu, Shield } from "lucide-react"
import { cn } from "@/lib/utils"

interface FeatureItem {
  number: string
  title: string
  description: string
  highlighted?: boolean
}

interface AmazingFeaturesProps {
  title: string
  features: FeatureItem[]
  className?: string
}

// 根据特性编号返回对应图标
const getFeatureIcon = (number: string) => {
  const icons: Record<string, React.ReactNode> = {
    "1": <Users className="h-6 w-6" />,
    "2": <Zap className="h-6 w-6" />,
    "3": <Clock className="h-6 w-6" />,
    "4": <FolderOpen className="h-6 w-6" />,
    "5": <Cpu className="h-6 w-6" />,
    "6": <Shield className="h-6 w-6" />
  }
  return icons[number] || <Zap className="h-6 w-6" />
}

export function AmazingFeatures({
  title,
  features,
  className
}: AmazingFeaturesProps) {
  return (
    <section className={cn("py-20", className)}>
      <div className="container mx-auto px-4">
        <div className="mx-auto text-center mb-16">
          <h2
            className="text-4xl md:text-5xl font-heading font-extrabold mb-6 text-white"
          >
            {title}
          </h2>
        </div>

        <div className="flex flex-wrap justify-center gap-8 mx-auto max-w-7xl">
          {features.map((feature, index) => (
            <div
              key={index}
              className={cn(
                "w-full md:w-[calc(50%-1rem)] lg:w-[calc(33.333%-1.5rem)] md:max-w-[400px]",
                "bg-brand-gray-800/70 backdrop-blur-md border border-brand-gray-700",
                "rounded-xl p-4 sm:p-6 shadow-apple-soft transition-all duration-300 ease-apple",
                "hover:bg-brand-gray-700/90 hover:shadow-apple-medium hover:border-brand-purple-DEFAULT/30",
                "group",
                feature.highlighted && "border-brand-purple-DEFAULT/50"
              )}
            >
              {/* Icon */}
              <div className={cn(
                "mb-5 p-3.5 rounded-full w-fit",
                feature.highlighted
                  ? "bg-gradient-to-br from-brand-purple-DEFAULT/25 to-brand-pink-DEFAULT/25"
                  : "bg-gradient-to-br from-brand-pink-DEFAULT/15 to-brand-purple-DEFAULT/15"
              )}>
                <div className={cn(
                  feature.highlighted ? "text-brand-purple-DEFAULT" : "text-brand-pink-DEFAULT"
                )}>
                  {getFeatureIcon(feature.number)}
                </div>
              </div>

              {/* Content */}
              <h3 className="text-xl font-heading font-semibold mb-3 text-gray-100">
                {feature.title}
              </h3>
              <p className="text-gray-300 text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
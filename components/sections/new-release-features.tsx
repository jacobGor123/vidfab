"use client"

import Link from "next/link"
import Image from "next/image"
import { ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface NewReleaseFeaturesProps {
  className?: string
}

export function NewReleaseFeatures({ className }: NewReleaseFeaturesProps) {
  return (
    <section className={cn("py-20", className)}>
      <div className="container mx-auto px-4">
        {/* 渐变边框容器 */}
        <div className="relative mx-auto max-w-7xl">
          {/* 渐变边框效果 */}
          <div className="absolute inset-0 bg-gradient-to-r from-brand-purple-DEFAULT via-brand-pink-DEFAULT to-brand-purple-DEFAULT rounded-2xl blur-sm opacity-40" />

          {/* 主容器 */}
          <div className="relative bg-gradient-to-br from-brand-gray-800/95 to-brand-gray-900/95 backdrop-blur-xl border border-brand-purple-DEFAULT/30 rounded-2xl p-8 md:p-12 shadow-2xl">
            {/* 标题区域 */}
            <div className="mx-auto text-center mb-12">
              {/* 主标题 - 使用统一样式 */}
              <h2 className="text-4xl md:text-5xl font-heading font-extrabold text-white">
                Enhanced Video Creation with Integrated Image Generation!
              </h2>
            </div>

            {/* 功能卡片区域 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
              {/* Text to Image 卡片 */}
              <div className="group relative bg-brand-gray-900/50 backdrop-blur-md border border-brand-gray-700 rounded-xl p-6 md:p-8 transition-all duration-300 ease-apple hover:border-brand-purple-DEFAULT/50 hover:shadow-[0_0_30px_rgba(168,85,247,0.3)] hover:scale-[1.02]">
                {/* Icon */}
                <div className="mb-6 p-3 rounded-full w-fit bg-gradient-to-br from-brand-purple-DEFAULT/20 to-brand-pink-DEFAULT/20">
                  <Image
                    src="/logo/text-to-image.svg"
                    alt="Text to Image"
                    width={24}
                    height={24}
                    className="w-6 h-6"
                  />
                </div>

                {/* Content */}
                <h3 className="text-2xl font-heading font-bold mb-4 text-white">
                  Text to Image
                </h3>
                <p className="text-gray-300 text-base leading-relaxed mb-6">
                  Create high-quality visuals from text prompts in seconds, perfect for concepts and creative projects.
                </p>

                {/* CTA Button */}
                <Link
                  href="/text-to-image"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-brand-purple-DEFAULT to-brand-pink-DEFAULT text-white font-semibold text-sm transition-all duration-300 ease-apple hover:shadow-[0_0_20px_rgba(168,85,247,0.6)] hover:scale-105 group/btn"
                >
                  Try it now
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
                </Link>
              </div>

              {/* Image to Image 卡片 */}
              <div className="group relative bg-brand-gray-900/50 backdrop-blur-md border border-brand-gray-700 rounded-xl p-6 md:p-8 transition-all duration-300 ease-apple hover:border-brand-purple-DEFAULT/50 hover:shadow-[0_0_30px_rgba(168,85,247,0.3)] hover:scale-[1.02]">
                {/* Icon */}
                <div className="mb-6 p-3 rounded-full w-fit bg-gradient-to-br from-brand-pink-DEFAULT/20 to-brand-purple-DEFAULT/20">
                  <Image
                    src="/logo/image-to-image.svg"
                    alt="Image to Image"
                    width={24}
                    height={24}
                    className="w-6 h-6"
                  />
                </div>

                {/* Content */}
                <h3 className="text-2xl font-heading font-bold mb-4 text-white">
                  Image to Image
                </h3>
                <p className="text-gray-300 text-base leading-relaxed mb-6">
                  Reimagine your images with AI—apply new styles, enhance details, or generate fresh variations effortlessly.
                </p>

                {/* CTA Button */}
                <Link
                  href="/image-to-image"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-brand-purple-DEFAULT to-brand-pink-DEFAULT text-white font-semibold text-sm transition-all duration-300 ease-apple hover:shadow-[0_0_20px_rgba(168,85,247,0.6)] hover:scale-105 group/btn"
                >
                  Try it now
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

"use client"

import { cn } from "@/lib/utils"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { Quote } from "lucide-react"

interface Testimonial {
  quote: string
  author: string
  role: string
}

interface UserTestimonialsProps {
  title?: string
  testimonials?: Testimonial[]
  className?: string
}

const defaultTestimonials: Testimonial[] = [
  {
    quote: "VidFab is the easiest way to create videos from text or image. It saves us hours of work while delivering professional-quality results.",
    author: "Alex M.",
    role: "Marketing Manager"
  },
  {
    quote: "This tool transformed my content strategy. As a small business owner, I needed an affordable way to make professional videos—and VidFab delivered.",
    author: "Jessica L.",
    role: "Entrepreneur"
  },
  {
    quote: "VidFab has made turning my raw footage into epic vlogs a matter of minutes. I can also quickly transform my amazing ideas into visual videos, which was much more difficult to do in the past.",
    author: "Sarah K.",
    role: "Vlogger"
  }
]

export function UserTestimonials({
  title = "User Testimonials",
  testimonials = defaultTestimonials,
  className
}: UserTestimonialsProps) {
  return (
    <section className={cn("py-20", className)}>
      <div className="container mx-auto px-4">
        {/* Title */}
        <div className="mx-auto text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-heading font-extrabold mb-6 text-white">
            {title}
          </h2>
        </div>

        {/* Carousel */}
        <Carousel
          opts={{
            align: "start",
            loop: true,
          }}
          className="w-full"
        >
          <CarouselContent>
              {testimonials.map((testimonial, index) => (
                <CarouselItem key={index}>
                  <div className="p-1">
                    <div className="bg-brand-gray-800/70 backdrop-blur-md border border-brand-gray-700 rounded-xl p-8 sm:p-12 shadow-apple-soft transition-all duration-300 ease-apple hover:bg-brand-gray-700/90 hover:shadow-apple-medium">
                      {/* Quote Icon */}
                      <div className="mb-6">
                        <Quote className="h-10 w-10 text-brand-purple-DEFAULT opacity-60" />
                      </div>

                      {/* Quote Text */}
                      <blockquote className="text-lg sm:text-xl text-gray-200 italic leading-relaxed mb-8">
                        "{testimonial.quote}"
                      </blockquote>

                      {/* Author */}
                      <div className="border-t border-brand-gray-700 pt-6">
                        <p className="text-xl font-heading font-semibold text-white mb-1">
                          {testimonial.author}
                        </p>
                        <p className="text-gray-400">
                          {testimonial.role}
                        </p>
                      </div>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>

          {/* Navigation Buttons */}
          <CarouselPrevious className="bg-brand-gray-800 border-brand-gray-700 text-white hover:bg-brand-purple-DEFAULT hover:border-brand-purple-DEFAULT" />
          <CarouselNext className="bg-brand-gray-800 border-brand-gray-700 text-white hover:bg-brand-purple-DEFAULT hover:border-brand-purple-DEFAULT" />
        </Carousel>
      </div>
    </section>
  )
}

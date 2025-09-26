"use client"

import { Button } from "@/components/ui/button"
import { Video, Type, ImageIcon } from "lucide-react"

type ToolType = "discover" | "text-to-video" | "image-to-video" | "my-assets" | null

interface EmptyStateProps {
  onToolSelect: (tool: ToolType) => void
}

export function EmptyState({ onToolSelect }: EmptyStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[600px] p-8">
      {/* Animated Illustration */}
      <div className="relative mb-12">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-purple-DEFAULT/20 to-brand-cyan-DEFAULT/20 rounded-full blur-3xl w-64 h-64 -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2"></div>
        
        <div className="relative z-10 flex items-center justify-center w-48 h-48">
          {/* Video Camera Icon */}
          <div className="relative">
            <div className="w-32 h-24 border-2 border-gray-600 rounded-lg flex items-center justify-center bg-gray-800/50">
              <Video className="w-12 h-12 text-gray-400" />
            </div>
            
            {/* Floating Elements */}
            <div className="absolute -top-4 -right-4 w-8 h-8 border border-brand-purple-DEFAULT rounded bg-brand-purple-DEFAULT/10 flex items-center justify-center animate-bounce">
              <Type className="w-4 h-4 text-brand-purple-DEFAULT" />
            </div>
            
            <div className="absolute -bottom-4 -left-4 w-8 h-8 border border-brand-cyan-DEFAULT rounded bg-brand-cyan-DEFAULT/10 flex items-center justify-center animate-bounce [animation-delay:0.5s]">
              <ImageIcon className="w-4 h-4 text-brand-cyan-DEFAULT" />
            </div>
            
            {/* Sparkles */}
            <div className="absolute top-2 left-12 w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <div className="absolute top-8 right-2 w-1 h-1 bg-brand-pink-DEFAULT rounded-full animate-pulse [animation-delay:1s]"></div>
            <div className="absolute bottom-3 left-4 w-1.5 h-1.5 bg-brand-cyan-DEFAULT rounded-full animate-pulse [animation-delay:1.5s]"></div>
          </div>
        </div>
      </div>

      {/* Text Content */}
      <div className="text-center max-w-md mb-8">
        <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
          Start creating your first masterpiece!
        </h2>
        <p className="text-gray-400 text-lg leading-relaxed">
          Transform your ideas into stunning videos with AI. Choose a tool from the sidebar to begin your creative journey.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Button
          onClick={() => onToolSelect("text-to-video")}
          className="bg-gradient-to-r from-brand-purple-DEFAULT to-brand-purple-600 hover:from-brand-purple-600 hover:to-brand-purple-700 text-white px-8 py-3 text-lg font-medium"
        >
          <Type className="w-5 h-5 mr-2" />
          Text to Video
        </Button>
        
        <Button
          onClick={() => onToolSelect("image-to-video")}
          variant="outline"
          className="border-brand-cyan-DEFAULT/50 text-brand-cyan-DEFAULT hover:bg-brand-cyan-DEFAULT/10 px-8 py-3 text-lg font-medium"
        >
          <ImageIcon className="w-5 h-5 mr-2" />
          Image to Video
        </Button>
      </div>

      {/* Feature Hints */}
      <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl">
        <div className="text-center">
          <div className="w-12 h-12 bg-brand-purple-DEFAULT/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <Type className="w-6 h-6 text-brand-purple-DEFAULT" />
          </div>
          <h3 className="font-semibold text-white mb-1">Text to Video</h3>
          <p className="text-sm text-gray-400">Generate videos from text descriptions</p>
        </div>
        
        <div className="text-center">
          <div className="w-12 h-12 bg-brand-cyan-DEFAULT/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <ImageIcon className="w-6 h-6 text-brand-cyan-DEFAULT" />
          </div>
          <h3 className="font-semibold text-white mb-1">Image to Video</h3>
          <p className="text-sm text-gray-400">Convert images to video sequences</p>
        </div>
        
        <div className="text-center">
          <div className="w-12 h-12 bg-brand-pink-DEFAULT/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <Video className="w-6 h-6 text-brand-pink-DEFAULT" />
          </div>
          <h3 className="font-semibold text-white mb-1">AI-Powered</h3>
          <p className="text-sm text-gray-400">Advanced AI models for best results</p>
        </div>
      </div>
    </div>
  )
}
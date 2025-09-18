"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Sparkles, BookOpen, Zap } from "lucide-react"
import { cn } from "@/lib/utils"
import type { VideoHeroItem } from './types/video-hero.types'

interface HeroContentProps {
  currentItem: VideoHeroItem | null
  onQuerySubmit: (query: string) => void
  className?: string
}

const useTypingAnimation = (texts: string[], resetKey?: string) => {
  const [currentTextIndex, setCurrentTextIndex] = useState(0)
  const [currentText, setCurrentText] = useState('')
  const [isTyping, setIsTyping] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isFocused, setIsFocused] = useState(false)

  // 重置动画当resetKey变化时
  useEffect(() => {
    if (resetKey && !isFocused) {
      console.log('🔄 Resetting typing animation for:', resetKey)
      setCurrentText('')
      setCurrentTextIndex(0)
      setIsDeleting(false)
      setIsTyping(true)
    }
  }, [resetKey, isFocused])

  useEffect(() => {
    if (texts.length === 0 || isFocused) return

    const targetText = texts[currentTextIndex]
    
    const timeout = setTimeout(() => {
      if (isDeleting) {
        setCurrentText(prev => prev.slice(0, -1))
        
        if (currentText === '') {
          setIsDeleting(false)
          setCurrentTextIndex(prev => (prev + 1) % texts.length)
        }
      } else {
        setCurrentText(targetText.slice(0, currentText.length + 1))
        
        if (currentText === targetText) {
          // 对于单个文本，不删除，保持显示
          if (texts.length === 1) {
            return
          }
          setTimeout(() => setIsDeleting(true), 2000) // Pause before deleting
          return
        }
      }
    }, isDeleting ? 50 : 100)

    return () => clearTimeout(timeout)
  }, [currentText, currentTextIndex, isDeleting, texts, isFocused])

  const handleFocus = () => {
    setIsFocused(true)
    setIsTyping(false)
  }

  const handleBlur = (value: string) => {
    setIsFocused(false)
    if (!value.trim()) {
      setIsTyping(true)
    }
  }

  return {
    animatedPlaceholder: isFocused ? '' : currentText,
    isAnimating: !isFocused && currentText.length > 0,
    onFocus: handleFocus,
    onBlur: handleBlur
  }
}

export const HeroContent: React.FC<HeroContentProps> = ({
  currentItem,
  onQuerySubmit,
  className = ""
}) => {
  const [query, setQuery] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  const typingTexts = currentItem?.typingTexts || ["Create amazing videos with AI..."]
  
  const {
    animatedPlaceholder,
    isAnimating,
    onFocus: handleFocusHook,
    onBlur: handleBlurHook,
  } = useTypingAnimation(typingTexts, currentItem?.id)

  // 打字动画现在通过resetKey自动与视频切换同步

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setIsProcessing(true)
    onQuerySubmit(query)

    setTimeout(() => {
      setIsProcessing(false)
    }, 3000)
  }

  const placeholderClasses = cn(
    "placeholder:transition-colors placeholder:duration-300 ease-apple",
    {
      "placeholder:text-gray-400": isAnimating,
      "placeholder:text-gray-500": !isAnimating,
    }
  )

  return (
    <div className={cn(
      "relative z-10 flex flex-col items-center justify-center min-h-screen",
      "container mx-auto px-4 text-center",
      className
    )}>
      <div className="max-w-6xl mx-auto w-full">
        <h1 className="text-5xl md:text-7xl font-heading font-extrabold mb-8 text-gradient-brand leading-tight">
          Words In, Videos Out | VidFab
        </h1>

        <p className="text-lg md:text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
        What used to take days now takes minutes. AI video generation that
        actually works.
        </p>

        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto relative">
          <div className="relative flex items-center">
            <Search className="absolute left-3 h-5 w-5 text-gray-400 z-10" />
            <Input
              type="text"
              placeholder={animatedPlaceholder}
              className={cn(
                "w-full pl-10 pr-36 py-5 text-md md:py-6 md:text-lg",
                "bg-brand-gray-800/70 backdrop-blur-md border-brand-gray-700",
                "focus:border-brand-purple-DEFAULT focus:ring-1 focus:ring-brand-purple-DEFAULT text-white",
                placeholderClasses,
              )}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={handleFocusHook}
              onBlur={() => handleBlurHook(query)}
              disabled={isProcessing}
            />
            <Button
              type="submit"
              className={cn(
                "absolute right-1.5 top-1/2 -translate-y-1/2 h-[calc(100%-0.75rem)]",
                "bg-gradient-to-r from-brand-purple-DEFAULT to-brand-cyan-DEFAULT text-white",
                "transition-all duration-300 ease-apple group hover:shadow-apple-medium",
                isProcessing ? "w-10 px-0" : "px-6 text-sm md:text-base"
              )}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <>
                  <Zap className="h-4 w-4 md:h-5 md:w-5 mr-0 md:mr-2 transition-transform duration-300 ease-apple group-hover:scale-110" />
                  <span className="hidden md:inline">Create Video</span>
                  <span className="md:hidden">Create</span>
                </>
              )}
            </Button>
          </div>

          {isProcessing && (
            <div className="mt-6 flex items-center justify-center space-x-8 text-sm text-gray-400">
              <div className="flex items-center">
                <div className="animate-pulse h-2 w-2 rounded-full bg-pink-500 mr-2" />
                <span>AI analyzing...</span>
              </div>
              <div className="flex items-center">
                <div className="animate-pulse h-2 w-2 rounded-full bg-purple-500 mr-2" />
                <span>Generating video...</span>
              </div>
              <div className="flex items-center">
                <div className="animate-pulse h-2 w-2 rounded-full bg-cyan-400 mr-2" />
                <span>Finalizing...</span>
              </div>
            </div>
          )}
        </form>

        <div className="mt-12 flex flex-wrap justify-center gap-x-6 gap-y-3">
          {[
            { text: "AI-Powered Creation", icon: Sparkles, color: "text-brand-pink-DEFAULT" },
            { text: "Instant Generation", icon: Zap, color: "text-brand-purple-DEFAULT" },
            { text: "Professional Quality", icon: BookOpen, color: "text-brand-cyan-DEFAULT" },
          ].map((item, index) => (
            <div
              key={index}
              className="flex items-center bg-brand-gray-800/70 backdrop-blur-md px-4 py-2.5 rounded-full shadow-apple-soft transition-all duration-300 ease-apple hover:bg-brand-gray-700/80 hover:scale-105"
            >
              <item.icon className={`h-4 w-4 ${item.color} mr-2.5`} />
              <span className="text-sm text-gray-300">{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
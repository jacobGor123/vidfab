"use client"

import { useState, useEffect } from "react"
import { BookOpen } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

interface LoadingStateProps {
  message?: string
}

export function LoadingState({ message = "Loading content..." }: LoadingStateProps) {
  const [progress, setProgress] = useState(0)
  const [animationStage, setAnimationStage] = useState(0) // 0: initial, 1: grow, 2: pulse, 3: rotate

  useEffect(() => {
    const progressTimer = setInterval(() => {
      setProgress((oldProgress) => {
        if (oldProgress >= 100) {
          clearInterval(progressTimer)
          return 100
        }
        const diff = Math.random() * 10
        return Math.min(oldProgress + diff, 100)
      })
    }, 200)

    return () => {
      clearInterval(progressTimer)
    }
  }, [])

  useEffect(() => {
    const stageDurations = [500, 1000, 1500] // Durations for each stage before rotate
    let currentTimeout: NodeJS.Timeout

    if (animationStage < 3) {
      currentTimeout = setTimeout(() => {
        setAnimationStage((prev) => prev + 1)
      }, stageDurations[animationStage] || 0)
    }

    // Continuous rotation for stage 3
    let rotationFrameId: number
    if (animationStage === 3) {
      let rotation = 0
      const animateRotation = () => {
        rotation = (rotation + 2) % 360 // Slower, smoother rotation
        const bookElement = document.getElementById("loading-book-icon")
        if (bookElement) {
          bookElement.style.transform = `rotateY(${rotation}deg) scale(${1 + Math.sin(Date.now() / 300) * 0.05})` // Add subtle pulse to rotation
        }
        rotationFrameId = requestAnimationFrame(animateRotation)
      }
      animateRotation()
    }

    return () => {
      clearTimeout(currentTimeout)
      if (rotationFrameId) {
        cancelAnimationFrame(rotationFrameId)
      }
    }
  }, [animationStage])

  const bookIconClasses = cn(
    "h-16 w-16 text-transparent bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 bg-clip-text transition-all duration-500 ease-out",
    {
      "opacity-0 scale-50": animationStage === 0, // Initial: small and transparent
      "opacity-100 scale-100": animationStage === 1, // Stage 1: Grow to full size
      "scale-110": animationStage === 2, // Stage 2: Pulse slightly larger
      // Stage 3: Rotation handled by direct style manipulation for continuous effect
    },
  )

  return (
    <div className="flex flex-col items-center justify-center p-8 w-full">
      <div className="relative mb-6 h-20 w-20 flex items-center justify-center">
        {" "}
        {/* Container for icon */}
        <div id="loading-book-icon" className={bookIconClasses}>
          <BookOpen className="h-full w-full" />
        </div>
        {animationStage < 3 && ( // Show blur only during initial stages
          <div
            className={cn(
              "absolute inset-0 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 blur-xl rounded-full transition-opacity duration-500",
              animationStage > 0 ? "opacity-30" : "opacity-0",
            )}
          ></div>
        )}
      </div>
      <h3 className="text-xl font-bold mb-2 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 bg-clip-text text-transparent">
        {message}
      </h3>
      <div className="w-full max-w-md mb-4">
        <Progress
          value={progress}
          className="h-2 bg-white/10"
          indicatorClassName="bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400"
        />
      </div>
      <p className="text-sm text-gray-400">Please wait while we prepare your content</p>
    </div>
  )
}

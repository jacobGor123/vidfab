"use client"

import { useEffect, useRef } from "react"
import { useClientOnly } from "@/hooks/use-client-only"

export function SpaceBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isClient = useClientOnly()

  useEffect(() => {
    if (!isClient) return
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions
    const setCanvasDimensions = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    setCanvasDimensions()
    window.addEventListener("resize", setCanvasDimensions)

    // Star properties
    const stars: { x: number; y: number; radius: number; opacity: number; speed: number }[] = []
    const starCount = Math.min(Math.floor((window.innerWidth * window.innerHeight) / 1000), 300) // Limit star count

    // Create stars
    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 1.5,
        opacity: Math.random(),
        speed: Math.random() * 0.05,
      })
    }

    // Animation
    let animationFrameId: number

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw background gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
      gradient.addColorStop(0, "#0f0f1a")
      gradient.addColorStop(1, "#1a1a2e")
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw stars
      stars.forEach((star) => {
        ctx.beginPath()
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`
        ctx.fill()

        // Twinkle effect
        star.opacity += Math.random() * 0.01 - 0.005
        star.opacity = Math.max(0.1, Math.min(1, star.opacity))

        // Slow movement
        star.y += star.speed
        if (star.y > canvas.height) {
          star.y = 0
          star.x = Math.random() * canvas.width
        }
      })

      // Draw nebula-like clouds (reduced number and complexity)
      for (let i = 0; i < 2; i++) {
        const x = Math.random() * canvas.width
        const y = Math.random() * canvas.height
        const radius = Math.random() * 80 + 40

        const cloudGradient = ctx.createRadialGradient(x, y, 0, x, y, radius)

        if (i % 2 === 0) {
          cloudGradient.addColorStop(0, "rgba(255, 0, 128, 0.02)")
          cloudGradient.addColorStop(1, "rgba(255, 0, 128, 0)")
        } else {
          cloudGradient.addColorStop(0, "rgba(0, 255, 255, 0.01)")
          cloudGradient.addColorStop(1, "rgba(0, 255, 255, 0)")
        }

        ctx.fillStyle = cloudGradient
        ctx.beginPath()
        ctx.arc(x, y, radius, 0, Math.PI * 2)
        ctx.fill()
      }

      animationFrameId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener("resize", setCanvasDimensions)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return <canvas ref={canvasRef} className="fixed top-0 left-0 w-full h-full -z-10" />
}

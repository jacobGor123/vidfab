"use client"

import type React from "react"

import { Navbar } from "@/components/navbar" // Corrected path
import { Footer } from "@/components/footer" // Corrected path
import { SpaceBackground } from "@/components/space-background" // Corrected path
import { useState, useEffect } from "react"

/**
 * Layout for the main application pages.
 * Includes Navbar, Footer, and SpaceBackground.
 * Manages scroll state for Navbar.
 */
export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <div className="relative flex flex-col min-h-screen overflow-hidden bg-brand-gray-900 text-white">
      <SpaceBackground />
      <Navbar scrolled={scrolled} />
      <main className="flex-grow">{children}</main>
      <Footer />
    </div>
  )
}

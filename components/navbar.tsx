"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Menu, X, LogIn } from "lucide-react"
import Link from "next/link"
import { NeuralArchiveIcon } from "@/components/common/icon-neural-archive"
import { UserMenu } from "@/components/user-menu"
import { GetStartedButton } from "@/components/ui/get-started-button"

interface NavbarProps {
  scrolled: boolean
}

export function Navbar({ scrolled }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { data: session, status } = useSession()

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled ? "bg-black/30 backdrop-blur-lg border-b border-white/10" : "bg-transparent",
      )}
    >
      <div className="mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <NeuralArchiveIcon className="h-8 w-8" />
            <span className="ml-2 text-xl font-bold text-gradient-brand">NeuralArchive</span>
          </div>

          <nav className="hidden md:flex items-center space-x-8">
            <Link
              href="/"
              className="text-sm font-medium text-gray-300 hover:text-white transition-colors duration-300 ease-apple"
            >
              Home
            </Link>
            <Link
              href="/how-it-works"
              className="text-sm font-medium text-gray-300 hover:text-white transition-colors duration-300 ease-apple"
            >
              How It Works
            </Link>
            <Link
              href="/features"
              className="text-sm font-medium text-gray-300 hover:text-white transition-colors duration-300 ease-apple"
            >
              Features
            </Link>
            <Link
              href="/pricing"
              className="text-sm font-medium text-gray-300 hover:text-white transition-colors duration-300 ease-apple"
            >
              Pricing
            </Link>
          </nav>

          <div className="hidden md:flex items-center space-x-4">
            {status === "loading" ? (
              <div className="animate-pulse flex space-x-2">
                <div className="h-10 w-20 bg-gray-600 rounded"></div>
                <div className="h-10 w-8 bg-gray-600 rounded-full"></div>
              </div>
            ) : session?.user ? (
              <>
                <GetStartedButton />
                <UserMenu />
              </>
            ) : (
              <>
                <GetStartedButton />
                <Button
                  variant="outline"
                  className="hover:border-brand-purple-DEFAULT hover:text-brand-purple-DEFAULT transition-all duration-300 ease-apple hover:shadow-apple-soft group"
                  asChild
                >
                  <Link href="/login">
                    <LogIn className="h-4 w-4 mr-2 group-hover:text-brand-purple-DEFAULT transition-colors duration-300" />
                    Sign In
                  </Link>
                </Button>
              </>
            )}
          </div>

          <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-6 w-6 text-white" /> : <Menu className="h-6 w-6 text-white" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-black/95 backdrop-blur-lg">
          <div className="container mx-auto px-4 py-4 space-y-4">
            <Link
              href="/"
              className="block py-2 text-base font-heading text-gray-200 hover:text-brand-pink-DEFAULT transition-colors duration-300"
            >
              Home
            </Link>
            <Link
              href="/how-it-works"
              className="block py-2 text-base font-heading text-gray-200 hover:text-brand-purple-DEFAULT transition-colors duration-300"
            >
              How It Works
            </Link>
            <Link
              href="/features"
              className="block py-2 text-base font-heading text-gray-200 hover:text-brand-cyan-DEFAULT transition-colors duration-300"
            >
              Features
            </Link>
            <Link
              href="/pricing"
              className="block py-2 text-base font-heading text-gray-200 hover:text-brand-pink-DEFAULT transition-colors duration-300"
            >
              Pricing
            </Link>
            <div className="pt-4 flex flex-col space-y-4">
              {session?.user ? (
                <>
                  <GetStartedButton />
                  <div className="flex items-center space-x-3 p-2">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-r from-purple-500 to-cyan-400 flex items-center justify-center text-white font-medium">
                      {session.user.name?.[0] || session.user.email?.[0] || "U"}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{session.user.name || "User"}</p>
                      <p className="text-xs text-gray-400">{session.user.email}</p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <GetStartedButton />
                  <Button
                    variant="ghost"
                    className="text-gray-200 justify-start group font-heading hover:text-brand-purple-DEFAULT transition-colors duration-300"
                    asChild
                  >
                    <Link href="/login">Sign In</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

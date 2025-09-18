"use client"

import { useState, useRef, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { LogOut, User, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * UserMenu Component
 * Shows user avatar with dropdown menu for authenticated users
 */
export function UserMenu() {
  const { data: session, status } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  const handleSignOut = async () => {
    setIsOpen(false)
    await signOut({
      callbackUrl: "/",
      redirect: true,
    })
  }

  if (status === "loading") {
    return (
      <div className="animate-pulse">
        <div className="h-8 w-8 bg-gray-600 rounded-full"></div>
      </div>
    )
  }

  if (!session?.user) {
    return null
  }

  // Get user initials for fallback
  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    }
    if (email) {
      return email[0].toUpperCase()
    }
    return "U"
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* Avatar Button */}
      <Button
        variant="ghost"
        className={cn(
          "flex items-center space-x-2 p-2 rounded-full hover:bg-white/10 transition-colors",
          isOpen && "bg-white/10"
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <Avatar className="h-8 w-8">
          <AvatarImage src={session.user.image || ""} alt={session.user.name || "User"} />
          <AvatarFallback className="bg-gradient-to-r from-purple-500 to-cyan-400 text-white text-sm font-medium">
            {getInitials(session.user.name, session.user.email)}
          </AvatarFallback>
        </Avatar>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-gray-400 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </Button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-black/95 backdrop-blur-lg border border-white/10 rounded-lg shadow-lg z-50">
          {/* User Info */}
          <div className="px-4 py-3 border-b border-white/10">
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={session.user.image || ""} alt={session.user.name || "User"} />
                <AvatarFallback className="bg-gradient-to-r from-purple-500 to-cyan-400 text-white">
                  {getInitials(session.user.name, session.user.email)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {session.user.name || "User"}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {session.user.email}
                </p>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            {/* Profile (disabled for now) */}
            <button
              className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors cursor-not-allowed opacity-50"
              disabled
            >
              <User className="h-4 w-4 mr-3" />
              Profile (Coming Soon)
            </button>

            {/* Sign Out */}
            <button
              onClick={handleSignOut}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-red-500/10 hover:text-red-400 transition-colors"
            >
              <LogOut className="h-4 w-4 mr-3" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
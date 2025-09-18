"use client"

import { Button } from "@/components/ui/button"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface GetStartedButtonProps {
  className?: string
}

export function GetStartedButton({ className }: GetStartedButtonProps) {
  return (
    <Button
      variant="default"
      className={cn(
        "relative overflow-hidden bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-700 hover:to-cyan-600 text-white transition-all duration-300 ease-apple hover:shadow-lg hover:scale-105 before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:translate-x-[-100%] before:animate-shine",
        className
      )}
      asChild
    >
      <Link href="/create">
        Get Started
      </Link>
    </Button>
  )
}
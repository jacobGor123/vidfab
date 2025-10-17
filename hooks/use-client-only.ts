"use client"

import { useEffect, useState } from "react"

/**
 * Custom hook to ensure component logic only runs on client-side
 * This prevents hydration mismatches when using browser-specific APIs
 *
 * @returns boolean indicating if code is running on client-side
 */
export function useClientOnly(): boolean {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  return isClient
}

/**
 * Hook to safely access window object without hydration errors
 * @returns window object if available, undefined otherwise
 */
export function useWindow(): typeof window | undefined {
  const isClient = useClientOnly()
  return isClient ? window : undefined
}
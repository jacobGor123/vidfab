"use client"

/**
 * Effects Selector Modal Component
 * Effects Selector Modal Component - Grid layout with lazy loading support
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EffectGridItem } from './effect-grid-item'
import { VideoEffect, VIDEO_EFFECTS } from '@/lib/constants/video-effects'
import { cn } from '@/lib/utils'

interface EffectsSelectorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedEffect: VideoEffect | null
  onEffectSelect: (effect: VideoEffect) => void
}

export function EffectsSelectorModal({
  open,
  onOpenChange,
  selectedEffect,
  onEffectSelect
}: EffectsSelectorModalProps) {
  const [visibleCount, setVisibleCount] = useState(12) // Initially display 12 items
  const [isLoading, setIsLoading] = useState(false)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Lazy load more effects
  const loadMore = useCallback(() => {
    setIsLoading(true)
    setTimeout(() => {
      setVisibleCount(prev => {
        if (prev >= VIDEO_EFFECTS.length) {
          setIsLoading(false)
          return prev
        }
        const newCount = Math.min(prev + 12, VIDEO_EFFECTS.length)
        setIsLoading(false)
        return newCount
      })
    }, 200)
  }, []) // No dependencies to avoid recreating observer

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!open || visibleCount >= VIDEO_EFFECTS.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !isLoading) {
            loadMore()
          }
        })
      },
      {
        root: scrollContainerRef.current,
        threshold: 0.3,
        rootMargin: '100px'
      }
    )

    const currentRef = loadMoreRef.current
    if (currentRef) {
      observer.observe(currentRef)
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef)
      }
      observer.disconnect()
    }
  }, [open, visibleCount, isLoading, loadMore])

  // Reset state when modal is closed
  useEffect(() => {
    if (!open) {
      setVisibleCount(12)
      setIsLoading(false)
    }
  }, [open])

  // Auto-load more if content doesn't fill the container
  useEffect(() => {
    if (!open || isLoading) return

    const timer = setTimeout(() => {
      const container = scrollContainerRef.current
      const loadMoreElement = loadMoreRef.current

      if (container && loadMoreElement && visibleCount < VIDEO_EFFECTS.length) {
        const containerRect = container.getBoundingClientRect()
        const loadMoreRect = loadMoreElement.getBoundingClientRect()

        // If load more trigger is visible in the viewport, auto-load more
        if (loadMoreRect.top < containerRect.bottom) {
          loadMore()
        }
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [open, visibleCount, isLoading, loadMore])

  const handleEffectSelect = (effect: VideoEffect) => {
    onEffectSelect(effect)
    onOpenChange(false)
  }

  const visibleEffects = VIDEO_EFFECTS.slice(0, visibleCount)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[80vh] bg-gray-900 border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-white text-xl">
            Select Video Effects ({VIDEO_EFFECTS.length} effects)
          </DialogTitle>
        </DialogHeader>

        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto pr-4"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#4b5563 #1f2937' }}
        >
          {/* Effects grid */}
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 pb-4">
            {visibleEffects.map((effect) => (
              <EffectGridItem
                key={effect.id}
                effect={effect}
                isSelected={selectedEffect?.id === effect.id}
                onClick={handleEffectSelect}
              />
            ))}
          </div>

          {/* Load more trigger */}
          {visibleCount < VIDEO_EFFECTS.length && (
            <div className="py-8">
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 text-gray-400">
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  Loading more effects...
                </div>
              ) : (
                <div
                  ref={loadMoreRef}
                  className="flex items-center justify-center text-gray-500 text-sm cursor-pointer hover:text-gray-300 transition-colors"
                  onClick={loadMore}
                >
                  Scroll to load more effects ({visibleCount}/{VIDEO_EFFECTS.length})
                  <br />
                  <span className="text-xs mt-1">Or click here to load more</span>
                </div>
              )}
            </div>
          )}

          {/* Load complete hint */}
          {visibleCount >= VIDEO_EFFECTS.length && (
            <div className="text-center py-4 text-gray-500 text-sm">
              Loaded all {VIDEO_EFFECTS.length} effects
            </div>
          )}
        </div>

        {/* Bottom operation hint */}
        <div className="border-t border-gray-800 pt-4">
          <p className="text-gray-400 text-sm text-center">
            Hover to preview video effects, click to select effect
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
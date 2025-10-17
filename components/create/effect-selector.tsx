"use client"

/**
 * Effect Selector Component
 * Effect Selector Component - Display current selected effect in main panel
 */

import { VideoEffect, DEFAULT_EFFECT } from '@/lib/constants/video-effects'
import { cn } from '@/lib/utils'

interface EffectSelectorProps {
  selectedEffect: VideoEffect | null
  onOpenModal: () => void
}

export function EffectSelector({ selectedEffect, onOpenModal }: EffectSelectorProps) {
  const currentEffect = selectedEffect || DEFAULT_EFFECT

  return (
    <div className="space-y-3">
      {/* Title */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-white">
          Video Effects
        </label>
        <span className="text-xs text-gray-400">
          64 effects available
        </span>
      </div>

      {/* Current selected effect display */}
      <div
        onClick={onOpenModal}
        className={cn(
          "relative cursor-pointer rounded-lg border-2 border-gray-600",
          "hover:border-gray-400 transition-all duration-200",
          "bg-gray-800 p-3"
        )}
      >
        <div className="flex items-center gap-3">
          {/* Effect preview image */}
          <div className="relative w-16 h-12 rounded-md overflow-hidden bg-gray-700 flex-shrink-0">
            <img
              src={currentEffect.posterUrl}
              alt={currentEffect.name}
              className="w-full h-full object-cover"
            />

            {/* Play icon overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
            </div>
          </div>

          {/* Effect information */}
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-medium text-sm truncate">
              {currentEffect.name}
            </h3>
            <p className="text-gray-400 text-xs mt-1">
              Click to view all effects
            </p>
          </div>

          {/* Change button */}
          <div className="flex-shrink-0">
            <div className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors duration-200">
              <span className="text-xs">Change</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Hover effect indicator */}
        <div className="absolute inset-0 rounded-lg bg-white/5 opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
      </div>

      {/* Help text */}
      <p className="text-xs text-gray-500 leading-relaxed">
        Select a video effect to apply to your image. Each effect has unique animations and visual effects.
      </p>
    </div>
  )
}
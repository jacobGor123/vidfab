"use client"

import type React from "react"
import { cn } from '@/lib/utils'
import { Play, Loader2 } from 'lucide-react'
import type { VideoHeroItem } from './types/video-hero.types'

interface VideoNavigationProps {
  items: VideoHeroItem[]
  currentIndex: number
  onItemSelect: (index: number) => void
  isVideoReady: (itemId: string) => boolean
  loadingCount?: number
  className?: string
}

interface NavigationItemProps {
  item: VideoHeroItem
  index: number
  isActive: boolean
  isReady: boolean
  onClick: () => void
}

const NavigationItem: React.FC<NavigationItemProps> = ({
  item,
  index,
  isActive,
  isReady,
  onClick
}) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative group block w-16 h-16 rounded-lg overflow-hidden transition-all duration-300 ease-out",
        "hover:w-18 hover:h-18 hover:scale-110",
        "focus:outline-none focus:ring-2 focus:ring-white/50",
        isActive 
          ? "ring-2 ring-white shadow-lg shadow-white/25" 
          : "hover:ring-1 hover:ring-white/30"
      )}
      aria-label={`Switch to ${item.title}`}
    >
      <div className="absolute inset-0">
        <img
          src={item.posterUrl}
          alt={item.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        
        {/* Overlay */}
        <div className={cn(
          "absolute inset-0 transition-opacity duration-300",
          isActive 
            ? "bg-black/20" 
            : "bg-black/40 group-hover:bg-black/25"
        )} />
        
        {/* Loading indicator */}
        {!isReady && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-4 h-4 text-white animate-spin" />
          </div>
        )}
        
        {/* Play icon for non-active items */}
        {!isActive && isReady && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <Play className="w-5 h-5 text-white fill-white" />
          </div>
        )}
        
        {/* Active indicator */}
        {isActive && (
          <div className="absolute bottom-1 left-1 right-1">
            <div className="h-0.5 bg-white rounded-full" />
          </div>
        )}
      </div>
      
      {/* Index number */}
      <div className={cn(
        "absolute top-1 left-1 w-4 h-4 flex items-center justify-center text-xs font-medium rounded-full transition-all duration-200",
        isActive 
          ? "bg-white text-black" 
          : "bg-black/50 text-white group-hover:bg-white/20"
      )}>
        {index + 1}
      </div>
    </button>
  )
}

export const VideoNavigation: React.FC<VideoNavigationProps> = ({
  items,
  currentIndex,
  onItemSelect,
  isVideoReady,
  loadingCount = 0,
  className = ""
}) => {
  if (items.length <= 1) {
    return null
  }

  return (
    <div className={cn(
      "fixed right-6 top-1/2 -translate-y-1/2 z-20",
      "flex flex-col space-y-3",
      "backdrop-blur-sm bg-black/10 rounded-2xl p-3",
      "border border-white/10",
      className
    )}>
      {/* Loading indicator */}
      {loadingCount > 0 && (
        <div className="flex items-center justify-center py-2">
          <div className="flex items-center space-x-2 text-white/70 text-xs">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Loading {loadingCount}</span>
          </div>
        </div>
      )}
      
      {/* Navigation items */}
      {items.map((item, index) => (
        <NavigationItem
          key={item.id}
          item={item}
          index={index}
          isActive={index === currentIndex}
          isReady={isVideoReady(item.id)}
          onClick={() => onItemSelect(index)}
        />
      ))}
      
      {/* Progress indicator */}
      <div className="flex justify-center pt-2">
        <div className="flex space-x-1">
          {items.map((_, index) => (
            <div
              key={index}
              className={cn(
                "w-1.5 h-1.5 rounded-full transition-all duration-300",
                index === currentIndex
                  ? "bg-white"
                  : "bg-white/30 hover:bg-white/50"
              )}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
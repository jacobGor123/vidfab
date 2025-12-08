'use client'

/**
 * Blog Share Button
 * 客户端组件 - 文章分享按钮
 */

import { Share2 } from 'lucide-react'

interface ShareButtonProps {
  title: string
  excerpt?: string | null
}

export function ShareButton({ title, excerpt }: ShareButtonProps) {
  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: title,
          text: excerpt || '',
          url: window.location.href,
        })
        .catch(console.error)
    } else {
      // Fallback: Copy to clipboard
      navigator.clipboard
        .writeText(window.location.href)
        .then(() => {
          alert('Link copied to clipboard!')
        })
        .catch(console.error)
    }
  }

  return (
    <button
      onClick={handleShare}
      className="ml-auto flex items-center gap-2 px-4 py-2 bg-brand-gray-800/50 border border-brand-gray-700 rounded-lg hover:bg-brand-gray-700/70 hover:border-brand-purple-DEFAULT/30 transition-all"
    >
      <Share2 className="w-4 h-4" />
      <span className="hidden sm:inline">Share</span>
    </button>
  )
}

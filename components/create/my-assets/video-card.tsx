"use client"

import { Play, Film, Loader2 } from "lucide-react"
import { UnifiedAsset } from "@/lib/types/asset"

interface VideoCardProps {
  asset: UnifiedAsset
  isStory: boolean
  isDeleting: boolean
  onDelete: () => void
  onDownload: () => void
  onOpen: () => void
}

function Thumbnail({ asset }: { asset: UnifiedAsset }) {
  if (!asset.previewUrl) return null
  const isVideoUrl =
    asset.previewUrl.includes('.mp4') ||
    asset.previewUrl.includes('user-videos') ||
    asset.previewUrl.includes('wavespeed')
  if (isVideoUrl) {
    return (
      <video
        src={asset.previewUrl}
        className="w-full h-full object-cover"
        preload="metadata"
        muted
        playsInline
      />
    )
  }
  return (
    <img
      src={asset.previewUrl}
      alt={asset.prompt || 'Video'}
      className="w-full h-full object-cover"
    />
  )
}

export function VideoCard({
  asset,
  isStory,
  isDeleting,
  onDelete,
  onDownload,
  onOpen,
}: VideoCardProps) {
  const typeIcon = isStory
    ? '/icons/my-assets/icon-story-type.svg'
    : '/icons/my-assets/icon-video-type.svg'

  return (
    <div
      className="relative aspect-square rounded-xl overflow-hidden group bg-gray-900 cursor-pointer active:scale-[0.97] transition-transform duration-100 touch-manipulation"
      onClick={onOpen}
    >
      {/* Deleting overlay */}
      {isDeleting && (
        <div className="absolute inset-0 bg-black/70 z-20 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-white" />
        </div>
      )}

      {/* Thumbnail */}
      {asset.previewUrl ? (
        <Thumbnail asset={asset} />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          {isStory
            ? <Film className="w-8 h-8 text-gray-700" />
            : <Play className="w-8 h-8 text-gray-700" />
          }
        </div>
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />

      {/* Play icon — center, always visible at low opacity */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-sm opacity-60 group-hover:opacity-90 transition-opacity duration-200"
          style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)' }}
        >
          {isStory
            ? <Film className="w-4 h-4 text-white" />
            : <Play className="w-4 h-4 text-white fill-white" />
          }
        </div>
      </div>

      {/* Type badge — top-left */}
      <div className="absolute top-2 left-2 z-10 pointer-events-none">
        <div
          className="w-[22px] h-[22px] flex items-center justify-center rounded-[4px] overflow-hidden"
          style={{ background: 'rgba(6,6,6,0.5)' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={typeIcon}
            alt={isStory ? 'Story' : 'Video'}
            width={22}
            height={22}
            className="object-contain"
          />
        </div>
      </div>

      {/* Action buttons — right side, appear on hover */}
      <div
        className="absolute top-2 right-2 flex flex-col gap-1.5 z-10 opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {asset.downloadUrl && (
          <button
            onClick={onDownload}
            disabled={isDeleting}
            title="Download"
            className="cursor-pointer hover:opacity-80 active:opacity-60 transition-opacity disabled:opacity-40"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/my-assets/icon-download.svg" alt="Download" width={22} height={22} />
          </button>
        )}
        <button
          onClick={onDelete}
          disabled={isDeleting}
          title="Delete"
          className="cursor-pointer hover:opacity-80 active:opacity-60 transition-opacity disabled:opacity-40"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/my-assets/icon-delete.svg" alt="Delete" width={22} height={22} />
        </button>
      </div>

      {/* Prompt at bottom */}
      <div className="absolute bottom-0 left-0 right-0 px-2 pb-2 pt-6 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
        <p className="text-[11px] text-white/75 truncate leading-tight">
          {asset.prompt || 'AI Generated Video'}
        </p>
      </div>
    </div>
  )
}

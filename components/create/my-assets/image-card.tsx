"use client"

import { Loader2 } from "lucide-react"
import { UnifiedAsset } from "@/lib/types/asset"

interface ImageCardProps {
  asset: UnifiedAsset
  isDeleting: boolean
  onOpen: () => void
  onDelete: () => void
  onDownload: () => void
  onImageToVideo: () => void
  onImageToImage: () => void
}

const ACTION_BUTTONS = [
  { key: 'download', icon: '/icons/my-assets/icon-download.svg', label: 'Download' },
  { key: 'regenerate', icon: '/icons/my-assets/icon-refresh.svg', label: 'Regenerate' },
  { key: 'video', icon: '/icons/my-assets/icon-generate-video.svg', label: 'Generate Video' },
  { key: 'delete', icon: '/icons/my-assets/icon-delete.svg', label: 'Delete' },
] as const

export function ImageCard({
  asset,
  isDeleting,
  onOpen,
  onDelete,
  onDownload,
  onImageToVideo,
  onImageToImage,
}: ImageCardProps) {
  const handlers: Record<string, () => void> = {
    download: onDownload,
    regenerate: onImageToImage,
    video: onImageToVideo,
    delete: onDelete,
  }

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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={asset.previewUrl}
        alt={asset.prompt || 'Image'}
        className="w-full h-full object-cover"
        onError={(e) => { e.currentTarget.style.display = 'none' }}
      />

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />

      {/* Type badge — top-left */}
      <div className="absolute top-2 left-2 z-10 pointer-events-none">
        <div
          className="w-[22px] h-[22px] flex items-center justify-center rounded-[4px] overflow-hidden"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/my-assets/icon-image-type.svg"
            alt="Image"
            width={22}
            height={22}
            className="object-contain"
          />
        </div>
      </div>

      {/* Action buttons — right side vertical stack, appear on hover */}
      <div
        className="absolute top-2 right-2 flex flex-col gap-1.5 z-10 opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all duration-200"
        onClick={e => e.stopPropagation()}
      >
        {ACTION_BUTTONS.map(({ key, icon, label }) => (
          <button
            key={key}
            onClick={handlers[key]}
            disabled={isDeleting}
            title={label}
            className="cursor-pointer hover:opacity-80 active:opacity-60 transition-opacity disabled:opacity-40"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={icon} alt={label} width={22} height={22} />
          </button>
        ))}
      </div>

      {/* Prompt at bottom */}
      <div className="absolute bottom-0 left-0 right-0 px-2 pb-2 pt-6 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
        <p className="text-[11px] text-white/75 truncate leading-tight">
          {asset.prompt || 'AI Generated Image'}
        </p>
      </div>
    </div>
  )
}

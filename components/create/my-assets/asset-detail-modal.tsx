"use client"

import { useCallback } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Copy, Download, Trash2, Video, ImageIcon, Loader2, X } from "lucide-react"
import { toast } from "sonner"
import { UnifiedAsset, UserImage, isVideoAsset, isImageAsset } from "@/lib/types/asset"
import { UserVideo } from "@/lib/supabase"

// ─── Figma design tokens ───────────────────────────────────────────────────────
const T = {
  panelBg:    '#181a26',
  boxBg:      '#1f212d',
  btnBg:      '#2a2d41',
  labelColor: '#737791',
  textColor:  '#a7aed0',
  bodyColor:  '#e3e3e3',
  metaColor:  '#5b5f77',
  deleteBg:   'rgba(255,146,146,0.20)',
  deleteText: '#ff7779',
  mediaBg:    '#221e31',
} as const

// ─── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(iso: string) {
  return iso.slice(0, 10)
}

function getVideoMeta(asset: UnifiedAsset) {
  const v = asset.rawData as UserVideo
  const hasAudio = !!v.settings?.model?.toLowerCase().includes('veo')
  return [
    { label: 'Ratio',    value: v.settings?.aspectRatio || '—' },
    { label: 'Duration', value: v.settings?.duration    || '—' },
    { label: 'Audio',    value: hasAudio ? 'ON' : 'OFF'        },
    { label: 'Created',  value: formatDate(asset.createdAt)    },
  ]
}

function getImageMeta(asset: UnifiedAsset) {
  const img = asset.rawData as UserImage
  return [
    { label: 'Ratio',   value: img.aspect_ratio || '—'      },
    { label: 'Model',   value: img.model        || '—'      },
    { label: 'Created', value: formatDate(asset.createdAt)  },
  ]
}

// ─── Media display (left side) ────────────────────────────────────────────────
function MediaDisplay({ asset }: { asset: UnifiedAsset }) {
  const src = asset.downloadUrl || asset.previewUrl
  if (asset.type === 'video') {
    return (
      <video
        key={src}
        src={src}
        controls
        className="rounded-xl object-contain"
        style={{ maxWidth: '100%', maxHeight: '100%' }}
      />
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={asset.prompt || 'Image'}
      className="rounded-xl object-contain"
      style={{ maxWidth: '100%', maxHeight: '100%' }}
    />
  )
}

// ─── Main component ────────────────────────────────────────────────────────────
export interface AssetDetailModalProps {
  asset: UnifiedAsset | null
  isOpen: boolean
  onClose: () => void
  onDelete: () => void
  onDownload: () => void
  onImageToVideo: () => void
  onImageToImage: () => void
  isDeleting: boolean
}

export function AssetDetailModal({
  asset,
  isOpen,
  onClose,
  onDelete,
  onDownload,
  onImageToVideo,
  onImageToImage,
  isDeleting,
}: AssetDetailModalProps) {
  const handleCopyPrompt = useCallback(() => {
    if (!asset?.prompt) return
    navigator.clipboard.writeText(asset.prompt)
    toast.success('Prompt copied')
  }, [asset?.prompt])

  if (!asset) return null

  const metaRows = isVideoAsset(asset) ? getVideoMeta(asset) : getImageMeta(asset)
  const isImage  = isImageAsset(asset)

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent
        showClose={false}
        className="!p-0 border border-white/15 overflow-hidden w-full md:w-[95vw] !max-w-full md:!max-w-[1100px] h-[90svh] md:h-[700px]"
        style={{
          background: T.mediaBg,
          padding: 0,
        }}
      >
        <div className="absolute inset-0 flex flex-col md:flex-row">

          {/* ── TOP (mobile) / LEFT (desktop): media display ─────────── */}
          <div
            className="flex-shrink-0 h-[40%] md:h-auto md:flex-1 min-w-0 overflow-hidden flex items-center justify-center p-4 md:p-8 relative"
            style={{ background: T.mediaBg }}
          >
            {/* Close button — top-right of media area */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 flex items-center justify-center rounded-lg transition-opacity hover:opacity-70 z-10"
              style={{ width: 30, height: 30, background: T.btnBg, color: T.textColor }}
            >
              <X size={14} />
            </button>
            <MediaDisplay asset={asset} />
          </div>

          {/* ── BOTTOM (mobile) / RIGHT (desktop): info panel ────────── */}
          <div
            className="flex flex-col flex-1 min-h-0 md:flex-none md:self-stretch md:w-[450px]"
            style={{ background: T.panelBg }}
          >
            {/* Fixed header — Download always visible at top-right */}
            <div className="flex-shrink-0 flex justify-end" style={{ padding: '20px 20px 12px 20px' }}>
              <button
                onClick={onDownload}
                disabled={isDeleting}
                className="flex items-center gap-2 px-4 rounded-xl text-[15px] font-medium transition-opacity hover:opacity-80 disabled:opacity-40 w-fit"
                style={{ height: 40, background: T.btnBg, color: T.textColor }}
              >
                <Download size={14} />
                Download
              </button>
            </div>

            {/* Scrollable content area */}
            <div className="flex-1 overflow-y-auto min-h-0 flex flex-col gap-4" style={{ padding: '0 20px 12px 20px' }}>

              {/* Prompt section */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[16px] font-medium" style={{ color: T.labelColor }}>
                    Prompt
                  </span>
                  <button
                    onClick={handleCopyPrompt}
                    title="Copy prompt"
                    className="flex items-center justify-center rounded-md transition-colors hover:bg-white/10"
                    style={{ width: 22, height: 22, color: '#a8adbd' }}
                  >
                    <Copy size={12} />
                  </button>
                </div>
                <div className="rounded-xl p-4" style={{ background: T.boxBg }}>
                  <p
                    className="text-[15px] leading-[1.65] overflow-y-auto"
                    style={{ color: T.bodyColor, maxHeight: 200, wordBreak: 'break-word' }}
                  >
                    {asset.prompt || '—'}
                  </p>
                </div>
              </div>

              {/* Metadata section */}
              <div>
                <span className="text-[16px] font-medium block mb-2" style={{ color: T.labelColor }}>
                  Metadata
                </span>
                <div className="rounded-xl p-4 flex flex-col gap-2" style={{ background: T.boxBg }}>
                  {metaRows.map(r => (
                    <div key={r.label} className="text-[15px] leading-[23px]" style={{ color: T.metaColor }}>
                      <span>{r.label}:</span>
                      <span className="ml-1">{r.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Generate section — image only */}
              {isImage && (
                <div>
                  <span className="text-[16px] font-medium block mb-2" style={{ color: T.labelColor }}>
                    Generate
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={onImageToVideo}
                      disabled={isDeleting}
                      className="flex items-center justify-center gap-2 rounded-xl text-[15px] font-medium transition-opacity hover:opacity-80 disabled:opacity-40"
                      style={{ height: 40, background: T.btnBg, color: T.textColor }}
                    >
                      <Video size={14} />
                      Reference to Video
                    </button>
                    <button
                      onClick={onImageToImage}
                      disabled={isDeleting}
                      className="flex items-center justify-center gap-2 rounded-xl text-[15px] font-medium transition-opacity hover:opacity-80 disabled:opacity-40"
                      style={{ height: 40, background: T.btnBg, color: T.textColor }}
                    >
                      <ImageIcon size={14} />
                      Reference to Image
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* Fixed footer — Delete always visible at bottom-right */}
            <div className="flex-shrink-0 flex justify-end" style={{ padding: '12px 20px 20px 20px' }}>
              <button
                onClick={onDelete}
                disabled={isDeleting}
                className="flex items-center gap-2.5 px-4 rounded-xl text-[15px] font-medium transition-opacity hover:opacity-80 disabled:opacity-40 w-fit"
                style={{ height: 40, background: T.deleteBg, color: T.deleteText }}
              >
                {isDeleting
                  ? <Loader2 size={14} className="animate-spin" />
                  : <Trash2 size={14} />
                }
                Delete
              </button>
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  )
}

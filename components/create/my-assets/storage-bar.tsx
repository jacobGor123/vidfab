"use client"

import { useVideoContext } from "@/lib/contexts/video-context"

export function StorageBar() {
  const { quotaInfo, quotaLoading } = useVideoContext()

  const currentMB = quotaInfo?.current_size_mb ?? 0
  const maxMB = quotaInfo?.max_size_mb ?? 1024
  const percentage = Math.min(quotaInfo?.storage_percentage ?? 0, 100)
  const isPro = quotaInfo?.is_subscribed ?? false
  const planLabel = isPro ? '(Pro)' : '(Free)'

  const currentDisplay = quotaLoading ? '...' : `${currentMB.toFixed(1)} MB`
  const limitDisplay = `${maxMB.toFixed(0)} MB`

  return (
    // Outer wrapper: full-width, acts as a background separator
    <div className="flex-shrink-0 flex justify-center px-3 py-3 md:px-6 md:py-4" style={{ background: '#0b081f' }}>
      {/* Inner card — matches Figma Frame 46: 700×76, bg #181921, r=8 */}
      <div
        className="relative w-full overflow-hidden"
        style={{
          background: '#181921',
          borderRadius: 8,
          padding: '16px 20px 14px 20px',
          maxWidth: 900,
        }}
      >
        {/* Decorative purple glow ellipse (Figma Ellipse 8, opacity 0.7) */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: '-80px',
            left: '-100px',
            width: 400,
            height: 200,
            background: 'radial-gradient(ellipse, rgba(128,111,223,0.70) 0%, transparent 70%)',
            filter: 'blur(30px)',
          }}
        />

        {/* Row 1: text info */}
        <div className="relative flex items-center flex-wrap gap-x-1 gap-y-0.5 mb-3 text-sm md:text-base font-medium" style={{ color: '#8e8ea2' }}>
          <span>Storage Used：</span>
          <span className="text-white font-semibold">{currentDisplay}</span>
          <span>&nbsp;/ {limitDisplay} {planLabel}</span>
          {/* Info icon — Figma Frame [14×14] */}
          <svg
            className="ml-1 flex-shrink-0"
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
          >
            <circle cx="7" cy="7" r="6.5" stroke="#8e8ea2" strokeWidth="1" />
            <path d="M7 6.5V10" stroke="#8e8ea2" strokeWidth="1.2" strokeLinecap="round" />
            <circle cx="7" cy="4.5" r="0.7" fill="#8e8ea2" />
          </svg>
        </div>

        {/* Row 2: progress bar + percentage */}
        <div className="relative flex items-center gap-3">
          {/* Track — Figma: rgb(60,57,103), r=10 */}
          <div
            className="flex-1 relative"
            style={{ height: 7.5, borderRadius: 10, background: '#3c3967' }}
          >
            {/* Fill — gradient rgba(123,92,255) → rgba(65,154,255) */}
            <div
              className="absolute inset-y-0 left-0 transition-all duration-500"
              style={{
                width: `${percentage}%`,
                borderRadius: 10,
                background: 'linear-gradient(90deg, #7b5cff 0%, #419aff 100%)',
              }}
            />
          </div>
          {/* Percentage text — Figma: rgb(142,142,162), fs=12, fw=500 */}
          <span
            className="flex-shrink-0 text-xs font-medium tabular-nums"
            style={{ color: '#8e8ea2', minWidth: 36, textAlign: 'right' }}
          >
            {quotaLoading ? '...' : `${percentage.toFixed(1)}%`}
          </span>
        </div>
      </div>
    </div>
  )
}

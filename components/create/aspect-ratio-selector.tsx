"use client"

import { cn } from "@/lib/utils"

interface AspectRatioSelectorProps {
  value: string
  options: readonly string[]
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
  optionClassName?: string
  size?: "default" | "compact"
}

function getPreviewSize(ratio: string, compact: boolean): { width: number; height: number } {
  const [rawWidth, rawHeight] = ratio.split(":").map(Number)
  const ratioWidth = Number.isFinite(rawWidth) && rawWidth > 0 ? rawWidth : 1
  const ratioHeight = Number.isFinite(rawHeight) && rawHeight > 0 ? rawHeight : 1
  const maxWidth = compact ? 20 : 26
  const maxHeight = compact ? 14 : 18
  const scale = Math.min(maxWidth / ratioWidth, maxHeight / ratioHeight)

  return {
    width: Math.max(8, Math.round(ratioWidth * scale)),
    height: Math.max(8, Math.round(ratioHeight * scale))
  }
}

function AspectRatioMark({
  ratio,
  selected,
  compact
}: {
  ratio: string
  selected: boolean
  compact: boolean
}) {
  const { width, height } = getPreviewSize(ratio, compact)

  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center",
        compact ? "h-4 w-6" : "h-5 w-7"
      )}
    >
      <span
        className={cn(
          "block rounded-[3px] border-2 transition-colors",
          selected
            ? "border-purple-200 bg-purple-300/10"
            : "border-gray-400/70 bg-transparent group-hover:border-gray-200/90"
        )}
        style={{ width, height }}
      />
    </span>
  )
}

export function AspectRatioSelector({
  value,
  options,
  onChange,
  disabled = false,
  className,
  optionClassName,
  size = "default"
}: AspectRatioSelectorProps) {
  const compact = size === "compact"

  return (
    <div
      role="radiogroup"
      className={cn(
        compact ? "flex gap-1" : "grid gap-1.5",
        className
      )}
    >
      {options.map((ratio) => {
        const selected = value === ratio

        return (
          <button
            key={ratio}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={ratio}
            onClick={() => onChange(ratio)}
            disabled={disabled}
            className={cn(
              "group rounded-md border text-sm font-medium transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/70 focus-visible:ring-offset-0",
              "disabled:pointer-events-none disabled:opacity-50",
              compact
                ? "inline-flex h-8 min-w-[54px] items-center justify-center gap-1.5 px-2"
                : "flex min-h-[42px] w-full flex-col items-center justify-center gap-1 px-2 py-1.5",
              selected
                ? "border-purple-400/70 bg-purple-500/12 text-white shadow-[0_0_0_1px_rgba(168,85,247,0.12)]"
                : "border-gray-700/45 bg-gray-800/45 text-gray-400 hover:border-gray-500/70 hover:bg-gray-800/75 hover:text-white",
              optionClassName
            )}
          >
            <AspectRatioMark ratio={ratio} selected={selected} compact={compact} />
            <span className={compact ? "text-xs leading-none" : "text-xs leading-none"}>{ratio}</span>
          </button>
        )
      })}
    </div>
  )
}

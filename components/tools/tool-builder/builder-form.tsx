"use client"

import { useRef, useState } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Upload, X, Sparkles, Loader2, Volume2, VolumeX } from "lucide-react"
import { BuilderConfig } from "@/lib/tools/tool-configs"
import { ToolBuilderParams, ToolBuilderState, calcVeo3Credits } from "./use-tool-builder"

interface BuilderFormProps {
  config: BuilderConfig
  state: ToolBuilderState
  onParamChange: <K extends keyof ToolBuilderParams>(key: K, value: ToolBuilderParams[K]) => void
  onSubmit: () => void
  onShowAuth: () => void
  isAuthenticated: boolean
  credits: number
  isJobActive: boolean
}

function ToggleGroup({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex rounded-lg overflow-hidden border border-brand-gray-700 w-full">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "flex-1 py-2 text-sm font-medium transition-colors duration-200",
            value === opt.value
              ? "bg-brand-purple-DEFAULT text-white"
              : "bg-brand-gray-800 text-gray-400 hover:text-white hover:bg-brand-gray-700"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function DurationSlider({ min, max, step = 1, value, onChange }: {
  min: number; max: number; step?: number; value: number; onChange: (v: number) => void
}) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-gray-400 uppercase tracking-wider">Duration</Label>
        <span className="text-sm font-semibold text-white tabular-nums">{value}s</span>
      </div>
      <div className="relative py-2">
        <div className="relative h-1 rounded-full bg-brand-gray-700">
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-brand-purple-DEFAULT to-brand-pink-DEFAULT transition-all duration-150"
            style={{ width: `${pct}%` }}
          />
        </div>
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-5 top-0"
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-lg border-2 border-brand-purple-DEFAULT pointer-events-none transition-all duration-150"
          style={{ left: `calc(${pct}% - 8px)` }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        <span>{min}s</span><span>{max}s</span>
      </div>
    </div>
  )
}

function ParamPill({
  options,
  value,
  onChange,
  label,
}: {
  options: string[]
  value: string
  onChange: (v: string) => void
  label: string
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-gray-400 uppercase tracking-wider">{label}</Label>
      <div className="flex gap-1.5 flex-wrap">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={cn(
              "px-3 py-1 text-sm rounded-full border transition-all duration-200",
              value === opt
                ? "border-white/60 bg-brand-purple-DEFAULT text-white shadow-[0_0_10px_rgba(139,92,246,0.4)]"
                : "border-brand-gray-700 text-gray-400 hover:border-brand-gray-500 hover:text-white"
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

export function BuilderForm({
  config,
  state,
  onParamChange,
  onSubmit,
  onShowAuth,
  isAuthenticated,
  credits,
  isJobActive,
}: BuilderFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/images/upload", { method: "POST", body: formData, credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        const url = data.url || data.data?.url
        if (url) onParamChange("imageUrl", url)
      }
    } finally {
      setIsUploading(false)
      // reset so same file can be re-selected
      e.target.value = ""
    }
  }

  const handleGenerate = () => {
    if (!isAuthenticated) {
      onShowAuth()
      return
    }
    onSubmit()
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Mode toggle */}
      <div className="space-y-1.5">
        <Label className="text-xs text-gray-400 uppercase tracking-wider">Mode</Label>
        <ToggleGroup
          options={[
            { label: "Text to Video", value: "text-to-video" },
            { label: "Image to Video", value: "image-to-video" },
          ]}
          value={state.mode}
          onChange={(v) => onParamChange("mode", v as "text-to-video" | "image-to-video")}
        />
      </div>

      {/* Image upload — only for i2v */}
      {state.mode === "image-to-video" && (
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-400 uppercase tracking-wider">Reference Image</Label>

          {/* Uploading state */}
          {isUploading ? (
            <div className="w-full h-24 rounded-lg border-2 border-dashed border-brand-purple-DEFAULT/40 bg-brand-purple-DEFAULT/5 flex flex-col items-center justify-center gap-2.5">
              <div className="w-32 h-1 rounded-full bg-brand-gray-700 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-brand-purple-DEFAULT to-brand-pink-DEFAULT rounded-full animate-[upload-progress_1.2s_ease-in-out_infinite]" />
              </div>
              <span className="text-xs text-brand-purple-DEFAULT animate-pulse">Uploading...</span>
            </div>
          ) : state.imageUrl ? (
            <div className="relative w-full h-40 rounded-lg overflow-hidden border border-brand-gray-700 bg-brand-gray-900">
              <img src={state.imageUrl} alt="reference" className="w-full h-full object-contain" />
              <button
                type="button"
                onClick={() => onParamChange("imageUrl", null)}
                className="absolute top-2 right-2 p-1 rounded-full bg-black/70 hover:bg-black text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-24 rounded-lg border-2 border-dashed border-brand-gray-700 hover:border-brand-purple-DEFAULT/50 transition-colors flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-gray-200"
            >
              <Upload className="w-5 h-5" />
              <span className="text-sm">Click to upload image</span>
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      )}

      {/* Prompt */}
      <div className="space-y-1.5 flex-1">
        <Label className="text-xs text-gray-400 uppercase tracking-wider">Prompt</Label>
        <Textarea
          value={state.prompt}
          onChange={(e) => onParamChange("prompt", e.target.value)}
          placeholder="Describe your scene in detail — camera movement, lighting, subject actions..."
          className="min-h-[100px] bg-brand-gray-800 border-brand-gray-700 text-white placeholder:text-gray-500 resize-none focus:border-brand-purple-DEFAULT"
          maxLength={1000}
        />
        <p className="text-xs text-gray-500 text-right">{state.prompt.length}/1000</p>
      </div>

      {/* Size (Sora 2) — replaces aspectRatio + resolution */}
      {config.sizes && config.sizes.length > 0 && state.mode === "text-to-video" && (
        <ParamPill
          label="Size"
          options={config.sizes}
          value={state.size}
          onChange={(v) => onParamChange("size", v)}
        />
      )}

      {/* Aspect Ratio — non-sora models */}
      {(!config.sizes || config.sizes.length === 0) && (
        <ParamPill
          label="Aspect Ratio"
          options={config.aspectRatios}
          value={state.aspectRatio}
          onChange={(v) => onParamChange("aspectRatio", v)}
        />
      )}

      {/* Duration */}
      {config.durationSlider ? (
        <DurationSlider
          min={config.durationSlider.min}
          max={config.durationSlider.max}
          step={config.durationSlider.step}
          value={state.duration}
          onChange={(v) => onParamChange("duration", v)}
        />
      ) : (
        <ParamPill
          label="Duration"
          options={config.durations.map((d) => `${d}s`)}
          value={`${state.duration}s`}
          onChange={(v) => onParamChange("duration", parseInt(v) as number)}
        />
      )}

      {/* Resolution — non-sora models，无选项时整块隐藏 */}
      {(!config.sizes || config.sizes.length === 0) && config.resolutions && config.resolutions.length > 0 && (
        <ParamPill
          label="Resolution"
          options={config.resolutions}
          value={state.resolution}
          onChange={(v) => onParamChange("resolution", v)}
        />
      )}

      {/* Audio toggle */}
      {config.supportsAudio && (
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-400 uppercase tracking-wider">Audio</Label>
          <button
            type="button"
            onClick={() => onParamChange("audio", !state.audio)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-all duration-200",
              state.audio
                ? "border-brand-purple-DEFAULT bg-brand-purple-DEFAULT/20 text-white"
                : "border-brand-gray-700 bg-brand-gray-800 text-gray-400 hover:border-brand-gray-500 hover:text-white"
            )}
          >
            {state.audio ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            {state.audio ? "Audio ON" : "Audio OFF"}
          </button>
        </div>
      )}

      {/* Generate button */}
      <Button
        onClick={handleGenerate}
        disabled={state.isSubmitting || isJobActive || (!isAuthenticated ? false : !state.prompt.trim())}
        className="w-full py-5 text-base font-semibold bg-gradient-to-r from-brand-purple-DEFAULT to-brand-pink-DEFAULT text-white hover:opacity-90 transition-opacity rounded-xl mt-auto disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {state.isSubmitting || isJobActive ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Video ({credits} credits)
          </>
        )}
      </Button>
    </div>
  )
}

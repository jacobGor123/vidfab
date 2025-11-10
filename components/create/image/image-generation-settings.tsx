"use client"

/**
 * Image Generation Settings Component
 * 图片生成参数设置组件
 */

import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ASPECT_RATIOS, IMAGE_MODEL_CONFIG } from "@/lib/types/image"
import Image from "next/image"

interface ImageGenerationSettingsProps {
  model: string
  aspectRatio: string
  onModelChange: (model: string) => void
  onAspectRatioChange: (ratio: string) => void
  disabled?: boolean
  showAspectRatio?: boolean  // 是否显示宽高比选择（图生图不显示）
}

export function ImageGenerationSettings({
  model,
  aspectRatio,
  onModelChange,
  onAspectRatioChange,
  disabled = false,
  showAspectRatio = true
}: ImageGenerationSettingsProps) {
  return (
    <div className="space-y-4">
      {/* Model 选择 */}
      <div className="space-y-2">
        <Label className="text-gray-300">Model</Label>
        <Select
          value={model}
          onValueChange={onModelChange}
          disabled={disabled}
        >
          <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
            <SelectValue>
              {model && IMAGE_MODEL_CONFIG[model as keyof typeof IMAGE_MODEL_CONFIG] && (
                <div className="flex items-center gap-2">
                  <Image
                    src={IMAGE_MODEL_CONFIG[model as keyof typeof IMAGE_MODEL_CONFIG].icon}
                    alt={IMAGE_MODEL_CONFIG[model as keyof typeof IMAGE_MODEL_CONFIG].name}
                    width={20}
                    height={20}
                    className="rounded"
                  />
                  <span>{IMAGE_MODEL_CONFIG[model as keyof typeof IMAGE_MODEL_CONFIG].name}</span>
                </div>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="bg-gray-900 border-gray-700">
            {Object.entries(IMAGE_MODEL_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key} className="transition-all duration-200">
                <div className="flex items-center gap-2">
                  <Image
                    src={config.icon}
                    alt={config.name}
                    width={20}
                    height={20}
                    className="rounded"
                  />
                  <span>{config.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Aspect Ratio 选择 */}
      {showAspectRatio && (
        <div className="space-y-2">
          <Label className="text-gray-300">Aspect Ratio</Label>
          <div className="grid grid-cols-5 gap-2">
            {ASPECT_RATIOS.map((ratio) => (
              <button
                key={ratio}
                onClick={() => onAspectRatioChange(ratio)}
                disabled={disabled}
                className={`py-2 px-3 rounded-md text-sm font-medium transition-all disabled:opacity-50 ${
                  aspectRatio === ratio
                    ? "bg-primary text-primary-foreground"
                    : "bg-gray-800 text-gray-400 hover:bg-primary/80 hover:text-white"
                }`}
              >
                {ratio}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

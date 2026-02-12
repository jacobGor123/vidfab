/**
 * Image Style Selector Component
 */

'use client'

import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { IMAGE_STYLES, type ImageStyle } from '@/lib/services/video-agent/character-prompt-generator'

interface ImageStyleSelectorProps {
  value: ImageStyle
  onChange: (value: ImageStyle) => void
  disabled: boolean
}

export function ImageStyleSelector({ value, onChange, disabled }: ImageStyleSelectorProps) {
  return (
    <div className="space-y-3">
      <Label className="text-white/70 text-sm font-medium">Image Style</Label>
      <Select value={value} onValueChange={(v) => onChange(v as ImageStyle)} disabled={disabled}>
        <SelectTrigger className="h-12 bg-[#0f1117] border border-white/20 text-white hover:bg-[#0f1117] focus:ring-2 focus:ring-[#7B5CFF]/50 rounded-xl">
          <SelectValue placeholder="Select an image style" />
        </SelectTrigger>
        <SelectContent className="bg-slate-900 border-white/10 backdrop-blur-xl rounded-xl">
          {Object.entries(IMAGE_STYLES).map(([key, style]) => (
            <SelectItem
              key={key}
              value={key}
              className="text-white hover:bg-white/10 focus:bg-white/10 cursor-pointer text-left"
            >
              {style.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

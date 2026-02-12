/**
 * YouTube URL Input Component
 */

'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface YouTubeInputProps {
  value: string
  onChange: (value: string) => void
  disabled: boolean
}

export function YouTubeInput({ value, onChange, disabled }: YouTubeInputProps) {
  return (
    <div className="space-y-3">
      <Label className="text-white/70 text-sm font-medium">YouTube Video URL</Label>
      <Input
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://www.youtube.com/watch?v=..."
        disabled={disabled}
        className="h-12 bg-white/5 border border-[#7B5CFF]/50 text-white placeholder:text-white/30 focus-visible:ring-2 focus-visible:ring-[#7B5CFF]/50 rounded-xl"
      />
    </div>
  )
}

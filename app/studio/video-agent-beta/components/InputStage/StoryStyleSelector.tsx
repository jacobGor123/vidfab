'use client'

import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

const STORY_STYLES = [
  { value: 'auto', label: 'Auto' },
  { value: 'comedy', label: 'Comedy' },
  { value: 'mystery', label: 'Mystery' },
  { value: 'moral', label: 'Moral' },
  { value: 'twist', label: 'Twist' },
  { value: 'suspense', label: 'Suspense' },
  { value: 'warmth', label: 'Warmth' },
  { value: 'inspiration', label: 'Inspire' }
]

interface StoryStyleSelectorProps {
  value: string
  onChange: (value: string) => void
}

export default function StoryStyleSelector({ value, onChange }: StoryStyleSelectorProps) {
  return (
    <div className="space-y-3">
      <Label className="text-white/50 text-xs font-bold uppercase tracking-widest">
        STORY STYLE
      </Label>
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
        {STORY_STYLES.map((style) => (
          <button
            key={style.value}
            onClick={() => onChange(style.value)}
            className={cn(
              "flex-shrink-0 px-5 py-2.5 text-sm font-medium transition-all",
              value === style.value
                ? "rounded-md text-white"
                : "rounded-lg border border-slate-700/50 bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 hover:border-blue-400/60 hover:shadow-[0_0_8px_rgba(96,165,250,0.3)]"
            )}
            style={
              value === style.value
                ? {
                    border: '0.6px solid #7A5BFC',
                    background: '#211F43',
                    boxShadow: '0 -4px 12.6px 0 rgba(51, 48, 98, 0.50) inset, 0 4px 12.6px 0 rgba(51, 48, 98, 0.50) inset'
                  }
                : undefined
            }
          >
            {style.label}
          </button>
        ))}
      </div>
    </div>
  )
}

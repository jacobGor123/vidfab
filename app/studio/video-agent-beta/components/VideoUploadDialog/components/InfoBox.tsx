/**
 * Info Box Component
 */

'use client'

import { AlertCircle } from 'lucide-react'

interface InfoBoxProps {
  duration: number
  storyStyle: string
}

export function InfoBox({ duration, storyStyle }: InfoBoxProps) {
  return (
    <div className="bg-[#2a2416] border border-[#4a3f1f] rounded-xl p-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-[#D4AF37] flex-shrink-0 mt-0.5" />
        <div className="text-sm text-white/70 space-y-2">
          <p className="font-semibold text-white/90">Tips:</p>
          <ul className="list-disc list-inside space-y-1.5 text-sm">
            <li>Only public YouTube videos are supported</li>
            <li>Video analysis may take 1-2 minutes depending on video length</li>
            <li>The generated script will be editable before creating the project</li>
            <li>Current settings (duration: {duration}s, style: {storyStyle}) will be used</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

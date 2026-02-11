'use client'

import Image from 'next/image'
import { Volume2, VolumeX } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

const DURATIONS = [
  { value: 15, label: '15s' },
  { value: 30, label: '30s' },
  { value: 45, label: '45s' },
  { value: 60, label: '60s' }
]

interface VideoToolbarProps {
  aspectRatio: '16:9' | '9:16'
  onAspectRatioChange: (value: '16:9' | '9:16') => void
  duration: number
  onDurationChange: (value: number) => void
  muteBgm: boolean
  onMuteBgmChange: (value: boolean) => void
  charCount: number
  onAIInspiration: () => void
  onAnalyzeVideo: () => void
  isGeneratingInspiration: boolean
}

export default function VideoToolbar({
  aspectRatio,
  onAspectRatioChange,
  duration,
  onDurationChange,
  muteBgm,
  onMuteBgmChange,
  charCount,
  onAIInspiration,
  onAnalyzeVideo,
  isGeneratingInspiration
}: VideoToolbarProps) {
  return (
    <div
      className="absolute bottom-0 inset-x-0"
      style={{
        background: '#181921',
        borderTop: '1px solid #23263A',
        borderBottomLeftRadius: '13px',
        borderBottomRightRadius: '13px',
        paddingTop: '12px',
        paddingBottom: '16px'
      }}
    >
      <div className="flex flex-col md:flex-row justify-between items-center gap-3 md:gap-4">
        {/* 左侧工具组 */}
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          {/* Aspect Ratio Select */}
          <Select value={aspectRatio} onValueChange={onAspectRatioChange}>
            <SelectTrigger className={cn(selectTriggerClass, "group")}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" className="w-4 h-4 mr-1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="#AAA9B4" strokeWidth="2" className="group-hover:stroke-white transition-all"/>
                <line x1="9" y1="3" x2="9" y2="21" stroke="#AAA9B4" strokeWidth="2" className="group-hover:stroke-white transition-all"/>
              </svg>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={selectContentClass}>
              <SelectItem value="16:9" className={selectItemClass}>16:9</SelectItem>
              <SelectItem value="9:16" className={selectItemClass}>9:16</SelectItem>
            </SelectContent>
          </Select>

          {/* Duration Select */}
          <Select value={duration.toString()} onValueChange={(v) => onDurationChange(parseInt(v))}>
            <SelectTrigger className={cn(selectTriggerClass, "group")}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" className="w-4 h-4 mr-1.5">
                <circle cx="12" cy="12" r="10" stroke="#AAA9B4" strokeWidth="2" className="group-hover:stroke-white transition-all"/>
                <path d="M12 6v6l4 2" stroke="#AAA9B4" strokeWidth="2" strokeLinecap="round" className="group-hover:stroke-white transition-all"/>
              </svg>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={selectContentClass}>
              {DURATIONS.map(d => (
                <SelectItem key={d.value} value={d.value.toString()} className={selectItemClass}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Volume Button */}
          <button
            onClick={() => onMuteBgmChange(!muteBgm)}
            className={cn(
              "flex items-center justify-center h-9 w-9 rounded-lg transition-all group",
              muteBgm
                ? "bg-slate-800/50 border border-slate-700/50 hover:bg-slate-700/50 hover:border-blue-400/60 hover:shadow-[0_0_8px_rgba(96,165,250,0.3)]"
                : "bg-blue-600/90 border border-blue-500/50 shadow-lg shadow-blue-900/20"
            )}
            title={muteBgm ? "Enable Background Music" : "Mute Background Music"}
          >
            {muteBgm ? (
              <VolumeX className="w-4 h-4 text-[#AAA9B4] group-hover:text-white transition-all" />
            ) : (
              <Volume2 className="w-4 h-4 text-white" />
            )}
          </button>

          {/* AI Inspiration */}
          <button
            onClick={onAIInspiration}
            disabled={isGeneratingInspiration}
            className={cn(buttonClass, "group")}
          >
            {isGeneratingInspiration ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="16" viewBox="0 0 15 16" fill="none" className="w-4 h-4">
                <path d="M11.5034 0.146645C11.5605 -0.0488815 11.8375 -0.0488815 11.8945 0.146645L12.3589 1.73529C12.3685 1.76816 12.3862 1.79808 12.4104 1.82228C12.4346 1.84649 12.4645 1.86421 12.4974 1.87379L14.086 2.33817C14.2815 2.39519 14.2815 2.67219 14.086 2.72922L12.4974 3.19359C12.4645 3.20318 12.4346 3.22089 12.4104 3.2451C12.3862 3.26931 12.3685 3.29922 12.3589 3.33209L11.8945 4.92074C11.8375 5.11626 11.5605 5.11626 11.5034 4.92074L11.0391 3.33209C11.0295 3.29922 11.0118 3.26931 10.9876 3.2451C10.9634 3.22089 10.9334 3.20318 10.9006 3.19359L9.31193 2.72922C9.1164 2.67219 9.1164 2.39519 9.31193 2.33817L10.9006 1.87379C10.9334 1.86421 10.9634 1.84649 10.9876 1.82228C11.0118 1.79808 11.0295 1.76816 11.0391 1.73529L11.5034 0.146645ZM3.74758 2.18337C3.69055 1.98785 3.41356 1.98785 3.35653 2.18337L2.6616 4.55983C2.65201 4.59269 2.6343 4.62261 2.61009 4.64682C2.58588 4.67103 2.55597 4.68874 2.5231 4.69833L0.146645 5.39326C-0.0488815 5.45029 -0.0488815 5.72728 0.146645 5.78431L2.5231 6.47924C2.55597 6.48883 2.58588 6.50654 2.61009 6.53075C2.6343 6.55496 2.65201 6.58488 2.6616 6.61774L3.35653 8.9942C3.41356 9.18972 3.69055 9.18972 3.74758 8.9942L4.44251 6.61774C4.4521 6.58488 4.46981 6.55496 4.49402 6.53075C4.51823 6.50654 4.54815 6.48883 4.58101 6.47924L6.95665 5.78431C7.15218 5.72728 7.15218 5.45029 6.95665 5.39326L4.58101 4.69833C4.54815 4.68874 4.51823 4.67103 4.49402 4.64682C4.46981 4.62261 4.4521 4.59269 4.44251 4.55983L3.74758 2.18337ZM9.52619 5.0796C9.7599 5.21472 9.9304 5.4371 10.0002 5.69787C10.07 5.95865 10.0334 6.23647 9.89851 6.47028L4.80668 15.2909C4.7403 15.4077 4.65148 15.5102 4.54534 15.5925C4.4392 15.6747 4.31783 15.7352 4.18822 15.7704C4.05861 15.8056 3.92332 15.8148 3.79014 15.7975C3.65696 15.7802 3.52851 15.7367 3.41221 15.6695C3.2959 15.6024 3.19402 15.5129 3.11244 15.4062C3.03086 15.2995 2.97119 15.1778 2.93686 15.0479C2.90254 14.9181 2.89423 14.7827 2.91242 14.6497C2.93062 14.5166 2.97495 14.3884 3.04287 14.2726L8.1347 5.45273C8.2016 5.3369 8.29067 5.23539 8.39681 5.15398C8.50296 5.07258 8.6241 5.01289 8.75332 4.97831C8.88253 4.94374 9.0173 4.93496 9.14991 4.95248C9.28252 4.97 9.41038 5.01347 9.52619 5.08042V5.0796ZM11.8945 9.31193C11.8375 9.1164 11.5605 9.1164 11.5034 9.31193L11.2696 10.1128C11.26 10.1456 11.2423 10.1756 11.2181 10.1998C11.1939 10.224 11.164 10.2417 11.1311 10.2513L10.3303 10.4851C10.1348 10.5421 10.1348 10.8191 10.3303 10.8761L11.1311 11.11C11.164 11.1195 11.1939 11.1373 11.2181 11.1615C11.2423 11.1857 11.26 11.2156 11.2696 11.2484L11.5034 12.0493C11.5605 12.2448 11.8375 12.2448 11.8945 12.0493L12.1283 11.2484C12.1379 11.2156 12.1556 11.1857 12.1798 11.1615C12.204 11.1373 12.2339 11.1195 12.2668 11.11L13.0677 10.8761C13.2632 10.8191 13.2632 10.5421 13.0677 10.4851L12.2668 10.2513C12.2339 10.2417 12.204 10.224 12.1798 10.1998C12.1556 10.1756 12.1379 10.1456 12.1283 10.1128L11.8945 9.31193Z" fill="#AAA9B4" className="group-hover:fill-white transition-all"/>
              </svg>
            )}
            <span className="hidden sm:inline">AI Inspiration</span>
          </button>
        </div>

        {/* 右侧工具组 */}
        <div className="flex items-center gap-2 md:gap-3 justify-end">
          <div className="text-xs text-white/40 font-mono px-2">{charCount} chars</div>
          <button
            onClick={onAnalyzeVideo}
            className={analyzeButtonClass}
            style={{
              backgroundColor: 'transparent',
              border: '0.5px solid #CFCBFF',
              color: '#CFCBFF'
            }}
          >
            <Image
              src="/logo/analyze-video-icon.svg"
              alt="Analyze"
              width={20}
              height={20}
              className="flex-shrink-0"
            />
            <span className="hidden sm:inline">Analyze Video</span>
          </button>
        </div>
      </div>
    </div>
  )
}

// 样式常量
const selectTriggerClass = cn(
  "w-[100px] h-9 px-3 py-2",
  "bg-slate-800/50 hover:bg-slate-700/50",
  "border border-slate-700/50 hover:border-blue-400/60",
  "text-[#AAA9B4] hover:text-white text-sm font-medium",
  "rounded-lg transition-all",
  "focus:ring-2 focus:ring-purple-500/50",
  "hover:shadow-[0_0_8px_rgba(96,165,250,0.3)]"
)

const selectContentClass = cn(
  "bg-slate-900 border-slate-700",
  "rounded-lg shadow-xl backdrop-blur-xl z-[100]"
)

const selectItemClass = cn(
  "text-white text-sm",
  "hover:bg-slate-800 focus:bg-slate-800",
  "cursor-pointer transition-colors"
)

const buttonClass = cn(
  "flex items-center gap-2 h-9 px-3 py-2 rounded-lg",
  "bg-slate-800/50 hover:bg-slate-700/50",
  "border border-slate-700/50 hover:border-blue-400/60",
  "text-[#AAA9B4] hover:text-white text-sm font-medium transition-all",
  "hover:shadow-[0_0_8px_rgba(96,165,250,0.3)]"
)

const analyzeButtonClass = "flex items-center gap-2 h-10 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 hover:shadow-[0_0_12px_rgba(207,203,255,0.4)]"

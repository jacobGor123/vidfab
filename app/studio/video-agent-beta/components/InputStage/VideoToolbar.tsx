'use client'

import { Mic, Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'
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

interface VideoToolbarProps {
  aspectRatio: '16:9' | '9:16'
  onAspectRatioChange: (value: '16:9' | '9:16') => void
  duration: number
  onDurationChange: (value: number) => void
  muteBgm: boolean
  onMuteBgmChange: (value: boolean) => void
  onAIInspiration: () => void
  isGeneratingInspiration: boolean
  storyStyle: string
  onStoryStyleChange: (value: string) => void
  onSubmit: () => void
  isLoading: boolean
  hasScript: boolean
}

// 工具栏内复用的 sparkle 图标
function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="16" viewBox="0 0 15 16" fill="none"
      className={cn("w-3.5 h-3.5 flex-shrink-0", className)}>
      <path d="M11.5034 0.146645C11.5605 -0.0488815 11.8375 -0.0488815 11.8945 0.146645L12.3589 1.73529C12.3685 1.76816 12.3862 1.79808 12.4104 1.82228C12.4346 1.84649 12.4645 1.86421 12.4974 1.87379L14.086 2.33817C14.2815 2.39519 14.2815 2.67219 14.086 2.72922L12.4974 3.19359C12.4645 3.20318 12.4346 3.22089 12.4104 3.2451C12.3862 3.26931 12.3685 3.29922 12.3589 3.33209L11.8945 4.92074C11.8375 5.11626 11.5605 5.11626 11.5034 4.92074L11.0391 3.33209C11.0295 3.29922 11.0118 3.26931 10.9876 3.2451C10.9634 3.22089 10.9334 3.20318 10.9006 3.19359L9.31193 2.72922C9.1164 2.67219 9.1164 2.39519 9.31193 2.33817L10.9006 1.87379C10.9334 1.86421 10.9634 1.84649 10.9876 1.82228C11.0118 1.79808 11.0295 1.76816 11.0391 1.73529L11.5034 0.146645ZM3.74758 2.18337C3.69055 1.98785 3.41356 1.98785 3.35653 2.18337L2.6616 4.55983C2.65201 4.59269 2.6343 4.62261 2.61009 4.64682C2.58588 4.67103 2.55597 4.68874 2.5231 4.69833L0.146645 5.39326C-0.0488815 5.45029 -0.0488815 5.72728 0.146645 5.78431L2.5231 6.47924C2.55597 6.48883 2.58588 6.50654 2.61009 6.53075C2.6343 6.55496 2.65201 6.58488 2.6616 6.61774L3.35653 8.9942C3.41356 9.18972 3.69055 9.18972 3.74758 8.9942L4.44251 6.61774C4.4521 6.58488 4.46981 6.55496 4.49402 6.53075C4.51823 6.50654 4.54815 6.48883 4.58101 6.47924L6.95665 5.78431C7.15218 5.72728 7.15218 5.45029 6.95665 5.39326L4.58101 4.69833C4.54815 4.68874 4.51823 4.67103 4.49402 4.64682C4.46981 4.62261 4.4521 4.59269 4.44251 4.55983L3.74758 2.18337ZM11.8945 9.31193C11.8375 9.1164 11.5605 9.1164 11.5034 9.31193L11.2696 10.1128C11.26 10.1456 11.2423 10.1756 11.2181 10.1998C11.1939 10.224 11.164 10.2417 11.1311 10.2513L10.3303 10.4851C10.1348 10.5421 10.1348 10.8191 10.3303 10.8761L11.1311 11.11C11.164 11.1195 11.1939 11.1373 11.2181 11.1615C11.2423 11.1857 11.26 11.2156 11.2696 11.2484L11.5034 12.0493C11.5605 12.2448 11.8375 12.2448 11.8945 12.0493L12.1283 11.2484C12.1379 11.2156 12.1556 11.1857 12.1798 11.1615C12.204 11.1373 12.2339 11.1195 12.2668 11.11L13.0677 10.8761C13.2632 10.8191 13.2632 10.5421 13.0677 10.4851L12.2668 10.2513C12.2339 10.2417 12.204 10.224 12.1798 10.1998C12.1556 10.1756 12.1379 10.1456 12.1283 10.1128L11.8945 9.31193Z" fill="currentColor"/>
    </svg>
  )
}

export default function VideoToolbar({
  aspectRatio,
  onAspectRatioChange,
  duration,
  onDurationChange,
  muteBgm,
  onMuteBgmChange,
  onAIInspiration,
  isGeneratingInspiration,
  storyStyle,
  onStoryStyleChange,
  onSubmit,
  isLoading,
  hasScript,
}: VideoToolbarProps) {
  const t = useTranslations('studio')

  const STYLE_KEY_MAP: Record<string, string> = {
    auto: 'storyToVideo.styleAuto',
    comedy: 'storyToVideo.styleComedy',
    mystery: 'storyToVideo.styleMystery',
    moral: 'storyToVideo.styleMoral',
    twist: 'storyToVideo.styleTwist',
    suspense: 'storyToVideo.styleSuspense',
    warmth: 'storyToVideo.styleWarmth',
    inspiration: 'storyToVideo.styleInspire',
  }

  function getStyleLabel(value: string): string {
    const key = STYLE_KEY_MAP[value]
    return key ? t(key) : value
  }

  return (
    <div
      className="absolute bottom-0 inset-x-0 flex items-center gap-2 px-4 overflow-x-auto scrollbar-hide"
      style={{
        background: '#181921',
        borderTop: '1px solid #23263A',
        borderBottomLeftRadius: '13px',
        borderBottomRightRadius: '13px',
        paddingTop: '10px',
        paddingBottom: '10px',
      }}
    >
      {/* 左侧工具组 — shrink-0 不压缩，内容自撑开 */}
      <div className="flex items-center gap-1.5 shrink-0">

        {/* Aspect Ratio */}
        <Select value={aspectRatio} onValueChange={onAspectRatioChange}>
          <SelectTrigger className={cn(toolBtnClass, "w-auto px-3")}>
            {/* Filled aspect ratio icon — outer frame minus inner cutout + vertical divider */}
            <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 flex-shrink-0">
              <path fillRule="evenodd" clipRule="evenodd" d="M2 3C2 2.44772 2.44772 2 3 2H13C13.5523 2 14 2.44772 14 3V13C14 13.5523 13.5523 14 13 14H3C2.44772 14 2 13.5523 2 13V3ZM3.4 3.4V12.6H12.6V3.4H3.4Z" fill="currentColor"/>
              <rect x="5.7" y="3.4" width="1.3" height="9.2" fill="currentColor"/>
            </svg>
            <SelectValue />
          </SelectTrigger>
          <SelectContent side="top" className={selectContentClass}>
            <SelectItem value="16:9" className={selectItemClass}>16:9</SelectItem>
            <SelectItem value="9:16" className={selectItemClass}>9:16</SelectItem>
          </SelectContent>
        </Select>

        {/* Duration */}
        <Select value={duration.toString()} onValueChange={(v) => onDurationChange(parseInt(v))}>
          <SelectTrigger className={cn(toolBtnClass, "w-auto px-3")}>
            {/* Filled clock icon — Figma design (604:128) */}
            <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 flex-shrink-0">
              <path d="M8 0C3.58865 0 0 3.58865 0 8C0 12.4113 3.58865 16 8 16C12.4113 16 16 12.4113 16 8C16 3.58865 12.4113 0 8 0ZM8 14.6666C4.32399 14.6666 1.33332 11.676 1.33332 8C1.33332 4.32399 4.32399 1.33332 8 1.33332C11.676 1.33332 14.6666 4.32399 14.6666 8C14.6666 11.676 11.676 14.6666 8 14.6666Z" fill="currentColor"/>
              <path d="M11.099 9.9607L8.33364 8.36137V4.00006C8.33364 3.63206 8.03497 3.33339 7.66698 3.33339C7.29898 3.33339 7.00031 3.63206 7.00031 4.00006V8.6667C7.00031 8.91404 7.30764 9.12137 7.50763 9.23603C7.56297 9.31936 7.71497 9.39469 7.80763 9.44803L10.5576 11.1147C10.8763 11.2987 11.2216 11.1893 11.4056 10.8707C11.5896 10.552 11.4183 10.1447 11.099 9.9607Z" fill="currentColor"/>
            </svg>
            <SelectValue />
          </SelectTrigger>
          <SelectContent side="top" className={selectContentClass}>
            {DURATIONS.map(d => (
              <SelectItem key={d.value} value={d.value.toString()} className={selectItemClass}>
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* BGM 开关 — mic 图标 */}
        <button
          onClick={() => onMuteBgmChange(!muteBgm)}
          title={muteBgm ? t('storyToVideo.enableBgm') : t('storyToVideo.muteBgm')}
          className={cn(
            "flex items-center justify-center w-9 h-8 rounded-lg transition-all flex-shrink-0",
            muteBgm
              ? "bg-slate-800/50 border border-slate-700/50 text-[#AAA9B4] hover:text-white hover:border-blue-400/50"
              : "bg-blue-600/90 border border-blue-500/50 text-white shadow-lg shadow-blue-900/20"
          )}
        >
          <Mic className="w-3.5 h-3.5" />
        </button>

        {/* AI Inspiration */}
        <button
          onClick={onAIInspiration}
          disabled={isGeneratingInspiration}
          className={cn(toolBtnClass, "gap-1.5 px-3")}
        >
          {isGeneratingInspiration ? (
            <div className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
          ) : (
            <SparkleIcon />
          )}
          <span>{t('storyToVideo.aiInspiration')}</span>
        </button>

        {/* Story Style 下拉 */}
        <Select value={storyStyle} onValueChange={onStoryStyleChange}>
          <SelectTrigger className={cn(toolBtnClass, "gap-1.5 px-3 w-auto [&>svg:last-child]:hidden")}>
            <SparkleIcon />
            <span>{t('storyToVideo.storyStyle')}: <span className="capitalize">{getStyleLabel(storyStyle)}</span></span>
          </SelectTrigger>
          <SelectContent className={selectContentClass}>
            {STORY_STYLES.map(s => (
              <SelectItem key={s.value} value={s.value} className={selectItemClass}>
                {getStyleLabel(s.value)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 右侧：Generate Video 胶囊按钮 — ml-auto 固定右对齐 */}
      <button
        onClick={onSubmit}
        disabled={isLoading || !hasScript}
        className={cn(
          "ml-auto flex items-center gap-1.5 px-4 h-9 rounded-full text-base font-bold whitespace-nowrap transition-all duration-300 flex-shrink-0",
          isLoading || !hasScript
            ? "bg-gradient-disabled cursor-not-allowed text-white/40"
            : "bg-gradient-primary text-white shadow-glow-primary"
        )}
      >
        {isLoading ? (
          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <Sparkles className="w-3.5 h-3.5" />
        )}
        <span>{t('storyToVideo.generateVideo')}</span>
      </button>
    </div>
  )
}

const toolBtnClass = cn(
  "flex items-center gap-1.5 h-8 rounded-lg text-base font-medium transition-all",
  "bg-slate-800/50 border border-slate-700/50 text-[#AAA9B4]",
  "hover:bg-slate-700/50 hover:border-blue-400/50 hover:text-white",
  "focus:ring-0 focus:ring-offset-0"
)

const selectContentClass = cn(
  "bg-slate-900 border-slate-700 rounded-lg shadow-xl backdrop-blur-xl z-[100]"
)

const selectItemClass = cn(
  "text-white text-sm hover:bg-slate-800 focus:bg-slate-800 cursor-pointer"
)

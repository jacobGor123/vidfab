"use client"

export type TypeFilter = 'all' | 'story' | 'video' | 'image'
export type SortOrder = 'newest' | 'oldest'

interface AssetFilterBarProps {
  total: number
  videoCount: number
  imageCount: number
  typeFilter: TypeFilter
  onTypeFilterChange: (v: TypeFilter) => void
  sortOrder: SortOrder
  onSortOrderChange: (v: SortOrder) => void
}

// 双向排序图标 (↕)
function SortIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M4 5.5L7 2.5L10 5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M4 8.5L7 11.5L10 8.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// 向下箭头 (for Creation Time dropdown)
function ChevronDown() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// 内联 SVG 图标，使用 currentColor 描边，避免原始文件的 opacity:0.3 问题
function StoryIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3.5C8.2 2.6 7 2 5.5 2H2v12h3.5C7 14 8.2 14.6 9 15.5"/>
      <path d="M9 3.5C9.8 2.6 11 2 12.5 2H16v12h-3.5C11 14 9.8 14.6 9 15.5"/>
    </svg>
  )
}

function VideoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="4.5" width="11" height="9" rx="1.5"/>
      <path d="M12.5 7.2L16.5 5v8l-4-2.2"/>
    </svg>
  )
}

function ImageIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="14" height="14" rx="2"/>
      <circle cx="6.5" cy="6.5" r="1.2" fill="currentColor" stroke="none"/>
      <path d="M2 12l4-4 3 3 2.5-3 4.5 5"/>
    </svg>
  )
}

const TYPE_OPTIONS: { key: TypeFilter; label?: string; Icon?: React.FC; title: string }[] = [
  { key: 'all',   label: 'All',  title: 'All types' },
  { key: 'story', Icon: StoryIcon, title: 'Story videos' },
  { key: 'video', Icon: VideoIcon, title: 'Videos' },
  { key: 'image', Icon: ImageIcon, title: 'Images' },
]

export function AssetFilterBar({
  total, videoCount, imageCount,
  typeFilter, onTypeFilterChange,
  sortOrder, onSortOrderChange,
}: AssetFilterBarProps) {
  return (
    <div
      className="flex-shrink-0 flex items-center justify-between gap-4 px-3 py-2.5 md:px-6"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Left: stats */}
      <p className="text-sm whitespace-nowrap hidden md:block" style={{ color: '#9b9ab4' }}>
        Total:&nbsp;<span style={{ color: '#9d9ab8' }}>{total}</span>&nbsp;assets
        &nbsp;•&nbsp;<span style={{ color: '#9d9ab8' }}>{videoCount}</span>&nbsp;videos
        &nbsp;•&nbsp;<span style={{ color: '#9d9ab8' }}>{imageCount}</span>&nbsp;images
      </p>

      {/* Right controls */}
      <div className="flex items-center gap-3 ml-auto">

        {/* Type label + grouped buttons */}
        <div className="flex items-center gap-2">
          <span className="text-sm" style={{ color: '#9b9ab4' }}>Type:</span>

          {/* Single container for all type options */}
          <div
            className="flex items-center p-[3px]"
            style={{ border: '1.5px solid rgba(255,255,255,0.25)', borderRadius: 8 }}
          >
            {TYPE_OPTIONS.map(({ key, label, Icon, title }) => {
              const active = typeFilter === key
              return (
                <button
                  key={key}
                  title={title}
                  onClick={() => onTypeFilterChange(key)}
                  className="flex items-center justify-center transition-all duration-150"
                  style={{
                    width: 36, height: 32,
                    borderRadius: 8,
                    background: active ? 'rgba(255,255,255,0.15)' : 'transparent',
                  }}
                >
                  {label ? (
                    <span
                      className="text-sm font-medium"
                      style={{ color: active ? '#ffffff' : '#c4c3d8' }}
                    >
                      {label}
                    </span>
                  ) : Icon ? (
                    <span style={{ color: active ? '#ffffff' : '#c4c3d8', display: 'flex' }}>
                      <Icon />
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>

        {/* Vertical divider */}
        <div className="h-6 w-px" style={{ background: 'rgba(255,255,255,0.1)' }} />

        {/* Sort by */}
        <div className="flex items-center gap-2">
          <span className="text-sm" style={{ color: '#9b9ab4' }}>Sort by:</span>

          {/* Creation Time (static, only one sort field) */}
          <button
            className="flex items-center gap-1.5 px-3 rounded-xl text-sm transition-all duration-150 cursor-default"
            style={{
              height: 36,
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#c4c3d8',
            }}
            disabled
          >
            Creation Time
            <ChevronDown />
          </button>

          {/* Newest / Oldest toggle */}
          <button
            onClick={() => onSortOrderChange(sortOrder === 'newest' ? 'oldest' : 'newest')}
            className="flex items-center gap-1.5 px-3 rounded-xl text-sm font-medium transition-all duration-150"
            style={{
              height: 36,
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#c4c3d8',
            }}
          >
            {sortOrder === 'newest' ? 'Newest' : 'Oldest'}
            <SortIcon />
          </button>
        </div>
      </div>
    </div>
  )
}

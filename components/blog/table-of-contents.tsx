/**
 * 文章目录组件 (Table of Contents)
 *
 * 功能：
 * - PC端 (≥1024px): 左侧固定式 TOC，跟随滚动
 * - 移动端 (<1024px): 顶部折叠式 TOC，点击展开
 * - 滚动监听：高亮当前阅读章节
 * - 平滑跳转：点击目录项平滑滚动到对应章节
 */

'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, List } from 'lucide-react'
import { TocHeading } from '@/lib/blog/toc'

interface TableOfContentsProps {
  headings: TocHeading[]
}

/**
 * 监听当前激活的章节 ID
 */
function useActiveSection(headingIds: string[]) {
  const [activeId, setActiveId] = useState<string>('')

  useEffect(() => {
    if (headingIds.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        })
      },
      {
        rootMargin: '-100px 0px -66%',
        threshold: 0,
      }
    )

    // 观察所有标题元素
    headingIds.forEach((id) => {
      const element = document.getElementById(id)
      if (element) {
        observer.observe(element)
      }
    })

    return () => {
      observer.disconnect()
    }
  }, [headingIds])

  return activeId
}

/**
 * 桌面端侧边栏 TOC
 */
function DesktopToc({
  headings,
  activeId,
}: {
  headings: TocHeading[]
  activeId: string
}) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  // 从 localStorage 读取用户偏好
  useEffect(() => {
    const saved = localStorage.getItem('toc-collapsed')
    if (saved !== null) {
      setIsCollapsed(saved === 'true')
    }
  }, [])

  // 保存用户偏好
  const toggleCollapse = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    localStorage.setItem('toc-collapsed', String(newState))
  }

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault()
    const element = document.getElementById(id)
    if (element) {
      const top = element.offsetTop - 100 // 预留顶部空间
      window.scrollTo({ top, behavior: 'smooth' })
    }
  }

  // 收起状态：只显示一个展开按钮
  if (isCollapsed) {
    return (
      <button
        onClick={toggleCollapse}
        className="hidden lg:flex fixed top-32 left-4 z-40 items-center justify-center w-10 h-10 rounded-lg border border-brand-gray-700 bg-brand-gray-800/50 backdrop-blur-sm hover:bg-brand-gray-700/50 transition-colors group"
        aria-label="Expand table of contents"
      >
        <List className="w-5 h-5 text-gray-400 group-hover:text-brand-purple-DEFAULT transition-colors" />
      </button>
    )
  }

  return (
    <aside className="hidden lg:block fixed top-32 left-8 xl:left-16 w-64 max-h-[calc(100vh-200px)] overflow-y-auto z-40">
      <nav className="rounded-xl border border-brand-gray-700 bg-brand-gray-800/50 backdrop-blur-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <List className="w-4 h-4 text-brand-purple-DEFAULT" />
            Table of Contents
          </h2>
          <button
            onClick={toggleCollapse}
            className="p-1 rounded hover:bg-brand-gray-700/50 transition-colors group"
            aria-label="Collapse table of contents"
          >
            <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors rotate-90" />
          </button>
        </div>
        <ul className="space-y-2 text-sm">
          {headings.map((heading) => (
            <li key={heading.id}>
              <a
                href={`#${heading.id}`}
                onClick={(e) => handleClick(e, heading.id)}
                className={`block py-1.5 px-3 rounded-lg transition-all ${
                  activeId === heading.id
                    ? 'bg-brand-purple-DEFAULT/20 text-brand-purple-DEFAULT font-medium border-l-2 border-brand-purple-DEFAULT'
                    : 'text-gray-400 hover:text-white hover:bg-brand-gray-700/50'
                }`}
              >
                {heading.text}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}

/**
 * 移动端折叠式 TOC
 */
function MobileToc({
  headings,
  activeId,
}: {
  headings: TocHeading[]
  activeId: string
}) {
  const [isOpen, setIsOpen] = useState(false)

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault()
    const element = document.getElementById(id)
    if (element) {
      const top = element.offsetTop - 100
      window.scrollTo({ top, behavior: 'smooth' })
    }
    setIsOpen(false) // 跳转后自动收起
  }

  return (
    <div className="lg:hidden mb-8">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-brand-gray-700 bg-brand-gray-800/50 backdrop-blur-sm text-left hover:bg-brand-gray-700/50 transition-colors"
      >
        <span className="text-sm font-semibold text-white flex items-center gap-2">
          <List className="w-4 h-4 text-brand-purple-DEFAULT" />
          Table of Contents
        </span>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {isOpen && (
        <nav className="mt-2 rounded-xl border border-brand-gray-700 bg-brand-gray-800/50 backdrop-blur-sm p-4">
          <ul className="space-y-2 text-sm">
            {headings.map((heading) => (
              <li key={heading.id}>
                <a
                  href={`#${heading.id}`}
                  onClick={(e) => handleClick(e, heading.id)}
                  className={`block py-2 px-3 rounded-lg transition-all ${
                    activeId === heading.id
                      ? 'bg-brand-purple-DEFAULT/20 text-brand-purple-DEFAULT font-medium'
                      : 'text-gray-400 hover:text-white hover:bg-brand-gray-700/50'
                  }`}
                >
                  {heading.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  )
}

/**
 * 主组件
 */
export function TableOfContents({ headings }: TableOfContentsProps) {
  // 如果没有标题，不渲染组件
  if (!headings || headings.length === 0) {
    return null
  }

  const headingIds = headings.map((h) => h.id)
  const activeId = useActiveSection(headingIds)

  return (
    <>
      {/* 移动端折叠式 TOC */}
      <MobileToc headings={headings} activeId={activeId} />

      {/* 桌面端固定式 TOC */}
      <DesktopToc headings={headings} activeId={activeId} />
    </>
  )
}

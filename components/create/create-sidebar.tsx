"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  ChevronLeft,
  ChevronRight
} from "lucide-react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { defaultLocale } from "@/i18n/locale"
import { useIsMobile } from "@/hooks/use-mobile"
import { useSession } from "next-auth/react"
import Image from "next/image"
import {
  type ToolType,
  discoverTool,
  menuCategories,
  toolToUrlMap,
  getToolFromPath
} from "@/lib/config/studio-tools"

// 需要登录才显示的工具 ID
const AUTH_REQUIRED_TOOLS = new Set<ToolType>(['my-assets', 'my-profile'])

interface CreateSidebarProps {
  isOpen: boolean
  onToggle: () => void
}

const TOOL_LABEL_KEYS: Record<ToolType, string> = {
  'discover': 'sidebar.discover',
  'story-to-video': 'sidebar.storyToVideo',
  'text-to-video': 'sidebar.textToVideo',
  'image-to-video': 'sidebar.imageToVideo',
  'video-effects': 'sidebar.videoEffects',
  'text-to-image': 'sidebar.textToImage',
  'image-to-image': 'sidebar.imageToImage',
  'my-assets': 'sidebar.myAssets',
  'my-profile': 'sidebar.myProfile',
}

const CATEGORY_LABEL_KEYS: Record<string, string> = {
  'AI Video': 'sidebar.aiVideo',
  'AI Image': 'sidebar.aiImage',
  'My Works': 'sidebar.myWorks',
  'Account': 'sidebar.account',
}

export function CreateSidebar({ isOpen, onToggle }: CreateSidebarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const locale = useLocale()
  const t = useTranslations('studio')
  const isMobile = useIsMobile()
  const { status } = useSession()
  const isLoggedIn = status === 'authenticated'

  const localePrefix = locale === defaultLocale ? '' : `/${locale}`

  // 使用统一配置的路径映射表
  const activeTool = getToolFromPath(pathname) || (searchParams.get("tool") as ToolType) || 'discover'

  const handleToolSelect = (toolId: ToolType) => {
    const studioUrl = toolToUrlMap[toolId]
    router.push(`${localePrefix}${studioUrl}`)
  }

  // 在移动端隐藏侧边栏
  if (isMobile) {
    return null
  }

  return (
    <>
      {/* Sidebar */}
      <div
        className={cn(
          "bg-gray-950 border-r border-gray-800 transition-all duration-300 ease-in-out flex flex-col",
          isOpen ? "w-80" : "w-16"
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          {isOpen && (
            <h2 className="text-lg font-semibold text-white">{t('sidebar.title')}</h2>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="text-gray-400 hover:text-white hover:bg-gray-800"
          >
            {isOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>

        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto py-4">
          {/* Discover - 单独菜单项 */}
          <div className="mb-6">
            {(() => {
              const isActive = activeTool === discoverTool.id

              return (
                <button
                  key={discoverTool.id}
                  onClick={() => handleToolSelect(discoverTool.id)}
                  className={cn(
                    "w-full flex items-center text-left px-4 py-3 text-sm transition-all duration-200",
                    "hover:bg-gray-800",
                    isActive
                      ? "bg-gradient-to-r from-purple-600/20 to-cyan-500/20 text-white border-r-2 border-purple-600"
                      : "text-gray-300"
                  )}
                >
                  <div className={cn(
                    "h-5 w-5 flex-shrink-0 relative",
                    isActive ? "opacity-100" : "opacity-60"
                  )}>
                    {discoverTool.icon ? (
                      <discoverTool.icon className="h-5 w-5" />
                    ) : (
                      <Image
                        src={discoverTool.iconPath!}
                        alt={discoverTool.label}
                        width={20}
                        height={20}
                        className="object-contain"
                      />
                    )}
                  </div>
                  {isOpen && (
                    <div className="ml-3 flex-1 min-w-0">
                      <div className="font-medium truncate">{t('sidebar.discover')}</div>
                    </div>
                  )}
                </button>
              )
            })()}
          </div>

          {/* 其他分类菜单项 */}
          {menuCategories.map((category) => {
            const visibleItems = category.items.filter(
              item => isLoggedIn || !AUTH_REQUIRED_TOOLS.has(item.id)
            )
            if (visibleItems.length === 0) return null

            return (
            <div key={category.category} className="mb-8">
              {isOpen && (
                <div className="px-4 mb-3">
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t(CATEGORY_LABEL_KEYS[category.category] as Parameters<typeof t>[0])}
                  </h3>
                </div>
              )}
              <div className="space-y-1">
                {visibleItems.map((item) => {
                  const isActive = activeTool === item.id

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleToolSelect(item.id)}
                      className={cn(
                        "w-full flex items-center text-left px-4 py-3 text-sm transition-all duration-200",
                        "hover:bg-gray-800",
                        isActive
                          ? "bg-gradient-to-r from-purple-600/20 to-cyan-500/20 text-white border-r-2 border-purple-600"
                          : "text-gray-300"
                      )}
                    >
                      <div className={cn(
                        "h-5 w-5 flex-shrink-0 relative",
                        isActive ? "opacity-100" : "opacity-60"
                      )}>
                        {item.icon ? (
                          <item.icon className="h-5 w-5" />
                        ) : (
                          <Image
                            src={item.iconPath!}
                            alt={item.label}
                            width={20}
                            height={20}
                            className="object-contain"
                          />
                        )}
                      </div>
                      {isOpen && (
                        <div className="ml-3 flex-1 min-w-0 flex items-center gap-2">
                          <div className="font-medium truncate">{t(TOOL_LABEL_KEYS[item.id] as Parameters<typeof t>[0])}</div>
                          {item.isBeta && (
                            <span className="px-1.5 py-0.5 text-[10px] bg-blue-500/20 text-blue-400 rounded font-semibold shrink-0">
                              BETA
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
            )
          })}
        </div>

        {/* Footer */}
        {isOpen && (
          <div className="p-4 border-t border-gray-800">
            <div className="text-xs text-gray-500">
              <p>{t('sidebar.footer')}</p>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
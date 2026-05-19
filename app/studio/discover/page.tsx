/**
 * Studio Discover 页 —— 改版后入口
 *
 * 4 大模块（PDF 第 2 部分需求）：
 *   1. Hero 大标题
 *   2. VidFab Suite（6 工具卡）
 *   3. Latest AI Models（Veo 3 / Kling 3.0）
 *   4. Inspirations（含 tab + media 切换）
 */

'use client'

import { DiscoverHero } from '@/components/discover/discover-hero'
import { VidfabSuite } from '@/components/discover/vidfab-suite'
import { LatestModels } from '@/components/discover/latest-models'
import { InspirationsGrid } from '@/components/discover/inspirations-grid'

export const dynamic = 'force-dynamic'

export default function StudioDiscoverPage() {
  // 滚动由父 layout 的 <main> 负责，本组件只渲染内容
  return (
    <div className="relative w-full">
      {/* 背景渐变（fixed 定位以贴附整个 viewport） */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-900/15 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-900/15 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-8 lg:px-12 pb-32">
        <DiscoverHero />

        <div className="space-y-14 sm:space-y-20">
          <VidfabSuite />
          <LatestModels />
          <InspirationsGrid />
        </div>
      </div>
    </div>
  )
}

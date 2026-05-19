/**
 * TemplateGallery (legacy export)
 *
 * 历史路由 /create?tool=discover 通过 CreateContent 渲染本组件。
 * 改版后实际渲染逻辑全部下沉到 components/discover/* —— 本文件只是薄包装，
 * 保证老 URL 与 /studio/discover 内容一致，避免代码重复。
 */

'use client'

import { DiscoverHero } from '@/components/discover/discover-hero'
import { VidfabSuite } from '@/components/discover/vidfab-suite'
import { LatestModels } from '@/components/discover/latest-models'
import { InspirationsGrid } from '@/components/discover/inspirations-grid'

export function TemplateGallery() {
  return (
    <div className="h-screen overflow-y-auto custom-scrollbar bg-black">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-8 lg:px-12 pb-32">
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

"use client"

import React, { Suspense } from "react"
import nextDynamic from "next/dynamic"

// 强制动态渲染，避免预渲染问题
export const dynamic = 'force-dynamic'

// 动态导入客户端组件，避免SSR问题
const CreatePageClient = nextDynamic(
  () => import("@/components/create/create-page-client").then(mod => ({ default: mod.CreatePageClient })),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    )
  }
)

export default function CreatePage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    }>
      <CreatePageClient />
    </Suspense>
  )
}
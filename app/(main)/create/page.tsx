import React, { Suspense } from "react"
import { CreatePageClient } from "@/components/create/create-page-client"

// 强制动态渲染，避免预渲染问题
export const dynamic = 'force-dynamic'

export default function CreatePage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-400">Loading create page...</div>
      </div>
    }>
      <CreatePageClient />
    </Suspense>
  )
}
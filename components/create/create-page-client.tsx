"use client"

import React, { useState, useEffect, useRef, useCallback, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { CreateTabs } from "./create-tabs"
import { CreateContent } from "./create-content"
import { useIsMobile } from "@/hooks/use-mobile"
import { useVideoPollingV2 } from "@/hooks/use-video-polling-v2"
import { useVideoContext } from "@/lib/contexts/video-context"
import { useImagePollingV2 } from "@/hooks/use-image-polling-v2"
import { useImageContext } from "@/lib/contexts/image-context"

type ToolType = "discover" | "text-to-video" | "image-to-video" | "video-effects" | "text-to-image" | "image-to-image" | "my-assets" | "my-profile" | null

function CreatePageClientInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const isMobile = useIsMobile()

  // 🔥 统一轮询管理：在父组件启动轮询，确保切换 tab 时轮询不会停止
  const { startPolling } = useVideoPollingV2({
    enabled: true
  })

  // 🔥 自动轮询：监听新任务，自动开始轮询
  const videoContext = useVideoContext()

  // 使用 ref 追踪已启动轮询的任务，避免重复启动
  const pollingStartedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    videoContext.activeJobs.forEach(job => {
      // 只对有 requestId 且状态为 processing/queued/created 的任务启动轮询
      if (
        job.requestId &&
        (job.status === 'processing' || job.status === 'queued' || job.status === 'created') &&
        !pollingStartedRef.current.has(job.requestId)  // 避免重复启动
      ) {
        pollingStartedRef.current.add(job.requestId)
        startPolling(job.id, job.requestId)
      }
    })

    // 清理已完成/失败任务的追踪记录
    const activeRequestIds = new Set(
      videoContext.activeJobs
        .filter(j => j.requestId)
        .map(j => j.requestId!)
    )

    pollingStartedRef.current.forEach(requestId => {
      if (!activeRequestIds.has(requestId)) {
        pollingStartedRef.current.delete(requestId)
      }
    })
  }, [videoContext.activeJobs.length, startPolling]) // 只监听数量变化，不监听整个数组

  // 🔥 图片轮询管理：同样的逻辑应用到图片任务
  const imageContext = useImageContext()
  const imagePollingStartedRef = useRef<Set<string>>(new Set())

  const { startPolling: startImagePolling } = useImagePollingV2({
    enabled: true,
    onCompleted: useCallback((requestId: string, imageUrl: string) => {
      const task = imageContext.tasks.find(t => t.requestId === requestId)
      if (task) {
        imageContext.updateTask(task.id, { status: "completed", imageUrl })
      }
    }, [imageContext]),
    onFailed: useCallback((requestId: string, error: string) => {
      const task = imageContext.tasks.find(t => t.requestId === requestId)
      if (task) {
        imageContext.updateTask(task.id, { status: "failed", error })
      }
    }, [imageContext])
  })

  useEffect(() => {
    imageContext.tasks.forEach(task => {
      // 只对有 requestId 且状态为 processing 的任务启动轮询
      if (
        task.requestId &&
        task.status === 'processing' &&
        !imagePollingStartedRef.current.has(task.requestId)
      ) {
        imagePollingStartedRef.current.add(task.requestId)
        startImagePolling(task.requestId, task.id)
      }
    })

    // 清理已完成/失败任务的追踪记录
    const activeImageRequestIds = new Set(
      imageContext.tasks
        .filter(t => t.requestId && t.status === 'processing')
        .map(t => t.requestId!)
    )

    imagePollingStartedRef.current.forEach(requestId => {
      if (!activeImageRequestIds.has(requestId)) {
        imagePollingStartedRef.current.delete(requestId)
      }
    })
  }, [imageContext.tasks.length, startImagePolling])

  // 直接从 URL 参数获取当前工具，默认为 "discover"
  const activeTool = (searchParams.get("tool") as ToolType) || "discover"
  const initialPrompt = searchParams.get("prompt") || ""

  // 如果没有 tool 参数，自动设置为 discover
  useEffect(() => {
    if (!searchParams.get("tool")) {
      const params = new URLSearchParams(searchParams.toString())
      params.set("tool", "discover")
      router.replace(`/create?${params.toString()}`)
    }
  }, [searchParams, router])

  const handleToolChange = (tool: ToolType) => {
    const params = new URLSearchParams(searchParams.toString())
    if (tool) {
      params.set("tool", tool)
    } else {
      params.delete("tool")
    }
    router.push(`/create?${params.toString()}`)
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Mobile Tabs */}
      {isMobile && (
        <CreateTabs
          activeTool={activeTool}
          onToolChange={handleToolChange}
        />
      )}

      {/* Content Area */}
      <CreateContent
        activeTool={activeTool}
        onToolChange={handleToolChange}
        initialPrompt={initialPrompt}
      />
    </div>
  )
}

export function CreatePageClient() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-400">Loading create page...</div>
      </div>
    }>
      <CreatePageClientInner />
    </Suspense>
  )
}
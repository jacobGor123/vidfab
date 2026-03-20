"use client"

import React, { useState, useEffect, useRef, useCallback, Suspense, useMemo } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { useLocale } from "next-intl"
import { defaultLocale } from "@/i18n/locale"
import { CreateTabs } from "./create-tabs"
import { CreateContent } from "./create-content"
import { useIsMobile } from "@/hooks/use-mobile"
import { useVideoPollingV2 } from "@/hooks/use-video-polling-v2"
import { useVideoContext } from "@/lib/contexts/video-context"
import { useImagePollingV2 } from "@/hooks/use-image-polling-v2"
import { useImageContext } from "@/lib/contexts/image-context"
import {
  type ToolType,
  urlToToolMap,
  toolToUrlMap
} from "@/lib/config/studio-tools"

function CreatePageClientInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const locale = useLocale()
  const localePrefix = locale === defaultLocale ? '' : `/${locale}`
  const isMobile = useIsMobile()

  // 🔥 统一轮询管理：在父组件启动轮询，确保切换 tab 时轮询不会停止
  const { startPolling } = useVideoPollingV2({
    enabled: true
  })

  // 🔥 自动轮询：监听新任务，自动开始轮询
  const videoContext = useVideoContext()

  // 使用 ref 追踪已启动轮询的任务，避免重复启动
  const pollingStartedRef = useRef<Set<string>>(new Set())

  // 🔥 使用 ref 保持最新的 activeJobs 引用，避免闭包问题
  const activeJobsRef = useRef(videoContext.activeJobs)
  activeJobsRef.current = videoContext.activeJobs

  useEffect(() => {
    // 🔥 使用 ref 获取最新的 activeJobs
    const jobs = activeJobsRef.current

    jobs.forEach(job => {
      // 🔥 增强验证：确保 job 对象完整且有效
      if (
        job &&
        job.id &&
        job.requestId &&
        (job.status === 'processing' || job.status === 'queued' || job.status === 'created') &&
        !pollingStartedRef.current.has(job.requestId)  // 避免重复启动
      ) {
        pollingStartedRef.current.add(job.requestId)
        startPolling(job)  // 🔥 修复：直接传递 job 对象，避免状态查找失败
      }
    })

    // 清理已完成/失败任务的追踪记录
    const activeRequestIds = new Set(
      jobs
        .filter(j => j && j.requestId)
        .map(j => j.requestId!)
    )

    pollingStartedRef.current.forEach(requestId => {
      if (!activeRequestIds.has(requestId)) {
        pollingStartedRef.current.delete(requestId)
      }
    })
  }, [videoContext.activeJobs, startPolling]) // 🔥 监听整个数组，确保 requestId 更新也能触发

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
        // 🔥 传递任务数据用于事件追踪
        startImagePolling(task.requestId, task.id, {
          prompt: task.prompt,
          settings: {
            model: task.model,
            aspectRatio: task.aspectRatio
          },
          generationType: task.generationType || 'text-to-image'  // 🔥 传递 generationType
        })
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

  // 从 pathname 或 searchParams 获取当前工具
  const activeTool = useMemo(() => {
    // 优先从 /studio/{tool} 或 /{locale}/studio/{tool} pathname 中提取
    const studioMatch = pathname.match(/^(?:\/[a-z]{2}(?:-[A-Z]{2})?)?\/studio\/([^/]+)/)
    if (studioMatch) {
      return urlToToolMap[studioMatch[1]] || 'discover'
    }

    // 否则从 searchParams 获取 (兼容 /create?tool=xxx)
    return (searchParams.get("tool") as ToolType) || "discover"
  }, [pathname, searchParams])

  const initialPrompt = searchParams.get("prompt") || ""

  const handleToolChange = (tool: ToolType) => {
    if (tool && toolToUrlMap[tool]) {
      const studioUrl = toolToUrlMap[tool]
      // 保留原有的 query 参数（如果有的话），并携带 locale 前缀
      if (searchParams.toString()) {
        router.push(`${localePrefix}${studioUrl}?${searchParams.toString()}`)
      } else {
        router.push(`${localePrefix}${studioUrl}`)
      }
    } else {
      router.push(`${localePrefix}/studio/discover`)
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
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
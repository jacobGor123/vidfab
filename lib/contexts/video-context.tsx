"use client"

/**
 * Video State Management Context
 * 管理视频生成任务状态，支持持久化和跨tab同步
 */

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
  useCallback
} from "react"
import { useSession } from "next-auth/react"
import { VideoJob, VideoResult, VideoGenerationSettings, VideoGenerationType } from "@/lib/types/video"
import { UserVideo, UserQuotaInfo } from "@/lib/supabase"
import { UserVideosDB } from "@/lib/database/user-videos"

// 🔥 新增：API客户端函数
async function fetchUserQuota(userId: string): Promise<UserQuotaInfo> {
  const response = await fetch('/api/user/quota', {
    method: 'GET',
    credentials: 'include', // 包含session cookies
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch quota: ${response.status}`)
  }

  const result = await response.json()
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch quota')
  }

  return result.data
}

// Storage keys
const STORAGE_KEYS = {
  ACTIVE_JOBS: "vidfab_active_video_jobs",
  COMPLETED_VIDEOS: "vidfab_completed_videos",
  FAILED_JOBS: "vidfab_failed_jobs"
} as const

// BroadcastChannel for cross-tab communication
const BROADCAST_CHANNEL_NAME = "vidfab_video_sync"

interface VideoState {
  activeJobs: VideoJob[]
  temporaryVideos: VideoResult[]
  permanentVideos: UserVideo[]
  completedVideos: UserVideo[]
  failedJobs: VideoJob[]
  isLoading: boolean
  error: string | null
  quotaInfo: UserQuotaInfo | null
  quotaLoading: boolean
  totalVideos: number
  hasMore: boolean
  currentPage: number
}

// Actions
type VideoAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "ADD_JOB"; payload: VideoJob }
  | { type: "UPDATE_JOB"; payload: { id: string; updates: Partial<VideoJob> } }
  | { type: "COMPLETE_JOB"; payload: { id: string; result: VideoResult } }
  | { type: "FAIL_JOB"; payload: { id: string; error: string } }
  | { type: "REMOVE_JOB"; payload: string }
  | { type: "DELETE_VIDEO"; payload: string }
  | { type: "RESTORE_STATE"; payload: Partial<VideoState> }
  | { type: "SYNC_FROM_BROADCAST"; payload: Partial<VideoState> }
  | { type: "ADD_TEMPORARY_VIDEO"; payload: VideoResult }
  | { type: "MOVE_TO_PERMANENT"; payload: { temporaryId: string; permanentVideo: UserVideo } }
  | { type: "REMOVE_TEMPORARY_VIDEO"; payload: string }
  | { type: "SET_PERMANENT_VIDEOS"; payload: { videos: UserVideo[]; total: number; hasMore: boolean; page: number } }
  | { type: "ADD_PERMANENT_VIDEO"; payload: UserVideo }
  | { type: "UPDATE_PERMANENT_VIDEO"; payload: { id: string; updates: Partial<UserVideo> } }
  | { type: "SET_COMPLETED_VIDEOS"; payload: { videos: UserVideo[]; total: number; hasMore: boolean; page: number } }
  | { type: "ADD_COMPLETED_VIDEO"; payload: UserVideo }
  | { type: "UPDATE_COMPLETED_VIDEO"; payload: { id: string; updates: Partial<UserVideo> } }
  | { type: "REMOVE_COMPLETED_VIDEO"; payload: string }
  | { type: "SET_QUOTA_INFO"; payload: UserQuotaInfo | null }
  | { type: "SET_QUOTA_LOADING"; payload: boolean }

// Context interface
interface VideoContextType extends VideoState {
  // Job management
  addJob: (job: Omit<VideoJob, "id" | "createdAt" | "updatedAt">) => VideoJob
  updateJob: (id: string, updates: Partial<VideoJob>) => void
  completeJob: (id: string, result: Omit<VideoResult, "id">) => void
  failJob: (id: string, error: string) => void
  removeJob: (id: string) => void
  deleteVideo: (id: string) => Promise<void>
  removeCompletedVideo: (id: string) => void

  addTemporaryVideo: (result: Omit<VideoResult, "id">) => VideoResult
  moveTemporaryToPermanent: (temporaryId: string, permanentVideo: UserVideo) => void
  removeTemporaryVideo: (id: string) => void
  getAllVideos: () => (VideoResult | UserVideo)[]

  // Utility functions
  getJobById: (id: string) => VideoJob | undefined
  getVideoById: (id: string) => UserVideo | undefined
  getTemporaryVideoById: (id: string) => VideoResult | undefined
  getJobsByStatus: (status: VideoJob["status"]) => VideoJob[]

  // Database operations
  loadCompletedVideos: (page?: number) => Promise<void>
  loadPermanentVideos: (page?: number) => Promise<void>
  refreshQuotaInfo: () => Promise<void>
  recordVideoView: (videoId: string) => Promise<void>
  toggleVideoFavorite: (videoId: string) => Promise<boolean>
  handleVideoStorageCompleted: (videoId: string) => Promise<void>

  // Storage management
  cleanupUserStorage: (targetSizeMB?: number) => Promise<{ deletedVideos: number; freedSizeMB: number; remainingSizeMB: number }>
  checkStorageStatus: () => Promise<boolean>

  // State management
  clearError: () => void
  refreshState: () => void
}

// Initial state
const initialState: VideoState = {
  activeJobs: [],
  temporaryVideos: [],
  permanentVideos: [],
  completedVideos: [],
  failedJobs: [],
  isLoading: false,
  error: null,
  quotaInfo: null,
  quotaLoading: false,
  totalVideos: 0,
  hasMore: false,
  currentPage: 1
}

// Reducer
function videoReducer(state: VideoState, action: VideoAction): VideoState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload }

    case "SET_ERROR":
      return { ...state, error: action.payload }

    case "ADD_JOB": {
      const newActiveJobs = [...state.activeJobs, action.payload]
      return { ...state, activeJobs: newActiveJobs }
    }

    case "UPDATE_JOB": {
      const { id, updates } = action.payload
      const existingJob = state.activeJobs.find(job => job.id === id)

      if (!existingJob) {
        return state
      }

      const updatedJob = {
        ...existingJob,
        ...updates,
        updatedAt: new Date().toISOString()
      } as VideoJob

      const newActiveJobs = state.activeJobs.map(job =>
        job.id === id ? updatedJob : job
      )

      return { ...state, activeJobs: newActiveJobs }
    }

    case "COMPLETE_JOB": {
      const { id, result } = action.payload
      const job = state.activeJobs.find(job => job.id === id)

      if (!job) return state

      // 防止重复添加：如果已经在 temporaryVideos 中，直接返回
      const alreadyCompleted = state.temporaryVideos.some(v => v.id === id)
      if (alreadyCompleted) {
        return state
      }

      const videoResult: VideoResult = {
        id: result.id || id,
        videoUrl: result.videoUrl,
        thumbnailUrl: result.thumbnailUrl,
        prompt: result.prompt,
        settings: result.settings,
        createdAt: result.createdAt,
        userId: result.userId,
        isStored: result.isStored || false
      }

      return {
        ...state,
        activeJobs: state.activeJobs.filter(job => job.id !== id),
        temporaryVideos: [videoResult, ...state.temporaryVideos],
        completedVideos: [videoResult, ...state.completedVideos]
      }
    }

    case "FAIL_JOB": {
      const { id, error } = action.payload
      const job = state.activeJobs.find(job => job.id === id)

      if (!job) return state

      const failedJob = {
        ...job,
        status: "failed" as const,
        error,
        updatedAt: new Date().toISOString()
      }

      return {
        ...state,
        activeJobs: state.activeJobs.filter(job => job.id !== id),
        failedJobs: [...state.failedJobs, failedJob]
      }
    }

    case "REMOVE_JOB":
      return {
        ...state,
        activeJobs: state.activeJobs.filter(job => job.id !== action.payload),
        failedJobs: state.failedJobs.filter(job => job.id !== action.payload)
      }

    case "DELETE_VIDEO":
      return {
        ...state,
        temporaryVideos: state.temporaryVideos.filter(video => video.id !== action.payload),
        permanentVideos: state.permanentVideos.filter(video => video.id !== action.payload),
        completedVideos: state.completedVideos.filter(video => video.id !== action.payload)
      }

    case "REMOVE_COMPLETED_VIDEO":
      return {
        ...state,
        completedVideos: state.completedVideos.filter(video => video.id !== action.payload)
      }

    case "SET_COMPLETED_VIDEOS":
      const { videos, total, hasMore, page } = action.payload
      return {
        ...state,
        completedVideos: page === 1 ? videos : [...state.completedVideos, ...videos],
        totalVideos: total,
        hasMore,
        currentPage: page
      }

    case "ADD_COMPLETED_VIDEO":
      return {
        ...state,
        completedVideos: [action.payload, ...state.completedVideos],
        totalVideos: state.totalVideos + 1
      }

    case "UPDATE_COMPLETED_VIDEO": {
      const { id, updates } = action.payload
      return {
        ...state,
        completedVideos: state.completedVideos.map(video =>
          video.id === id ? { ...video, ...updates } : video
        )
      }
    }

    case "SET_QUOTA_INFO":
      return {
        ...state,
        quotaInfo: action.payload
      }

    case "SET_QUOTA_LOADING":
      return {
        ...state,
        quotaLoading: action.payload
      }

    case "RESTORE_STATE":
      return { ...state, ...action.payload }

    case "SYNC_FROM_BROADCAST":
      return { ...state, ...action.payload }

    case "ADD_TEMPORARY_VIDEO":
      return {
        ...state,
        temporaryVideos: [action.payload, ...state.temporaryVideos],
        completedVideos: [action.payload, ...state.completedVideos]
      }

    case "MOVE_TO_PERMANENT": {
      const { temporaryId, permanentVideo } = action.payload
      return {
        ...state,
        temporaryVideos: state.temporaryVideos.filter(video => video.id !== temporaryId),
        permanentVideos: [permanentVideo, ...state.permanentVideos],
        completedVideos: [permanentVideo, ...state.completedVideos.filter(v => v.id !== temporaryId)]
      }
    }

    case "REMOVE_TEMPORARY_VIDEO":
      return {
        ...state,
        temporaryVideos: state.temporaryVideos.filter(video => video.id !== action.payload),
        completedVideos: state.completedVideos.filter(video => video.id !== action.payload)
      }

    case "SET_PERMANENT_VIDEOS": {
      const { videos, total, hasMore, page } = action.payload
      return {
        ...state,
        permanentVideos: page === 1 ? videos : [...state.permanentVideos, ...videos],
        completedVideos: page === 1 ?
          [...state.temporaryVideos, ...videos] :
          [...state.completedVideos, ...videos],
        totalVideos: total,
        hasMore,
        currentPage: page
      }
    }

    case "ADD_PERMANENT_VIDEO":
      return {
        ...state,
        permanentVideos: [action.payload, ...state.permanentVideos],
        completedVideos: [action.payload, ...state.completedVideos],
        totalVideos: state.totalVideos + 1
      }

    case "UPDATE_PERMANENT_VIDEO": {
      const { id, updates } = action.payload
      return {
        ...state,
        permanentVideos: state.permanentVideos.map(video =>
          video.id === id ? { ...video, ...updates } : video
        ),
        completedVideos: state.completedVideos.map(video =>
          video.id === id ? { ...video, ...updates } : video
        )
      }
    }

    default:
      return state
  }
}

// Context
const VideoContext = createContext<VideoContextType | null>(null)

// Hook to use context
export function useVideoContext(): VideoContextType {
  const context = useContext(VideoContext)
  if (!context) {
    throw new Error("useVideoContext must be used within VideoProvider")
  }
  return context
}

// Local storage utilities
function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (error) {
    // Ignore storage errors
  }
}

function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : defaultValue
  } catch (error) {
    return defaultValue
  }
}

// Provider component
export function VideoProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(videoReducer, initialState)
  const { data: session, status: sessionStatus } = useSession()
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null)
  const isInitializedRef = useRef(false)

  // Initialize BroadcastChannel for cross-tab sync
  useEffect(() => {
    if (typeof window === "undefined") return

    broadcastChannelRef.current = new BroadcastChannel(BROADCAST_CHANNEL_NAME)

    broadcastChannelRef.current.onmessage = (event) => {
      if (event.data.type === "SYNC_STATE") {
        dispatch({ type: "SYNC_FROM_BROADCAST", payload: event.data.state })
      }
    }

    return () => {
      broadcastChannelRef.current?.close()
    }
  }, [])

  // Initialize data from localStorage and database on mount
  useEffect(() => {
    if (typeof window === "undefined") return

    if (sessionStatus !== 'authenticated') return
    if (!session?.user?.uuid) return
    if (isInitializedRef.current) return

    isInitializedRef.current = true

    const initializeData = async () => {
      try {
        dispatch({ type: "SET_LOADING", payload: true })

        if (session?.user?.uuid) {
          const allActiveJobs = loadFromStorage(STORAGE_KEYS.ACTIVE_JOBS, [])
          const allFailedJobs = loadFromStorage(STORAGE_KEYS.FAILED_JOBS, [])

          // 清理僵尸 job：只清理创建超过10分钟且 requestId 仍为空的任务
          const now = Date.now()
          const ZOMBIE_AGE = 10 * 60 * 1000 // 10 分钟

          const cleanActiveJobs = allActiveJobs.filter(job => {
            if (job.userId !== session.user.uuid) return true

            const createdAt = new Date(job.createdAt || 0).getTime()
            const age = now - createdAt

            // 只移除：创建超过10分钟 + requestId为空 + status是generating
            if (age > ZOMBIE_AGE && !job.requestId && job.status === 'generating') {
              return false
            }

            return true
          })

          const userActiveJobs = cleanActiveJobs.filter(job => job.userId === session.user.uuid)
          const userFailedJobs = allFailedJobs.filter(job => job.userId === session.user.uuid)

          if (cleanActiveJobs.length < allActiveJobs.length) {
            saveToStorage(STORAGE_KEYS.ACTIVE_JOBS, cleanActiveJobs)
          }

          try {
            const response = await fetch(`/api/user/videos?page=1&limit=20&orderBy=created_at&orderDirection=desc`)

            if (response.ok) {
              const apiData = await response.json()

              if (apiData.success) {
                const permanentVideos = apiData.data.videos || []

                dispatch({
                  type: "SET_PERMANENT_VIDEOS",
                  payload: {
                    videos: permanentVideos,
                    total: apiData.data.pagination.total,
                    hasMore: apiData.data.pagination.hasMore,
                    page: apiData.data.pagination.page
                  }
                })

                dispatch({
                  type: "SET_COMPLETED_VIDEOS",
                  payload: {
                    videos: permanentVideos,
                    total: apiData.data.pagination.total,
                    hasMore: apiData.data.pagination.hasMore,
                    page: apiData.data.pagination.page
                  }
                })
              } else {
                throw new Error(apiData.error || 'API returned success=false')
              }
            } else {
              throw new Error(`API responded with status: ${response.status}`)
            }
          } catch (apiError) {
            const result = await UserVideosDB.getUserVideos(session.user.uuid, {
              page: 1,
              limit: 20,
              status: ['completed'],
              orderBy: 'created_at',
              orderDirection: 'desc'
            })

            dispatch({
              type: "SET_PERMANENT_VIDEOS",
              payload: {
                videos: result.videos,
                total: result.total,
                hasMore: result.hasMore,
                page: result.page
              }
            })

            dispatch({
              type: "SET_COMPLETED_VIDEOS",
              payload: {
                videos: result.videos,
                total: result.total,
                hasMore: result.hasMore,
                page: result.page
              }
            })
          }

          // Load quota information
          try {
            const quotaInfo = await fetchUserQuota(session.user.uuid)
            dispatch({ type: "SET_QUOTA_INFO", payload: quotaInfo })
          } catch (quotaError) {
            dispatch({ type: "SET_QUOTA_INFO", payload: null })
          }

          dispatch({
            type: "RESTORE_STATE",
            payload: {
              activeJobs: userActiveJobs,
              failedJobs: userFailedJobs
            }
          })

        } else {
          dispatch({ type: "SET_QUOTA_INFO", payload: null })
        }
      } catch (error) {
        dispatch({ type: "SET_ERROR", payload: "Failed to load video data" })
      } finally {
        dispatch({ type: "SET_LOADING", payload: false })
      }
    }

    initializeData()
  }, [session?.user?.uuid, sessionStatus])

  // Save active/failed jobs to localStorage and broadcast state changes
  useEffect(() => {
    if (!isInitializedRef.current) return

    // Only save temporary state (active/failed jobs) to localStorage
    // Completed videos are stored in database
    saveToStorage(STORAGE_KEYS.ACTIVE_JOBS, state.activeJobs)
    saveToStorage(STORAGE_KEYS.FAILED_JOBS, state.failedJobs)

    // Broadcast state to other tabs
    broadcastChannelRef.current?.postMessage({
      type: "SYNC_STATE",
      state: {
        activeJobs: state.activeJobs,
        failedJobs: state.failedJobs,
        quotaInfo: state.quotaInfo
      }
    })
  }, [state.activeJobs, state.failedJobs, state.quotaInfo])

  // Context methods
  const addJob = useCallback((jobData: Omit<VideoJob, "id" | "createdAt" | "updatedAt">): VideoJob => {
    // 去重检查：防止短时间内创建相同的任务
    const isDuplicate = state.activeJobs.some(existingJob => {
      if (existingJob.status !== 'generating' && existingJob.status !== 'processing' && existingJob.status !== 'queued') {
        return false
      }

      const sameUser = existingJob.userId === jobData.userId
      const samePrompt = existingJob.prompt === jobData.prompt
      const sameImage = existingJob.settings?.imageUrl === jobData.settings?.imageUrl ||
                        existingJob.sourceImage === jobData.sourceImage
      const sameGenerationType = existingJob.generationType === (jobData.generationType || (jobData.sourceImage ? "image-to-video" : "text-to-video"))

      return sameUser && samePrompt && sameImage && sameGenerationType
    })

    if (isDuplicate) {
      const existingJob = state.activeJobs.find(existingJob => {
        const sameUser = existingJob.userId === jobData.userId
        const samePrompt = existingJob.prompt === jobData.prompt
        const sameImage = existingJob.settings?.imageUrl === jobData.settings?.imageUrl ||
                          existingJob.sourceImage === jobData.sourceImage
        const sameGenerationType = existingJob.generationType === (jobData.generationType || (jobData.sourceImage ? "image-to-video" : "text-to-video"))
        return sameUser && samePrompt && sameImage && sameGenerationType
      })
      return existingJob!
    }

    const job: VideoJob = {
      ...jobData,
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      generationType: jobData.generationType || (jobData.sourceImage ? "image-to-video" : "text-to-video")
    }

    dispatch({ type: "ADD_JOB", payload: job })
    return job
  }, [state.activeJobs])

  const updateJob = useCallback((id: string, updates: Partial<VideoJob>) => {
    dispatch({ type: "UPDATE_JOB", payload: { id, updates } })
  }, [])

  const completeJob = useCallback((id: string, result: Omit<VideoResult, "id">) => {
    const resultWithId = { ...result, id: id }
    dispatch({ type: "COMPLETE_JOB", payload: { id, result: resultWithId } })
  }, [])

  const failJob = useCallback((id: string, error: string) => {
    dispatch({ type: "FAIL_JOB", payload: { id, error } })
  }, [])

  const removeJob = useCallback((id: string) => {
    dispatch({ type: "REMOVE_JOB", payload: id })
  }, [])

  const removeCompletedVideo = useCallback((id: string) => {
    dispatch({ type: "REMOVE_COMPLETED_VIDEO", payload: id })
  }, [])

  const getJobById = useCallback((id: string) => {
    return [...state.activeJobs, ...state.failedJobs].find(job => job.id === id)
  }, [state.activeJobs.length, state.failedJobs.length])

  const getVideoById = useCallback((id: string) => {
    return state.completedVideos.find(video => video.id === id)
  }, [state.completedVideos.length])

  const addTemporaryVideo = useCallback((result: Omit<VideoResult, "id">): VideoResult => {
    const videoResult: VideoResult = {
      ...result,
      id: result.id || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
    dispatch({ type: "ADD_TEMPORARY_VIDEO", payload: videoResult })
    return videoResult
  }, [])

  const moveTemporaryToPermanent = useCallback((temporaryId: string, permanentVideo: UserVideo) => {
    dispatch({ type: "MOVE_TO_PERMANENT", payload: { temporaryId, permanentVideo } })
  }, [])

  const removeTemporaryVideo = useCallback((id: string) => {
    dispatch({ type: "REMOVE_TEMPORARY_VIDEO", payload: id })
  }, [])

  const getAllVideos = useCallback((): (VideoResult | UserVideo)[] => {
    const allVideos = [...state.temporaryVideos, ...state.permanentVideos]
    return allVideos.sort((a, b) =>
      new Date(b.createdAt || b.created_at || 0).getTime() -
      new Date(a.createdAt || a.created_at || 0).getTime()
    )
  }, [state.temporaryVideos.length, state.permanentVideos.length])

  const getTemporaryVideoById = useCallback((id: string) => {
    return state.temporaryVideos.find(video => video.id === id)
  }, [state.temporaryVideos.length])

  // Database operations
  const loadCompletedVideos = useCallback(async (page: number = 1) => {
    if (!session?.user?.uuid) return

    try {
      dispatch({ type: "SET_LOADING", payload: true })

      const result = await UserVideosDB.getUserVideos(session.user.uuid, {
        page,
        limit: 20,
        status: ['completed'],
        orderBy: 'created_at',
        orderDirection: 'desc'
      })

      dispatch({
        type: "SET_COMPLETED_VIDEOS",
        payload: {
          videos: result.videos,
          total: result.total,
          hasMore: result.hasMore,
          page: result.page
        }
      })
    } catch (error) {
      console.error('Failed to load completed videos:', error)
      dispatch({ type: "SET_ERROR", payload: "Failed to load videos" })
    } finally {
      dispatch({ type: "SET_LOADING", payload: false })
    }
  }, [session?.user?.uuid])

  const loadPermanentVideos = useCallback(async (page: number = 1) => {
    if (!session?.user?.uuid) return

    try {
      dispatch({ type: "SET_LOADING", payload: true })

      const result = await UserVideosDB.getUserVideos(session.user.uuid, {
        page,
        limit: 20,
        status: ['completed'],
        orderBy: 'created_at',
        orderDirection: 'desc'
      })

      dispatch({
        type: "SET_PERMANENT_VIDEOS",
        payload: {
          videos: result.videos,
          total: result.total,
          hasMore: result.hasMore,
          page: result.page
        }
      })
    } catch (error) {
      console.error('Failed to load permanent videos:', error)
      dispatch({ type: "SET_ERROR", payload: "Failed to load videos" })
    } finally {
      dispatch({ type: "SET_LOADING", payload: false })
    }
  }, [session?.user?.uuid])

  // Add debouncing for quota info refresh to prevent infinite loops
  const lastQuotaRefreshRef = useRef<number>(0)
  const QUOTA_REFRESH_COOLDOWN = 5000 // 5 seconds cooldown

  const refreshQuotaInfo = useCallback(async () => {
    if (!session?.user?.uuid) return

    const now = Date.now()
    if (now - lastQuotaRefreshRef.current < QUOTA_REFRESH_COOLDOWN) {
      return
    }
    lastQuotaRefreshRef.current = now

    try {
      dispatch({ type: "SET_QUOTA_LOADING", payload: true })

      const quotaInfo = await fetchUserQuota(session.user.uuid)
      dispatch({ type: "SET_QUOTA_INFO", payload: quotaInfo })
    } catch (error) {
      // Ignore error
    } finally {
      dispatch({ type: "SET_QUOTA_LOADING", payload: false })
    }
  }, [session?.user?.uuid])

  const deleteVideo = useCallback(async (id: string) => {
    if (!session?.user?.uuid) return

    try {
      await UserVideosDB.deleteVideo(id, session.user.uuid)
      dispatch({ type: "DELETE_VIDEO", payload: id })

      // Refresh quota info after deletion
      await refreshQuotaInfo()
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: "Failed to delete video" })
    }
  }, [session?.user?.uuid, refreshQuotaInfo])

  const recordVideoView = useCallback(async (videoId: string) => {
    if (!session?.user?.uuid) return

    try {
      await UserVideosDB.recordVideoView(videoId, session.user.uuid)
      // Update view count in local state
      dispatch({
        type: "UPDATE_COMPLETED_VIDEO",
        payload: {
          id: videoId,
          updates: {
            view_count: (state.completedVideos.find(v => v.id === videoId)?.view_count || 0) + 1,
            last_viewed_at: new Date().toISOString()
          }
        }
      })
    } catch (error) {
      // Ignore error
    }
  }, [session?.user?.uuid])

  const toggleVideoFavorite = useCallback(async (videoId: string) => {
    if (!session?.user?.uuid) return false

    try {
      const newFavoriteStatus = await UserVideosDB.toggleVideoFavorite(videoId, session.user.uuid)

      // Update favorite status in local state
      dispatch({
        type: "UPDATE_COMPLETED_VIDEO",
        payload: {
          id: videoId,
          updates: { is_favorite: newFavoriteStatus }
        }
      })

      return newFavoriteStatus
    } catch (error) {
      return false
    }
  }, [session?.user?.uuid])

  const handleVideoStorageCompleted = useCallback(async (videoId: string) => {
    if (!session?.user?.uuid) return

    try {
      // 检查是否是各种临时ID格式
      if (videoId.startsWith('00000000-0000-4000-8000-') ||
          videoId.startsWith('job_') ||
          videoId.startsWith('temp-') ||
          videoId.startsWith('pred_')) {
        return
      }

      // 验证 videoId 格式（应该是 UUID）
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidPattern.test(videoId)) {
        return
      }

      const permanentVideo = await UserVideosDB.getVideoById(videoId, session.user.uuid)

      if (!permanentVideo) {
        return
      }

      if (permanentVideo.status !== 'completed') {
        return
      }

      const temporaryVideo = state.temporaryVideos.find(video => {
        return video.videoUrl === permanentVideo.original_url
      })

      if (temporaryVideo) {
        moveTemporaryToPermanent(temporaryVideo.id, permanentVideo)
      } else {
        dispatch({ type: "ADD_PERMANENT_VIDEO", payload: permanentVideo })
      }

      await refreshQuotaInfo()

    } catch (error) {
      // Ignore error
    }
  }, [session?.user?.uuid, refreshQuotaInfo, moveTemporaryToPermanent, state.temporaryVideos.length])

  const getJobsByStatus = useCallback((status: VideoJob["status"]) => {
    if (status === "failed") return state.failedJobs
    return state.activeJobs.filter(job => job.status === status)
  }, [state.activeJobs.length, state.failedJobs.length])

  const clearError = useCallback(() => {
    dispatch({ type: "SET_ERROR", payload: null })
  }, [])

  // Storage management functions
  const cleanupUserStorage = useCallback(async (targetSizeMB?: number) => {
    if (!session?.user?.uuid) {
      throw new Error('User not authenticated')
    }

    try {
      const result = await UserVideosDB.cleanupUserStorage(session.user.uuid, targetSizeMB)

      // Refresh completed videos and quota after cleanup
      await loadCompletedVideos(1)
      await refreshQuotaInfo()

      return result
    } catch (error) {
      throw error
    }
  }, [session?.user?.uuid, loadCompletedVideos, refreshQuotaInfo])

  const checkStorageStatus = useCallback(async () => {
    if (!session?.user?.uuid) return false

    try {
      return await UserVideosDB.isStorageExceeded(session.user.uuid)
    } catch (error) {
      return false
    }
  }, [session?.user?.uuid])

  const refreshState = useCallback(async () => {
    // Force re-initialization
    isInitializedRef.current = false
    dispatch({ type: "RESTORE_STATE", payload: initialState })

    // Reload data if user is logged in
    if (session?.user?.uuid) {
      await loadCompletedVideos(1)
      await refreshQuotaInfo()
    }
  }, [session?.user?.uuid])

  const contextValue: VideoContextType = {
    ...state,
    addJob,
    updateJob,
    completeJob,
    failJob,
    removeJob,
    deleteVideo,
    removeCompletedVideo,
    addTemporaryVideo,
    moveTemporaryToPermanent,
    removeTemporaryVideo,
    getAllVideos,
    getJobById,
    getVideoById,
    getTemporaryVideoById,
    getJobsByStatus,
    loadCompletedVideos,
    loadPermanentVideos,
    refreshQuotaInfo,
    recordVideoView,
    toggleVideoFavorite,
    handleVideoStorageCompleted,
    cleanupUserStorage,
    checkStorageStatus,
    clearError,
    refreshState
  }

  return (
    <VideoContext.Provider value={contextValue}>
      {children}
    </VideoContext.Provider>
  )
}
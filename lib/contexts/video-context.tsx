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

// 🔥 新增：分离临时和永久视频的状态接口
interface VideoState {
  activeJobs: VideoJob[]
  temporaryVideos: VideoResult[] // 🔥 新增：刚生成的临时视频
  permanentVideos: UserVideo[]   // 🔥 重命名：已保存到数据库的永久视频
  completedVideos: UserVideo[]   // 🔥 保留：向后兼容，现在指向permanentVideos
  failedJobs: VideoJob[]
  isLoading: boolean
  error: string | null
  quotaInfo: UserQuotaInfo | null
  quotaLoading: boolean         // 🔥 新增：存储配额加载状态
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
  // 🔥 新增：分离临时和永久视频的Actions
  | { type: "ADD_TEMPORARY_VIDEO"; payload: VideoResult }
  | { type: "MOVE_TO_PERMANENT"; payload: { temporaryId: string; permanentVideo: UserVideo } }
  | { type: "REMOVE_TEMPORARY_VIDEO"; payload: string }
  | { type: "SET_PERMANENT_VIDEOS"; payload: { videos: UserVideo[]; total: number; hasMore: boolean; page: number } }
  | { type: "ADD_PERMANENT_VIDEO"; payload: UserVideo }
  | { type: "UPDATE_PERMANENT_VIDEO"; payload: { id: string; updates: Partial<UserVideo> } }
  // 🔥 保留：向后兼容的Actions
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

  // 🔥 新增：临时和永久视频管理
  addTemporaryVideo: (result: Omit<VideoResult, "id">) => VideoResult
  moveTemporaryToPermanent: (temporaryId: string, permanentVideo: UserVideo) => void
  removeTemporaryVideo: (id: string) => void
  getAllVideos: () => (VideoResult | UserVideo)[] // 🔥 获取所有视频（临时+永久）

  // Utility functions
  getJobById: (id: string) => VideoJob | undefined
  getVideoById: (id: string) => UserVideo | undefined
  getTemporaryVideoById: (id: string) => VideoResult | undefined
  getJobsByStatus: (status: VideoJob["status"]) => VideoJob[]

  // Database operations
  loadCompletedVideos: (page?: number) => Promise<void>
  loadPermanentVideos: (page?: number) => Promise<void> // 🔥 新增：加载永久视频
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
  temporaryVideos: [],      // 🔥 新增：临时视频
  permanentVideos: [],      // 🔥 新增：永久视频
  completedVideos: [],      // 🔥 保留：向后兼容
  failedJobs: [],
  isLoading: false,
  error: null,
  quotaInfo: null,
  quotaLoading: false,      // 🔥 新增：存储配额加载状态
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
        console.warn(`🔥 UPDATE_JOB: Job ${id} not found in activeJobs`)
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

      // 🔥 重构：现在将完成的视频添加到临时存储
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
        temporaryVideos: [videoResult, ...state.temporaryVideos], // 🔥 添加到临时存储
        completedVideos: [videoResult, ...state.completedVideos] // 🔥 保留：向后兼容
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

    // 🔥 新增：临时视频管理
    case "ADD_TEMPORARY_VIDEO":
      return {
        ...state,
        temporaryVideos: [action.payload, ...state.temporaryVideos],
        completedVideos: [action.payload, ...state.completedVideos] // 🔥 向后兼容
      }

    case "MOVE_TO_PERMANENT": {
      const { temporaryId, permanentVideo } = action.payload
      return {
        ...state,
        temporaryVideos: state.temporaryVideos.filter(video => video.id !== temporaryId),
        permanentVideos: [permanentVideo, ...state.permanentVideos],
        completedVideos: [permanentVideo, ...state.completedVideos.filter(v => v.id !== temporaryId)] // 🔥 向后兼容
      }
    }

    case "REMOVE_TEMPORARY_VIDEO":
      return {
        ...state,
        temporaryVideos: state.temporaryVideos.filter(video => video.id !== action.payload),
        completedVideos: state.completedVideos.filter(video => video.id !== action.payload) // 🔥 向后兼容
      }

    case "SET_PERMANENT_VIDEOS": {
      const { videos, total, hasMore, page } = action.payload
      return {
        ...state,
        permanentVideos: page === 1 ? videos : [...state.permanentVideos, ...videos],
        completedVideos: page === 1 ?
          [...state.temporaryVideos, ...videos] :
          [...state.completedVideos, ...videos], // 🔥 向后兼容：临时+永久
        totalVideos: total,
        hasMore,
        currentPage: page
      }
    }

    case "ADD_PERMANENT_VIDEO":
      return {
        ...state,
        permanentVideos: [action.payload, ...state.permanentVideos],
        completedVideos: [action.payload, ...state.completedVideos], // 🔥 向后兼容
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
        ) // 🔥 向后兼容
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
    console.warn(`Failed to save to localStorage (${key}):`, error)
  }
}

function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : defaultValue
  } catch (error) {
    console.warn(`Failed to load from localStorage (${key}):`, error)
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

    // 只在 sessionStatus 从 loading → authenticated 时执行一次
    if (sessionStatus !== 'authenticated') return
    if (!session?.user?.uuid) return
    if (isInitializedRef.current) return

    // 立即标记为已初始化,防止重复执行
    isInitializedRef.current = true

    const initializeData = async () => {

      try {
        dispatch({ type: "SET_LOADING", payload: true })

        // 移除清空数据的操作,避免导致闪烁
        // dispatch({ type: "RESTORE_STATE", payload: { activeJobs: [], failedJobs: [] } })

        // Only load data if user is logged in
        if (session?.user?.uuid) {
          // Restore active jobs from localStorage (temporary state) and filter immediately
          const allActiveJobs = loadFromStorage(STORAGE_KEYS.ACTIVE_JOBS, [])
          const allFailedJobs = loadFromStorage(STORAGE_KEYS.FAILED_JOBS, [])


          const userActiveJobs = allActiveJobs.filter(job => job.userId === session.user.uuid)
          const userFailedJobs = allFailedJobs.filter(job => job.userId === session.user.uuid)


          // 🔥 新流程：通过API加载永久视频

          try {
            const response = await fetch(`/api/user/videos?page=1&limit=20&orderBy=created_at&orderDirection=desc`)

            if (response.ok) {
              const apiData = await response.json()

              if (apiData.success) {
                const permanentVideos = apiData.data.videos || []

                // 使用新的永久视频Action
                dispatch({
                  type: "SET_PERMANENT_VIDEOS",
                  payload: {
                    videos: permanentVideos,
                    total: apiData.data.pagination.total,
                    hasMore: apiData.data.pagination.hasMore,
                    page: apiData.data.pagination.page
                  }
                })

                // 🔥 保持向后兼容性
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
            console.warn('API failed, falling back to direct database access:', apiError)

            // 后备方案：直接使用数据库
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
            console.error('Error fetching quota:', quotaError)
            dispatch({ type: "SET_QUOTA_INFO", payload: null })
          }

          // Restore filtered user data only

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
        console.error('Failed to initialize video context:', error)
        dispatch({ type: "SET_ERROR", payload: "Failed to load video data" })
      } finally {
        dispatch({ type: "SET_LOADING", payload: false })
        // isInitializedRef.current 已在 useEffect 开头设置,无需重复
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
    const job: VideoJob = {
      ...jobData,
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // 只在没有明确设置generationType时才自动识别
      generationType: jobData.generationType || (jobData.sourceImage ? "image-to-video" : "text-to-video")
    }

    dispatch({ type: "ADD_JOB", payload: job })
    return job
  }, [])

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

  // 🔥 新增：临时和永久视频管理方法
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
    // 🔥 合并临时和永久视频，按时间排序
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

  // 🔥 新增：加载永久视频方法
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

    // Prevent frequent calls
    const now = Date.now()
    if (now - lastQuotaRefreshRef.current < QUOTA_REFRESH_COOLDOWN) {
      return
    }
    lastQuotaRefreshRef.current = now

    try {
      // 🔥 开始加载，设置 loading 状态
      dispatch({ type: "SET_QUOTA_LOADING", payload: true })

      const quotaInfo = await fetchUserQuota(session.user.uuid)
      dispatch({ type: "SET_QUOTA_INFO", payload: quotaInfo })
    } catch (error) {
      console.error('Failed to refresh quota info:', error)
    } finally {
      // 🔥 加载完成，清除 loading 状态
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
      console.error('Failed to delete video:', error)
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
      console.error('Failed to record video view:', error)
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
      console.error('Failed to toggle video favorite:', error)
      return false
    }
  }, [session?.user?.uuid])

  // 🔥 重构：新的储存完成处理流程
  const handleVideoStorageCompleted = useCallback(async (videoId: string) => {
    if (!session?.user?.uuid) return

    try {

      // 🔥 改进：检查是否是各种临时ID格式
      if (videoId.startsWith('00000000-0000-4000-8000-') ||
          videoId.startsWith('job_') ||
          videoId.startsWith('temp-') ||
          videoId.startsWith('pred_')) {
        console.log(`✅ 跳过临时ID的数据库查询: ${videoId}`)
        return
      }

      // 🔥 首先尝试从数据库获取完整的视频信息
      const permanentVideo = await UserVideosDB.getVideoById(videoId, session.user.uuid)

      if (!permanentVideo) {
        console.warn(`⚠️ Video not found in database: ${videoId}`)
        return
      }

      if (permanentVideo.status !== 'completed') {
        console.warn(`⚠️ Video not in completed status: ${videoId}, status: ${permanentVideo.status}`)
        return
      }

      // 🔥 改进：通过videoUrl匹配临时视频（因为VideoResult没有wavespeed_request_id字段）
      const temporaryVideo = state.temporaryVideos.find(video => {
        // 通过original_url/videoUrl匹配（最可靠的方式）
        return video.videoUrl === permanentVideo.original_url
      })

      if (temporaryVideo) {
        console.log(`✅ 找到对应的临时视频，移动到永久存储: ${temporaryVideo.id} -> ${permanentVideo.id}`)
        // 移动临时视频到永久存储
        moveTemporaryToPermanent(temporaryVideo.id, permanentVideo)
      } else {
        console.log(`⚠️ 未找到对应的临时视频，直接添加到永久存储: ${permanentVideo.id}`)
        // 如果没有找到对应的临时视频，直接添加到永久存储（数据库直接创建的情况）
        dispatch({ type: "ADD_PERMANENT_VIDEO", payload: permanentVideo })
      }

      // Refresh quota info
      await refreshQuotaInfo()

    } catch (error) {
      console.error('Failed to handle video storage completion:', error)
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
      console.error('Failed to cleanup user storage:', error)
      throw error
    }
  }, [session?.user?.uuid, loadCompletedVideos, refreshQuotaInfo])

  const checkStorageStatus = useCallback(async () => {
    if (!session?.user?.uuid) return false

    try {
      return await UserVideosDB.isStorageExceeded(session.user.uuid)
    } catch (error) {
      console.error('Failed to check storage status:', error)
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
    // 🔥 新增：临时和永久视频管理方法
    addTemporaryVideo,
    moveTemporaryToPermanent,
    removeTemporaryVideo,
    getAllVideos,
    getJobById,
    getVideoById,
    getTemporaryVideoById,
    getJobsByStatus,
    loadCompletedVideos,
    loadPermanentVideos, // 🔥 新增
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
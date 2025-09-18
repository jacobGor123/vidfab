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

// Storage keys
const STORAGE_KEYS = {
  ACTIVE_JOBS: "vidfab_active_video_jobs",
  COMPLETED_VIDEOS: "vidfab_completed_videos",
  FAILED_JOBS: "vidfab_failed_jobs"
} as const

// BroadcastChannel for cross-tab communication
const BROADCAST_CHANNEL_NAME = "vidfab_video_sync"

// State interface
interface VideoState {
  activeJobs: VideoJob[]
  completedVideos: UserVideo[]
  failedJobs: VideoJob[]
  isLoading: boolean
  error: string | null
  quotaInfo: UserQuotaInfo | null
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
  | { type: "SET_COMPLETED_VIDEOS"; payload: { videos: UserVideo[]; total: number; hasMore: boolean; page: number } }
  | { type: "ADD_COMPLETED_VIDEO"; payload: UserVideo }
  | { type: "UPDATE_COMPLETED_VIDEO"; payload: { id: string; updates: Partial<UserVideo> } }
  | { type: "SET_QUOTA_INFO"; payload: UserQuotaInfo | null }

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

  // Utility functions
  getJobById: (id: string) => VideoJob | undefined
  getVideoById: (id: string) => UserVideo | undefined
  getJobsByStatus: (status: VideoJob["status"]) => VideoJob[]

  // Database operations
  loadCompletedVideos: (page?: number) => Promise<void>
  refreshQuotaInfo: () => Promise<void>
  recordVideoView: (videoId: string) => Promise<void>
  toggleVideoFavorite: (videoId: string) => Promise<boolean>
  handleVideoStorageCompleted: (videoId: string) => Promise<void>

  // State management
  clearError: () => void
  refreshState: () => void
}

// Initial state
const initialState: VideoState = {
  activeJobs: [],
  completedVideos: [],
  failedJobs: [],
  isLoading: false,
  error: null,
  quotaInfo: null,
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
      const updatedJob = {
        ...state.activeJobs.find(job => job.id === id),
        ...updates,
        updatedAt: new Date().toISOString()
      } as VideoJob

      const newActiveJobs = state.activeJobs.map(job =>
        job.id === id ? updatedJob : job
      )

      // 🔥 如果任务完成且有resultUrl，同时添加到completedVideos
      if (updates.status === 'completed' && updates.resultUrl) {
        const videoResult: VideoResult = {
          id: updatedJob.id,
          videoUrl: updates.resultUrl,
          prompt: updatedJob.prompt,
          settings: updatedJob.settings,
          createdAt: updatedJob.createdAt,
          userId: updatedJob.userId
        }

        // 检查是否已存在，避免重复添加
        const alreadyExists = state.completedVideos.some(v => v.id === videoResult.id)
        if (!alreadyExists) {
          return {
            ...state,
            activeJobs: newActiveJobs,
            completedVideos: [videoResult, ...state.completedVideos]
          }
        }
      }

      return { ...state, activeJobs: newActiveJobs }
    }

    case "COMPLETE_JOB": {
      const { id, result } = action.payload
      const job = state.activeJobs.find(job => job.id === id)

      if (!job) return state

      // Keep legacy VideoResult handling for temporary jobs
      const videoResult: VideoResult = {
        id: result.id || id,
        videoUrl: result.videoUrl,
        thumbnailUrl: result.thumbnailUrl,
        prompt: result.prompt,
        settings: result.settings,
        createdAt: result.createdAt,
        userId: result.userId
      }

      // 🔥 关键修复：将完成的视频添加到 completedVideos 列表
      return {
        ...state,
        activeJobs: state.activeJobs.filter(job => job.id !== id),
        completedVideos: [videoResult, ...state.completedVideos] // 添加到已完成视频列表
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

    case "RESTORE_STATE":
      return { ...state, ...action.payload }

    case "SYNC_FROM_BROADCAST":
      return { ...state, ...action.payload }

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
  const { data: session } = useSession()
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
    if (typeof window === "undefined" || isInitializedRef.current) return

    const initializeData = async () => {
      try {
        dispatch({ type: "SET_LOADING", payload: true })

        // Clear any existing data first to prevent flicker
        dispatch({ type: "RESTORE_STATE", payload: { activeJobs: [], failedJobs: [] } })

        // Only load data if user is logged in
        if (session?.user?.uuid) {
          // Restore active jobs from localStorage (temporary state) and filter immediately
          const allActiveJobs = loadFromStorage(STORAGE_KEYS.ACTIVE_JOBS, [])
          const allFailedJobs = loadFromStorage(STORAGE_KEYS.FAILED_JOBS, [])

          const userActiveJobs = allActiveJobs.filter(job => job.userId === session.user.uuid)
          const userFailedJobs = allFailedJobs.filter(job => job.userId === session.user.uuid)

          // Load completed videos from database
          const result = await UserVideosDB.getUserVideos(session.user.uuid, {
            page: 1,
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

          // Load quota information
          const quotaInfo = await UserVideosDB.getUserQuota(session.user.uuid)
          dispatch({ type: "SET_QUOTA_INFO", payload: quotaInfo })

          // Restore filtered user data only
          dispatch({
            type: "RESTORE_STATE",
            payload: {
              activeJobs: userActiveJobs,
              failedJobs: userFailedJobs
            }
          })
        }
      } catch (error) {
        console.error('Failed to initialize video context:', error)
        dispatch({ type: "SET_ERROR", payload: "Failed to load video data" })
      } finally {
        dispatch({ type: "SET_LOADING", payload: false })
        isInitializedRef.current = true
      }
    }

    initializeData()
  }, [session?.user?.uuid])

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
      // 自动识别生成类型
      generationType: jobData.sourceImage ? "image-to-video" : "text-to-video"
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
  }, [state.activeJobs, state.failedJobs])

  const getVideoById = useCallback((id: string) => {
    return state.completedVideos.find(video => video.id === id)
  }, [state.completedVideos])

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

  const refreshQuotaInfo = useCallback(async () => {
    if (!session?.user?.uuid) return

    try {
      const quotaInfo = await UserVideosDB.getUserQuota(session.user.uuid)
      dispatch({ type: "SET_QUOTA_INFO", payload: quotaInfo })
    } catch (error) {
      console.error('Failed to refresh quota info:', error)
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
  }, [session?.user?.uuid, state.completedVideos])

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

  // Handle when video storage is completed
  const handleVideoStorageCompleted = useCallback(async (videoId: string) => {
    if (!session?.user?.uuid) return

    try {
      // Fetch the completed video from database
      const video = await UserVideosDB.getVideoById(videoId, session.user.uuid)
      if (video && video.status === 'completed') {
        dispatch({ type: "ADD_COMPLETED_VIDEO", payload: video })

        // Refresh quota info
        await refreshQuotaInfo()
      }
    } catch (error) {
      console.error('Failed to handle video storage completion:', error)
    }
  }, [session?.user?.uuid, refreshQuotaInfo])

  const getJobsByStatus = useCallback((status: VideoJob["status"]) => {
    if (status === "failed") return state.failedJobs
    return state.activeJobs.filter(job => job.status === status)
  }, [state.activeJobs, state.failedJobs])

  const clearError = useCallback(() => {
    dispatch({ type: "SET_ERROR", payload: null })
  }, [])

  const refreshState = useCallback(async () => {
    // Force re-initialization
    isInitializedRef.current = false
    dispatch({ type: "RESTORE_STATE", payload: initialState })

    // Reload data if user is logged in
    if (session?.user?.uuid) {
      await loadCompletedVideos(1)
      await refreshQuotaInfo()
    }
  }, [session?.user?.uuid, loadCompletedVideos, refreshQuotaInfo])

  const contextValue: VideoContextType = {
    ...state,
    addJob,
    updateJob,
    completeJob,
    failJob,
    removeJob,
    deleteVideo,
    removeCompletedVideo,
    getJobById,
    getVideoById,
    getJobsByStatus,
    loadCompletedVideos,
    refreshQuotaInfo,
    recordVideoView,
    toggleVideoFavorite,
    handleVideoStorageCompleted,
    clearError,
    refreshState
  }

  return (
    <VideoContext.Provider value={contextValue}>
      {children}
    </VideoContext.Provider>
  )
}
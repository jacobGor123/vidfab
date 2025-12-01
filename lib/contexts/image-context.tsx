"use client"

/**
 * Image State Management Context
 * 管理图片生成任务状态，支持持久化和跨tab同步
 */

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useRef
} from "react"
import { useSession } from "next-auth/react"

// 图片任务接口
export interface ImageTask {
  id: string
  requestId: string
  prompt: string
  model: string
  aspectRatio?: string
  status: "pending" | "processing" | "completed" | "failed"
  imageUrl?: string
  error?: string
  sourceImages?: string[]
  createdAt: number
  generationType?: 'text-to-image' | 'image-to-image'  // 🔥 用于事件追踪
}

// Storage keys
const STORAGE_KEYS = {
  IMAGE_TASKS: "vidfab_image_tasks"
} as const

// State interface
interface ImageState {
  tasks: ImageTask[]
  isLoading: boolean
  error: string | null
}

// Actions
type ImageAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "ADD_TASK"; payload: ImageTask }
  | { type: "UPDATE_TASK"; payload: { id: string; updates: Partial<ImageTask> } }
  | { type: "REMOVE_TASK"; payload: string }
  | { type: "CLEAR_TASKS" }
  | { type: "RESTORE_STATE"; payload: Partial<ImageState> }

// Context interface
interface ImageContextType extends ImageState {
  addTask: (task: ImageTask) => void
  updateTask: (id: string, updates: Partial<ImageTask>) => void
  removeTask: (id: string) => void
  clearTasks: () => void
  getTaskById: (id: string) => ImageTask | undefined
  getTasksByStatus: (status: ImageTask["status"]) => ImageTask[]
  clearError: () => void
}

// Initial state
const initialState: ImageState = {
  tasks: [],
  isLoading: false,
  error: null
}

// Reducer
function imageReducer(state: ImageState, action: ImageAction): ImageState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload }

    case "SET_ERROR":
      return { ...state, error: action.payload }

    case "ADD_TASK":
      return {
        ...state,
        tasks: [action.payload, ...state.tasks].slice(0, 20) // 最多保留20个任务
      }

    case "UPDATE_TASK":
      return {
        ...state,
        tasks: state.tasks.map((task) =>
          task.id === action.payload.id
            ? { ...task, ...action.payload.updates }
            : task
        )
      }

    case "REMOVE_TASK":
      return {
        ...state,
        tasks: state.tasks.filter((task) => task.id !== action.payload)
      }

    case "CLEAR_TASKS":
      return {
        ...state,
        tasks: []
      }

    case "RESTORE_STATE":
      return {
        ...state,
        ...action.payload
      }

    default:
      return state
  }
}

// Context
const ImageContext = createContext<ImageContextType | undefined>(undefined)

// Provider
export function ImageProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(imageReducer, initialState)
  const { data: session } = useSession()
  const isInitializedRef = useRef(false)

  // 从 localStorage 恢复状态 - 只恢复未完成的任务
  useEffect(() => {
    if (isInitializedRef.current) return
    isInitializedRef.current = true

    try {
      const stored = localStorage.getItem(STORAGE_KEYS.IMAGE_TASKS)
      if (stored) {
        const tasks = JSON.parse(stored) as ImageTask[]

        // 🔥 过滤条件:
        // 1. 只恢复 pending/processing 任务
        // 2. 过滤掉超过1小时的任务
        const oneHourAgo = Date.now() - 60 * 60 * 1000
        const validTasks = tasks.filter(task => {
          const isActive = task.status === "pending" || task.status === "processing"
          const isRecent = task.createdAt > oneHourAgo
          return isActive && isRecent
        })

        console.log(`🔄 Restored ${validTasks.length} active image tasks from localStorage`)

        dispatch({
          type: "RESTORE_STATE",
          payload: { tasks: validTasks }
        })
      }
    } catch (error) {
      console.error("Failed to restore image tasks from localStorage:", error)
    }
  }, [])

  // 保存到 localStorage - 只保存 pending/processing 任务
  useEffect(() => {
    if (!isInitializedRef.current) return

    try {
      // 🔥 只保存未完成的任务（pending/processing），不保存 completed/failed
      const activeTasks = state.tasks.filter(
        task => task.status === "pending" || task.status === "processing"
      )
      localStorage.setItem(STORAGE_KEYS.IMAGE_TASKS, JSON.stringify(activeTasks))
    } catch (error) {
      console.error("Failed to save image tasks to localStorage:", error)
    }
  }, [state.tasks])

  // 过滤当前用户的任务
  const userTasks = session?.user?.uuid
    ? state.tasks.filter(task => {
        // 由于我们没有在 task 中存储 userId，暂时返回所有任务
        // TODO: 如果需要多用户支持，需要在 ImageTask 接口中添加 userId
        return true
      })
    : []

  // Actions
  const addTask = useCallback((task: ImageTask) => {
    dispatch({ type: "ADD_TASK", payload: task })
  }, [])

  const updateTask = useCallback((id: string, updates: Partial<ImageTask>) => {
    dispatch({ type: "UPDATE_TASK", payload: { id, updates } })
  }, [])

  const removeTask = useCallback((id: string) => {
    dispatch({ type: "REMOVE_TASK", payload: id })
  }, [])

  const clearTasks = useCallback(() => {
    dispatch({ type: "CLEAR_TASKS" })
  }, [])

  const getTaskById = useCallback(
    (id: string) => state.tasks.find((task) => task.id === id),
    [state.tasks]
  )

  const getTasksByStatus = useCallback(
    (status: ImageTask["status"]) =>
      state.tasks.filter((task) => task.status === status),
    [state.tasks]
  )

  const clearError = useCallback(() => {
    dispatch({ type: "SET_ERROR", payload: null })
  }, [])

  const value: ImageContextType = {
    ...state,
    tasks: userTasks,
    addTask,
    updateTask,
    removeTask,
    clearTasks,
    getTaskById,
    getTasksByStatus,
    clearError
  }

  return <ImageContext.Provider value={value}>{children}</ImageContext.Provider>
}

// Hook
export function useImageContext() {
  const context = useContext(ImageContext)
  if (context === undefined) {
    throw new Error("useImageContext must be used within ImageProvider")
  }
  return context
}

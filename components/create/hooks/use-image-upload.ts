/**
 * 多图上传逻辑 Hook
 * 管理上传任务队列、状态追踪、文件上传流程
 */

import { useRef, useState, useCallback } from 'react'
import { UploadTask } from '../image-upload/types'
import { ImageProcessor } from '@/lib/image-processor'

/**
 * Hook 配置选项
 */
export interface UseImageUploadOptions {
  uploadMode: 'local' | 'url'
  onAuthRequired?: () => Promise<boolean>
}

/**
 * Hook 返回值
 */
export interface UseImageUploadReturn {
  // 状态
  uploadTasks: Map<string, UploadTask>
  selectedImageId: string | null
  isDragging: boolean

  // 操作方法
  uploadImage: (file: File) => Promise<void>
  uploadMultiple: (files: File[]) => Promise<void>
  removeTask: (taskId: string) => Promise<void>
  selectImage: (taskId: string) => void
  clearAll: () => Promise<void>

  // 辅助方法
  getSelectedImage: () => UploadTask | null
  getCompletedImages: () => UploadTask[]

  // 拖放处理
  setIsDragging: (isDragging: boolean) => void
}

/**
 * 多图上传 Hook
 */
export function useImageUpload(
  options: UseImageUploadOptions,
  onImageSelected?: (imageUrl: string) => void
): UseImageUploadReturn {
  const { uploadMode, onAuthRequired } = options

  // 🔥 使用 ref 作为唯一数据源,避免竞态条件
  const uploadTasksRef = useRef<Map<string, UploadTask>>(new Map())
  const [, forceUpdate] = useState({})
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // 🔥 强制触发重渲染的辅助函数
  const triggerRerender = useCallback(() => {
    forceUpdate({})
  }, [])

  /**
   * 上传单个图片文件
   */
  const uploadImageFile = useCallback(async (file: File) => {
    // 生成唯一任务 ID
    const taskId = `${file.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    console.log(`🚀 Starting upload task: ${taskId}`)

    // 创建初始任务
    const initialTask: UploadTask = {
      id: taskId,
      file,
      fileName: file.name,
      progress: 0,
      status: 'uploading',
      previewUrl: null,
      resultUrl: null,
      error: null,
      size: file.size,
      timestamp: Date.now()
    }

    // 🔥 直接操作 ref,避免任何状态竞争
    uploadTasksRef.current.set(taskId, initialTask)
    triggerRerender()

    // 🔥 直接更新 ref + 强制重渲染
    const updateTask = (updates: Partial<UploadTask>) => {
      const task = uploadTasksRef.current.get(taskId)

      if (!task) {
        console.warn(`⚠️ Task not found: ${taskId}`)
        return
      }

      const updatedTask = { ...task, ...updates }
      uploadTasksRef.current.set(taskId, updatedTask)

      console.log(`📊 Task ${taskId} updated:`, updates)

      // 触发重渲染
      triggerRerender()
    }

    try {
      // Step 1: 验证图片 (5%)
      updateTask({ progress: 5 })
      const validation = ImageProcessor.validateImage(file)
      if (!validation.valid) {
        throw new Error(validation.error || 'Invalid image')
      }

      // Step 2: 创建预览 (15%)
      updateTask({ progress: 15 })
      const previewUrl = await ImageProcessor.createPreviewUrl(file)
      updateTask({ previewUrl, progress: 20 })

      // Step 3: 智能处理和压缩 (20% -> 60%)
      updateTask({ progress: 30 })
      const processedResult = await ImageProcessor.processImageSmart(file)
      updateTask({ progress: 60 })

      // Step 4: 上传到 Supabase (60% -> 90%)
      const formData = new FormData()
      formData.append('file', processedResult.file)
      formData.append('autoOptimized', 'true')

      updateTask({ progress: 70 })

      const response = await fetch('/api/images/upload', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed')
      }

      updateTask({ progress: 90 })

      // Step 5: 完成 (100%)
      updateTask({
        progress: 100,
        status: 'completed',
        resultUrl: result.data.url
      })

      // 🔥 自动选中最新上传成功的图片
      setSelectedImageId(taskId)
      if (onImageSelected) {
        onImageSelected(result.data.url)
      }

      console.log(`✅ Upload completed: ${taskId}`)

    } catch (error) {
      console.error(`❌ Upload failed: ${taskId}`, error)

      updateTask({
        status: 'failed',
        error: error instanceof Error ? error.message : 'Upload failed'
      })

      // 如果当前选中的就是这个失败的任务,清除选中
      if (selectedImageId === taskId) {
        setSelectedImageId(null)
        if (onImageSelected) {
          onImageSelected('')
        }
      }
    }
  }, [triggerRerender, selectedImageId, onImageSelected])

  /**
   * 上传单个图片(带认证检查)
   */
  const uploadImage = useCallback(async (file: File) => {
    if (!file) return

    // 检查用户认证状态
    if (onAuthRequired) {
      const authSuccess = await onAuthRequired()
      if (!authSuccess) {
        return
      }
    }

    await uploadImageFile(file)
  }, [uploadImageFile, onAuthRequired])

  /**
   * 上传多个图片
   */
  const uploadMultiple = useCallback(async (files: File[]) => {
    if (!files || files.length === 0) return

    // 检查用户认证状态
    if (onAuthRequired) {
      const authSuccess = await onAuthRequired()
      if (!authSuccess) {
        return
      }
    }

    // 🔥 并发上传所有图片
    await Promise.all(files.map(file => uploadImageFile(file)))
  }, [uploadImageFile, onAuthRequired])

  /**
   * 删除单个上传任务
   */
  const removeTask = useCallback(async (taskId: string) => {
    const task = uploadTasksRef.current.get(taskId)
    if (!task) return

    // 如果有 Supabase URL,尝试删除文件
    if (task.resultUrl && uploadMode === 'local') {
      try {
        const urlParts = task.resultUrl.split('/')
        const imageFile = urlParts[urlParts.length - 1]
        const imageId = imageFile.split('.')[0]

        if (imageId) {
          await fetch(`/api/images/upload?imageId=${imageId}`, {
            method: 'DELETE'
          })
        }
      } catch (error) {
        console.error('Failed to delete image from storage:', error)
      }
    }

    // 🔥 直接从 ref 删除
    uploadTasksRef.current.delete(taskId)
    triggerRerender()

    // 如果删除的是当前选中的图片,清除选中状态
    if (selectedImageId === taskId) {
      setSelectedImageId(null)
      if (onImageSelected) {
        onImageSelected('')
      }
    }
  }, [uploadMode, selectedImageId, triggerRerender, onImageSelected])

  /**
   * 选择图片
   */
  const selectImage = useCallback((taskId: string) => {
    const task = uploadTasksRef.current.get(taskId)
    if (!task || task.status !== 'completed' || !task.resultUrl) return

    setSelectedImageId(taskId)
    if (onImageSelected) {
      onImageSelected(task.resultUrl)
    }
  }, [onImageSelected])

  /**
   * 清空所有上传
   */
  const clearAll = useCallback(async () => {
    // 删除所有已上传的图片
    const currentTasks = uploadTasksRef.current
    for (const [taskId, task] of currentTasks) {
      if (task.resultUrl) {
        try {
          const urlParts = task.resultUrl.split('/')
          const imageFile = urlParts[urlParts.length - 1]
          const imageId = imageFile.split('.')[0]

          if (imageId) {
            await fetch(`/api/images/upload?imageId=${imageId}`, {
              method: 'DELETE'
            })
          }
        } catch (error) {
          console.error('Failed to delete image:', error)
        }
      }
    }

    // 🔥 直接清空 ref
    uploadTasksRef.current.clear()
    triggerRerender()

    setSelectedImageId(null)
    if (onImageSelected) {
      onImageSelected('')
    }
  }, [triggerRerender, onImageSelected])

  /**
   * 获取当前选中的图片
   */
  const getSelectedImage = useCallback(() => {
    if (!selectedImageId) return null
    return uploadTasksRef.current.get(selectedImageId) || null
  }, [selectedImageId])

  /**
   * 获取所有已完成的图片
   */
  const getCompletedImages = useCallback(() => {
    return Array.from(uploadTasksRef.current.values())
      .filter(task => task.status === 'completed')
  }, [])

  return {
    // 状态
    uploadTasks: uploadTasksRef.current,
    selectedImageId,
    isDragging,

    // 操作方法
    uploadImage,
    uploadMultiple,
    removeTask,
    selectImage,
    clearAll,

    // 辅助方法
    getSelectedImage,
    getCompletedImages,

    // 拖放处理
    setIsDragging
  }
}

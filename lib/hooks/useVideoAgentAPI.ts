/**
 * Video Agent 统一 API 调用 Hooks
 *
 * 集中管理所有 Video Agent 相关的 API 调用
 * 提供统一的错误处理、类型安全、状态管理
 *
 * 使用方法：
 * ```typescript
 * const { createProject, analyzeScript, ... } = useVideoAgentAPI()
 *
 * await createProject({ duration: 30, story_style: 'auto', original_script: '...' })
 * ```
 */

import { useState, useCallback } from 'react'
import type { ScriptAnalysisResult, Shot, CharacterConfig } from '@/lib/types/video-agent'

// ==================== 类型定义 ====================

interface APIResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

interface ProjectData {
  id: string
  duration: number
  story_style: string
  original_script: string
  aspect_ratio: '16:9' | '9:16'
  enable_narration: boolean
  status: string
  current_step: number
  created_at: string
  script_analysis?: ScriptAnalysisResult
  // ... 其他字段
}

interface CreateProjectParams {
  duration: number
  story_style: string
  original_script: string
  aspect_ratio?: '16:9' | '9:16'
  enable_narration?: boolean
}

interface CharacterPromptParams {
  characterNames: string[]
  shots: Shot[]
  storyStyle: string
}

interface BatchGenerateCharactersParams {
  characters: Array<{
    name: string
    generation_prompt: string
    negative_prompt?: string
    source: 'ai_generate'
  }>
}

interface GenerateCharacterImageParams {
  prompt: string
  negativePrompt?: string
  aspectRatio?: string
}

interface UpdateCharactersParams {
  characters: Array<{
    name: string
    source: 'template' | 'upload' | 'ai_generate'
    templateId?: string
    referenceImages?: string[]
    generationPrompt?: string
    negativePrompt?: string
  }>
}

interface GenerateStoryboardsParams {
  imageStyle?: string
  shotNumbers?: number[]
}

interface RegenerateStoryboardParams {
  shotNumber: number
  imageStyle?: string
  customPrompt?: string
}

interface GenerateVideosParams {
  aspectRatio?: '16:9' | '9:16'
  shotNumbers?: number[]
}

interface RetryVideoParams {
  shotNumber: number
  customPrompt?: string
}

interface ComposeVideoParams {
  enableMusic?: boolean
  musicUrl?: string
}

interface AnalyzeVideoParams {
  videoSource: {
    type: 'youtube' | 'local'
    url: string
  }
  duration: number
  storyStyle: string
  aspectRatio?: '16:9' | '9:16'
}

interface ScriptInspiration {
  title: string
  description: string
  script: string
  style: string
  duration: number
  hashtags: string[]
}

// ==================== Hook ====================

export function useVideoAgentAPI() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * 通用 API 调用函数
   */
  const callAPI = useCallback(async <T = any>(
    url: string,
    options?: RequestInit
  ): Promise<T> => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      })

      const data: APIResponse<T> = await response.json()

      if (!response.ok || !data.success) {
        // 🔥 改进错误处理：包含详细信息
        const errorMessage = data.error || data.message || 'API call failed'
        const errorDetails = (data as any).details

        // 如果有详细错误信息，记录到控制台
        if (errorDetails) {
          console.error('[API Error] Details:', errorDetails)
        }

        throw new Error(errorMessage)
      }

      return data.data as T
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // ==================== Project APIs ====================

  /**
   * 获取所有项目
   */
  const getProjects = useCallback(async (): Promise<ProjectData[]> => {
    return callAPI('/api/video-agent/projects')
  }, [callAPI])

  /**
   * 创建新项目
   */
  const createProject = useCallback(async (params: CreateProjectParams): Promise<ProjectData> => {
    return callAPI('/api/video-agent/projects', {
      method: 'POST',
      body: JSON.stringify(params),
    })
  }, [callAPI])

  /**
   * 获取单个项目
   */
  const getProject = useCallback(async (projectId: string): Promise<ProjectData> => {
    return callAPI(`/api/video-agent/projects/${projectId}`)
  }, [callAPI])

  /**
   * 更新项目
   */
  const updateProject = useCallback(async (
    projectId: string,
    updates: Partial<ProjectData>
  ): Promise<ProjectData> => {
    return callAPI(`/api/video-agent/projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
  }, [callAPI])

  /**
   * 删除项目
   */
  const deleteProject = useCallback(async (projectId: string): Promise<void> => {
    return callAPI(`/api/video-agent/projects/${projectId}`, {
      method: 'DELETE',
    })
  }, [callAPI])

  /**
   * 更新项目步骤
   */
  const updateProjectStep = useCallback(async (
    projectId: string,
    step: number
  ): Promise<void> => {
    return callAPI(`/api/video-agent/projects/${projectId}/step`, {
      method: 'PATCH',
      body: JSON.stringify({ current_step: step }),
    })
  }, [callAPI])

  /**
   * 从指定步骤重置项目（清空该步骤及之后的所有数据）
   */
  const resetProjectFromStep = useCallback(async (
    projectId: string,
    step: number
  ): Promise<ProjectData> => {
    return callAPI(`/api/video-agent/projects/${projectId}/reset-from-step`, {
      method: 'POST',
      body: JSON.stringify({ step }),
    })
  }, [callAPI])

  // ==================== Script Analysis APIs ====================

  /**
   * 分析脚本
   */
  const analyzeScript = useCallback(async (projectId: string): Promise<ScriptAnalysisResult> => {
    return callAPI(`/api/video-agent/projects/${projectId}/analyze-script`, {
      method: 'POST',
    })
  }, [callAPI])

  /**
   * 分析视频
   */
  const analyzeVideo = useCallback(async (params: AnalyzeVideoParams): Promise<ScriptAnalysisResult> => {
    return callAPI('/api/video-agent/analyze-video', {
      method: 'POST',
      body: JSON.stringify(params),
    })
  }, [callAPI])

  /**
   * 获取脚本灵感
   */
  const getInspirations = useCallback(async (): Promise<ScriptInspiration[]> => {
    return callAPI('/api/video-agent/inspirations')
  }, [callAPI])

  // ==================== Character APIs ====================

  /**
   * 获取角色配置
   */
  const getCharacters = useCallback(async (projectId: string): Promise<CharacterConfig[]> => {
    return callAPI(`/api/video-agent/projects/${projectId}/characters`)
  }, [callAPI])

  /**
   * 更新角色配置
   */
  const updateCharacters = useCallback(async (
    projectId: string,
    params: UpdateCharactersParams
  ): Promise<void> => {
    return callAPI(`/api/video-agent/projects/${projectId}/characters`, {
      method: 'POST',
      body: JSON.stringify(params),
    })
  }, [callAPI])

  /**
   * 生成角色 Prompt
   */
  const generateCharacterPrompts = useCallback(async (
    projectId: string,
    params: CharacterPromptParams
  ): Promise<Record<string, string>> => {
    return callAPI(`/api/video-agent/projects/${projectId}/character-prompts`, {
      method: 'POST',
      body: JSON.stringify(params),
    })
  }, [callAPI])

  /**
   * 批量生成角色图片
   */
  const batchGenerateCharacters = useCallback(async (
    projectId: string,
    params: BatchGenerateCharactersParams
  ): Promise<void> => {
    return callAPI(`/api/video-agent/projects/${projectId}/batch-generate-characters`, {
      method: 'POST',
      body: JSON.stringify(params),
    })
  }, [callAPI])

  /**
   * 生成单个角色图片
   */
  const generateCharacterImage = useCallback(async (
    params: GenerateCharacterImageParams
  ): Promise<{ imageUrl: string }> => {
    return callAPI('/api/video-agent/generate-character-image', {
      method: 'POST',
      body: JSON.stringify(params),
    })
  }, [callAPI])

  // ==================== Storyboard APIs ====================

  /**
   * 获取分镜图生成状态
   */
  const getStoryboardsStatus = useCallback(async (projectId: string): Promise<any> => {
    return callAPI(`/api/video-agent/projects/${projectId}/storyboards/status`)
  }, [callAPI])

  /**
   * 生成分镜图
   */
  const generateStoryboards = useCallback(async (
    projectId: string,
    params: GenerateStoryboardsParams = {}
  ): Promise<void> => {
    return callAPI(`/api/video-agent/projects/${projectId}/storyboards/generate`, {
      method: 'POST',
      body: JSON.stringify(params),
    })
  }, [callAPI])

  /**
   * 重新生成单个分镜图
   */
  const regenerateStoryboard = useCallback(async (
    projectId: string,
    params: RegenerateStoryboardParams
  ): Promise<void> => {
    const url = `/api/video-agent/projects/${projectId}/storyboards/${params.shotNumber}/regenerate`

    console.log('[useVideoAgentAPI] regenerateStoryboard called', {
      projectId,
      shotNumber: params.shotNumber,
      url,
      hasCustomPrompt: !!params.customPrompt
    })

    return callAPI(url, {
      method: 'POST',
      body: JSON.stringify({
        image_style: params.imageStyle,
        customPrompt: params.customPrompt
      }),
    })
  }, [callAPI])

  // ==================== Video APIs ====================

  /**
   * 获取视频生成状态
   */
  const getVideosStatus = useCallback(async (projectId: string): Promise<any> => {
    return callAPI(`/api/video-agent/projects/${projectId}/videos/status`)
  }, [callAPI])

  /**
   * 生成视频
   */
  const generateVideos = useCallback(async (
    projectId: string,
    params: GenerateVideosParams = {}
  ): Promise<void> => {
    return callAPI(`/api/video-agent/projects/${projectId}/videos/generate`, {
      method: 'POST',
      body: JSON.stringify(params),
    })
  }, [callAPI])

  /**
   * 重试视频生成
   */
  const retryVideo = useCallback(async (
    projectId: string,
    params: RetryVideoParams
  ): Promise<void> => {
    return callAPI(
      `/api/video-agent/projects/${projectId}/videos/${params.shotNumber}/retry`,
      {
        method: 'POST',
        body: JSON.stringify({
          customPrompt: params.customPrompt || undefined
        }),
      }
    )
  }, [callAPI])

  // ==================== Compose APIs ====================

  /**
   * 获取合成状态
   */
  const getComposeStatus = useCallback(async (projectId: string): Promise<any> => {
    return callAPI(`/api/video-agent/projects/${projectId}/compose/status`)
  }, [callAPI])

  /**
   * 开始视频合成
   */
  const composeVideo = useCallback(async (
    projectId: string,
    params: ComposeVideoParams = {}
  ): Promise<void> => {
    return callAPI(`/api/video-agent/projects/${projectId}/compose`, {
      method: 'POST',
      body: JSON.stringify(params),
    })
  }, [callAPI])

  /**
   * 保存合成视频到 My Assets
   */
  const saveToAssets = useCallback(async (projectId: string): Promise<{ videoId: string }> => {
    return callAPI(`/api/video-agent/projects/${projectId}/save-to-assets`, {
      method: 'POST',
    })
  }, [callAPI])

  // ==================== 返回所有 API 方法 ====================

  return {
    // 状态
    loading,
    error,
    setError,

    // Project APIs
    getProjects,
    createProject,
    getProject,
    updateProject,
    deleteProject,
    updateProjectStep,
    resetProjectFromStep,

    // Script Analysis APIs
    analyzeScript,
    analyzeVideo,
    getInspirations,

    // Character APIs
    getCharacters,
    updateCharacters,
    generateCharacterPrompts,
    batchGenerateCharacters,
    generateCharacterImage,

    // Storyboard APIs
    getStoryboardsStatus,
    generateStoryboards,
    regenerateStoryboard,

    // Video APIs
    getVideosStatus,
    generateVideos,
    retryVideo,

    // Compose APIs
    getComposeStatus,
    composeVideo,
    saveToAssets,
  }
}

// ==================== 类型导出 ====================

export type {
  APIResponse,
  ProjectData,
  CreateProjectParams,
  CharacterPromptParams,
  BatchGenerateCharactersParams,
  GenerateCharacterImageParams,
  UpdateCharactersParams,
  GenerateStoryboardsParams,
  RegenerateStoryboardParams,
  GenerateVideosParams,
  RetryVideoParams,
  ComposeVideoParams,
  AnalyzeVideoParams,
  ScriptInspiration,
}

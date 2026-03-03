/**
 * Video Analysis Hook
 * 处理视频分析的核心逻辑
 */

'use client'

import { useState } from 'react'
import { useVideoAgentAPI } from '@/lib/hooks/useVideoAgentAPI'
import { showError, showSuccess } from '@/lib/utils/toast'
import type { ImageStyle } from '@/lib/services/video-agent/character-prompt-generator'

interface UseVideoAnalysisProps {
  duration: number
  storyStyle: string
  aspectRatio: '16:9' | '9:16'
  muteBgm: boolean
  onComplete: (project: any) => void
}

export function useVideoAnalysis({
  duration,
  storyStyle,
  aspectRatio,
  muteBgm,
  onComplete
}: UseVideoAnalysisProps) {
  const { analyzeVideo, createProject, updateProject, getProject } = useVideoAgentAPI()
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [progress, setProgress] = useState<string>('')

  // 从分析结果生成脚本文本
  const generateScriptFromAnalysis = (analysis: any): string => {
    const { shots } = analysis
    if (!shots || shots.length === 0) {
      return ''
    }

    // 生成脚本：每个 shot 的 description + character_action
    const scriptParts = shots.map((shot: any, index: number) => {
      const shotNumber = index + 1
      const description = shot.description || ''
      const action = shot.character_action || ''
      return `Shot ${shotNumber}: ${description}. ${action}`
    })

    return scriptParts.join('\n\n')
  }

  const analyzeYouTubeVideo = async (youtubeUrl: string, imageStyle: ImageStyle) => {
    setIsAnalyzing(true)
    setProgress('Analyzing video content...')

    try {
      // 🔥 步骤1: 调用视频分析 API（现在会直接创建项目，避免重复扣配额）
      const response = await analyzeVideo({
        videoSource: {
          type: 'youtube',
          url: youtubeUrl
        },
        duration,  // YouTube 模式下会被实际时长覆盖
        storyStyle,
        aspectRatio: '9:16',  // 复刻视频模式强制竖屏
        imageStyle,  // 🔥 直接传递图片风格，API 创建项目时设置
        muteBgm
      }) as any

      // 🔥 API 现在返回 { analysis, project, meta }
      const analysisData = response.analysis
      const project = response.project

      if (!project || !analysisData) {
        console.error('[YouTube Mode] Invalid API response:', response)
        throw new Error('Invalid response from analyze API')
      }

      console.log('[YouTube Mode] Project created with image style:', {
        projectId: project.id,
        shotsCount: analysisData?.shots?.length || 0,
        duration: project.duration,
        imageStyle: project.image_style_id
      })

      // 🔥 步骤4: 自动生成角色 Prompts（YouTube 模式）
      if (analysisData.characters && analysisData.characters.length > 0) {
        setProgress('Generating character prompts...')

        try {
          // 调用 character-prompts API 生成角色的 prompts
          const response = await fetch(`/api/video-agent/projects/${project.id}/character-prompts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageStyle })  // 🔥 使用用户选择的风格
          })

          if (response.ok) {
            const { data } = await response.json()
            const characterPrompts = data.characterPrompts || []

            // 将 prompts 保存到数据库
            if (characterPrompts.length > 0) {
              const charactersData = characterPrompts.map((cp: any) => ({
                name: cp.characterName,
                source: 'ai_generate' as const,
                generationPrompt: cp.prompt,
                negativePrompt: cp.negativePrompt
              }))

              const updateCharsResponse = await fetch(`/api/video-agent/projects/${project.id}/characters`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ characters: charactersData })
              })

              if (!updateCharsResponse.ok) {
                console.warn('[YouTube Mode] Failed to save character prompts, but continuing...')
              }
            }
          } else {
            console.warn('[YouTube Mode] Failed to generate character prompts, but continuing...')
          }
        } catch (charError) {
          console.warn('[YouTube Mode] Character prompt generation failed (non-critical):', charError)
          // 角色 prompt 生成失败不影响主流程，继续执行
        }
      }

      setProgress('Loading project...')

      // 🔥 步骤5: 重新获取完整项目数据（包含分析结果）
      const fullProject = await getProject(project.id)

      showSuccess('Video analyzed successfully!')

      // 🔥 步骤6: 通知完成
      setTimeout(() => {
        // 通知父组件（通过全局事件或其他方式）
        window.dispatchEvent(new CustomEvent('video-agent-project-created', {
          detail: fullProject
        }))

        onComplete(fullProject)
        setIsAnalyzing(false)
        setProgress('')
      }, 500)

    } catch (error: any) {
      console.error('Video analysis error:', error)
      showError(error.message || 'Failed to analyze video')
      setIsAnalyzing(false)
      setProgress('')
      throw error
    }
  }

  return {
    isAnalyzing,
    progress,
    analyzeYouTubeVideo
  }
}

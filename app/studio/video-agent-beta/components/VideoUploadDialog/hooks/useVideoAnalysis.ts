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
  onComplete: (project: any) => void
}

export function useVideoAnalysis({
  duration,
  storyStyle,
  aspectRatio,
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
        aspectRatio
      })

      // 🔥 API 现在直接返回创建好的项目
      const analysisData = response.data || response
      const project = response.project

      if (!project) {
        throw new Error('Project was not created by analyze API')
      }

      setProgress('Saving image style...')

      // 🔥 步骤2: 更新图片风格（如果用户选择了）
      if (imageStyle) {
        await updateProject(project.id, {
          image_style_id: imageStyle
        } as any)
      }

      console.log('[YouTube Mode] Project created and analysis saved:', {
        projectId: project.id,
        shotsCount: analysisData?.shots?.length || 0,
        duration: project.duration
      })

      console.log('[YouTube Mode] ✅ script_analysis saved successfully')

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

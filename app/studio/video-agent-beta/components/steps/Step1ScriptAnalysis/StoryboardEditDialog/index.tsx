/**
 * StoryboardEditDialog Component
 *
 * 分镜编辑对话框主组件
 * 左侧：人物参考面板（可选择）
 * 右侧：分镜预览 + prompt 编辑 + 重新生成
 */

'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { Film } from 'lucide-react'
import type { VideoAgentProject } from '@/lib/stores/video-agent'
import { useStoryboardEditor } from './useStoryboardEditor'
import { CharacterReferencePanel } from './CharacterReferencePanel'
import { StoryboardEditPanel } from './StoryboardEditPanel'

interface Character {
  id: string
  character_name: string
  generation_prompt: string | null
  character_reference_images?: Array<{
    image_url: string
    image_order: number
  }>
}

interface Storyboard {
  id: string
  shot_number: number
  image_url?: string
  status?: 'generating' | 'completed' | 'failed'
  error_message?: string | null
  updated_at?: string | null
}

interface StoryboardEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: VideoAgentProject
  shotNumber: number | null
  onRegenerate: (shotNumber: number, prompt: string, characterNames: string[], characterIds: string[]) => Promise<void>
  onVersionSwitched?: () => void // 🔥 版本切换后的回调，用于通知父组件刷新数据
}

export function StoryboardEditDialog({
  open,
  onOpenChange,
  project,
  shotNumber,
  onRegenerate,
  onVersionSwitched
}: StoryboardEditDialogProps) {
  // 预览版本状态（点击历史版本时只预览，不切换）
  const [previewVersion, setPreviewVersion] = useState<{
    id: string
    version: number
    image_url: string
    image_url_external?: string
    cdn_url?: string
    storage_status?: string
    is_current: boolean
    updated_at?: string
  } | null>(null)

  // 🔥 强制刷新历史版本列表的 key
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0)

  // 🔥 清空预览状态：当弹框关闭或 shotNumber 变化时
  useEffect(() => {
    if (!open) {
      setPreviewVersion(null)
    }
  }, [open])

  useEffect(() => {
    setPreviewVersion(null)
    setHistoryRefreshKey(prev => prev + 1) // 重置历史列表
  }, [shotNumber])

  const {
    selectedCharacterNames,
    selectedCharacterIds,
    editedPrompt,
    isRegenerating,
    handleToggleCharacter,
    handleToggleCharacterId,
    handlePromptChange,
    handleRegenerate
  } = useStoryboardEditor(project, shotNumber)

  // 🔥 修复：映射人物数据，兼容两种格式
  // 数据库格式: character_name, character_reference_images[{image_url}]
  // Store 格式: name, reference_images[{url}]
  const allCharacters: Character[] = Array.isArray(project.characters)
    ? project.characters.map((char: any) => ({
        id: char.id,
        character_name: char.character_name || char.name || '',
        generation_prompt: char.generation_prompt || null,
        character_reference_images: Array.isArray(char.character_reference_images)
          ? char.character_reference_images.map((img: any) => ({
              image_url: img.image_url || img.url || '',
              image_order: img.image_order ?? img.order ?? 0
            }))
          : Array.isArray(char.reference_images)
            ? char.reference_images.map((img: any) => ({
                image_url: img.image_url || img.url || '',
                image_order: img.image_order ?? img.order ?? 0
              }))
            : []
      }))
    : []

  // 🔥 去重：优先使用带括号描述的完整名称（新格式），过滤掉简短名称（旧格式）
  // 但如果人物名称本身就没有括号，也应该保留
  const characters: Character[] = (() => {
    // 按名称分组（括号前的部分作为key）
    const groupedByBaseName = new Map<string, Character[]>()

    allCharacters.forEach(char => {
      // 提取基础名称（括号前的部分，或完整名称）
      const baseName = char.character_name.split('(')[0].trim()
      if (!groupedByBaseName.has(baseName)) {
        groupedByBaseName.set(baseName, [])
      }
      groupedByBaseName.get(baseName)!.push(char)
    })

    // 对每组，优先选择带括号的完整格式，否则选择第一个
    const deduplicated: Character[] = []
    groupedByBaseName.forEach((group) => {
      // 优先选择带括号的（完整描述）
      const withParentheses = group.find(char => char.character_name.includes('('))
      deduplicated.push(withParentheses || group[0])
    })

    return deduplicated
  })()

  const storyboard = shotNumber
    ? (project.storyboards?.find(s => s.shot_number === shotNumber) as unknown as Storyboard)
    : undefined

  // 获取当前 shot 信息
  const shot = shotNumber && Array.isArray(project.script_analysis?.shots)
    ? project.script_analysis.shots.find(s => s.shot_number === shotNumber)
    : undefined

  const handleRegenerateClick = async () => {
    await handleRegenerate(onRegenerate)

    // 🔥 重新生成完成后刷新历史版本列表和预览
    setHistoryRefreshKey(prev => prev + 1)
    setPreviewVersion(null) // 清空历史预览，显示最新生成的图片
  }

  // 🔥 预览历史版本（不关闭弹框，不切换数据库记录）
  const handleVersionPreview = async (versionId: string, version: number) => {
    try {
      // 从历史 API 获取该版本的完整数据
      const response = await fetch(
        `/api/video-agent/projects/${project.id}/storyboards/${shotNumber}/history`
      )

      if (!response.ok) {
        throw new Error('Failed to load version data')
      }

      const data = await response.json()
      const versionData = data.data?.find((v: any) => v.id === versionId)

      if (versionData) {
        setPreviewVersion(versionData)
      }
    } catch (error) {
      console.error('[StoryboardEdit] Failed to preview version:', error)
    }
  }

  // 🔥 真正切换版本（设置为当前版本）- 不关闭弹框
  const handleSetAsCurrent = async () => {
    if (!previewVersion) return

    try {
      const response = await fetch(
        `/api/video-agent/projects/${project.id}/storyboards/${shotNumber}/switch-version`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ version: previewVersion.version })
        }
      )

      if (!response.ok) {
        throw new Error('Failed to switch version')
      }

      // ✅ 成功切换后，刷新历史版本列表（更新打勾状态和高亮）
      setHistoryRefreshKey(prev => prev + 1)

      // ✅ 重新加载历史版本数据，获取最新状态
      const historyResponse = await fetch(
        `/api/video-agent/projects/${project.id}/storyboards/${shotNumber}/history`
      )

      if (historyResponse.ok) {
        const historyData = await historyResponse.json()
        // 找到刚刚设置为 current 的版本
        const newCurrentVersion = historyData.data?.find((v: any) => v.version === previewVersion.version)

        if (newCurrentVersion) {
          // 更新预览版本为最新数据（包含 is_current = true）
          setPreviewVersion(newCurrentVersion)
        }
      }

      // ✅ 通知父组件刷新数据（外层预览图会更新）
      onVersionSwitched?.()

    } catch (error) {
      console.error('[StoryboardEdit] Failed to switch version:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-[#1a1d2e] border-white/10 backdrop-blur-xl p-0 gap-0 flex flex-col"
        style={{ maxWidth: '1400px', width: '95vw', maxHeight: '90vh', height: '90vh' }}
      >
        {/* Header */}
        <div className="px-6 py-3 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
              <Film className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl text-white font-bold">
                Edit Storyboard - Shot {shotNumber}
              </h2>
              <p className="text-sm text-slate-400 mt-0.5">
                Select characters and edit the prompt to regenerate this storyboard
              </p>
            </div>
          </div>
        </div>

        {/* Main Content - 上下布局 */}
        <div className="flex flex-col gap-4 p-6 overflow-hidden flex-1 min-h-0">
          {/* 上部 - 人物选择区域（固定高度） */}
          <div className="flex-shrink-0">
            <CharacterReferencePanel
              characters={characters}
              selectedCharacterNames={selectedCharacterNames}
              selectedCharacterIds={selectedCharacterIds}
              onToggle={handleToggleCharacter}
              onToggleById={handleToggleCharacterId}
            />
          </div>

          {/* 下部 - 分镜编辑区域（填充剩余空间） */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <StoryboardEditPanel
              projectId={project.id}
              shotNumber={shotNumber || 0}
              storyboard={storyboard}
              previewVersion={previewVersion}
              prompt={editedPrompt}
              isRegenerating={isRegenerating}
              onPromptChange={handlePromptChange}
              onRegenerate={handleRegenerateClick}
              onVersionPreview={handleVersionPreview}
              onSetAsCurrent={handleSetAsCurrent}
              historyRefreshKey={historyRefreshKey}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

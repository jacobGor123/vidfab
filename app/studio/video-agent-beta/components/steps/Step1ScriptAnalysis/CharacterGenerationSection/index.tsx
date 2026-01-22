/**
 * CharacterGenerationSection Component
 *
 * 人物生成区域主组件（集成版）
 * 职责：
 * 1. 自动触发人物图批量生成
 * 2. 显示生成进度
 * 3. 显示完整功能的人物卡片（支持编辑、生成、上传、预设）
 * 4. 支持单个人物重新生成
 */

'use client'

import { useEffect, useRef, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AlertCircle, RefreshCw, Check } from 'lucide-react'
import { VideoAgentProject, ScriptAnalysis } from '@/lib/stores/video-agent'
import { useCharacterAutoGeneration } from './useCharacterAutoGeneration'
import { CharacterLoadingState } from './CharacterLoadingState'

// 🔥 使用紧凑版卡片组件
import { CharacterCardCompact, CharacterCardCompactSkeleton } from './CharacterCardCompact'

// 复用 Step2 的 hooks
import { useCharacterState } from '../../Step2CharacterConfig/hooks/useCharacterState'
import { useCharacterGeneration } from '../../Step2CharacterConfig/hooks/useCharacterGeneration'
import { useCharacterManagement } from '../../Step2CharacterConfig/hooks/useCharacterManagement'
import { CharacterPresetDialog } from '../../../CharacterPresetDialog'
import { CharacterPreset } from '@/lib/constants/character-presets'

interface CharacterGenerationSectionProps {
  project: VideoAgentProject
  analysis: ScriptAnalysis
  onStatusChange: (status: 'idle' | 'generating' | 'completed' | 'failed') => void
  onUpdate: (updates: Partial<VideoAgentProject>) => void
}

export function CharacterGenerationSection({
  project,
  analysis,
  onStatusChange,
  onUpdate
}: CharacterGenerationSectionProps) {
  // 🔥 复用 Step2 的状态管理
  const { characterStates, setCharacterStates, isInitialLoading, characters } = useCharacterState({
    project,
    onUpdate
  })

  // 🔥 复用 Step2 的生成相关操作
  const {
    handleGeneratePrompts,
    handleBatchGenerate,
    handleSingleGenerate,
    isGeneratingPrompts,
    isBatchGenerating,
    error,
    setError
  } = useCharacterGeneration({
    project,
    characterStates,
    setCharacterStates
  })

  // 🔥 复用 Step2 的管理相关操作
  const {
    handleImageUpload,
    handleSelectPreset
  } = useCharacterManagement({
    project,
    characterStates,
    setCharacterStates,
    onUpdate,
    onNext: () => { }, // 这里不需要 onNext
    setError
  })

  // 角色预设对话框状态
  const [isPresetDialogOpen, setIsPresetDialogOpen] = useState(false)
  const [currentPresetCharacter, setCurrentPresetCharacter] = useState<string | null>(null)

  // 追踪状态
  const lastNotifiedStatusRef = useRef<string | null>(null)
  const hasAutoStartedRef = useRef(false)

  // 计算生成进度和状态
  const generatedCount = Object.values(characterStates).filter(s => s.imageUrl).length
  const totalCount = characters.length
  const isAnyGenerating = Object.values(characterStates).some(s => s.isGenerating) || isBatchGenerating

  // 计算整体状态
  const computedStatus = (() => {
    if (isInitialLoading) return 'idle'
    if (isAnyGenerating || isGeneratingPrompts) return 'generating'
    if (generatedCount === totalCount && totalCount > 0) return 'completed'
    if (error) return 'failed'
    return generatedCount > 0 ? 'completed' : 'idle'
  })()

  // 向父组件同步状态
  useEffect(() => {
    if (lastNotifiedStatusRef.current !== computedStatus) {
      lastNotifiedStatusRef.current = computedStatus
      onStatusChange(computedStatus)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [computedStatus])

  // 🔥 自动开始：如果没有人物图片，自动生成 prompts 然后批量生成
  useEffect(() => {
    if (hasAutoStartedRef.current) return
    if (isInitialLoading) return
    if (characters.length === 0) return
    if (isBatchGenerating || isGeneratingPrompts) return  // 🔥 防止重复触发

    // 检查是否已有图片
    const hasExistingImages = Object.values(characterStates).some(s => s.imageUrl)
    if (hasExistingImages) {
      hasAutoStartedRef.current = true
      return
    }

    // 检查是否有 prompt
    const hasPrompts = Object.values(characterStates).some(s => s.prompt && s.prompt.trim())

    if (!hasPrompts) {
      hasAutoStartedRef.current = true
      // 先生成 prompts，然后批量生成图片
      handleGeneratePrompts().then(() => {
        handleBatchGenerate()
      })
    } else {
      hasAutoStartedRef.current = true
      handleBatchGenerate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialLoading, characters.length, isBatchGenerating, isGeneratingPrompts])

  // 🔥 同步人物数据到 project.characters，供 StoryboardEditDialog 使用
  const lastSyncedRef = useRef<string | null>(null)
  useEffect(() => {
    if (isInitialLoading) return
    if (Object.keys(characterStates).length === 0) return

    // Convert characterStates to project.characters format for StoryboardEditDialog.
    // IMPORTANT: preserve the real DB id from Step2 if present; do NOT synthesize `char-...` ids.
    const projectCharacters = Object.values(characterStates).map(state => ({
      id: (state as any).id || `char-${state.name}`,
      character_name: state.name,
      name: state.name,
      generation_prompt: state.prompt,
      character_reference_images: state.imageUrl ? [{
        image_url: state.imageUrl,
        image_order: 0
      }] : [],
      reference_images: state.imageUrl ? [{
        url: state.imageUrl,
        order: 0
      }] : []
    }))

    // 检查是否有变化（避免无限循环）
    // 🔥 修复：syncKey 包含 image_url，确保图片更新时会触发同步
    const syncKey = JSON.stringify(projectCharacters.map(c =>
      c.character_name + (c.character_reference_images[0]?.image_url || 'none')
    ))
    if (lastSyncedRef.current !== syncKey) {
      lastSyncedRef.current = syncKey
      onUpdate({ characters: projectCharacters as any })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [characterStates, isInitialLoading])

  // 打开预设对话框
  const handleOpenPresetDialog = (characterName: string) => {
    setCurrentPresetCharacter(characterName)
    setIsPresetDialogOpen(true)
  }

  // 处理预设选择
  const handlePresetSelect = (preset: CharacterPreset) => {
    if (currentPresetCharacter) {
      handleSelectPreset(currentPresetCharacter, preset)
      setIsPresetDialogOpen(false)
      setCurrentPresetCharacter(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Character Generation</h2>

        {/* 批量重新生成按钮 */}
        {computedStatus === 'completed' && (
          <Button
            onClick={handleBatchGenerate}
            variant="outline"
            size="sm"
            disabled={isBatchGenerating}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isBatchGenerating ? 'animate-spin' : ''}`} />
            Regenerate All
          </Button>
        )}
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 🔥 人物卡片网格 - 固定一排 4 个 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {isInitialLoading ? (
          // 加载中显示骨架屏
          characters.map((name) => <CharacterCardCompactSkeleton key={name} />)
        ) : (
          // 加载完成后显示紧凑版卡片
          // 🔥 使用 Object.entries 并用对象的 key 作为 React key，确保唯一性
          Object.entries(characterStates).map(([stateKey, state]) => (
            <CharacterCardCompact
              key={stateKey}
              state={state}
              onPromptChange={(prompt) =>
                setCharacterStates(prev => ({
                  ...prev,
                  [stateKey]: { ...prev[stateKey], prompt }
                }))
              }
              onGenerate={() => handleSingleGenerate(state.name)}
              onUpload={(file) => handleImageUpload(state.name, file)}
              onOpenPreset={() => handleOpenPresetDialog(state.name)}
            />
          ))
        )}
      </div>

      {/* Error State - Retry */}
      {computedStatus === 'failed' && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
              <div className="flex-1 space-y-3">
                <div>
                  <h3 className="font-medium text-destructive">
                    Character Generation Failed
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    An error occurred while generating character images.
                    Please try again.
                  </p>
                </div>
                <Button
                  onClick={handleBatchGenerate}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry Generation
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 角色预设选择对话框 */}
      <CharacterPresetDialog
        open={isPresetDialogOpen}
        onOpenChange={setIsPresetDialogOpen}
        onSelectPreset={handlePresetSelect}
        currentCharacterName={currentPresetCharacter || undefined}
      />
    </div>
  )
}

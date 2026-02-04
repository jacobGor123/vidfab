/**
 * Step 2: Character Configuration (重构版)
 * 人物配置 - 拆分为多个子组件，提升可维护性
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { VideoAgentProject } from '@/lib/stores/video-agent'
import { CharacterPresetDialog } from '../../CharacterPresetDialog'
import { CharacterPreset } from '@/lib/constants/character-presets'
import { AlertCircle, Users } from 'lucide-react'
import { useCharacterState } from './hooks/useCharacterState'
import { useCharacterGeneration } from './hooks/useCharacterGeneration'
import { useCharacterManagement } from './hooks/useCharacterManagement'
import { BatchControls } from './BatchControls'
import { CharacterCard, CharacterCardSkeleton } from './CharacterCard'

interface Step2Props {
  project: VideoAgentProject
  onNext: () => void
  onUpdate: (updates: Partial<VideoAgentProject>) => void
}

export default function Step2CharacterConfig({ project, onNext, onUpdate }: Step2Props) {
  // 状态管理
  const { characterStates, setCharacterStates, isInitialLoading, characters } = useCharacterState({
    project,
    onUpdate
  })

  // 生成相关操作
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

  // 管理相关操作
  const {
    handleImageUpload,
    handleSelectPreset,
    handleConfirm,
    handleNameChange,
    isSaving
  } = useCharacterManagement({
    project,
    characterStates,
    setCharacterStates,
    onUpdate,
    onNext,
    setError
  })

  // 角色预设对话框状态
  const [isPresetDialogOpen, setIsPresetDialogOpen] = useState(false)
  const [currentPresetCharacter, setCurrentPresetCharacter] = useState<string | null>(null)

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

  // 计算生成进度
  const generatedCount = Object.values(characterStates).filter(s => s.imageUrl).length
  const totalCount = characters.length

  // 如果没有人物，跳过此步骤
  if (characters.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="flex justify-center mb-4">
            <Users className="w-20 h-20 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-bold mb-2">No Characters Detected</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Your script doesn&apos;t include any characters. We&apos;ll proceed directly to
            storyboard generation.
          </p>
        </div>
        <div className="flex justify-center">
          <Button onClick={() => onNext()} size="lg" className="px-12">
            Skip & Continue
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 错误提示 */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 批量操作控制面板 */}
      <BatchControls
        onGenerateAll={handleBatchGenerate}
        onGeneratePrompts={handleGeneratePrompts}
        isGeneratingPrompts={isGeneratingPrompts}
        isBatchGenerating={isBatchGenerating}
        isLoading={isInitialLoading}
        generatedCount={generatedCount}
        totalCount={totalCount}
      />

      {/* 人物卡片网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isInitialLoading ? (
          // 加载中显示骨架屏
          characters.map((name) => <CharacterCardSkeleton key={name} />)
        ) : (
          // 加载完成后显示实际卡片
          Object.values(characterStates).map(state => (
            <CharacterCard
              key={state.name}
              state={state}
              onPromptChange={(prompt) =>
                setCharacterStates(prev => ({
                  ...prev,
                  [state.name]: { ...prev[state.name], prompt }
                }))
              }
              onNameChange={(newName) => handleNameChange(state.name, newName)}
              onGenerate={() => {
                console.log('⚡⚡⚡ [INDEX] onGenerate triggered for:', state.name)
                handleSingleGenerate(state.name)
              }}
              onUpload={(file) => handleImageUpload(state.name, file)}
              onOpenPreset={() => handleOpenPresetDialog(state.name)}
            />
          ))
        )}
      </div>

      {/* 确认按钮 */}
      <div className="sticky bottom-0 -mx-6 -mb-6 p-6 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent flex justify-center items-center gap-4 pt-8 pb-8 z-10">
        <Button
          onClick={() => onNext()}
          variant="ghost"
          className="text-slate-400 hover:text-white"
          disabled={isSaving || isInitialLoading}
        >
          Skip Character Setup
        </Button>

        <Button
          onClick={handleConfirm}
          disabled={isSaving || isInitialLoading}
          size="lg"
          className="h-14 px-12 rounded-full bg-white text-black hover:bg-blue-50 hover:text-blue-600 font-bold text-lg shadow-[0_0_30px_rgba(255,255,255,0.1)] transition-all hover:scale-105"
        >
          {isSaving ? 'Saving...' : isInitialLoading ? 'Loading...' : 'Confirm & Continue'}
        </Button>
      </div>

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

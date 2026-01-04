/**
 * Step 3: Storyboard Generation
 * 生成分镜图，支持重新生成
 */

'use client'

import { Button } from '@/components/ui/button'
import { useStoryboardGeneration } from './useStoryboardGeneration'
import { Step3InitialState } from './Step3InitialState'
import { Step3ProgressCard } from './Step3ProgressCard'
import { Step3StoryboardCard } from './Step3StoryboardCard'
import type { Step3Props, DisplayItem } from './Step3StoryboardGen.types'

export default function Step3StoryboardGen({ project, onNext, onUpdate }: Step3Props) {
  const { state, actions, stats, setIsShowingConfirm } = useStoryboardGeneration({
    project,
    onUpdate,
    onNext
  })

  const {
    isGenerating,
    hasStartedGeneration,
    storyboards,
    error,
    regeneratingShot,
    customPrompts,
    expandedPrompts,
    isShowingConfirm
  } = state

  const {
    handleGenerate,
    handleConfirm,
    getDefaultPrompt,
    updateCustomPrompt,
    togglePromptExpand
  } = actions

  const { totalShots, completedShots, failedShots, generatingShots, progress } = stats
  const status = state.statusMeta?.status

  // 根据项目尺寸比决定容器 aspect ratio
  const aspectRatioClass = project.aspect_ratio === '9:16' ? 'aspect-[9/16]' : 'aspect-video'

  // 初始状态：未生成且从未开始过生成
  if (!hasStartedGeneration && storyboards.length === 0 && !isGenerating) {
    return (
      <Step3InitialState
        totalShots={totalShots}
        imageStyle={project.image_style_id || 'realistic'}
        error={error}
        onGenerate={handleGenerate}
      />
    )
  }

  // 创建占位数组 - 始终显示 totalShots 个卡片
  const displayItems: DisplayItem[] = Array.from({ length: totalShots }, (_, index) => {
    const shotNumber = index + 1
    const storyboard = storyboards.find(sb => sb.shot_number === shotNumber)
    return storyboard || { shot_number: shotNumber, status: 'pending' as const }
  })

  return (
    <div className="space-y-6">
      {/* 进度概览 */}
      <Step3ProgressCard
        totalShots={totalShots}
        completedShots={completedShots}
        generatingShots={generatingShots}
        failedShots={failedShots}
        progress={progress}
        regenerateQuotaRemaining={project.regenerate_quota_remaining}
        status={status}
      />

      {/* 分镜网格 - 使用占位符确保高度稳定 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {displayItems.map((item) => (
          <Step3StoryboardCard
            key={item.shot_number}
            item={item}
            aspectRatioClass={aspectRatioClass}
            regeneratingShot={regeneratingShot}
            isShowingConfirm={isShowingConfirm}
            expandedPrompts={expandedPrompts}
            customPrompts={customPrompts}
            onRegenerateClick={actions.handleRegenerate}
            onTogglePrompt={togglePromptExpand}
            onUpdatePrompt={updateCustomPrompt}
            getDefaultPrompt={getDefaultPrompt}
            setIsShowingConfirm={setIsShowingConfirm}
          />
        ))}
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
          {error}
        </div>
      )}

      {/* 确认按钮 - 只有在所有分镜都完成（成功或失败）且不在生成中时才显示 */}
      {!isGenerating && generatingShots === 0 && (completedShots + failedShots === totalShots) && totalShots > 0 && (
        <div className="sticky bottom-0 -mx-6 -mb-6 p-6 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent flex justify-center pt-8 pb-8 z-10">
          <Button
            onClick={handleConfirm}
            size="lg"
            className="h-14 px-12 rounded-full bg-white text-black hover:bg-blue-50 hover:text-blue-600 font-bold text-lg shadow-[0_0_30px_rgba(255,255,255,0.1)] transition-all hover:scale-105"
          >
            {failedShots > 0 ? 'Continue (Some Failed)' : 'Confirm & Continue'}
          </Button>
        </div>
      )}
    </div>
  )
}

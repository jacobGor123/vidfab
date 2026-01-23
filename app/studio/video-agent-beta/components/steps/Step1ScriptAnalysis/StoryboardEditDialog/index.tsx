/**
 * StoryboardEditDialog Component
 *
 * 分镜编辑对话框主组件
 * 左侧：人物参考面板（可选择）
 * 右侧：分镜预览 + prompt 编辑 + 重新生成
 */

'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
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
}

export function StoryboardEditDialog({
  open,
  onOpenChange,
  project,
  shotNumber,
  onRegenerate
}: StoryboardEditDialogProps) {
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
  const characters: Character[] = (project.characters || []).map((char: any) => ({
    id: char.id,
    character_name: char.character_name || char.name || '',
    generation_prompt: char.generation_prompt || null,
    character_reference_images: (char.character_reference_images || char.reference_images || []).map((img: any) => ({
      image_url: img.image_url || img.url || '',
      image_order: img.image_order ?? img.order ?? 0
    }))
  }))

  const storyboard = shotNumber
    ? (project.storyboards?.find(s => s.shot_number === shotNumber) as unknown as Storyboard)
    : undefined

  // 获取当前 shot 信息
  const shot = shotNumber
    ? project.script_analysis?.shots.find(s => s.shot_number === shotNumber)
    : undefined

  const handleRegenerateClick = async () => {
    await handleRegenerate(onRegenerate, () => onOpenChange(false))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[1800px] h-[90vh] p-0 gap-0 bg-slate-950 border-slate-800">
        {/* Header */}
        <DialogHeader className="px-8 py-6 border-b border-slate-800 flex-shrink-0">
          <DialogTitle className="text-2xl text-slate-100 font-bold">
            Edit Storyboard - Shot {shotNumber}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Select characters and edit the prompt to regenerate this storyboard
          </DialogDescription>
        </DialogHeader>

        {/* Main Content */}
        <div className="flex flex-row gap-8 p-8 overflow-hidden flex-1">
          {/* Left Panel - Character Selection */}
          <div className="w-[400px] flex-shrink-0">
            <ScrollArea className="h-full pr-4">
              <CharacterReferencePanel
                characters={characters}
                selectedCharacterNames={selectedCharacterNames}
                selectedCharacterIds={selectedCharacterIds}
                onToggle={handleToggleCharacter}
                onToggleById={handleToggleCharacterId}
              />
            </ScrollArea>
          </div>

          {/* Divider */}
          <div className="w-px bg-slate-800 flex-shrink-0" />

          {/* Right Panel - Storyboard Editor */}
          <div className="flex-1 min-w-0">
            <ScrollArea className="h-full pr-4">
              <StoryboardEditPanel
                shotNumber={shotNumber || 0}
                storyboard={storyboard}
                prompt={editedPrompt}
                isRegenerating={isRegenerating}
                onPromptChange={handlePromptChange}
                onRegenerate={handleRegenerateClick}
              />
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

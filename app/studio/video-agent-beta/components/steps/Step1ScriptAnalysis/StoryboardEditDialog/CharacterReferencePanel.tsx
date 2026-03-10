/**
 * CharacterReferencePanel Component
 *
 * 左侧人物参考面板
 * 显示所有人物的缩略图，支持选择/取消选择
 */

'use client'

import { User } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface Character {
  id: string
  character_name: string
  generation_prompt: string | null
  character_reference_images?: Array<{
    image_url: string
    image_order: number
  }>
}

interface CharacterReferencePanelProps {
  characters: Character[]
  selectedCharacterNames: string[]
  selectedCharacterIds?: string[]
  onToggle: (characterName: string) => void
  onToggleById?: (characterId: string) => void
}

export function CharacterReferencePanel({
  characters,
  selectedCharacterNames,
  selectedCharacterIds,
  onToggle,
  onToggleById
}: CharacterReferencePanelProps) {
  const selectedCount = selectedCharacterIds?.length || selectedCharacterNames.length

  return (
    <TooltipProvider delayDuration={300}>
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        {characters.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No characters available</p>
          </div>
        ) : (
          <>
            {/* 横向滚动布局 */}
            <div className="overflow-x-auto overflow-y-hidden -mx-4 px-4 mb-4 scrollbar-hide">
              <div className="flex gap-3 pb-2">
                {characters.map((character) => {
                  const isSelected = selectedCharacterIds
                    ? selectedCharacterIds.includes(character.id)
                    : selectedCharacterNames.includes(character.character_name)
                  const imageUrl = character.character_reference_images?.[0]?.image_url

                  // 人物名：取括号前的部分作为简短展示名
                  const displayName = character.character_name.split('(')[0].trim()
                  const prompt = character.generation_prompt

                  return (
                    <div
                      key={character.id}
                      className={cn(
                        "flex-shrink-0 w-28 cursor-pointer transition-all duration-200 rounded-lg border p-2.5",
                        isSelected
                          ? "border-purple-500/50 bg-purple-500/10"
                          : "border-slate-700 bg-slate-900/40 hover:border-slate-600 hover:bg-slate-900/60"
                      )}
                      onClick={() => {
                        if (onToggleById) {
                          onToggleById(character.id)
                        } else {
                          onToggle(character.character_name)
                        }
                      }}
                    >
                      {/* Character Image */}
                      <div className="relative mb-2">
                        <div className="w-full aspect-square rounded-lg overflow-hidden bg-slate-800/50">
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={displayName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-500">
                              <User className="w-8 h-8" />
                            </div>
                          )}
                        </div>

                        {/* Selection Indicator - 右上角紫色圆点 */}
                        {isSelected && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center shadow-lg border-2 border-slate-900">
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* Character Info */}
                      <div>
                        {/* 名字：单行截断，全名做 tooltip */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <h4 className="text-xs font-medium text-white mb-1 truncate">
                              {displayName}
                            </h4>
                          </TooltipTrigger>
                          {character.character_name !== displayName && (
                            <TooltipContent
                              side="bottom"
                              className="max-w-[240px] text-xs break-words"
                            >
                              {character.character_name}
                            </TooltipContent>
                          )}
                        </Tooltip>

                        {/* 描述：最多 2 行，超出 tooltip 展示完整 */}
                        {prompt && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <p
                                className="text-[10px] text-slate-400 leading-relaxed"
                                style={{
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                }}
                              >
                                {prompt}
                              </p>
                            </TooltipTrigger>
                            <TooltipContent
                              side="bottom"
                              className="max-w-[280px] text-xs break-words leading-relaxed"
                            >
                              {prompt}
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Selection Summary */}
            <div className="pt-3 border-t border-slate-800 flex-shrink-0">
              <p className="text-sm text-slate-400">
                {selectedCount} of {characters.length} character(s) selected
              </p>
            </div>
          </>
        )}
      </div>
    </TooltipProvider>
  )
}

/**
 * CharacterReferencePanel Component
 *
 * 左侧人物参考面板
 * 显示所有人物的缩略图，支持选择/取消选择
 */

'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, User } from 'lucide-react'
import { cn } from '@/lib/utils'

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
  onToggle
  ,
  onToggleById
}: CharacterReferencePanelProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-200 mb-1">
          Character References
        </h3>
      </div>

      {/* Character List */}
      {/*
        Avoid nested scrollbars: the parent Dialog already wraps this panel in a ScrollArea.
        Also, prevent flex children from overflowing by allowing the text column to shrink.
      */}
      <div className="space-y-3 pr-2">
        {characters.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No characters available</p>
          </div>
        ) : (
          characters.map((character) => {
            const isSelected = selectedCharacterIds
              ? selectedCharacterIds.includes(character.id)
              : selectedCharacterNames.includes(character.character_name)
            const imageUrl = character.character_reference_images?.[0]?.image_url

            return (
              <Card
                key={character.id}
                className={cn(
                  "cursor-pointer transition-all duration-200 overflow-hidden",
                  isSelected
                    ? "border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20"
                    : "border-slate-700 bg-slate-900/50 hover:border-slate-600 hover:bg-slate-900"
                )}
                onClick={() => {
                  if (onToggleById) {
                    onToggleById(character.id)
                  } else {
                    onToggle(character.character_name)
                  }
                }}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Character Image */}
                    <div className="relative flex-shrink-0">
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-800">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={character.character_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-500">
                            <User className="w-6 h-6" />
                          </div>
                        )}
                      </div>

                      {/* Selection Indicator */}
                      {isSelected && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>

                    {/* Character Info */}
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className="flex items-start gap-2 mb-1">
                        <h4 className="text-sm font-semibold text-slate-200 whitespace-normal break-words line-clamp-2">
                          {character.character_name}
                        </h4>
                        {isSelected && (
                          <Badge
                            variant="outline"
                            className="text-[10px] leading-none text-blue-400 border-blue-400 flex-shrink-0 self-start mt-0.5"
                          >
                            Selected
                          </Badge>
                        )}
                      </div>
                      {character.generation_prompt && (
                        <p className="text-xs text-slate-400 whitespace-normal break-words line-clamp-3">
                          {character.generation_prompt}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Selection Summary */}
      {characters.length > 0 && (
        <div className="pt-3 border-t border-slate-700">
          <p className="text-xs text-slate-400">
            {selectedCharacterNames.length} of {characters.length} character(s) selected
          </p>
        </div>
      )}
    </div>
  )
}

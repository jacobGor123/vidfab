/**
 * Character Preset Dialog - 角色预设选择对话框
 * 展示所有预设角色，支持搜索和选择
 */

'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CHARACTER_PRESETS, CharacterPreset } from '@/lib/constants/character-presets'
import { Check } from 'lucide-react'

interface CharacterPresetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectPreset: (preset: CharacterPreset) => void
  currentCharacterName?: string // 当前正在配置的角色名称（用于显示提示）
}

export function CharacterPresetDialog({
  open,
  onOpenChange,
  onSelectPreset,
  currentCharacterName
}: CharacterPresetDialogProps) {
  const [selectedPreset, setSelectedPreset] = useState<CharacterPreset | null>(null)

  // 确认选择
  const handleConfirm = () => {
    if (selectedPreset) {
      onSelectPreset(selectedPreset)
      onOpenChange(false)
      // 重置状态
      setSelectedPreset(null)
    }
  }

  // 关闭对话框时重置状态
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedPreset(null)
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-6">
        <DialogHeader className="sr-only">
          <DialogTitle>Choose Character Preset</DialogTitle>
        </DialogHeader>

        {/* 角色网格 */}
        <ScrollArea className="h-[60vh] -mx-6 px-6">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 pb-4">
            {CHARACTER_PRESETS.map((preset) => (
                <button
                  key={preset.imageUrl}
                  onClick={() => setSelectedPreset(preset)}
                  className={`
                    relative group rounded-lg overflow-hidden border-2 transition-all
                    hover:scale-105 hover:shadow-lg
                    ${selectedPreset?.imageUrl === preset.imageUrl
                      ? 'border-primary shadow-lg ring-2 ring-primary/20'
                      : 'border-border hover:border-primary/50'
                    }
                  `}
                >
                  {/* 图片 */}
                  <div className="aspect-square bg-muted/30 relative">
                    <img
                      src={preset.imageUrl}
                      alt={preset.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {/* 选中标记 */}
                    {selectedPreset?.imageUrl === preset.imageUrl && (
                      <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                        <div className="bg-primary text-primary-foreground rounded-full p-2">
                          <Check className="w-5 h-5" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 名称 */}
                  <div className="p-2 bg-background/95 backdrop-blur-sm">
                    <p className="text-xs font-medium text-center truncate" title={preset.name}>
                      {preset.name}
                    </p>
                  </div>
                </button>
            ))}
          </div>
        </ScrollArea>

        {/* 底部操作按钮 */}
        <DialogFooter className="flex-row justify-between sm:justify-between items-center gap-2">
          <div className="text-sm text-muted-foreground">
            {selectedPreset ? (
              <span>Selected: <span className="font-semibold text-foreground">{selectedPreset.name}</span></span>
            ) : (
              <span>Click a character to select</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!selectedPreset}
            >
              Confirm Selection
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

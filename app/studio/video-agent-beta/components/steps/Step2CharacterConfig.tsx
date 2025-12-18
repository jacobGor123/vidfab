/**
 * Step 2: Character Configuration (优化版)
 * 人物配置 - 自动生成 Prompts + 批量生图 + 优化排版
 */

'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { VideoAgentProject } from '@/lib/stores/video-agent'
import {
  Sparkles,
  Loader2,
  Upload,
  RefreshCw,
  Check,
  AlertCircle,
  Wand2,
  Users
} from 'lucide-react'

interface Step2Props {
  project: VideoAgentProject
  onNext: () => void
  onUpdate: (updates: Partial<VideoAgentProject>) => void
}

interface CharacterPrompt {
  characterName: string
  prompt: string
  negativePrompt: string
}

interface CharacterState {
  name: string
  prompt: string
  negativePrompt: string
  imageUrl?: string
  isGenerating: boolean
  error?: string
  mode: 'ai' | 'upload'
}

export default function Step2CharacterConfig({ project, onNext, onUpdate }: Step2Props) {
  const characters = project.script_analysis?.characters || []
  const [selectedStyle, setSelectedStyle] = useState('realistic')
  const [characterStates, setCharacterStates] = useState<Record<string, CharacterState>>({})
  const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false)
  const [isBatchGenerating, setIsBatchGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // 初始化人物状态
  useEffect(() => {
    const initialStates: Record<string, CharacterState> = {}
    characters.forEach(char => {
      initialStates[char] = {
        name: char,
        prompt: '',
        negativePrompt: '',
        isGenerating: false,
        mode: 'ai'
      }
    })
    setCharacterStates(initialStates)
  }, [characters])

  // 自动生成 Prompts
  const handleGeneratePrompts = async () => {
    setIsGeneratingPrompts(true)
    setError(null)

    try {
      const response = await fetch(`/api/video-agent/projects/${project.id}/character-prompts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageStyle: selectedStyle })
      })

      if (!response.ok) {
        throw new Error('Failed to generate prompts')
      }

      const { data } = await response.json()
      const { characterPrompts } = data as { characterPrompts: CharacterPrompt[] }

      // 更新人物状态
      const newStates = { ...characterStates }
      characterPrompts.forEach(cp => {
        if (newStates[cp.characterName]) {
          newStates[cp.characterName] = {
            ...newStates[cp.characterName],
            prompt: cp.prompt,
            negativePrompt: cp.negativePrompt
          }
        }
      })
      setCharacterStates(newStates)

    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsGeneratingPrompts(false)
    }
  }

  // 批量生成所有人物图片（智能模式：自动先生成prompts）
  const handleBatchGenerate = async () => {
    setIsBatchGenerating(true)
    setError(null)

    try {
      // 检查是否已生成 prompts
      const hasPrompts = Object.values(characterStates).some(s => s.prompt.trim())

      // 如果没有prompts，自动先生成
      if (!hasPrompts) {
        console.log('[Step2] Auto-generating prompts before batch generation')

        const response = await fetch(`/api/video-agent/projects/${project.id}/character-prompts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageStyle: selectedStyle })
        })

        if (!response.ok) {
          throw new Error('Failed to generate prompts')
        }

        const { data } = await response.json()
        const { characterPrompts } = data

        // 更新所有人物的 prompts
        const newStates = { ...characterStates }
        characterPrompts.forEach((cp: CharacterPrompt) => {
          if (newStates[cp.characterName]) {
            newStates[cp.characterName].prompt = cp.prompt
            newStates[cp.characterName].negativePrompt = cp.negativePrompt
          }
        })
        setCharacterStates(newStates)

        // 使用更新后的状态继续批量生成
        const promptsToGenerate = characterPrompts.map((cp: CharacterPrompt) => ({
          characterName: cp.characterName,
          prompt: cp.prompt,
          negativePrompt: cp.negativePrompt || ''
        }))

        // 继续批量生成流程
        await batchGenerateImages(promptsToGenerate, newStates)
        return
      }

      // 获取要生成的人物prompts（如果已有prompts）
      const promptsToGenerate = Object.values(characterStates)
        .filter(s => s.prompt.trim())
        .map(s => ({
          characterName: s.name,
          prompt: s.prompt,
          negativePrompt: s.negativePrompt || ''
        }))

      await batchGenerateImages(promptsToGenerate, characterStates)

    } catch (err: any) {
      setError(err.message)
      // 清除生成中状态
      const newStates = { ...characterStates }
      Object.keys(newStates).forEach(key => {
        newStates[key].isGenerating = false
      })
      setCharacterStates(newStates)
    } finally {
      setIsBatchGenerating(false)
    }
  }

  // 批量生成图片的核心逻辑（提取为独立函数）
  const batchGenerateImages = async (
    promptsToGenerate: Array<{ characterName: string; prompt: string; negativePrompt: string }>,
    currentStates: Record<string, CharacterState>
  ) => {
    if (promptsToGenerate.length === 0) {
      setError('No prompts available to generate')
      return
    }

    // 设置所有人物为生成中状态
    const newStates = { ...currentStates }
    promptsToGenerate.forEach(cp => {
      if (newStates[cp.characterName]) {
        newStates[cp.characterName].isGenerating = true
        newStates[cp.characterName].error = undefined
      }
    })
    setCharacterStates(newStates)

    const response = await fetch(`/api/video-agent/projects/${project.id}/batch-generate-characters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ characterPrompts: promptsToGenerate })
    })

    if (!response.ok) {
      throw new Error('Failed to batch generate characters')
    }

    const { data } = await response.json()
    const { results } = data

    // 更新生成结果
    const finalStates = { ...currentStates }
    results.forEach((result: any) => {
      if (finalStates[result.characterName]) {
        finalStates[result.characterName].isGenerating = false
        if (result.status === 'success') {
          finalStates[result.characterName].imageUrl = result.imageUrl
        } else {
          finalStates[result.characterName].error = result.error
        }
      }
    })
    setCharacterStates(finalStates)
  }

  // 单个人物生成
  const handleSingleGenerate = async (characterName: string) => {
    const state = characterStates[characterName]
    if (!state || !state.prompt.trim()) {
      setError('Please enter a prompt first')
      return
    }

    setCharacterStates(prev => ({
      ...prev,
      [characterName]: { ...prev[characterName], isGenerating: true, error: undefined }
    }))

    try {
      const response = await fetch('/api/video-agent/generate-character-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: state.prompt,
          negativePrompt: state.negativePrompt,
          aspectRatio: '1:1'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate image')
      }

      const { imageUrl } = await response.json()

      setCharacterStates(prev => ({
        ...prev,
        [characterName]: {
          ...prev[characterName],
          imageUrl,
          isGenerating: false
        }
      }))
    } catch (err: any) {
      setCharacterStates(prev => ({
        ...prev,
        [characterName]: {
          ...prev[characterName],
          isGenerating: false,
          error: err.message
        }
      }))
    }
  }

  // 上传图片
  const handleImageUpload = async (characterName: string, file: File) => {
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Failed to upload image')
      }

      const { url } = await response.json()

      setCharacterStates(prev => ({
        ...prev,
        [characterName]: {
          ...prev[characterName],
          imageUrl: url,
          mode: 'upload'
        }
      }))
    } catch (err: any) {
      setError(err.message)
    }
  }

  // 确认并继续
  const handleConfirm = async () => {
    setIsSaving(true)
    setError(null)

    try {
      // 只保存有图片的人物
      const charactersWithImages = Object.values(characterStates)
        .filter(s => s.imageUrl)

      if (charactersWithImages.length > 0) {
        const charactersData = charactersWithImages.map(s => ({
          name: s.name,
          source: s.mode === 'upload' ? 'upload' : 'ai_generate',
          referenceImages: [s.imageUrl!]
        }))

        const response = await fetch(`/api/video-agent/projects/${project.id}/characters`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ characters: charactersData })
        })

        if (!response.ok) {
          throw new Error('Failed to save characters')
        }
      }

      onNext()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSaving(false)
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

      {/* 控制面板 - 紧凑版 */}
      <Card>
        <CardContent className="pt-6">
          {/* 操作按钮 */}
          <div className="flex gap-2">
            {/* 一键生成按钮（主要操作） */}
            <Button
              onClick={handleBatchGenerate}
              disabled={isBatchGenerating || isGeneratingPrompts}
              className="flex-1"
            >
              {isBatchGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating {generatedCount}/{totalCount}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate All
                </>
              )}
            </Button>

            {/* 仅生成Prompts按钮（次要操作） */}
            <Button
              onClick={handleGeneratePrompts}
              disabled={isGeneratingPrompts || isBatchGenerating}
              variant="outline"
              className="flex-1"
            >
              {isGeneratingPrompts ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Prompts...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Prompts Only
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 人物卡片网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.values(characterStates).map(state => (
          <Card key={state.name} className="relative">
            <CardContent className="pt-6 space-y-3">
              {/* 人物名称 */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{state.name}</h3>
                {state.imageUrl && (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    <Check className="w-3 h-3 mr-1" />
                    Generated
                  </Badge>
                )}
              </div>

              {/* 图片预览 - 自适应尺寸，不裁切 */}
              <div className="min-h-[300px] max-h-[600px] border-2 border-dashed rounded-lg overflow-hidden bg-muted/30 relative group flex items-center justify-center">
                {state.isGenerating ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : state.imageUrl ? (
                  <>
                    <img
                      src={state.imageUrl}
                      alt={state.name}
                      className="w-full h-auto max-h-[600px] object-contain"
                    />
                    {/* 重新生成按钮 - 悬停时显示 */}
                    <button
                      onClick={() => handleSingleGenerate(state.name)}
                      disabled={!state.prompt.trim()}
                      className="absolute top-2 right-2 p-2 bg-background/90 hover:bg-background border border-border rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Regenerate image"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                    No image yet
                  </div>
                )}
              </div>

              {/* Prompt 编辑 */}
              <div className="space-y-2">
                <Label className="text-xs">Prompt</Label>
                <Textarea
                  value={state.prompt}
                  onChange={(e) =>
                    setCharacterStates(prev => ({
                      ...prev,
                      [state.name]: { ...prev[state.name], prompt: e.target.value }
                    }))
                  }
                  placeholder="AI will generate prompt..."
                  rows={3}
                  className="text-xs"
                />
              </div>

              {/* 错误提示 */}
              {state.error && (
                <div className="text-xs text-destructive bg-destructive/10 p-2 rounded">
                  {state.error}
                </div>
              )}

              {/* 操作按钮 */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => handleSingleGenerate(state.name)}
                  disabled={state.isGenerating || !state.prompt.trim()}
                  size="sm"
                  variant="outline"
                >
                  {state.imageUrl ? (
                    <>
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Regenerate
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3 mr-1" />
                      Generate
                    </>
                  )}
                </Button>

                <label>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleImageUpload(state.name, file)
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-full"
                    asChild
                  >
                    <span>
                      <Upload className="w-3 h-3 mr-1" />
                      Upload
                    </span>
                  </Button>
                </label>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 确认按钮 */}
      <div className="sticky bottom-0 -mx-6 -mb-6 p-6 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent flex justify-center items-center gap-4 pt-8 pb-8 z-10">
        <Button
          onClick={() => onNext()}
          variant="ghost"
          className="text-slate-400 hover:text-white"
          disabled={isSaving}
        >
          Skip Character Setup
        </Button>

        <Button
          onClick={handleConfirm}
          disabled={isSaving}
          size="lg"
          className="h-14 px-12 rounded-full bg-white text-black hover:bg-blue-50 hover:text-blue-600 font-bold text-lg shadow-[0_0_30px_rgba(255,255,255,0.1)] transition-all hover:scale-105"
        >
          {isSaving ? 'Saving...' : 'Confirm & Continue'}
        </Button>
      </div>
    </div>
  )
}

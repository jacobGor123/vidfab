/**
 * Character State Management Hook
 * 管理角色状态：初始化、数据加载、自动同步
 */

import { useState, useEffect, useRef } from 'react'
import { VideoAgentProject } from '@/lib/stores/video-agent'
import { useVideoAgentAPI } from '@/lib/hooks/useVideoAgentAPI'

export interface CharacterState {
  id?: string
  name: string
  prompt: string
  negativePrompt: string
  imageUrl?: string
  isGenerating: boolean
  error?: string
  mode: 'ai' | 'upload'
}

interface UseCharacterStateProps {
  project: VideoAgentProject
  onUpdate: (updates: Partial<VideoAgentProject>) => void
}

export function useCharacterState({ project, onUpdate }: UseCharacterStateProps) {
  const { getCharacters, updateProject } = useVideoAgentAPI()
  const characters = project.script_analysis?.characters || []
  const [characterStates, setCharacterStates] = useState<Record<string, CharacterState>>({})
  const [isInitialLoading, setIsInitialLoading] = useState(true)

  // Parent often passes inline closures; keep a stable reference to avoid churn.
  const onUpdateRef = useRef(onUpdate)
  useEffect(() => {
    onUpdateRef.current = onUpdate
  }, [onUpdate])

  // 🔥 使用 ref 追踪是否已初始化，避免不必要的重新加载
  const hasInitializedRef = useRef(false)
  const lastCharactersKeyRef = useRef<string>('')

  // 初始化人物状态 - 从数据库读取已保存的数据
  useEffect(() => {
    async function loadCharacterData() {

      // 🔥 关键修复：只在首次加载时显示骨架屏，重新加载时后台静默更新
      // 这样避免用户快速操作时出现闪烁的骨架屏，提升体验
      if (!hasInitializedRef.current) {
        setIsInitialLoading(true)
      }

      // 🔥 保存当前状态的快照，用于后续的智能合并
      // 这样即使在数据库请求期间，也能保留用户已经看到的图片
      const currentStatesSnapshot = { ...characterStates }

      const initialStates: Record<string, CharacterState> = {}

      // 🔥 关键修复：去重角色列表，避免重复的名称
      const uniqueCharacters = Array.from(new Set(characters))

      // 先创建默认状态（使用去重后的列表）
      // 🔥 优化：尝试从当前快照中恢复状态，避免"空白期"
      uniqueCharacters.forEach(char => {
        const existingState = currentStatesSnapshot[char]
        initialStates[char] = existingState || {
          name: char,
          prompt: char,
          negativePrompt: '',
          isGenerating: false,
          mode: 'ai'
        }
      })

      // 从数据库读取已保存的人物数据
      try {
        const data = await getCharacters(project.id)

        // 检测数据库中的角色名和 script_analysis 中的是否一致
        let needsSync = false
        const dbCharacterNames: string[] = []

        // 🔥 新增：保存所有数据库角色数据（包括不匹配的），用于位置映射
        const dbCharactersData: any[] = []

        // 回填已保存的数据
        if (data && Array.isArray(data)) {
          // 🔥 去重：按 character_name 去重，保留最后一个
          const uniqueData = data.reduce((acc: any[], char: any) => {
            const existingIndex = acc.findIndex((c: any) => c.character_name === char.character_name)
            if (existingIndex >= 0) {
              acc[existingIndex] = char
            } else {
              acc.push(char)
            }
            return acc
          }, [])

          uniqueData.forEach((char: any) => {
            dbCharacterNames.push(char.character_name)

            // 数据库角色 id（后续 updateCharacters 需要依赖 id 做稳定更新/改名）
            const dbId = char.id as string | undefined

            // 🔥 保存所有数据库角色（即使名字不匹配）
            const imageUrl = char.character_reference_images?.[0]?.image_url
            if (imageUrl) {
              dbCharactersData.push({
                id: dbId,
                name: char.character_name,
                imageUrl,
                mode: char.source === 'upload' ? 'upload' : 'ai',
                prompt: char.generation_prompt || '',
                negativePrompt: char.negative_prompt || ''
              })
            }

            // 数据库角色名匹配，回填数据
            if (initialStates[char.character_name]) {
              const matchedKey = char.character_name

              if (dbId) {
                initialStates[matchedKey].id = dbId
              }

              if (imageUrl) {
                initialStates[matchedKey].name = char.character_name
                initialStates[matchedKey].imageUrl = imageUrl
                initialStates[matchedKey].mode = char.source === 'upload' ? 'upload' : 'ai'
              } else {
              }

              // 恢复 prompt 和 negative prompt
              if (char.generation_prompt) {
                initialStates[matchedKey].prompt = char.generation_prompt
              }
              if (char.negative_prompt) {
                initialStates[matchedKey].negativePrompt = char.negative_prompt
              }
            } else {
              // 🔥 名字不匹配的角色，记录下来用于后续的位置映射
            }
          })

          // 🔥 尝试通过位置映射恢复未匹配的图片
          const initialStateKeys = Object.keys(initialStates)
          const unmatchedDbChars = dbCharactersData.filter(
            dbChar => !initialStateKeys.includes(dbChar.name)
          )

          if (unmatchedDbChars.length > 0) {
            // 找出 initialStates 中还没有图片的角色
            const statesWithoutImages = initialStateKeys.filter(
              key => !initialStates[key].imageUrl
            )

            // 按数组顺序映射（假设数据库中的顺序对应 script_analysis 中的顺序）
            unmatchedDbChars.forEach((dbChar, index) => {
              if (index < statesWithoutImages.length) {
                const targetKey = statesWithoutImages[index]
                initialStates[targetKey].imageUrl = dbChar.imageUrl
                initialStates[targetKey].mode = dbChar.mode
                initialStates[targetKey].prompt = dbChar.prompt || initialStates[targetKey].prompt
                initialStates[targetKey].negativePrompt = dbChar.negativePrompt || initialStates[targetKey].negativePrompt
                if (dbChar.id) {
                  initialStates[targetKey].id = dbChar.id
                }
              }
            })
          }

          // 🔥 关键修复：只在初次加载时自动同步，已初始化后跳过
          // 避免与用户主动选择预设人物的操作冲突，导致无限循环
          if (needsSync && dbCharacterNames.length > 0 && !hasInitializedRef.current) {
            await syncCharacterNames(dbCharacterNames, initialStates)
          } else if (needsSync) {
          }
        }
      } catch (error) {
        console.error('[useCharacterState] ❌ Failed to load character data:', error)
        // 继续执行，使用默认状态
      } finally {
        // 🔥 关键修复：智能合并状态，保留已有图片的角色
        // 这样可以避免快速操作时图片丢失的问题
        setCharacterStates(prev => {
          // 如果是首次加载，直接使用新状态
          if (!hasInitializedRef.current) {
            return initialStates
          }

          // 🔥 高级智能合并：基于图片 URL 匹配，而不仅仅是 key
          // 这样即使角色名变化，只要图片 URL 存在，就能保留
          const merged: Record<string, CharacterState> = { ...initialStates }

          // 构建旧状态的图片 URL 映射
          const oldImageUrlMap = new Map<string, CharacterState>()
          Object.values(prev).forEach(state => {
            if (state.imageUrl) {
              oldImageUrlMap.set(state.imageUrl, state)
            }
          })

          // 对每个新状态，尝试从旧状态中恢复图片和加载状态
          let recoveredCount = 0
          Object.keys(merged).forEach(key => {
            const newState = merged[key]
            const oldStateByKey = prev[key]

            // Preserve loading/error state only when it refers to the same logical character.
            // After renames/replacements, keeping isGenerating=true can create "ghost" cards
            // that appear to poll forever.
            // 🔥 关键修复：如果新状态已有图片，强制设置 isGenerating=false，避免卡死
            if (oldStateByKey && oldStateByKey.name === newState.name) {
              const preservedIsGenerating = newState.imageUrl ? false : (oldStateByKey.isGenerating ?? newState.isGenerating)
              merged[key] = {
                ...newState,
                isGenerating: preservedIsGenerating,
                error: oldStateByKey.error ?? newState.error
              }

              if (preservedIsGenerating) {
              }
            }

            // 情况1：新状态已有图片，保持不变（但已经保留了 isGenerating）
            if (newState.imageUrl) {
              // 图片已经是最新的，不需要额外恢复
              return
            }

            // 情况2：旧状态（相同 key）有图片，保留。
            // 但如果 DB 已经返回了不同的 imageUrl，不要用旧值覆盖回去。
            if (oldStateByKey && oldStateByKey.imageUrl) {
              const dbImageUrlForKey = initialStates[key]?.imageUrl
              if (dbImageUrlForKey && dbImageUrlForKey !== oldStateByKey.imageUrl) {
                return
              }
              merged[key] = {
                ...merged[key],  // 🔥 使用 merged[key] 而不是 newState，保留之前的 isGenerating
                id: oldStateByKey.id,
                imageUrl: oldStateByKey.imageUrl,
                mode: oldStateByKey.mode,
                isGenerating: false  // 🔥 有图片就不应该 generating
              }
              recoveredCount++
              return
            }

            // 情况3：在旧状态中查找相同名称的角色（即使 key 不同）
            const oldStateByName = Object.values(prev).find(s => s.name === newState.name && s.imageUrl)
            if (oldStateByName) {
              const dbImageUrlForKey = initialStates[key]?.imageUrl
              if (dbImageUrlForKey && dbImageUrlForKey !== oldStateByName.imageUrl) {
                return
              }
              merged[key] = {
                ...merged[key],  // 🔥 使用 merged[key] 而不是 newState，保留之前的 isGenerating
                id: oldStateByName.id,
                imageUrl: oldStateByName.imageUrl,
                mode: oldStateByName.mode,
                isGenerating: false  // 🔥 有图片就不应该 generating
              }
              recoveredCount++
              return
            }

            // 情况4：基于位置匹配（最后的兜底方案）
            // 如果数组长度相同，尝试通过索引位置恢复图片
            const newKeys = Object.keys(merged)
            const oldKeys = Object.keys(prev)
            if (oldKeys.length === newKeys.length) {
              const index = newKeys.indexOf(key)
              if (index >= 0 && index < oldKeys.length) {
                const oldKeyAtIndex = oldKeys[index]
                const oldStateByIndex = prev[oldKeyAtIndex]
                if (oldStateByIndex && oldStateByIndex.imageUrl) {
                  const dbImageUrlForKey = initialStates[key]?.imageUrl
                  if (dbImageUrlForKey && dbImageUrlForKey !== oldStateByIndex.imageUrl) {
                    return
                  }
                  merged[key] = {
                    ...merged[key],  // 🔥 使用 merged[key] 而不是 newState，保留之前的 isGenerating
                    id: oldStateByIndex.id,
                    imageUrl: oldStateByIndex.imageUrl,
                    mode: oldStateByIndex.mode,
                    isGenerating: false  // 🔥 有图片就不应该 generating
                  }
                  recoveredCount++
                  return
                }
              }
            }
          })

          if (recoveredCount > 0) {
          }

          return merged
        })

        setIsInitialLoading(false)
        hasInitializedRef.current = true
      }
    }

    // 🔥 优化：只在真正需要时才重新加载
    // 1. 未初始化时：第一次加载
    // 2. 人物列表变化时：但要避免仅因引用变化而重新加载
    const charactersKey = characters.join(',')
    const lastCharactersCount = lastCharactersKeyRef.current.split(',').filter(Boolean).length

    // 🔥 关键修复：只有在角色数量变化时才重新加载，避免因名称变化导致的循环
    const shouldLoad =
      (!hasInitializedRef.current && characters.length > 0 && project.id) ||
      (hasInitializedRef.current &&
        charactersKey !== lastCharactersKeyRef.current &&
        characters.length !== lastCharactersCount)

    if (shouldLoad) {
      lastCharactersKeyRef.current = charactersKey
      loadCharacterData()
    } else if (hasInitializedRef.current && charactersKey !== lastCharactersKeyRef.current) {
      // Names changed (e.g. from "Angel" to "Cyber Girl").
      // We must migrate local state keys to match new names, otherwise ghost cards appear.
      setCharacterStates(prev => {
        const nextStates: Record<string, CharacterState> = {}
        const oldNames = lastCharactersKeyRef.current.split(',').filter(Boolean)
        const newNames = characters

        // Migrate state from old name to new name by index
        newNames.forEach((newName, index) => {
          const oldName = oldNames[index]
          // If we have state for the old name, move it to the new name key
          // ONLY if the new name doesn't already have its own state.
          if (oldName && prev[oldName] && oldName !== newName) {
            nextStates[newName] = {
              ...prev[oldName],
              name: newName // Ensure internal name matches key
            }
            // Preserve image if one existed
          } else if (prev[newName]) {
            // Already has state for this name
            nextStates[newName] = prev[newName]
          } else {
            // New character added or found without state, initialize default
            // Try to rescue from prev by index if possible (fallback)
            const fallbackOld = oldNames[index]
            if (fallbackOld && prev[fallbackOld]) {
              nextStates[newName] = { ...prev[fallbackOld], name: newName }
            } else {
              nextStates[newName] = {
                name: newName,
                prompt: newName,
                negativePrompt: '',
                isGenerating: false,
                mode: 'ai'
              }
            }
          }
        })

        return nextStates
      })

      lastCharactersKeyRef.current = charactersKey
    } else if (characters.length === 0 && !hasInitializedRef.current) {
      setIsInitialLoading(false)
      hasInitializedRef.current = true
    }
  }, [characters.join(','), project.id])

  // 自动同步角色名称到 script_analysis
  const syncCharacterNames = async (
    dbCharacterNames: string[],
    initialStates: Record<string, CharacterState>
  ) => {
    const syncId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const nameMapping: Record<string, string> = {}
    characters.forEach((oldName, index) => {
      const newName = dbCharacterNames[index]
      if (newName && oldName !== newName) {
        nameMapping[oldName] = newName
      }
    })


    // 🔥 修复：不仅更新 name 属性，还要重新构建对象的 key
    if (Object.keys(nameMapping).length > 0) {

      // 重新构建 initialStates，使用新的 key
      const newInitialStates: Record<string, CharacterState> = {}
      Object.entries(initialStates).forEach(([oldKey, state]) => {
        const newKey = nameMapping[oldKey] || oldKey
        newInitialStates[newKey] = {
          ...state,
          name: newKey  // 确保 name 也同步更新
        }
      })

      // 清空并重新填充 initialStates
      Object.keys(initialStates).forEach(key => delete initialStates[key])
      Object.assign(initialStates, newInitialStates)

      if (project.script_analysis) {
        const updatedAnalysis = { ...project.script_analysis }

        // 更新全局角色列表，并去重
        updatedAnalysis.characters = Array.from(new Set(
          updatedAnalysis.characters.map(name => nameMapping[name] || name)
        ))

        // 🔥 关键修复：不仅更新 shot.characters 数组，还要替换所有文本描述中的人物名称
        updatedAnalysis.shots = updatedAnalysis.shots.map(shot => {
          let updatedShot = {
            ...shot,
            // 去重 characters 数组
            characters: Array.from(new Set(
              shot.characters.map(name => nameMapping[name] || name)
            ))
          }

          // 对每个需要替换的名称进行替换
          Object.entries(nameMapping).forEach(([oldName, newName]) => {
            const oldNamePattern = new RegExp(`\\b${oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')
            updatedShot = {
              ...updatedShot,
              description: updatedShot.description.replace(oldNamePattern, newName)
            }
          })

          return updatedShot
        })

        // 保存到数据库
        try {
          await updateProject(project.id, { script_analysis: updatedAnalysis })

          onUpdateRef.current({ script_analysis: updatedAnalysis })
        } catch (error) {
          console.error(`[useCharacterState] [${syncId}] ❌ syncCharacterNames failed:`, error)
          // Silent fail - auto-sync is best effort
        }
      }
    } else {
    }
  }

  return {
    characterStates,
    setCharacterStates,
    isInitialLoading,
    characters
  }
}

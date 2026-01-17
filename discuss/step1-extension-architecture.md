# Step1 扩展架构设计（正确版本）

**目标**: 在 Step1 中集成人物生成和分镜生成，实现 YouTube 复刻模式的完整流程

**创建时间**: 2026-01-14

---

## 一、整体流程设计

### 用户体验流程

```
用户进入 Step 1
    ↓
自动触发脚本分析（已有）
    ↓
显示分析结果：
- 分镜数量、角色、时长（已有）
- 角色列表（已有）
    ↓
【新增】自动触发人物图生成
    ↓
显示人物生成区域：
- 显示 loading skeleton
- 显示生成进度（1/3, 2/3...）
- 逐个显示完成的人物图
    ↓
人物图全部完成
    ↓
【新增】自动触发分镜图生成
    ↓
显示分镜生成区域：
- 每个分镜卡片显示分镜描述（已有）
- 显示分镜图 loading skeleton
- 显示生成进度条（1/6, 2/6...）
- 逐个显示完成的分镜图
- 每个分镜图悬浮显示 Edit 按钮
    ↓
用户可以：
- 编辑分镜描述（已有）
- 【新增】点击 Edit 编辑分镜图
    ↓
【新增】分镜编辑弹框：
- 左侧：显示所有人物参考图
  - 自动选中该分镜涉及的人物
  - 可以添加/删除人物
- 右侧：
  - 显示分镜图预览
  - prompt 编辑框（预填充当前 prompt）
  - 重新生成按钮
    ↓
所有图片生成完成
    ↓
用户点击 "Confirm & Continue"
    ↓
进入 Step 2（Video Generation）
```

---

## 二、组件架构设计

### 组件层次结构

```
Step1ScriptAnalysis (主组件 - 重构后)
├── AnalysisOverview (概览卡片)
│   ├── 分镜数量卡片
│   ├── 角色数量卡片
│   └── 时长卡片
│
├── CharacterListBadges (角色标签列表 - 已有)
│
├── CharacterGenerationSection (新增 - 人物生成区域)
│   ├── SectionHeader
│   ├── CharacterGrid
│   │   └── CharacterCard (复用 Step2 现有组件)
│   └── CharacterLoadingState (skeleton)
│
├── StoryboardSection (新增 - 分镜生成区域)
│   ├── SectionHeader
│   ├── StoryboardGrid
│   │   └── StoryboardCard (增强版)
│   │       ├── 分镜描述编辑（已有）
│   │       ├── 分镜图显示（新增）
│   │       └── Edit 按钮（新增）
│   └── StoryboardLoadingState (skeleton)
│
└── StoryboardEditDialog (新增 - 编辑弹框)
    ├── CharacterReferencePanel (左侧)
    │   ├── CharacterThumbnail (人物缩略图)
    │   └── AddCharacterButton (添加人物按钮)
    └── StoryboardEditPanel (右侧)
        ├── StoryboardPreview (分镜图预览)
        ├── PromptEditor (prompt 编辑器)
        └── RegenerateButton (重新生成按钮)
```

---

## 三、文件组织结构

### 目标：每个文件不超过 300 行

```
app/studio/video-agent-beta/components/steps/Step1ScriptAnalysis/
│
├── index.tsx                                (主组件, ~250行)
│   - 脚本分析逻辑（已有）
│   - 协调所有子组件
│   - 管理整体状态
│   - 底部操作栏
│
├── AnalysisOverview.tsx                     (~100行)
│   - 概览卡片（Shots/Characters/Duration）
│   - 角色标签列表
│
├── CharacterGenerationSection/
│   ├── index.tsx                            (~220行)
│   │   - 人物生成区域主组件
│   │   - 自动触发生成逻辑
│   │   - 生成进度管理
│   │   - 布局和状态展示
│   │
│   ├── CharacterLoadingState.tsx           (~80行)
│   │   - Skeleton 加载动画
│   │   - 进度条显示
│   │
│   └── useCharacterAutoGeneration.ts       (~150行)
│       - 自动生成 hook
│       - 轮询状态
│       - 防止重复触发
│
├── StoryboardSection/
│   ├── index.tsx                            (~200行)
│   │   - 分镜区域主组件
│   │   - 自动触发生成逻辑
│   │   - 分镜列表渲染
│   │   - 编辑弹框触发
│   │
│   ├── StoryboardCardEnhanced.tsx          (~180行)
│   │   - 增强版分镜卡片
│   │   - 显示分镜图
│   │   - Edit 按钮（悬浮）
│   │   - 保留原有编辑功能
│   │
│   ├── StoryboardLoadingState.tsx          (~80行)
│   │   - Skeleton 加载动画
│   │   - 进度条显示
│   │
│   └── useStoryboardAutoGeneration.ts      (~150行)
│       - 自动生成 hook
│       - 轮询状态
│       - 依赖人物完成状态
│
└── StoryboardEditDialog/
    ├── index.tsx                            (~250行)
    │   - 弹框主组件
    │   - 布局管理
    │   - 状态协调
    │
    ├── CharacterReferencePanel.tsx         (~180行)
    │   - 左侧人物参考面板
    │   - 人物缩略图展示
    │   - 添加/删除人物
    │   - 自动选中逻辑
    │
    ├── StoryboardEditPanel.tsx             (~180行)
    │   - 右侧编辑面板
    │   - 分镜图预览
    │   - Prompt 编辑
    │   - 重新生成按钮
    │
    └── useStoryboardEditor.ts               (~150行)
        - 编辑逻辑 hook
        - 人物选择管理
        - 重新生成逻辑
```

---

## 四、核心组件详细设计

### 4.1 Step1ScriptAnalysis/index.tsx (主组件重构)

**职责**：
- 保留现有脚本分析逻辑
- 协调所有子组件
- 管理整体状态
- 底部操作栏

**状态管理**：
```typescript
// 现有状态（保留）
const [isAnalyzing, setIsAnalyzing] = useState(false)
const [analysis, setAnalysis] = useState<ScriptAnalysis | null>(null)
const [error, setError] = useState<string | null>(null)

// 新增状态
const [characterStatus, setCharacterStatus] = useState<'idle' | 'generating' | 'completed' | 'failed'>('idle')
const [storyboardStatus, setStoryboardStatus] = useState<'idle' | 'generating' | 'completed' | 'failed'>('idle')

// 编辑弹框状态
const [editDialogOpen, setEditDialogOpen] = useState(false)
const [editingShotNumber, setEditingShotNumber] = useState<number | null>(null)
```

**布局结构**：
```tsx
<div className="space-y-8">
  {/* 1. 概览卡片（已有） */}
  <AnalysisOverview analysis={analysis} />

  {/* 2. 角色标签（已有，抽取为组件） */}
  <CharacterListBadges characters={analysis?.characters || []} />

  {/* 3. 🔥 新增：人物生成区域 */}
  {analysis && (
    <CharacterGenerationSection
      project={project}
      analysis={analysis}
      onStatusChange={setCharacterStatus}
      onUpdate={onUpdate}
    />
  )}

  {/* 4. 🔥 新增：分镜生成区域 */}
  {analysis && characterStatus === 'completed' && (
    <StoryboardSection
      project={project}
      analysis={analysis}
      onStatusChange={setStoryboardStatus}
      onEditClick={handleEditClick}
      onUpdate={onUpdate}
    />
  )}

  {/* 5. 底部操作栏（已有） */}
  <BottomActionBar
    hasUnsavedChanges={hasUnsavedChanges}
    onSave={handleSaveChanges}
    onCancel={handleCancelChanges}
    onContinue={handleConfirm}
    disabled={storyboardStatus !== 'completed'}
  />

  {/* 6. 🔥 新增：编辑弹框 */}
  <StoryboardEditDialog
    open={editDialogOpen}
    shotNumber={editingShotNumber}
    project={project}
    onClose={() => setEditDialogOpen(false)}
    onRegenerate={handleRegenerateStoryboard}
  />
</div>
```

**关键逻辑**：
```typescript
// 处理编辑分镜点击
const handleEditClick = (shotNumber: number) => {
  setEditingShotNumber(shotNumber)
  setEditDialogOpen(true)
}

// 处理重新生成分镜
const handleRegenerateStoryboard = async (
  shotNumber: number,
  customPrompt: string,
  selectedCharacterNames: string[]
) => {
  await regenerateStoryboard(project.id, {
    shotNumber,
    customPrompt,
    selectedCharacterNames
  })

  // 刷新分镜数据
  // ...
}

// 确认继续（需要等待所有图片完成）
const handleConfirm = async () => {
  if (storyboardStatus !== 'completed') {
    toast.error('Please wait for all storyboards to complete')
    return
  }

  if (hasUnsavedChanges) {
    await handleSaveChanges()
  }

  onNext()
}
```

---

### 4.2 CharacterGenerationSection/index.tsx

**职责**：
- 显示人物生成区域
- 自动触发批量生成
- 显示生成进度
- 复用 CharacterCard 组件

**Props**：
```typescript
interface CharacterGenerationSectionProps {
  project: VideoAgentProject
  analysis: ScriptAnalysis
  onStatusChange: (status: 'idle' | 'generating' | 'completed' | 'failed') => void
  onUpdate: (updates: Partial<VideoAgentProject>) => void
}
```

**核心逻辑**：
```typescript
export function CharacterGenerationSection({
  project,
  analysis,
  onStatusChange,
  onUpdate
}: CharacterGenerationSectionProps) {
  const {
    status,
    progress,
    characters,
    startGeneration,
    retryGeneration
  } = useCharacterAutoGeneration(project, analysis)

  // 向父组件同步状态
  useEffect(() => {
    onStatusChange(status)
  }, [status, onStatusChange])

  // 如果还没有人物数据，自动开始生成
  useEffect(() => {
    if (status === 'idle' && (!project.characters || project.characters.length === 0)) {
      startGeneration()
    }
  }, [status, project.characters, startGeneration])

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Character Generation"
        status={status}
        progress={progress}
      />

      {status === 'generating' && (
        <CharacterLoadingState count={analysis.characters.length} />
      )}

      {(status === 'completed' || characters.length > 0) && (
        <CharacterGrid>
          {characters.map(character => (
            <CharacterCard
              key={character.id}
              character={character}
              onRegenerate={handleRegenerateCharacter}
              onUpdate={onUpdate}
            />
          ))}
        </CharacterGrid>
      )}

      {status === 'failed' && (
        <ErrorState onRetry={retryGeneration} />
      )}
    </div>
  )
}
```

---

### 4.3 StoryboardSection/index.tsx

**职责**：
- 显示分镜生成区域
- 自动触发批量生成（等待人物完成）
- 显示分镜卡片（带图片）
- 触发编辑弹框

**Props**：
```typescript
interface StoryboardSectionProps {
  project: VideoAgentProject
  analysis: ScriptAnalysis
  onStatusChange: (status: 'idle' | 'generating' | 'completed' | 'failed') => void
  onEditClick: (shotNumber: number) => void
  onUpdate: (updates: Partial<VideoAgentProject>) => void
}
```

**核心逻辑**：
```typescript
export function StoryboardSection({
  project,
  analysis,
  onStatusChange,
  onEditClick,
  onUpdate
}: StoryboardSectionProps) {
  const {
    status,
    progress,
    storyboards,
    startGeneration,
    retryGeneration
  } = useStoryboardAutoGeneration(project, analysis)

  // 向父组件同步状态
  useEffect(() => {
    onStatusChange(status)
  }, [status, onStatusChange])

  // 自动开始生成（如果还没有分镜图）
  useEffect(() => {
    if (status === 'idle' && (!project.storyboards || project.storyboards.length === 0)) {
      startGeneration()
    }
  }, [status, project.storyboards, startGeneration])

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Storyboard Generation"
        status={status}
        progress={progress}
      />

      <div className="space-y-6">
        {analysis.shots.map((shot, index) => (
          <StoryboardCardEnhanced
            key={shot.shot_number}
            shot={shot}
            storyboard={storyboards[shot.shot_number]}
            isGenerating={status === 'generating'}
            onEdit={() => onEditClick(shot.shot_number)}
            onUpdate={onUpdate}
          />
        ))}
      </div>

      {status === 'failed' && (
        <ErrorState onRetry={retryGeneration} />
      )}
    </div>
  )
}
```

---

### 4.4 StoryboardEditDialog/index.tsx

**职责**：
- 显示编辑弹框
- 左侧人物参考面板
- 右侧编辑面板
- 协调编辑逻辑

**Props**：
```typescript
interface StoryboardEditDialogProps {
  open: boolean
  shotNumber: number | null
  project: VideoAgentProject
  onClose: () => void
  onRegenerate: (shotNumber: number, prompt: string, characterNames: string[]) => Promise<void>
}
```

**核心逻辑**：
```typescript
export function StoryboardEditDialog({
  open,
  shotNumber,
  project,
  onClose,
  onRegenerate
}: StoryboardEditDialogProps) {
  const {
    selectedCharacterNames,
    editedPrompt,
    isRegenerating,
    handleToggleCharacter,
    handlePromptChange,
    handleRegenerate
  } = useStoryboardEditor(project, shotNumber)

  // 获取当前分镜数据
  const shot = shotNumber
    ? project.script_analysis?.shots.find(s => s.shot_number === shotNumber)
    : null

  const storyboard = shotNumber
    ? project.storyboards?.find(s => s.shot_number === shotNumber)
    : null

  if (!shot || !storyboard) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onClose} size="xl">
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Edit Storyboard - Shot {shotNumber}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-[300px_1fr] gap-6">
          {/* 左侧：人物参考面板 */}
          <CharacterReferencePanel
            characters={project.characters || []}
            selectedCharacterNames={selectedCharacterNames}
            onToggle={handleToggleCharacter}
          />

          {/* 右侧：编辑面板 */}
          <StoryboardEditPanel
            storyboard={storyboard}
            prompt={editedPrompt}
            onPromptChange={handlePromptChange}
            onRegenerate={() => handleRegenerate(onRegenerate, onClose)}
            isRegenerating={isRegenerating}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

---

## 五、关键 Hooks 设计

### 5.1 useCharacterAutoGeneration

**文件**: `CharacterGenerationSection/useCharacterAutoGeneration.ts`

**职责**：
- 自动触发人物图批量生成
- 轮询生成状态
- 管理生成进度

**返回值**：
```typescript
interface UseCharacterAutoGenerationReturn {
  status: 'idle' | 'generating' | 'completed' | 'failed'
  progress: { current: number; total: number }
  characters: Character[]
  startGeneration: () => Promise<void>
  retryGeneration: () => Promise<void>
}
```

**实现**：
```typescript
export function useCharacterAutoGeneration(
  project: VideoAgentProject,
  analysis: ScriptAnalysis
) {
  const [status, setStatus] = useState<GenerationStatus>('idle')
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [characters, setCharacters] = useState<Character[]>(project.characters || [])

  const { batchGenerateCharacters, getCharacters } = useVideoAgentAPI()
  const hasStartedRef = useRef(false)

  const startGeneration = useCallback(async () => {
    if (hasStartedRef.current) return
    hasStartedRef.current = true

    setStatus('generating')
    setProgress({ current: 0, total: analysis.characters.length })

    try {
      // 调用批量生成 API
      await batchGenerateCharacters({ projectId: project.id })

      // 轮询获取生成状态
      const pollInterval = setInterval(async () => {
        const updatedCharacters = await getCharacters(project.id)
        setCharacters(updatedCharacters)

        const completed = updatedCharacters.filter(c => c.image_url).length
        setProgress({ current: completed, total: analysis.characters.length })

        if (completed === analysis.characters.length) {
          clearInterval(pollInterval)
          setStatus('completed')
        }
      }, 2000)

    } catch (error) {
      setStatus('failed')
      console.error('[CharacterAutoGen] Failed:', error)
    }
  }, [project.id, analysis.characters.length, batchGenerateCharacters, getCharacters])

  return {
    status,
    progress,
    characters,
    startGeneration,
    retryGeneration: startGeneration
  }
}
```

---

### 5.2 useStoryboardAutoGeneration

**文件**: `StoryboardSection/useStoryboardAutoGeneration.ts`

**职责**：
- 自动触发分镜图批量生成
- 轮询生成状态
- 管理生成进度

**实现逻辑**：
```typescript
export function useStoryboardAutoGeneration(
  project: VideoAgentProject,
  analysis: ScriptAnalysis
) {
  const [status, setStatus] = useState<GenerationStatus>('idle')
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [storyboards, setStoryboards] = useState<Record<number, Storyboard>>({})

  const { generateStoryboards, getStoryboardsStatus } = useVideoAgentAPI()
  const hasStartedRef = useRef(false)

  const startGeneration = useCallback(async () => {
    if (hasStartedRef.current) return
    hasStartedRef.current = true

    setStatus('generating')
    setProgress({ current: 0, total: analysis.shot_count })

    try {
      await generateStoryboards(project.id)

      // 轮询状态
      const pollInterval = setInterval(async () => {
        const status = await getStoryboardsStatus(project.id)

        // 更新分镜数据
        const storyboardMap: Record<number, Storyboard> = {}
        status.forEach(item => {
          if (item.storyboard) {
            storyboardMap[item.shot_number] = item.storyboard
          }
        })
        setStoryboards(storyboardMap)

        // 更新进度
        const completed = status.filter(s => s.status === 'completed').length
        setProgress({ current: completed, total: analysis.shot_count })

        // 检查是否全部完成
        if (completed === analysis.shot_count) {
          clearInterval(pollInterval)
          setStatus('completed')
        }
      }, 2000)

    } catch (error) {
      setStatus('failed')
      console.error('[StoryboardAutoGen] Failed:', error)
    }
  }, [project.id, analysis.shot_count, generateStoryboards, getStoryboardsStatus])

  return {
    status,
    progress,
    storyboards,
    startGeneration,
    retryGeneration: startGeneration
  }
}
```

---

### 5.3 useStoryboardEditor

**文件**: `StoryboardEditDialog/useStoryboardEditor.ts`

**职责**：
- 管理编辑状态
- 自动选中人物
- 处理重新生成

**实现逻辑**：
```typescript
export function useStoryboardEditor(
  project: VideoAgentProject,
  shotNumber: number | null
) {
  const [selectedCharacterNames, setSelectedCharacterNames] = useState<string[]>([])
  const [editedPrompt, setEditedPrompt] = useState('')
  const [isRegenerating, setIsRegenerating] = useState(false)

  // 初始化：从 script_analysis 读取人物分配
  useEffect(() => {
    if (!shotNumber || !project.script_analysis) return

    const shot = project.script_analysis.shots.find(s => s.shot_number === shotNumber)
    if (shot) {
      // 自动选中该分镜涉及的人物
      setSelectedCharacterNames(shot.characters || [])

      // 预填充 prompt（如果有）
      const storyboard = project.storyboards?.find(s => s.shot_number === shotNumber)
      if (storyboard) {
        setEditedPrompt(storyboard.prompt || shot.description)
      } else {
        setEditedPrompt(shot.description)
      }
    }
  }, [shotNumber, project.script_analysis, project.storyboards])

  const handleToggleCharacter = (characterName: string) => {
    setSelectedCharacterNames(prev => {
      if (prev.includes(characterName)) {
        return prev.filter(n => n !== characterName)
      } else {
        return [...prev, characterName]
      }
    })
  }

  const handlePromptChange = (prompt: string) => {
    setEditedPrompt(prompt)
  }

  const handleRegenerate = async (
    onRegenerate: (shotNumber: number, prompt: string, characterNames: string[]) => Promise<void>,
    onClose: () => void
  ) => {
    if (!shotNumber) return

    setIsRegenerating(true)
    try {
      await onRegenerate(shotNumber, editedPrompt, selectedCharacterNames)
      onClose()
    } catch (error) {
      console.error('[StoryboardEditor] Regenerate failed:', error)
    } finally {
      setIsRegenerating(false)
    }
  }

  return {
    selectedCharacterNames,
    editedPrompt,
    isRegenerating,
    handleToggleCharacter,
    handlePromptChange,
    handleRegenerate
  }
}
```

---

## 六、数据流设计

### 完整数据流

```
用户进入 Step 1
    ↓
Step1ScriptAnalysis 挂载
    ↓
useEffect 触发脚本分析（已有）
    ↓
setAnalysis(data)
    ↓
CharacterGenerationSection 挂载
    ↓
useCharacterAutoGeneration 自动触发
    ↓
batchGenerateCharacters() API 调用
    ↓
轮询 getCharacters()
    ↓
setCharacters(data)
setProgress({ current: X, total: Y })
    ↓
status = 'completed'
onStatusChange('completed') → 通知父组件
    ↓
StoryboardSection 渲染（依赖 characterStatus === 'completed'）
    ↓
useStoryboardAutoGeneration 自动触发
    ↓
generateStoryboards() API 调用
    ↓
轮询 getStoryboardsStatus()
    ↓
setStoryboards(data)
setProgress({ current: X, total: Y })
    ↓
status = 'completed'
onStatusChange('completed') → 通知父组件
    ↓
"Confirm & Continue" 按钮启用
    ↓
用户点击继续
    ↓
onNext() → 进入 Step 2
```

### 编辑分镜流程

```
用户点击分镜图的 Edit 按钮
    ↓
onEditClick(shotNumber)
    ↓
setEditingShotNumber(shotNumber)
setEditDialogOpen(true)
    ↓
StoryboardEditDialog 打开
    ↓
useStoryboardEditor 初始化
    ↓
从 script_analysis.shots[shotNumber].characters 读取人物
    ↓
setSelectedCharacterNames(characters) - 自动选中
    ↓
用户修改：
- 添加/删除人物
- 编辑 prompt
    ↓
点击 "Regenerate" 按钮
    ↓
handleRegenerate()
    ↓
调用 regenerateStoryboard(projectId, { shotNumber, customPrompt, selectedCharacterNames })
    ↓
API 重新生成分镜图
    ↓
关闭弹框
    ↓
分镜图自动更新
```

---

## 七、API 调用计划

### 需要使用的现有 API

| API | 用途 | 文件 |
|-----|------|------|
| `batchGenerateCharacters()` | 批量生成人物图 | useCharacterAutoGeneration |
| `getCharacters()` | 获取人物列表（轮询） | useCharacterAutoGeneration |
| `generateStoryboards()` | 批量生成分镜图 | useStoryboardAutoGeneration |
| `getStoryboardsStatus()` | 获取分镜状态（轮询） | useStoryboardAutoGeneration |
| `regenerateStoryboard()` | 重新生成单个分镜 | StoryboardEditDialog |

### 需要新增的 API（如果需要）

**已确认**：后端 API `/api/video-agent/projects/[id]/storyboards/[shotNumber]/regenerate` 已经支持 `selectedCharacterNames` 参数（Phase 1 已实现）。

---

## 八、状态管理策略

### 使用现有 Zustand Store

**不需要新增 slice**，复用现有的：

1. **CharacterConfigSlice**：
   - 管理人物图数据
   - 读取：`project.characters`

2. **StoryboardGenerationSlice**：
   - 管理分镜图数据
   - 读取：`project.storyboards`

### 本地状态管理

在 Step1 主组件中使用 `useState` 管理：
- `characterStatus`: 人物生成状态
- `storyboardStatus`: 分镜生成状态
- `editDialogOpen`: 编辑弹框开关
- `editingShotNumber`: 当前编辑的分镜编号

**理由**：
- 这些状态只在 Step1 内部使用
- 不需要跨组件共享
- 简化状态管理复杂度

---

## 九、性能优化策略

### 1. 分批渲染（继承已有优化）

Step1 已有分批渲染逻辑，继续使用：
- 首次渲染 12 个分镜
- 滚动加载更多

### 2. 图片懒加载

分镜图使用懒加载：
```tsx
<img
  src={storyboard.image_url}
  loading="lazy"
  alt={`Storyboard ${shot.shot_number}`}
/>
```

### 3. 轮询优化

使用指数退避策略：
```typescript
let pollInterval = 2000 // 初始 2 秒
const maxInterval = 10000 // 最大 10 秒

const poll = async () => {
  // 获取状态...

  if (!allCompleted) {
    pollInterval = Math.min(pollInterval * 1.2, maxInterval)
    setTimeout(poll, pollInterval)
  }
}
```

### 4. 防止重复触发

使用 `useRef` 标记：
```typescript
const hasStartedRef = useRef(false)

if (hasStartedRef.current) return
hasStartedRef.current = true
```

---

## 十、错误处理策略

### 1. 生成失败

```typescript
try {
  await batchGenerateCharacters()
} catch (error) {
  setStatus('failed')
  toast.error('Character generation failed', {
    description: 'Please try again'
  })
}
```

显示重试按钮：
```tsx
{status === 'failed' && (
  <Button onClick={retryGeneration}>
    Retry Generation
  </Button>
)}
```

### 2. 部分失败

如果某些分镜生成失败，显示失败的分镜：
```tsx
{failedShots.length > 0 && (
  <div className="text-red-400">
    Failed to generate: {failedShots.join(', ')}
  </div>
)}
```

### 3. 网络超时

设置合理的超时时间：
```typescript
const MAX_POLL_TIME = 5 * 60 * 1000 // 5 分钟
const startTime = Date.now()

const poll = async () => {
  if (Date.now() - startTime > MAX_POLL_TIME) {
    setStatus('failed')
    toast.error('Generation timeout')
    return
  }
  // 继续轮询...
}
```

---

## 十一、向后兼容策略

### 判断逻辑

在 `StepDialog.tsx` 中：
```typescript
const shouldUseIntegratedUI = (project: VideoAgentProject) => {
  const cutoffDate = new Date('2026-01-10T00:00:00Z')
  const createdAt = new Date(project.created_at)
  return createdAt >= cutoffDate
}
```

### 步骤渲染

```typescript
const renderStep = () => {
  switch (currentStep) {
    case 1:
      return <Step1ScriptAnalysis {...props} />
      // ✅ 新旧项目都使用相同的 Step1（内部会自动判断是否显示新功能）

    case 2:
      if (shouldUseIntegratedUI(project)) {
        // 🔥 新项目：Step 1 完成后直接跳到 Video Generation
        return <Step4VideoGen {...props} />
      } else {
        // 旧项目：Step 2 是 Character Config
        return <Step2CharacterConfig {...props} />
      }
    // ...
  }
}
```

### Step1 内部判断

在 `Step1ScriptAnalysis/index.tsx` 中：
```typescript
// 只对新项目显示人物/分镜生成区域
const shouldShowIntegratedFeatures = useMemo(() => {
  const cutoffDate = new Date('2026-01-10T00:00:00Z')
  const createdAt = new Date(project.created_at)
  return createdAt >= cutoffDate
}, [project.created_at])

return (
  <div>
    {/* 脚本分析结果（所有项目都显示） */}
    <AnalysisOverview />

    {/* 🔥 新功能（只对新项目显示） */}
    {shouldShowIntegratedFeatures && (
      <>
        <CharacterGenerationSection />
        <StoryboardSection />
      </>
    )}
  </div>
)
```

---

## 十二、实现优先级

### Phase 4: 人物生成集成 (高优先级)
1. 创建 `CharacterGenerationSection/index.tsx`
2. 创建 `useCharacterAutoGeneration.ts`
3. 在 Step1 中集成
4. 测试自动触发和轮询

### Phase 5: 分镜生成集成 (高优先级)
1. 创建 `StoryboardSection/index.tsx`
2. 创建 `StoryboardCardEnhanced.tsx`
3. 创建 `useStoryboardAutoGeneration.ts`
4. 在 Step1 中集成
5. 测试自动触发和依赖关系

### Phase 6: 分镜编辑功能 (中优先级)
1. 创建 `StoryboardEditDialog/index.tsx`
2. 创建 `CharacterReferencePanel.tsx`
3. 创建 `StoryboardEditPanel.tsx`
4. 创建 `useStoryboardEditor.ts`
5. 集成到 StoryboardSection
6. 测试编辑和重新生成

### Phase 7: 步骤跳转修复 (低优先级)
1. 修改 `StepDialog.tsx` 的步骤映射逻辑
2. 测试新旧项目的步骤跳转

---

## 十三、验收标准

### 功能验收

- [ ] 进入 Step 1 自动触发脚本分析
- [ ] 脚本分析完成后自动触发人物图生成
- [ ] 人物图显示加载状态（skeleton）
- [ ] 人物图生成进度正确显示
- [ ] 人物图完成后自动触发分镜图生成
- [ ] 分镜图显示加载状态
- [ ] 分镜图生成进度正确显示
- [ ] 分镜卡片显示分镜图缩略图
- [ ] 悬浮显示 Edit 按钮
- [ ] 点击 Edit 打开编辑弹框
- [ ] 编辑弹框左侧显示所有人物
- [ ] 自动选中该分镜涉及的人物
- [ ] 可以添加/删除人物
- [ ] 可以编辑 prompt
- [ ] 可以重新生成分镜图
- [ ] 所有图片完成后才能点击 "Confirm & Continue"
- [ ] 点击 Continue 正确跳转到 Video Generation
- [ ] 旧项目仍使用 5 步流程
- [ ] 新项目使用 3 步流程

### 代码质量验收

- [ ] 所有文件不超过 300 行
- [ ] 无代码冗余
- [ ] 无循环依赖
- [ ] TypeScript 类型完整
- [ ] 错误处理完善
- [ ] 加载状态清晰
- [ ] 无"坏味道"

---

**文档状态**: ✅ Phase 3 完成
**下一步**: Phase 4 - 实现人物生成集成

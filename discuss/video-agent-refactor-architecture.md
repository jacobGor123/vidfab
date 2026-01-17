# Video Agent 重构 - 详细组件架构设计

**文档版本**: v1.0
**创建日期**: 2026-01-13
**设计目标**: 整合 Step 2/3 为统一的"创建图片"界面

---

## 一、组件层次结构

```
Step2IntegratedImageGen (主组件)
├── CharacterSection (人物图区域)
│   ├── CharacterGenerationHeader (标题+状态提示)
│   ├── CharacterGrid (人物网格)
│   │   └── CharacterCard (复用现有，来自 Step2CharacterConfig/)
│   └── CharacterLoadingState (骨架屏)
│
├── StoryboardSection (分镜图区域)
│   ├── StoryboardGenerationHeader (标题+状态提示)
│   ├── StoryboardGrid (分镜网格)
│   │   └── StoryboardCard (复用现有，来自 Step3StoryboardGen)
│   ├── StoryboardLoadingState (骨架屏)
│   └── GenerateVideoButton ("Generate Full Story" 按钮)
│
└── StoryboardEditDialog (编辑弹框 - 独立组件)
    ├── CharacterReferencePanel (左侧：人物参考图面板)
    │   ├── CharacterThumbnail (单个人物缩略图)
    │   └── AddCharacterButton (添加人物按钮)
    └── StoryboardEditPanel (右侧：分镜编辑面板)
        ├── StoryboardPreview (分镜图预览)
        ├── PromptEditor (Prompt 编辑器)
        └── RegenerateButton (重新生成按钮)
```

---

## 二、文件组织结构

遵循**单文件不超过 300 行**的原则，拆分为以下文件：

```
app/studio/video-agent-beta/components/steps/
├── Step2IntegratedImageGen/
│   ├── index.tsx                          (主组件, ~250行)
│   │
│   ├── CharacterSection/
│   │   ├── index.tsx                      (人物区域主组件, ~200行)
│   │   ├── CharacterGenerationHeader.tsx  (标题组件, ~50行)
│   │   ├── CharacterGrid.tsx              (网格布局, ~100行)
│   │   └── CharacterLoadingState.tsx      (加载状态, ~80行)
│   │
│   ├── StoryboardSection/
│   │   ├── index.tsx                      (分镜区域主组件, ~200行)
│   │   ├── StoryboardGenerationHeader.tsx (标题组件, ~50行)
│   │   ├── StoryboardGrid.tsx             (网格布局, ~100行)
│   │   ├── StoryboardLoadingState.tsx     (加载状态, ~80行)
│   │   └── GenerateVideoButton.tsx        (视频生成按钮, ~60行)
│   │
│   ├── StoryboardEditDialog/
│   │   ├── index.tsx                      (弹框主组件, ~250行)
│   │   ├── CharacterReferencePanel.tsx    (左侧人物面板, ~150行)
│   │   ├── CharacterThumbnail.tsx         (人物缩略图, ~80行)
│   │   └── StoryboardEditPanel.tsx        (右侧编辑面板, ~180行)
│   │
│   └── hooks/
│       ├── useIntegratedImageGeneration.ts  (主业务逻辑, ~280行)
│       ├── useAutoCharacterGeneration.ts    (自动人物生成, ~150行)
│       ├── useAutoStoryboardGeneration.ts   (自动分镜生成, ~150行)
│       └── useStoryboardEditor.ts           (分镜编辑逻辑, ~180行)
```

**复用现有组件**:
- `Step2CharacterConfig/CharacterCard.tsx` - 人物卡片
- `Step2CharacterConfig/BatchControls.tsx` - 批量操作（部分逻辑）
- `Step3StoryboardCard.tsx` - 分镜卡片（修改版）
- `CharacterPresetDialog.tsx` - 角色预设库

---

## 三、核心组件详细设计

### 3.1 Step2IntegratedImageGen（主组件）

**文件**: `Step2IntegratedImageGen/index.tsx`

**职责**:
1. 统筹整个集成界面的渲染
2. 管理人物图和分镜图的生成状态
3. 协调两个子区域的交互

**Props**:
```typescript
interface Step2IntegratedImageGenProps {
  project: VideoAgentProject
  onUpdate: (updates: Partial<VideoAgentProject>) => void
  onNext: () => void // 进入下一步（Step 4）
}
```

**State（通过 hook 管理）**:
```typescript
interface IntegratedGenerationState {
  // 人物图生成状态
  characterStatus: 'idle' | 'generating' | 'completed' | 'failed'
  characterProgress: { current: number; total: number }

  // 分镜图生成状态
  storyboardStatus: 'idle' | 'generating' | 'completed' | 'failed'
  storyboardProgress: { current: number; total: number }

  // 编辑弹框状态
  editDialogOpen: boolean
  editingShotNumber: number | null
}
```

**核心逻辑**:
```typescript
const Step2IntegratedImageGen: React.FC<Props> = ({ project, onUpdate, onNext }) => {
  const {
    characterStatus,
    storyboardStatus,
    startCharacterGeneration,
    startStoryboardGeneration,
    openEditDialog,
  } = useIntegratedImageGeneration(project)

  // 1. 进入界面自动触发人物图生成
  useEffect(() => {
    if (characterStatus === 'idle') {
      startCharacterGeneration()
    }
  }, [])

  // 2. 人物图完成后自动触发分镜图生成
  useEffect(() => {
    if (characterStatus === 'completed' && storyboardStatus === 'idle') {
      startStoryboardGeneration()
    }
  }, [characterStatus, storyboardStatus])

  return (
    <div className="integrated-image-gen">
      <CharacterSection
        project={project}
        status={characterStatus}
        onUpdate={onUpdate}
      />

      <StoryboardSection
        project={project}
        status={storyboardStatus}
        onEditClick={openEditDialog}
        onGenerateVideo={() => onNext()} // 进入 Step 4
      />

      <StoryboardEditDialog
        open={editDialogOpen}
        shotNumber={editingShotNumber}
        project={project}
        onClose={() => setEditDialogOpen(false)}
        onRegenerate={handleRegenerate}
      />
    </div>
  )
}
```

---

### 3.2 CharacterSection（人物图区域）

**文件**: `Step2IntegratedImageGen/CharacterSection/index.tsx`

**职责**:
1. 显示所有人物图（使用 CharacterCard）
2. 显示生成状态（骨架屏、进度提示）
3. 支持单个人物重新生成
4. 支持角色预设库选择

**Props**:
```typescript
interface CharacterSectionProps {
  project: VideoAgentProject
  status: 'idle' | 'generating' | 'completed' | 'failed'
  onUpdate: (updates: Partial<VideoAgentProject>) => void
}
```

**UI 布局**:
```tsx
<section className="character-section">
  <CharacterGenerationHeader
    status={status}
    progress={progress}
    total={characters.length}
  />

  {status === 'generating' ? (
    <CharacterLoadingState count={characters.length} />
  ) : (
    <CharacterGrid>
      {characters.map(character => (
        <CharacterCard
          key={character.id}
          character={character}
          onRegenerate={handleRegenerate}
          onUpload={handleUpload}
          onPresetSelect={openPresetDialog}
        />
      ))}
    </CharacterGrid>
  )}
</section>
```

**加载动画**:
- 使用 shadcn/ui 的 Skeleton 组件
- 显示人物卡片的骨架屏（头像区域闪烁动画）

---

### 3.3 StoryboardSection（分镜图区域）

**文件**: `Step2IntegratedImageGen/StoryboardSection/index.tsx`

**职责**:
1. 显示所有分镜图（使用 StoryboardCard）
2. 显示生成状态（骨架屏、进度条）
3. 提供编辑按钮，触发编辑弹框
4. 提供"Generate Full Story"按钮

**Props**:
```typescript
interface StoryboardSectionProps {
  project: VideoAgentProject
  status: 'idle' | 'generating' | 'completed' | 'failed'
  onEditClick: (shotNumber: number) => void
  onGenerateVideo: () => void
}
```

**UI 布局**:
```tsx
<section className="storyboard-section">
  <StoryboardGenerationHeader
    status={status}
    progress={progress}
    total={shots.length}
  />

  {status === 'generating' ? (
    <StoryboardLoadingState
      count={shots.length}
      currentProgress={progress.current}
    />
  ) : (
    <StoryboardGrid>
      {shots.map((shot, index) => (
        <StoryboardCard
          key={shot.shot_number}
          shot={shot}
          storyboard={storyboards[index]}
          onEdit={() => onEditClick(shot.shot_number)}
        />
      ))}
    </StoryboardGrid>
  )}

  {status === 'completed' && (
    <GenerateVideoButton onClick={onGenerateVideo} />
  )}
</section>
```

**加载动画**:
- 使用 Progress 组件显示整体进度（X/N 完成）
- 使用 Skeleton 显示分镜卡片骨架屏

---

### 3.4 StoryboardEditDialog（编辑弹框）

**文件**: `Step2IntegratedImageGen/StoryboardEditDialog/index.tsx`

**职责**:
1. 左侧显示人物参考图（可添加/删除）
2. 右侧显示分镜图预览和 prompt 编辑
3. 支持重新生成分镜图

**Props**:
```typescript
interface StoryboardEditDialogProps {
  open: boolean
  shotNumber: number | null
  project: VideoAgentProject
  onClose: () => void
  onRegenerate: (shotNumber: number, prompt: string, characterIds: string[]) => void
}
```

**State**:
```typescript
interface EditDialogState {
  // 当前选中的人物参考图
  selectedCharacterIds: string[]

  // 编辑的 prompt
  editedPrompt: string

  // 重新生成中
  regenerating: boolean
}
```

**UI 布局**:
```tsx
<Dialog open={open} onOpenChange={onClose} size="large">
  <DialogContent className="edit-dialog-content">
    <div className="dialog-layout">
      {/* 左侧：人物参考图面板 */}
      <CharacterReferencePanel
        characters={project.characters}
        selectedIds={selectedCharacterIds}
        onToggle={handleToggleCharacter}
        onAdd={handleAddCharacter}
      />

      {/* 右侧：分镜编辑面板 */}
      <StoryboardEditPanel
        storyboard={currentStoryboard}
        prompt={editedPrompt}
        onPromptChange={setEditedPrompt}
        onRegenerate={handleRegenerate}
        regenerating={regenerating}
      />
    </div>
  </DialogContent>
</Dialog>
```

**人物分配逻辑**:
```typescript
// 从 script_analysis 中自动分配人物
const shot = project.script_analysis.shots[shotNumber - 1]
const assignedCharacterNames = shot.characters // ["Prince", "Princess"]

// 匹配到实际的 character 对象
const initialSelectedIds = project.characters
  .filter(c => assignedCharacterNames.includes(c.character_name))
  .map(c => c.id)

useEffect(() => {
  setSelectedCharacterIds(initialSelectedIds)
}, [shotNumber])
```

---

## 四、核心 Hooks 设计

### 4.1 useIntegratedImageGeneration（主业务逻辑）

**文件**: `hooks/useIntegratedImageGeneration.ts`

**职责**:
统筹整个集成流程的状态管理和业务逻辑

**返回值**:
```typescript
interface UseIntegratedImageGenerationReturn {
  // 人物图生成
  characterStatus: GenerationStatus
  characterProgress: { current: number; total: number }
  startCharacterGeneration: () => Promise<void>

  // 分镜图生成
  storyboardStatus: GenerationStatus
  storyboardProgress: { current: number; total: number }
  startStoryboardGeneration: () => Promise<void>

  // 编辑弹框
  editDialogOpen: boolean
  editingShotNumber: number | null
  openEditDialog: (shotNumber: number) => void
  closeEditDialog: () => void

  // 操作
  regenerateStoryboard: (shotNumber: number, prompt: string, characterIds: string[]) => Promise<void>
}
```

**实现逻辑**:
```typescript
export function useIntegratedImageGeneration(project: VideoAgentProject) {
  const [characterStatus, setCharacterStatus] = useState<GenerationStatus>('idle')
  const [storyboardStatus, setStoryboardStatus] = useState<GenerationStatus>('idle')

  const { batchGenerateCharacters, getCharacters } = useVideoAgentAPI()
  const { generateStoryboards, getStoryboardsStatus } = useVideoAgentAPI()

  // 人物图生成
  const startCharacterGeneration = async () => {
    setCharacterStatus('generating')
    try {
      await batchGenerateCharacters({ projectId: project.id })

      // 轮询获取生成状态
      const pollInterval = setInterval(async () => {
        const characters = await getCharacters(project.id)
        const allCompleted = characters.every(c => c.image_url)

        if (allCompleted) {
          clearInterval(pollInterval)
          setCharacterStatus('completed')
        }
      }, 2000)
    } catch (error) {
      setCharacterStatus('failed')
    }
  }

  // 分镜图生成（逻辑类似）
  const startStoryboardGeneration = async () => {
    // ... 类似逻辑
  }

  return {
    characterStatus,
    storyboardStatus,
    startCharacterGeneration,
    startStoryboardGeneration,
    // ...
  }
}
```

---

### 4.2 useAutoCharacterGeneration（自动人物生成）

**文件**: `hooks/useAutoCharacterGeneration.ts`

**职责**:
处理人物图的自动生成和轮询

**核心逻辑**:
```typescript
export function useAutoCharacterGeneration(projectId: string) {
  const [status, setStatus] = useState<'idle' | 'generating' | 'completed'>('idle')
  const [progress, setProgress] = useState({ current: 0, total: 0 })

  const { batchGenerateCharacters, getCharacters } = useVideoAgentAPI()

  const start = async () => {
    setStatus('generating')
    await batchGenerateCharacters({ projectId })

    // 轮询逻辑...
  }

  // 自动触发
  useEffect(() => {
    if (status === 'idle') {
      start()
    }
  }, [])

  return { status, progress, retry: start }
}
```

---

### 4.3 useStoryboardEditor（分镜编辑）

**文件**: `hooks/useStoryboardEditor.ts`

**职责**:
处理分镜图编辑弹框的状态和重新生成逻辑

**核心逻辑**:
```typescript
export function useStoryboardEditor(project: VideoAgentProject, shotNumber: number | null) {
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>([])
  const [editedPrompt, setEditedPrompt] = useState('')
  const [regenerating, setRegenerating] = useState(false)

  const { regenerateStoryboard } = useVideoAgentAPI()

  // 初始化：从 script_analysis 读取人物分配
  useEffect(() => {
    if (shotNumber) {
      const shot = project.script_analysis.shots[shotNumber - 1]
      const assignedCharacterNames = shot.characters

      const initialIds = project.characters
        .filter(c => assignedCharacterNames.includes(c.character_name))
        .map(c => c.id)

      setSelectedCharacterIds(initialIds)
    }
  }, [shotNumber])

  const handleRegenerate = async () => {
    setRegenerating(true)
    try {
      await regenerateStoryboard(project.id, shotNumber!, {
        prompt: editedPrompt,
        characterIds: selectedCharacterIds
      })
    } finally {
      setRegenerating(false)
    }
  }

  return {
    selectedCharacterIds,
    setSelectedCharacterIds,
    editedPrompt,
    setEditedPrompt,
    regenerating,
    handleRegenerate,
  }
}
```

---

## 五、数据流设计

### 5.1 自动生成流程

```
用户进入 Step 2 (新界面)
    ↓
useAutoCharacterGeneration 自动触发
    ↓
调用 batchGenerateCharacters() API
    ↓
轮询 getCharacters() 获取生成状态
    ↓
显示 CharacterLoadingState (skeleton)
    ↓
人物图生成完成 → characterStatus = 'completed'
    ↓
useEffect 监听 characterStatus
    ↓
自动触发 startStoryboardGeneration()
    ↓
调用 generateStoryboards() API
    ↓
轮询 getStoryboardsStatus() 获取生成状态
    ↓
显示 StoryboardLoadingState (progress bar)
    ↓
分镜图生成完成 → storyboardStatus = 'completed'
    ↓
显示 "Generate Full Story" 按钮
```

### 5.2 编辑分镜流程

```
用户点击分镜图的"编辑"按钮
    ↓
openEditDialog(shotNumber)
    ↓
StoryboardEditDialog 打开
    ↓
useStoryboardEditor 初始化
    ↓
从 script_analysis.shots[shotNumber].characters 读取人物分配
    ↓
自动选中对应的人物参考图
    ↓
用户修改 prompt 或添加/删除人物
    ↓
点击"重新生成"按钮
    ↓
调用 regenerateStoryboard() API
    ↓
弹框显示 loading 状态
    ↓
生成完成 → 更新分镜图 → 关闭弹框
```

---

## 六、状态管理设计

### 6.1 是否需要新增 Zustand Slice?

**分析**:
- 现有的 `CharacterConfigSlice` 和 `StoryboardGenerationSlice` 已经覆盖了大部分状态
- 新增的状态主要是**UI 交互状态**（弹框开关、自动生成触发）

**决策**:
- **不新增** Zustand slice
- UI 状态使用 `useState` 在组件内部管理
- 业务状态继续使用现有的 slice

### 6.2 状态分布

| 状态 | 存储位置 | 理由 |
|------|---------|------|
| characterStatus | 组件 `useState` | UI 临时状态，无需全局共享 |
| storyboardStatus | 组件 `useState` | UI 临时状态，无需全局共享 |
| editDialogOpen | 组件 `useState` | UI 临时状态，无需全局共享 |
| project.characters | Zustand (CharacterConfigSlice) | 业务数据，需要全局访问 |
| project.storyboards | Zustand (StoryboardGenerationSlice) | 业务数据，需要全局访问 |

---

## 七、向后兼容策略

### 7.1 判断逻辑

```typescript
// 在 StepDialog 或路由层判断
const shouldUseNewUI = (project: VideoAgentProject) => {
  // 方案 1: 基于创建时间
  const createdAt = new Date(project.created_at)
  const cutoffDate = new Date('2026-01-15') // 新界面上线日期
  return createdAt >= cutoffDate

  // 方案 2: 基于 feature flag（推荐）
  return project.metadata?.useIntegratedImageGen === true
}
```

### 7.2 路由调整

```typescript
// StepDialog.tsx
const renderStep2 = () => {
  if (shouldUseNewUI(project)) {
    return <Step2IntegratedImageGen project={project} onNext={goToStep4} />
  } else {
    return <Step2CharacterConfig project={project} onNext={goToStep3} />
  }
}

const renderStep3 = () => {
  if (shouldUseNewUI(project)) {
    return null // 新界面跳过 Step 3
  } else {
    return <Step3StoryboardGen project={project} onNext={goToStep4} />
  }
}
```

---

## 八、加载动画设计

### 8.1 人物图加载动画

使用 shadcn/ui 的 `Skeleton` 组件：

```tsx
<CharacterLoadingState>
  {Array.from({ length: characterCount }).map((_, i) => (
    <div key={i} className="character-card-skeleton">
      <Skeleton className="w-full h-48 rounded-lg" />
      <Skeleton className="w-3/4 h-4 mt-2" />
      <Skeleton className="w-1/2 h-3 mt-1" />
    </div>
  ))}
</CharacterLoadingState>
```

### 8.2 分镜图加载动画

使用 `Progress` 组件 + `Skeleton`：

```tsx
<StoryboardLoadingState>
  <div className="progress-header">
    <p>Generating storyboards... {progress.current}/{progress.total}</p>
    <Progress value={(progress.current / progress.total) * 100} />
  </div>

  <div className="storyboard-grid">
    {Array.from({ length: shotCount }).map((_, i) => (
      <div key={i} className="storyboard-card-skeleton">
        <Skeleton className="w-full h-64 rounded-lg" />
        <Skeleton className="w-full h-6 mt-2" />
      </div>
    ))}
  </div>
</StoryboardLoadingState>
```

---

## 九、关键实现细节

### 9.1 防止重复触发

```typescript
// 使用 ref 防止多次触发
const hasTriggeredCharacterGen = useRef(false)

useEffect(() => {
  if (!hasTriggeredCharacterGen.current && characterStatus === 'idle') {
    hasTriggeredCharacterGen.current = true
    startCharacterGeneration()
  }
}, [characterStatus])
```

### 9.2 轮询优化

```typescript
// 使用指数退避策略
let pollInterval = 2000
const maxInterval = 10000

const poll = async () => {
  const status = await getStoryboardsStatus()

  if (!allCompleted(status)) {
    pollInterval = Math.min(pollInterval * 1.2, maxInterval)
    setTimeout(poll, pollInterval)
  }
}
```

### 9.3 错误处理

```typescript
try {
  await startCharacterGeneration()
} catch (error) {
  toast.error('人物图生成失败，请重试')
  setCharacterStatus('failed')

  // 提供重试按钮
  // <Button onClick={() => startCharacterGeneration()}>重试</Button>
}
```

---

## 十、代码质量检查清单

- [ ] 所有文件不超过 300 行
- [ ] 无循环依赖
- [ ] 无代码冗余（DRY 原则）
- [ ] 职责单一（SRP 原则）
- [ ] 组件可复用
- [ ] TypeScript 类型完整
- [ ] 加载状态清晰
- [ ] 错误处理完善
- [ ] 无性能瓶颈（大量分镜的渲染优化）

---

## 十一、下一步行动

1. ✅ Phase 2 完成：架构设计
2. 🔄 Phase 3：实现 CharacterSection 组件
3. 🔄 Phase 4：实现 StoryboardSection 组件
4. 🔄 Phase 5：实现 StoryboardEditDialog 组件
5. 🔄 Phase 6：整合视频生成触发按钮
6. 🔄 Phase 7：状态管理和路由调整
7. 🔄 Phase 8：测试与验证
8. 🔄 Phase 9：代码质量检查与交付

---

**文档状态**: ✅ 已完成设计
**准备开始**: Phase 3 实现

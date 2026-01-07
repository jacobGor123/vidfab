# 分字段编辑 UI 设计方案

## 📋 设计目标

1. ✅ 让用户清楚知道每个字段的作用
2. ✅ 保留所有自动生成的约束（角色一致性、风格、质量等）
3. ✅ 提供完整 Prompt 预览功能
4. ✅ 提升用户体验，避免混淆

---

## 🎨 UI 设计方案

### 方案 1：折叠式多字段编辑（推荐）

**布局示例**：

```
┌─────────────────────────────────────────┐
│ Shot 1                            🔄 ▶  │
├─────────────────────────────────────────┤
│  [分镜图/视频显示区域]                    │
│                                         │
├─────────────────────────────────────────┤
│  ▼ Edit Scene Details                  │  ← 点击展开/收起
│                                         │
│  Scene Description *                    │
│  ┌───────────────────────────────────┐ │
│  │ A cozy coffee shop with warm      │ │
│  │ lighting                          │ │
│  └───────────────────────────────────┘ │
│                                         │
│  Camera Angle                           │
│  ┌───────────────────────────────────┐ │
│  │ Wide shot                         │ │
│  └───────────────────────────────────┘ │
│                                         │
│  Character Action *                     │
│  ┌───────────────────────────────────┐ │
│  │ Angela walks in and greets the    │ │
│  │ barista                           │ │
│  └───────────────────────────────────┘ │
│                                         │
│  Mood/Atmosphere                        │
│  ┌───────────────────────────────────┐ │
│  │ Warm and welcoming                │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌─────────────────┐  ┌──────────────┐ │
│  │ Preview Prompt  │  │ Reset        │ │
│  └─────────────────┘  └──────────────┘ │
│                                         │
│  💡 Auto-added: Character consistency, │
│     style, quality constraints          │
└─────────────────────────────────────────┘
```

**特点**：
- ✅ 每个字段有明确的标签
- ✅ 必填字段标记 *
- ✅ "Preview Prompt" 按钮可查看完整 prompt
- ✅ "Reset" 按钮恢复默认值
- ✅ 提示自动添加的内容

---

### 方案 2：标签页式编辑（适合字段更多的情况）

**布局示例**：

```
┌─────────────────────────────────────────┐
│ Shot 1                            🔄 ▶  │
├─────────────────────────────────────────┤
│  [分镜图/视频显示区域]                    │
├─────────────────────────────────────────┤
│  ┌─────┬─────┬─────┬─────┬─────────┐   │
│  │Basic│Camera│Action│Mood│Advanced │   │ ← 标签页
│  └─────┴─────┴─────┴─────┴─────────┘   │
│                                         │
│  Basic Tab:                             │
│  Scene Description *                    │
│  ┌───────────────────────────────────┐ │
│  │ A cozy coffee shop...             │ │
│  └───────────────────────────────────┘ │
│                                         │
│  [Preview Full Prompt]                  │
└─────────────────────────────────────────┘
```

**特点**：
- ✅ 更适合字段较多时
- ✅ 可以分组（基础、镜头、动作等）
- ⚠️ 可能过度设计（当前字段不多）

---

### 方案 3：内联式轻量编辑（最简单）

**布局示例**：

```
┌─────────────────────────────────────────┐
│ Shot 1                            🔄 ▶  │
├─────────────────────────────────────────┤
│  [分镜图/视频显示区域]                    │
├─────────────────────────────────────────┤
│  ▼ Edit Fields                          │
│                                         │
│  📝 Scene: [A cozy coffee shop...]      │
│  🎥 Camera: [Wide shot]                 │
│  🎬 Action: [Angela walks in...]        │
│  🎭 Mood: [Warm and welcoming]          │
│                                         │
│  [Preview] [Reset] [Regenerate]         │
└─────────────────────────────────────────┘
```

**特点**：
- ✅ 最简洁
- ✅ 改动最小
- ⚠️ 输入框较小，不适合长文本

---

## 🎯 推荐方案：方案 1（折叠式多字段编辑）

### 详细设计

#### 分镜图编辑（Step 3）

**字段定义**：
```typescript
interface StoryboardEditFields {
  description: string      // 场景描述（必填）
  camera_angle: string     // 镜头角度（可选，有默认值）
  character_action: string // 角色动作（必填）
  mood: string            // 情绪氛围（可选，有默认值）
}
```

**UI 组件层次**：
```
Step3StoryboardCard
  └─ StoryboardFieldsEditor (新增)
      ├─ FieldInput (description)
      ├─ FieldInput (camera_angle)
      ├─ FieldInput (character_action)
      ├─ FieldInput (mood)
      ├─ PromptPreviewDialog (新增)
      └─ Actions (Preview, Reset, Regenerate)
```

#### 视频编辑（Step 4）

**字段定义**：
```typescript
interface VideoEditFields {
  description: string      // 场景描述（必填）
  character_action: string // 角色动作（必填）
  // 其他字段由系统自动添加：
  // - 角色一致性约束（BytePlus 模式）
  // - 禁止字幕指令（所有模式）
}
```

**UI 组件层次**：
```
Step4VideoCard
  └─ VideoFieldsEditor (新增)
      ├─ FieldInput (description)
      ├─ FieldInput (character_action)
      ├─ PromptPreviewDialog (新增)
      └─ Actions (Preview, Reset, Regenerate)
```

---

## 🔧 实现方案

### 前端实现

#### 1. 创建通用字段编辑组件

**文件**: `components/studio/video-agent-beta/components/common/FieldsEditor.tsx`

```typescript
interface Field {
  name: string
  label: string
  value: string
  placeholder: string
  required?: boolean
  rows?: number
  maxLength?: number
  helpText?: string
}

interface FieldsEditorProps {
  fields: Field[]
  onChange: (name: string, value: string) => void
  onReset: () => void
  onPreview: () => void
  autoAddedInfo?: string
}

export function FieldsEditor({
  fields,
  onChange,
  onReset,
  onPreview,
  autoAddedInfo
}: FieldsEditorProps) {
  return (
    <div className="space-y-3 pt-2 border-t">
      {fields.map(field => (
        <div key={field.name} className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            {field.label}
            {field.required && <span className="text-red-400 ml-1">*</span>}
          </label>
          <textarea
            value={field.value}
            onChange={(e) => onChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            rows={field.rows || 2}
            maxLength={field.maxLength}
            className="w-full text-xs p-2 bg-muted/50 border border-muted rounded resize-none focus:outline-none focus:border-primary"
          />
          {field.helpText && (
            <p className="text-xs text-muted-foreground/60">{field.helpText}</p>
          )}
        </div>
      ))}

      {autoAddedInfo && (
        <div className="p-2 bg-primary/5 border border-primary/10 rounded text-xs text-muted-foreground">
          💡 {autoAddedInfo}
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button
          onClick={onPreview}
          className="flex-1 text-xs px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded transition-colors"
        >
          Preview Full Prompt
        </button>
        <button
          onClick={onReset}
          className="text-xs px-3 py-1.5 bg-muted/30 hover:bg-muted/60 text-muted-foreground rounded transition-colors"
        >
          Reset
        </button>
      </div>
    </div>
  )
}
```

#### 2. 创建 Prompt 预览对话框

**文件**: `components/studio/video-agent-beta/components/common/PromptPreviewDialog.tsx`

```typescript
interface PromptPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fullPrompt: string
  shotNumber: number
}

export function PromptPreviewDialog({
  open,
  onOpenChange,
  fullPrompt,
  shotNumber
}: PromptPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Full Prompt Preview - Shot {shotNumber}</DialogTitle>
          <DialogDescription>
            This is the complete prompt that will be sent to the AI model
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 完整 Prompt 显示 */}
          <div className="max-h-[60vh] overflow-y-auto">
            <pre className="text-xs p-4 bg-muted/50 rounded whitespace-pre-wrap font-mono">
              {fullPrompt}
            </pre>
          </div>

          {/* 字数统计 */}
          <div className="text-xs text-muted-foreground">
            Total characters: {fullPrompt.length}
          </div>

          {/* 关键部分高亮说明 */}
          <div className="text-xs space-y-2 p-3 bg-primary/5 rounded">
            <div className="font-medium">This prompt includes:</div>
            <ul className="space-y-1 list-disc list-inside text-muted-foreground">
              <li>Your custom scene description</li>
              <li>Character consistency constraints</li>
              <li>Camera angle and character actions</li>
              <li>Style and quality requirements</li>
              <li>Automatic safety filters</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Close
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

#### 3. 集成到分镜图卡片

**修改文件**: `Step3StoryboardCard.tsx`

```typescript
// 状态管理
const [editFields, setEditFields] = useState<{
  description: string
  camera_angle: string
  character_action: string
  mood: string
} | null>(null)

const [showPreview, setShowPreview] = useState(false)

// 获取默认值
const getDefaultFields = () => {
  const shot = /* 从 project.script_analysis 获取 */
  return {
    description: shot.description,
    camera_angle: shot.camera_angle,
    character_action: shot.character_action,
    mood: shot.mood
  }
}

// 构建完整 Prompt 用于预览
const buildFullPrompt = (fields: typeof editFields) => {
  // 调用后端的 buildStoryboardPrompt 逻辑（或在前端复制一份）
  // 返回完整的 prompt 字符串
}

// 字段定义
const fields: Field[] = [
  {
    name: 'description',
    label: 'Scene Description',
    value: editFields?.description || '',
    placeholder: 'Describe the scene...',
    required: true,
    rows: 3,
    helpText: 'What is happening in this scene?'
  },
  {
    name: 'camera_angle',
    label: 'Camera Angle',
    value: editFields?.camera_angle || '',
    placeholder: 'e.g., Wide shot, Close-up, Over-the-shoulder',
    rows: 2
  },
  {
    name: 'character_action',
    label: 'Character Action',
    value: editFields?.character_action || '',
    placeholder: 'What are the characters doing?',
    required: true,
    rows: 3
  },
  {
    name: 'mood',
    label: 'Mood/Atmosphere',
    value: editFields?.mood || '',
    placeholder: 'e.g., Warm and welcoming, Tense, Mysterious',
    rows: 2
  }
]

// 渲染
{expandedPrompts[item.shot_number] && (
  <>
    <FieldsEditor
      fields={fields}
      onChange={(name, value) => {
        setEditFields(prev => ({ ...prev, [name]: value }))
      }}
      onReset={() => setEditFields(getDefaultFields())}
      onPreview={() => setShowPreview(true)}
      autoAddedInfo="Character consistency, style, and quality constraints will be automatically added"
    />

    <PromptPreviewDialog
      open={showPreview}
      onOpenChange={setShowPreview}
      fullPrompt={buildFullPrompt(editFields)}
      shotNumber={item.shot_number}
    />
  </>
)}
```

---

### 后端 API 改动

#### 方案 A：最小改动（推荐）

**保持现有 API 不变**，前端将多个字段合并后再发送：

```typescript
// 前端发送时
const customPrompt = JSON.stringify({
  description: editFields.description,
  camera_angle: editFields.camera_angle,
  character_action: editFields.character_action,
  mood: editFields.mood
})

// 后端解析
const body = await request.json()
let fields: any = null
try {
  fields = JSON.parse(body.customPrompt)
} catch {
  // 如果不是 JSON，当作普通字符串（向后兼容）
  fields = { description: body.customPrompt }
}

// 构建 Shot
const modifiedShot = {
  ...shot,
  description: fields.description || shot.description,
  camera_angle: fields.camera_angle || shot.camera_angle,
  character_action: fields.character_action || shot.character_action,
  mood: fields.mood || shot.mood
}

const prompt = buildStoryboardPrompt(modifiedShot, style, characters, hasReferenceImages)
```

**优点**：
- ✅ API 接口不需要改动
- ✅ 向后兼容（旧客户端仍可使用字符串）
- ✅ 实施成本低

**缺点**：
- ⚠️ 使用 JSON 字符串不够优雅

---

#### 方案 B：新增专用 API（更规范）

**新增接口**：
```
POST /api/video-agent/projects/[id]/storyboards/[shotNumber]/regenerate-v2
```

**请求体**：
```typescript
{
  description?: string
  camera_angle?: string
  character_action?: string
  mood?: string
}
```

**优点**：
- ✅ 更规范、更清晰
- ✅ 类型安全

**缺点**：
- ❌ 需要维护两套 API
- ❌ 实施成本较高

---

## 📊 实施优先级建议

### Phase 1：核心功能（1-2 天）
1. ✅ 创建 `FieldsEditor` 通用组件
2. ✅ 创建 `PromptPreviewDialog` 组件
3. ✅ 集成到分镜图卡片（Step 3）
4. ✅ 后端采用方案 A（JSON 字符串）

### Phase 2：完善功能（1 天）
1. ✅ 集成到视频卡片（Step 4）
2. ✅ 添加字段验证（必填检查、长度限制）
3. ✅ 添加"恢复默认"确认对话框

### Phase 3：优化体验（可选）
1. 🔄 添加字段实时预览
2. 🔄 添加常用模板（预设的 camera_angle、mood 等）
3. 🔄 支持拖拽调整字段顺序

---

## 🎨 UI 细节建议

### 1. 字段标签的图标

```tsx
const fieldIcons = {
  description: '📝',
  camera_angle: '🎥',
  character_action: '🎬',
  mood: '🎭'
}
```

### 2. 字段验证提示

```tsx
{field.required && !field.value.trim() && (
  <p className="text-xs text-red-400">This field is required</p>
)}
```

### 3. 字数统计

```tsx
<div className="text-xs text-muted-foreground text-right">
  {field.value.length} / {field.maxLength}
</div>
```

### 4. 自动保存提示

```tsx
<div className="text-xs text-green-400">
  ✓ Changes saved
</div>
```

---

## 🔄 向后兼容策略

1. **保留旧的单字段输入框**：添加一个切换开关
   ```tsx
   <button onClick={() => setUseFieldsEditor(!useFieldsEditor)}>
     {useFieldsEditor ? 'Switch to Simple Mode' : 'Switch to Advanced Mode'}
   </button>
   ```

2. **渐进式迁移**：
   - 新用户默认使用字段编辑
   - 老用户可以选择切换

---

## ✅ 优势总结

1. ✅ **清晰透明**：用户知道每个字段的作用
2. ✅ **不丢失信息**：所有约束都自动保留
3. ✅ **灵活可控**：用户可以精确控制每个部分
4. ✅ **易于扩展**：未来可以添加更多字段（lighting、composition 等）
5. ✅ **提升专业性**：类似于专业视频制作软件的界面

---

## 📝 需要决策的点

1. **UI 方案选择**：
   - [ ] 方案 1：折叠式多字段（推荐）
   - [ ] 方案 2：标签页式
   - [ ] 方案 3：内联式轻量

2. **后端 API 策略**：
   - [ ] 方案 A：JSON 字符串（快速实施）
   - [ ] 方案 B：新增专用 API（规范但成本高）

3. **是否保留简单模式**：
   - [ ] 是，提供切换开关
   - [ ] 否，直接替换为字段编辑

4. **实施时间**：
   - [ ] 立即开始（Phase 1 + 2，约 2-3 天）
   - [ ] 延后（先观察当前方案 A 的效果）

---

你倾向于哪个方案？我可以立即开始实施！

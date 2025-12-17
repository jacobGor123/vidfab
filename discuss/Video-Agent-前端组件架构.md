# Video Agent Beta - 前端组件架构设计

**组件结构和状态管理方案**

---

## 📁 目录结构

```
app/studio/video-agent-beta/
├── page.tsx                          # 主入口页面
├── layout.tsx                        # 布局 (复用 Studio 布局)
│
├── components/
│   ├── InputStage.tsx                # 阶段 0: 用户输入界面
│   ├── StepDialog.tsx                # 通用步骤弹窗容器
│   ├── ProgressBar.tsx               # 步骤进度条
│   ├── ProjectList.tsx               # 项目列表 (草稿)
│   │
│   ├── steps/
│   │   ├── Step1ScriptAnalysis/
│   │   │   ├── AnalyzingView.tsx     # 分析中视图
│   │   │   └── ResultView.tsx        # 分析结果 + 编辑
│   │   │
│   │   ├── Step2CharacterConfig/
│   │   │   ├── CharacterCard.tsx     # 人物卡片
│   │   │   ├── TemplateSelector.tsx  # 模板库选择器
│   │   │   ├── ImageUploader.tsx     # 图片上传组件
│   │   │   └── AIGenerator.tsx       # AI 生成人物
│   │   │
│   │   ├── Step3ImageStyle/
│   │   │   └── StyleGallery.tsx      # 风格画廊
│   │   │
│   │   ├── Step4StoryboardGen/
│   │   │   ├── GeneratingView.tsx    # 批量生成中
│   │   │   └── StoryboardGrid.tsx    # 分镜图网格
│   │   │
│   │   ├── Step5VideoGen/
│   │   │   ├── GeneratingView.tsx    # 批量生成中
│   │   │   └── VideoClipGrid.tsx     # 视频片段网格
│   │   │
│   │   ├── Step6MusicEffect/
│   │   │   ├── MusicSelector.tsx     # 音乐选择器
│   │   │   └── TransitionSelector.tsx # 转场选择器
│   │   │
│   │   └── Step7FinalCompose/
│   │       ├── ComposingView.tsx     # 合成中视图
│   │       └── CompletedView.tsx     # 完成视图
│   │
│   └── shared/
│       ├── ErrorBoundary.tsx         # 错误边界
│       ├── LoadingSpinner.tsx        # 加载动画
│       └── ConfirmDialog.tsx         # 确认对话框

lib/stores/
└── video-agent/                      # Zustand 状态管理(已模块化拆分)
    ├── types.ts
    ├── project-store.ts
    ├── step-navigation.ts
    ├── script-analysis.ts
    ├── character-config.ts
    ├── image-style.ts
    ├── storyboard-generation.ts
    ├── video-generation.ts
    ├── music-transition.ts
    ├── video-composition.ts
    ├── utils.ts
    └── index.ts

lib/hooks/
├── use-video-agent-project.ts        # 项目数据钩子
├── use-step-navigation.ts            # 步骤导航逻辑
└── use-api-mutation.ts               # API 调用封装

lib/services/video-agent/
├── api-client.ts                     # API 客户端
├── script-analyzer.ts                # 脚本分析服务
├── storyboard-generator.ts           # 分镜生成服务
├── video-generator.ts                # 视频生成服务
├── music-generator.ts                # 音乐生成服务
└── video-composer.ts                 # 视频合成服务
```

---

## 🎯 主页面组件 (`page.tsx`)

```tsx
// app/studio/video-agent-beta/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useVideoAgentStore } from '@/lib/stores/video-agent'
import InputStage from './components/InputStage'
import StepDialog from './components/StepDialog'
import ProjectList from './components/ProjectList'

export default function VideoAgentBetaPage() {
  const router = useRouter()
  const {
    currentProject,
    currentStep,
    createProject,
    resumeProject
  } = useVideoAgentStore()

  const [showDialog, setShowDialog] = useState(false)

  const handleStart = async (data: {
    duration: number
    storyStyle: string
    originalScript: string
  }) => {
    // 创建新项目
    const project = await createProject(data)

    // 显示步骤 1 弹窗
    setShowDialog(true)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* 标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Video Agent Beta
          </h1>
          <p className="text-muted-foreground">
            从脚本到成片的 AI 自动化视频生成
          </p>
        </div>

        {/* 输入界面 or 项目列表 */}
        {!currentProject ? (
          <>
            <InputStage onStart={handleStart} />

            {/* 草稿列表 */}
            <div className="mt-12">
              <h2 className="text-xl font-semibold mb-4">我的草稿</h2>
              <ProjectList onResume={resumeProject} />
            </div>
          </>
        ) : (
          /* 步骤弹窗 */
          <StepDialog
            open={showDialog}
            onOpenChange={setShowDialog}
            step={currentStep}
            project={currentProject}
          />
        )}
      </div>
    </div>
  )
}
```

---

## 🏪 状态管理 (Zustand)

```typescript
// lib/stores/video-agent/index.ts (已模块化拆分)
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface VideoAgentProject {
  id: string
  status: 'draft' | 'processing' | 'completed' | 'failed'
  currentStep: number
  duration: number
  storyStyle: string
  originalScript: string
  scriptAnalysis?: any
  characters?: Character[]
  imageStyle?: string
  storyboards?: Storyboard[]
  videoClips?: VideoClip[]
  music?: Music
  transition?: Transition
  finalVideo?: FinalVideo
  regenerateQuotaRemaining: number
  createdAt: string
  updatedAt: string
}

interface VideoAgentStore {
  // 状态
  currentProject: VideoAgentProject | null
  currentStep: number
  isLoading: boolean
  error: string | null

  // 项目管理
  createProject: (data: CreateProjectData) => Promise<VideoAgentProject>
  loadProject: (id: string) => Promise<void>
  updateProject: (updates: Partial<VideoAgentProject>) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  resumeProject: (project: VideoAgentProject) => void

  // 步骤导航
  nextStep: () => void
  previousStep: () => void
  goToStep: (step: number) => void

  // 步骤操作
  analyzeScript: () => Promise<void>
  configureCharacters: (characters: Character[]) => Promise<void>
  selectImageStyle: (styleId: string) => Promise<void>
  generateStoryboards: () => Promise<void>
  regenerateStoryboard: (shotNumber: number) => Promise<void>
  generateVideos: () => Promise<void>
  retryVideo: (shotNumber: number) => Promise<void>
  selectMusic: (music: Music) => Promise<void>
  selectTransition: (transition: Transition) => Promise<void>
  composeFinalVideo: () => Promise<void>

  // 重置
  reset: () => void
}

export const useVideoAgentStore = create<VideoAgentStore>()(
  persist(
    (set, get) => ({
      // 初始状态
      currentProject: null,
      currentStep: 0,
      isLoading: false,
      error: null,

      // 创建项目
      createProject: async (data) => {
        set({ isLoading: true, error: null })
        try {
          const response = await fetch('/api/video-agent/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          })

          if (!response.ok) throw new Error('Failed to create project')

          const { data: project } = await response.json()

          set({
            currentProject: project,
            currentStep: 1,
            isLoading: false
          })

          return project
        } catch (error) {
          set({
            isLoading: false,
            error: error.message
          })
          throw error
        }
      },

      // 加载项目
      loadProject: async (id) => {
        set({ isLoading: true, error: null })
        try {
          const response = await fetch(`/api/video-agent/projects/${id}`)
          if (!response.ok) throw new Error('Failed to load project')

          const { data: project } = await response.json()

          set({
            currentProject: project,
            currentStep: project.currentStep,
            isLoading: false
          })
        } catch (error) {
          set({
            isLoading: false,
            error: error.message
          })
        }
      },

      // 脚本分析
      analyzeScript: async () => {
        const { currentProject } = get()
        if (!currentProject) return

        set({ isLoading: true, error: null })
        try {
          const response = await fetch(
            `/api/video-agent/projects/${currentProject.id}/analyze-script`,
            { method: 'POST' }
          )

          if (!response.ok) throw new Error('Script analysis failed')

          const { data: analysis } = await response.json()

          set(state => ({
            currentProject: {
              ...state.currentProject!,
              scriptAnalysis: analysis,
              currentStep: 2
            },
            currentStep: 2,
            isLoading: false
          }))
        } catch (error) {
          set({
            isLoading: false,
            error: error.message
          })
        }
      },

      // 批量生成分镜图
      generateStoryboards: async () => {
        const { currentProject } = get()
        if (!currentProject) return

        set({ isLoading: true, error: null })
        try {
          const response = await fetch(
            `/api/video-agent/projects/${currentProject.id}/storyboards/generate`,
            { method: 'POST' }
          )

          if (!response.ok) throw new Error('Storyboard generation failed')

          // 开始轮询状态
          await pollStoryboardStatus(currentProject.id)

          set({ isLoading: false })
        } catch (error) {
          set({
            isLoading: false,
            error: error.message
          })
        }
      },

      // 重置
      reset: () => set({
        currentProject: null,
        currentStep: 0,
        isLoading: false,
        error: null
      })
    }),
    {
      name: 'video-agent-storage',
      partialize: (state) => ({
        currentProject: state.currentProject,
        currentStep: state.currentStep
      })
    }
  )
)

// 辅助函数: 轮询分镜图状态
async function pollStoryboardStatus(projectId: string) {
  const maxAttempts = 60
  let attempts = 0

  while (attempts < maxAttempts) {
    const response = await fetch(
      `/api/video-agent/projects/${projectId}/storyboards/status`
    )
    const { data } = await response.json()

    const allCompleted = data.every(
      (sb: any) => sb.status === 'success' || sb.status === 'failed'
    )

    if (allCompleted) {
      // 更新 store
      useVideoAgentStore.getState().updateProject({
        storyboards: data,
        currentStep: 5
      })
      return
    }

    await new Promise(resolve => setTimeout(resolve, 3000))
    attempts++
  }

  throw new Error('Storyboard generation timeout')
}
```

---

## 🎨 核心组件实现

### 输入界面 (`InputStage.tsx`)

```tsx
// app/studio/video-agent-beta/components/InputStage.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

const DURATIONS = [15, 30, 45, 60]

const STORY_STYLES = [
  { value: 'auto', label: 'Auto', description: 'AI 自动判断' },
  { value: 'comedy', label: '搞笑', description: '幽默娱乐' },
  { value: 'mystery', label: '猎奇', description: '新奇怪异' },
  { value: 'moral', label: '警世', description: '警示教育' },
  { value: 'twist', label: '反转', description: '意外结局' },
  { value: 'suspense', label: '悬疑', description: '神秘紧张' },
  { value: 'warmth', label: '温情', description: '感人治愈' },
  { value: 'inspiration', label: '励志', description: '正能量' },
]

interface InputStageProps {
  onStart: (data: {
    duration: number
    storyStyle: string
    originalScript: string
  }) => Promise<void>
}

export default function InputStage({ onStart }: InputStageProps) {
  const [duration, setDuration] = useState(30)
  const [storyStyle, setStoryStyle] = useState('auto')
  const [script, setScript] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async () => {
    if (!script.trim()) {
      alert('请输入视频脚本')
      return
    }

    setIsLoading(true)
    try {
      await onStart({ duration, storyStyle, originalScript: script })
    } catch (error) {
      alert(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6 bg-card p-6 rounded-lg border">
      {/* 时长选择 */}
      <div>
        <Label className="text-base font-semibold">视频时长</Label>
        <div className="flex gap-2 mt-2">
          {DURATIONS.map(d => (
            <Button
              key={d}
              variant={duration === d ? 'default' : 'outline'}
              onClick={() => setDuration(d)}
            >
              {d}秒
            </Button>
          ))}
        </div>
      </div>

      {/* 剧情风格选择 */}
      <div>
        <Label className="text-base font-semibold">剧情风格</Label>
        <div className="grid grid-cols-4 gap-2 mt-2">
          {STORY_STYLES.map(style => (
            <Button
              key={style.value}
              variant={storyStyle === style.value ? 'default' : 'outline'}
              onClick={() => setStoryStyle(style.value)}
              className="h-auto flex-col items-start p-3"
            >
              <div className="font-semibold">{style.label}</div>
              <div className="text-xs text-muted-foreground">
                {style.description}
              </div>
            </Button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          💡 Auto: AI 自动判断,不强化特定风格
        </p>
      </div>

      {/* 脚本输入 */}
      <div>
        <Label className="text-base font-semibold">视频脚本</Label>
        <Textarea
          value={script}
          onChange={(e) => setScript(e.target.value)}
          placeholder={
            "请输入您的视频脚本...\n\n支持任何格式:\n" +
            "- 纯文字描述 (如: 王子救公主的故事)\n" +
            "- 分镜脚本\n" +
            "- 故事大纲\n\n" +
            "💡 简单描述 + 剧情风格 = AI 自动延伸"
          }
          rows={10}
          className="mt-2"
        />
      </div>

      {/* 开始按钮 */}
      <Button
        onClick={handleSubmit}
        disabled={isLoading || !script.trim()}
        className="w-full"
        size="lg"
      >
        {isLoading ? '创建中...' : '开始生成'}
      </Button>
    </div>
  )
}
```

### 步骤弹窗容器 (`StepDialog.tsx`)

```tsx
// app/studio/video-agent-beta/components/StepDialog.tsx
'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import ProgressBar from './ProgressBar'
import Step1ScriptAnalysis from './steps/Step1ScriptAnalysis'
import Step2CharacterConfig from './steps/Step2CharacterConfig'
// ... 其他步骤组件

interface StepDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  step: number
  project: VideoAgentProject
}

export default function StepDialog({
  open,
  onOpenChange,
  step,
  project
}: StepDialogProps) {
  const renderStep = () => {
    switch (step) {
      case 1:
        return <Step1ScriptAnalysis project={project} />
      case 2:
        return <Step2CharacterConfig project={project} />
      case 3:
        return <Step3ImageStyle project={project} />
      case 4:
        return <Step4StoryboardGen project={project} />
      case 5:
        return <Step5VideoGen project={project} />
      case 6:
        return <Step6MusicEffect project={project} />
      case 7:
        return <Step7FinalCompose project={project} />
      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            步骤 {step}/7: {getStepTitle(step)}
          </DialogTitle>
        </DialogHeader>

        {/* 进度条 */}
        <ProgressBar currentStep={step} totalSteps={7} />

        {/* 步骤内容 */}
        <div className="mt-4">
          {renderStep()}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function getStepTitle(step: number) {
  const titles = {
    1: '脚本分析与优化',
    2: '人物配置',
    3: '图片风格选择',
    4: '分镜图生成',
    5: '视频片段生成',
    6: '音乐和特效选择',
    7: '最终合成'
  }
  return titles[step] || ''
}
```

---

## 🔌 API 客户端封装

```typescript
// lib/services/video-agent/api-client.ts
class VideoAgentAPIClient {
  private baseUrl = '/api/video-agent'

  // 创建项目
  async createProject(data: CreateProjectData) {
    return this.post('/projects', data)
  }

  // 脚本分析
  async analyzeScript(projectId: string) {
    return this.post(`/projects/${projectId}/analyze-script`)
  }

  // 生成分镜图
  async generateStoryboards(projectId: string) {
    return this.post(`/projects/${projectId}/storyboards/generate`)
  }

  // 查询分镜图状态
  async getStoryboardStatus(projectId: string) {
    return this.get(`/projects/${projectId}/storyboards/status`)
  }

  // 重新生成单张分镜图
  async regenerateStoryboard(projectId: string, shotNumber: number) {
    return this.post(
      `/projects/${projectId}/storyboards/${shotNumber}/regenerate`
    )
  }

  // 生成视频片段
  async generateVideos(projectId: string) {
    return this.post(`/projects/${projectId}/videos/generate`)
  }

  // 查询视频状态
  async getVideoStatus(projectId: string) {
    return this.get(`/projects/${projectId}/videos/status`)
  }

  // 合成最终视频
  async composeFinalVideo(projectId: string) {
    return this.post(`/projects/${projectId}/compose`)
  }

  // 通用 GET
  private async get(path: string) {
    const response = await fetch(`${this.baseUrl}${path}`)
    if (!response.ok) throw new Error('API request failed')
    return response.json()
  }

  // 通用 POST
  private async post(path: string, data?: any) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined
    })
    if (!response.ok) throw new Error('API request failed')
    return response.json()
  }
}

export const videoAgentAPI = new VideoAgentAPIClient()
```

---

## 📊 技术栈总结

| 层级 | 技术选型 | 说明 |
|------|---------|------|
| **UI 框架** | React 19 + Next.js 15 | 已有 ✅ |
| **状态管理** | Zustand + Persist | 轻量级,支持持久化 |
| **UI 组件** | shadcn/ui | 已有 ✅ |
| **样式方案** | Tailwind CSS | 已有 ✅ |
| **表单处理** | React Hook Form | 复杂表单验证 |
| **弹窗管理** | Radix UI Dialog | shadcn/ui 内置 |
| **视频播放** | HTML5 Video + Controls | 简单轻量 |
| **进度显示** | 自定义进度条 | 7 步进度追踪 |

---

**文档版本:** v1.0
**最后更新:** 2025-12-09

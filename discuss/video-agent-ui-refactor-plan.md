# Video Agent UI 重构规划

## 一、现状分析

### 当前实现（InputStage.tsx）
- **主输入区域**：Textarea 文本输入框（300px 高度）
- **布局结构**：上下垂直布局
  - 顶部：大型文本输入框
  - 底部：左右两列配置区域（Grid 2列）
- **控制元素位置**：
  - Analyze Video：左下角浮动按钮
  - AI Inspiration + chars count：右下角浮动按钮
  - Visual Format、Duration、Audio：左列
  - Story Style + Generate：右列

### 目标设计（截图参考）
- **主区域**：深色视频预览区域（类似播放器的外观）
- **布局结构**：垂直堆叠
  - 顶部：视频预览区（带内嵌底部工具栏）
  - 中部：STORY STYLE 单行水平按钮组
  - 底部：Generate Video 大按钮（居中）
- **工具栏元素**：全部集中在视频区底部
  - 左侧：16:9、15s、麦克风、AI Inspiration
  - 右侧：0 chars、Analyze Video

---

## 二、核心差异对比

| 维度 | 当前实现 | 目标设计 |
|-----|---------|---------|
| **主区域类型** | Textarea 文本输入 | 深色视频预览区（视觉容器） |
| **主区域高度** | 300px | 约 400-450px（更高） |
| **工具栏位置** | 分散（文本框内浮动 + 外部配置区） | 统一在视频区底部的工具栏 |
| **工具栏样式** | 按钮形式 | 图标 + 标签的紧凑按钮 |
| **Story Style** | 4列网格（2行） | 单行水平滚动 |
| **Generate按钮** | 右侧对齐 | 底部居中 |
| **Aspect Ratio** | 独立区域（大按钮） | 工具栏小图标 |
| **Duration** | 独立区域（4个按钮） | 工具栏小图标 |
| **Audio设置** | 独立区域（2个按钮） | 工具栏麦克风图标 |
| **整体高度** | 分散占用更多垂直空间 | 更紧凑垂直布局 |

---

## 三、详细重构方案

### 3.1 主视频区域重构

#### 结构变化
```tsx
// 当前：Textarea
<Card>
  <Textarea ... />
  <浮动按钮层>
</Card>

// 目标：视频预览容器 + 底部工具栏
<Card className="视频预览样式">
  <div className="视频内容区">
    {/* 可以是空白、Textarea、或实际视频预览 */}
  </div>
  <div className="底部工具栏">
    <左侧工具组 />
    <右侧工具组 />
  </div>
</Card>
```

#### 样式要点
- **背景**：深色渐变（深蓝-黑色）
- **边框**：紫色/蓝色渐变边框（非虚线）
- **内容区**：保持 Textarea 但样式更隐蔽，或改为可编辑区域
- **工具栏**：
  - 绝对定位在底部
  - 半透明深色背景
  - 内边距：px-6 py-4
  - Flex 布局：justify-between

### 3.2 工具栏按钮设计

#### 按钮类型和图标
| 功能 | 图标 | 替代图标库 | 标签文本 |
|-----|------|-----------|---------|
| Aspect Ratio | 📐 矩形 | Lucide: `Ratio` 或 `Layout` | "16:9" |
| Duration | ⏱️ 时钟 | Lucide: `Clock` | "15s" |
| Microphone | 🎤 麦克风 | Lucide: `Mic` | （无文本） |
| AI Inspiration | ✨ 星星 | Lucide: `Sparkles` | "AI Inspiration" |
| Analyze Video | 🎬 播放分析 | Lucide: `Video` + `ArrowRight` | "Analyze Video" |
| Char Count | - | - | "0 chars" |

#### 按钮样式
```tsx
// 左侧工具按钮（小型、深色背景）
<button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:bg-slate-700/50">
  <Icon className="w-4 h-4" />
  <span className="text-sm">Label</span>
</button>

// Analyze Video（右侧、强调色）
<button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90">
  <Icon className="w-4 h-4" />
  <span className="text-sm font-medium">Analyze Video</span>
</button>
```

### 3.3 Story Style 区域重构

#### 当前实现
```tsx
<div className="grid grid-cols-4 gap-2">
  {STORY_STYLES.map(...)}
</div>
```

#### 目标实现
```tsx
<div className="space-y-3">
  <Label className="text-xs uppercase text-slate-400">STORY STYLE</Label>
  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
    {STORY_STYLES.map((style) => (
      <button
        className={cn(
          "flex-shrink-0 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all",
          selected
            ? "bg-purple-600 border-purple-500 text-white shadow-lg"
            : "bg-slate-800/50 border-slate-700/50 text-slate-300 hover:bg-slate-700/50"
        )}
      >
        {style.label}
      </button>
    ))}
  </div>
</div>
```

#### 样式要点
- 单行水平滚动（`overflow-x-auto`）
- 按钮不换行（`flex-shrink-0`）
- 选中状态：紫色高亮（匹配截图）
- 未选中：深色半透明背景

### 3.4 Generate Video 按钮

#### 位置和样式
```tsx
<div className="flex justify-center mt-8">
  <Button className="w-full max-w-2xl h-14 rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-lg font-bold shadow-xl hover:shadow-2xl">
    <Sparkles className="w-5 h-5 mr-2" />
    Generate Video
  </Button>
</div>
```

#### 要点
- **宽度**：全宽但限制 max-w-2xl
- **高度**：更高（h-14）
- **渐变**：蓝→紫→粉（三色渐变）
- **圆角**：更大（rounded-2xl）
- **阴影**：更强（shadow-xl）

---

## 四、技术实现细节

### 4.1 响应式适配

#### 工具栏
```tsx
// 移动端：垂直堆叠
<div className="flex flex-col sm:flex-row sm:justify-between gap-3 sm:gap-4">
  <div className="flex flex-wrap gap-2">
    {/* 左侧工具 */}
  </div>
  <div className="flex gap-2">
    {/* 右侧工具 */}
  </div>
</div>
```

#### Story Style
```tsx
// 移动端：允许水平滚动
<div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-2">
  {/* 按钮组 */}
</div>
```

### 4.2 交互状态管理

#### Aspect Ratio 切换
```tsx
const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9')

<button
  onClick={() => setAspectRatio(aspectRatio === '16:9' ? '9:16' : '16:9')}
  className="..."
>
  <Layout className="w-4 h-4" />
  <span>{aspectRatio}</span>
</button>
```

#### Duration 切换
```tsx
const [duration, setDuration] = useState(15)
const durations = [15, 30, 45, 60]

<button
  onClick={() => {
    const idx = durations.indexOf(duration)
    setDuration(durations[(idx + 1) % durations.length])
  }}
  className="..."
>
  <Clock className="w-4 h-4" />
  <span>{duration}s</span>
</button>
```

### 4.3 动画和过渡

#### 工具栏出现动画
```tsx
<div className="animate-fade-in-up">
  {/* 工具栏内容 */}
</div>

// tailwind.config.js
animation: {
  'fade-in-up': 'fadeInUp 0.3s ease-out'
}
keyframes: {
  fadeInUp: {
    '0%': { opacity: 0, transform: 'translateY(10px)' },
    '100%': { opacity: 1, transform: 'translateY(0)' }
  }
}
```

#### 按钮悬停效果
```tsx
className="transition-all duration-200 hover:scale-105 hover:shadow-lg"
```

---

## 五、图标替换方案

### Lucide React 图标映射

| 截图图标 | Lucide 组件 | 备用方案 |
|---------|------------|---------|
| 📐 矩形比例 | `<Layout />` | `<RectangleHorizontal />` |
| ⏱️ 时钟 | `<Clock />` | `<Timer />` |
| 🎤 麦克风 | `<Mic />` | `<AudioLines />` |
| ✨ 星星闪烁 | `<Sparkles />` | `<Stars />` |
| 🎬 播放分析 | `<Video />` + `<Play />` | 自定义 SVG |

### 自定义图标示例（Analyze Video）
```tsx
<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
  <rect x="4" y="6" width="8" height="12" rx="2" stroke="currentColor" strokeWidth="2"/>
  <path d="M14 8L18 12L14 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  <circle cx="8" cy="12" r="1.5" fill="currentColor" className="animate-pulse"/>
</svg>
```

---

## 六、色彩系统

### 调色板（基于截图）

```tsx
const colors = {
  background: {
    primary: '#0a0a0f',      // 主背景（深蓝黑）
    secondary: '#1a1a2e',    // 次要背景
    card: '#151527',         // 卡片背景
  },
  border: {
    default: 'rgba(139, 92, 246, 0.3)',  // 紫色边框
    gradient: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #d946ef 100%)',
  },
  button: {
    toolbar: {
      bg: 'rgba(30, 41, 59, 0.5)',    // 工具栏按钮背景
      border: 'rgba(51, 65, 85, 0.5)', // 工具栏按钮边框
      hover: 'rgba(51, 65, 85, 0.5)',  // 悬停态
    },
    selected: {
      bg: '#8b5cf6',        // 选中态背景（紫色）
      text: '#ffffff',      // 选中态文字
    },
    primary: {
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)',
    }
  },
  text: {
    primary: '#ffffff',
    secondary: 'rgba(255, 255, 255, 0.6)',
    muted: 'rgba(255, 255, 255, 0.3)',
  }
}
```

### Tailwind 类名应用
```tsx
// 主视频区域
className="bg-slate-950 border-2 border-purple-500/30 rounded-2xl"

// 工具栏按钮
className="bg-slate-800/50 border border-slate-700/50 text-slate-300"

// 选中状态
className="bg-purple-600 border-purple-500 text-white"

// Generate按钮
className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600"
```

---

## 七、实施步骤

### Phase 1: 主视频区域重构（优先级：高）
1. **调整卡片样式**
   - 移除虚线边框（`border-dashed`）
   - 改为实线渐变边框
   - 增加内容区高度（300px → 400px）

2. **实现底部工具栏**
   - 创建新组件 `VideoToolbar.tsx`
   - 实现左右布局（`justify-between`）
   - 添加半透明背景和模糊效果

3. **迁移控制元素**
   - Aspect Ratio → 工具栏左侧
   - Duration → 工具栏左侧
   - Microphone → 工具栏左侧
   - AI Inspiration → 工具栏左侧
   - Analyze Video → 工具栏右侧
   - Char Count → 工具栏右侧

### Phase 2: Story Style 区域重构（优先级：中）
1. **改为单行布局**
   - 从 `grid-cols-4` 改为 `flex`
   - 添加水平滚动（`overflow-x-auto`）

2. **调整按钮样式**
   - 统一宽度（`min-w-[100px]`）
   - 选中态紫色高亮
   - 未选中态深色半透明

### Phase 3: Generate 按钮重构（优先级：低）
1. **调整位置**
   - 从右侧对齐改为居中
   - 增加上边距（`mt-8`）

2. **优化样式**
   - 更大的高度（h-14）
   - 三色渐变
   - 更强的阴影

### Phase 4: 响应式优化（优先级：中）
1. **移动端适配**
   - 工具栏垂直堆叠
   - Story Style 水平滚动
   - Generate 按钮全宽

2. **平板适配**
   - 适当调整间距
   - 保持水平布局

---

## 八、潜在问题和解决方案

### 问题1：Textarea 在深色视频区内不明显
**方案A**：保留 Textarea 但优化样式
- 增加占位符透明度
- 添加微妙的边框提示
- 悬停时显示编辑提示

**方案B**：改为点击激活模式
- 默认显示渐变背景或占位内容
- 点击后展开编辑区
- 类似点击式播放器

### 问题2：工具栏按钮过多导致拥挤
**方案A**：分组显示
- 左侧：视频设置（Aspect + Duration）
- 中部：辅助功能（Mic + AI）
- 右侧：操作按钮（Analyze + Count）

**方案B**：折叠菜单
- 移动端部分按钮收入下拉菜单
- 桌面端全部展开

### 问题3：单行 Story Style 按钮在大屏幕上显得稀疏
**方案A**：固定宽度居中
- `max-w-3xl mx-auto`
- 按钮之间增加间距

**方案B**：响应式调整
- 大屏：单行居中
- 中屏：单行紧凑
- 小屏：水平滚动

---

## 九、代码组织建议

### 新建组件
```
app/studio/video-agent-beta/components/
├── InputStage/
│   ├── index.tsx                    # 主容器
│   ├── VideoArea.tsx                # 视频预览区域
│   ├── VideoToolbar.tsx             # 底部工具栏
│   ├── StoryStyleSelector.tsx       # 风格选择器
│   ├── GenerateButton.tsx           # 生成按钮
│   └── types.ts                     # 类型定义
```

### 共享样式
```tsx
// InputStage/styles.ts
export const videoAreaStyles = {
  container: "relative bg-slate-950 border-2 border-purple-500/30 rounded-2xl overflow-hidden",
  content: "min-h-[400px] p-8",
  toolbar: "absolute bottom-0 inset-x-0 flex justify-between items-center px-6 py-4 bg-slate-900/80 backdrop-blur-sm",
}

export const toolbarButtonStyles = {
  base: "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
  default: "bg-slate-800/50 border border-slate-700/50 text-slate-300 hover:bg-slate-700/50",
  primary: "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:opacity-90",
}
```

---

## 十、验收标准

### 视觉还原度
- [ ] 主视频区域高度和比例与截图一致
- [ ] 工具栏位置和间距匹配截图
- [ ] 工具栏按钮图标和文本匹配截图
- [ ] Story Style 按钮为单行水平布局
- [ ] Generate 按钮居中且使用渐变
- [ ] 色彩（紫色、蓝色、深色背景）匹配截图
- [ ] 边框渐变效果还原

### 功能完整性
- [ ] 所有现有功能保持正常（Aspect Ratio、Duration、Audio、Style）
- [ ] Analyze Video 功能正常
- [ ] AI Inspiration 功能正常
- [ ] 字符计数实时更新
- [ ] Generate Video 提交逻辑正常

### 响应式
- [ ] 移动端（< 640px）工具栏垂直堆叠
- [ ] 平板端（640px - 1024px）布局合理
- [ ] 桌面端（> 1024px）与截图一致

### 性能
- [ ] 无明显的重渲染问题
- [ ] 动画流畅（60fps）
- [ ] 交互响应及时（< 100ms）

---

## 十一、时间估算

| 阶段 | 内容 | 预计工作量 |
|-----|------|----------|
| Phase 1 | 主视频区域重构 | 3-4 小时 |
| Phase 2 | Story Style 重构 | 1-2 小时 |
| Phase 3 | Generate 按钮重构 | 0.5-1 小时 |
| Phase 4 | 响应式优化 | 2-3 小时 |
| 测试调试 | 全面测试和微调 | 2-3 小时 |
| **总计** | | **8-13 小时** |

---

## 十二、风险评估

### 高风险
1. **工具栏按钮过多导致移动端拥挤**
   - 缓解措施：优先实现桌面端，移动端使用折叠菜单

2. **Textarea 在深色背景下可见性差**
   - 缓解措施：增加微妙的边框和占位符对比度

### 中风险
1. **响应式适配工作量大于预期**
   - 缓解措施：优先完成桌面端，逐步适配移动端

2. **现有状态管理逻辑需要调整**
   - 缓解措施：保持现有状态结构，仅调整 UI 映射

### 低风险
1. **图标库缺少某些图标**
   - 缓解措施：使用 Lucide 类似图标或自定义 SVG

---

## 十三、后续优化方向

### 功能增强
1. **视频预览功能**：在视频区域实际预览上传的视频
2. **拖拽上传**：支持拖拽文件到视频区域
3. **快捷键支持**：Ctrl+Enter 提交等

### 视觉增强
1. **加载动画**：Generate 按钮点击后的精美加载动画
2. **进度指示器**：在视频区域显示生成进度
3. **主题切换**：支持深色/浅色主题切换

### 性能优化
1. **虚拟滚动**：如果 Story Style 按钮过多
2. **图片懒加载**：如果有缩略图预览
3. **状态持久化**：自动保存草稿

---

**文档版本**: v1.0
**创建时间**: 2026-02-10
**最后更新**: 2026-02-10
**负责人**: Video Agent 开发团队

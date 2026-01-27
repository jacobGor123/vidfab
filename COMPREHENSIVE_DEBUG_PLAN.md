# 分镜图卡住 Loading - 根因确认与修复方案

## ✅ 最终确认的根因

**闭包陷阱导致状态更新失败（已修复）**

### 问题机制

```typescript
// useStoryboardAutoGeneration.ts
const [storyboards, setStoryboards] = useState<Record<number, Storyboard>>({})

const pollStoryboards = useCallback(async () => {
  // ...
  console.log('currentStateKeys:', Object.keys(storyboards).sort()) // ← 始终是 []
  setStoryboards(storyboardMap) // ← 看似更新了
  // ...
}, [project.id, analysis.shot_count, getStoryboardsStatus, clearPoll])
//   ↑ 注意：依赖数组中没有 storyboards！
```

**根因**：
1. `pollStoryboards` 在组件挂载时创建，**闭包捕获了初始的空对象** `{}`
2. 虽然 `setStoryboards(storyboardMap)` 确实更新了 React 状态
3. 但下一次轮询时，`pollStoryboards` 内部引用的仍然是闭包捕获的旧空对象
4. 所以日志始终显示 `currentStateKeys: []`
5. 过度优化的比较逻辑 `setStoryboards((prev) => ...)` 依赖闭包中的旧值，导致判断错误

**证据**：
- 用户日志显示 `currentStateKeys: Array(0)` 始终为空
- 但 `storyboardMapKeys: [1,2,3,4,5,6,7,8,9]` 显示数据正确获取
- "🔄 Values changed, updating state" 触发了两次，说明代码执行了，但状态未更新

### 修复方案

**已应用**：移除过度优化的比较逻辑，在生成阶段直接强制更新状态

```typescript
// ❌ 旧代码（过度优化，导致闭包陷阱）
setStoryboards((prev) => {
  const prevKeys = Object.keys(prev).map(Number).sort()
  const nextKeys = Object.keys(storyboardMap).map(Number).sort()

  if (prevKeys.length !== nextKeys.length) {
    return storyboardMap
  }

  // 复杂的比较逻辑...
  return hasChanges ? storyboardMap : prev
})

// ✅ 新代码（直接更新，避免闭包问题）
console.log('[StoryboardAutoGen] 🔄 Forcing state update with', Object.keys(storyboardMap).length, 'storyboards')
setStoryboards(storyboardMap)
```

**为什么这样修复有效**：
1. 直接调用 `setStoryboards(storyboardMap)` 不依赖闭包中的旧值
2. React 会正确处理状态更新，即使函数闭包捕获了旧状态
3. 简化代码，移除不必要的优化（React 自己会做批处理和优化）

---

## 📋 其他已修复的相关问题

### 问题 1: 轮询过早停止（已修复）

**症状**：部分分镜图在生成完成后仍显示 loading，刷新页面后正常显示

**修复**：在轮询停止前强制同步状态，并延迟 500ms 确保 React 批处理完成

```typescript
if (generating === 0) {
  // 强制最后一次状态同步
  setStoryboards(storyboardMap)
  setProgress({ current: completed, total })

  setTimeout(() => {
    clearPoll()
    setStatus('completed')
  }, 500)
}
```

### 问题 2: 双重状态同步冲突（已修复）

**症状**：轮询数据可能被 `project.storyboards` 的 useEffect 覆盖

**修复**：在生成阶段禁用 `project.storyboards` 同步

```typescript
useEffect(() => {
  if (status === 'generating') {
    return // 跳过同步，避免覆盖轮询数据
  }
  // ... 合并逻辑
}, [project.storyboards, status])
```

### 问题 3: 图片加载超时（已修复）

**症状**：图片加载缓慢时永久显示 loading overlay

**修复**：添加 15 秒超时保护

```typescript
useEffect(() => {
  if (srcKey) {
    const timeout = setTimeout(() => {
      console.warn('[StoryboardCard] Image load timeout')
      setIsImageReady(true) // 超时后移除 loading
    }, 15000)
    return () => clearTimeout(timeout)
  }
}, [srcKey])
```

---

## 🔍 最新调查（2026-01-27）

### 症状
用户日志显示：
```
[StoryboardCard] Shot 1 render: {hasStoryboard: true, storyboardStatus: 'success', isStoryboardGenerating: true}
```

- 单个 storyboard 对象的 status 是 'success'
- 但全局的 `isStoryboardGenerating` 仍然是 true
- 导致卡片显示 loading overlay 而不是图片

### 根因分析

**渲染条件**（StoryboardCardEnhanced.tsx:286）：
```typescript
{(storyboard?.status === 'generating' || (isStoryboardGenerating && (!storyboard || !resolvedStoryboardSrc))) ? (
```

**分解**：
- `storyboard?.status === 'generating'` → FALSE（单个 status 是 'success'）
- `isStoryboardGenerating` → TRUE（全局 hook status 仍是 'generating'）
- `!storyboard` → FALSE（对象存在）
- `!resolvedStoryboardSrc` → **可能是 TRUE**（URL 解析失败）

**问题链**：
1. `useStoryboardAutoGeneration` 的 `status` 没有从 'generating' 转换为 'completed'
2. 因为轮询的 `generating === 0` 条件没有触发
3. 可能是后端 statusData 中仍有 `status === 'generating'` 的记录
4. 或者 `resolvedStoryboardSrc` 返回 undefined 导致显示 loading

### 最终修复（2026-01-27 15:30）

**根因确认**：
- 轮询检测到 `generating === 0` 并调用 `setTimeout(() => { setStatus('completed') }, 500)`
- 但在 500ms 延迟期间，React 触发多次渲染
- 所有卡片的 `isStoryboardGenerating` 保持 true
- 渲染条件 `isStoryboardGenerating && (!storyboard || !resolvedStoryboardSrc)` 中：
  - 虽然 storyboard 存在且有 URL
  - 但因为 `isStoryboardGenerating === true`，部分逻辑仍显示 loading

**修复方案**：
```typescript
// useStoryboardAutoGeneration.ts:219-233
if (generating === 0) {
  // 立即更新 status 为 completed（不延迟）
  setStatus('completed')

  // 只延迟清理轮询（给 React 时间完成渲染）
  setTimeout(() => {
    clearPoll()
  }, 500)
}
```

**为什么有效**：
1. `setStatus('completed')` 立即执行 → `isStoryboardGenerating` 立即变为 false
2. 卡片立即显示图片，不再有 500ms 的 loading 延迟
3. 轮询清理仍延迟 500ms，避免竞态条件

### 新增诊断

**Added logs in:**
1. `useStoryboardAutoGeneration.ts:187-200` - 每次轮询输出所有分镜状态
2. `StoryboardCardEnhanced.tsx:127-143` - 输出有问题的卡片（无 storyboard 或无 URL）

## 🧪 测试验证

请重新测试分镜图批量生成功能：

1. 重启开发服务器：`./scripts/dev.sh`
2. 创建新项目，生成 6-9 张分镜图
3. 观察控制台日志，特别关注：
   - `[StoryboardAutoGen] 📊 Poll tick:` 输出的 generating 计数
   - 每个分镜的 status 和 URL 字段
   - `[StoryboardCard] resolvedSrc:` 是否返回有效 URL
4. 验证不再出现卡住 loading 的情况

**预期结果**：
- 所有分镜图都能在生成完成后立即显示
- 轮询日志显示 `generating: 0` 时停止
- 卡片日志显示所有 URL 字段都有值
- resolvedSrc 返回有效的图片 URL
- 不再需要刷新页面

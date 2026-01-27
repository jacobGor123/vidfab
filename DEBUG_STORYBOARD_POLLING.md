# 分镜图卡住问题 - 诊断方案

## 根本原因

**轮询停止时机过早 + 状态更新丢失**

### 问题链路

```
后台生成完成 → 更新DB → 轮询拉取 → 检测 generating=0 → clearPoll()
                                ↓ (React批处理中)
                             setStoryboards() 未生效 → 卡片仍显示 loading
```

## 诊断代码

在 `useStoryboardAutoGeneration.ts` 的 `pollStoryboards()` 函数中添加:

```typescript
// 行183-213 之间,替换停止逻辑为:

const completed = statusData.filter(s => s.status === 'success' && s.image_url).length
const failed = statusData.filter(s => s.status === 'failed').length
const generating = statusData.filter(s => s.status === 'generating').length

// 🔥 关键诊断日志
console.log('[StoryboardPoll] 📊 Current state:', {
  timestamp: new Date().toISOString(),
  pollCount: pollCountRef.current,
  completed,
  failed,
  generating,
  total: analysis.shot_count,
  storyboardKeys: Object.keys(storyboardMap).sort(),
  prevStateKeys: Object.keys(prev).sort(),
})

// 🔥 修复1: 先强制更新 state,再检查停止条件
setStoryboards(storyboardMap)
setProgress({ current: completed, total: analysis.shot_count })

// 🔥 修复2: 添加最小轮询次数保证(至少轮询总数+2次)
const minPolls = analysis.shot_count + 2

// 🔥 修复3: 延迟停止,确保状态已同步
if (generating === 0 && pollCountRef.current >= minPolls) {
  console.log('[StoryboardPoll] ✅ All done, scheduling stop in next tick...')

  // 使用 setTimeout 延迟停止,确保 React 完成状态更新
  setTimeout(() => {
    clearPoll()
    const nextStatus = completed === total ? 'completed' :
                      failed > 0 ? 'completed' : 'completed'
    setStatus(nextStatus)
  }, 100)
}
```

## 测试步骤

1. 添加上述诊断代码
2. 清空浏览器缓存和 localStorage
3. 创建新项目,生成 6-8 张分镜
4. 观察控制台日志:
   - 每次轮询都应该输出 `[StoryboardPoll] 📊`
   - 检查 `storyboardKeys` 和 `prevStateKeys` 是否匹配
   - 确认停止时 `completed === total`

## 预期结果

- 所有分镜图都能正确显示
- 不再有卡住的 loading 卡片
- 日志显示所有状态都被正确捕获

## 长期修复

如果诊断验证成功,需要:

1. 移除 `useEffect` 中的双重状态同步(行47-105)
2. 统一使用轮询作为唯一数据源
3. 参考 `useVideoGenerationIntegrated` 的实现模式
4. 添加单元测试覆盖轮询逻辑

# Template Gallery 视频Hover优化方案

## 问题分析

### 根本原因
在 `components/create/template-gallery.tsx` 中，VideoCard组件在鼠标hover时会多次触发loading状态，主要原因包括：

1. **SmartVideoElement的useEffect依赖项不稳定**：
   - `preloadedElement` 对象引用每次都可能不同
   - 快速hover时依赖项频繁变化，导致useEffect重复执行

2. **重复的DOM清理与重建**：
   - 每次useEffect都先清理之前的video元素然后重新创建
   - 触发新的loading状态

3. **状态竞态条件**：
   - 用户快速移入移出时，`isHovered` 状态快速变化
   - 导致SmartVideoElement频繁mount/unmount

## 优化方案

### 1. 添加防抖机制

**问题**：用户快速hover导致重复触发loading状态
**解决**：在mouse leave事件中添加100ms延迟

```tsx
const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)

const handleMouseEnter = useCallback(() => {
  // 清除之前的离开定时器
  if (hoverTimeoutRef.current) {
    clearTimeout(hoverTimeoutRef.current)
    hoverTimeoutRef.current = null
  }

  // 防止快速hover导致重复触发
  if (!isHovered) {
    setIsHovered(true)
    setHoverStartTime(Date.now())
  }
}, [isHovered])

const handleMouseLeave = useCallback(() => {
  // 添加短暂延迟，避免快速移入移出
  hoverTimeoutRef.current = setTimeout(() => {
    setIsHovered(false)
    setHoverStartTime(null)
    hoverTimeoutRef.current = null
  }, 100) // 100ms延迟
}, [])
```

### 2. 稳定预加载元素引用

**问题**：`getPreloadedVideoElement()` 每次调用返回不同引用
**解决**：使用useRef缓存预加载元素引用

```tsx
const preloadedVideoRef = useRef<HTMLVideoElement | null>(null)

// 使用useEffect来稳定preloadedElement的引用
useEffect(() => {
  if (getPreloadedVideo) {
    const element = getPreloadedVideo(video.id)
    if (element && element.readyState >= 2) {
      preloadedVideoRef.current = element
    }
  }
}, [video.id, getPreloadedVideo, isPreloaded])
```

### 3. 优化SmartVideoElement

**问题**：频繁的DOM清理与重建
**解决**：添加元素复用逻辑和初始化状态检查

```tsx
const isInitializingRef = useRef(false)
const preloadedElementRef = useRef<HTMLVideoElement | null>(null)

useEffect(() => {
  if (!containerRef.current || isInitializingRef.current) return

  // 检查是否已经有相同的视频元素在使用
  if (videoElementRef.current) {
    const currentElement = videoElementRef.current
    const isSameVideo = currentElement.src.includes(videoId.toString()) ||
                       currentElement === preloadedElementRef.current

    if (isSameVideo && currentElement.readyState >= 2) {
      // 复用现有元素，只更新样式
      currentElement.className = className
      if (currentElement.paused) {
        currentElement.play().catch(console.warn)
      }
      return
    }
  }

  isInitializingRef.current = true
  // ... 初始化逻辑
}, [videoId, videoSrc]) // 只依赖真正需要重建元素的属性
```

### 4. 优化useEffect依赖项

**问题**：不稳定的依赖项导致useEffect重复执行
**解决**：
- 移除 `className` 和回调函数依赖
- 使用 `useRef` 存储回调函数
- 分离样式更新和元素创建逻辑

```tsx
const callbacksRef = useRef({ onCanPlay, onError, onLoadStart })
// 更新回调引用，避免作为useEffect依赖项
callbacksRef.current = { onCanPlay, onError, onLoadStart }

// 稳定preloadedElement引用，只在真正改变时更新
useEffect(() => {
  if (preloadedElement !== preloadedElementRef.current) {
    preloadedElementRef.current = preloadedElement
  }
}, [preloadedElement])
```

## 优化效果

### 性能提升
- **减少DOM操作**：避免重复创建/销毁video元素
- **减少网络请求**：更好地复用预加载视频
- **提升响应速度**：防抖机制避免无效操作
- **降低CPU使用**：减少不必要的useEffect执行

### 用户体验改善
- 消除快速hover时的多次loading闪烁
- 视频播放更加流畅
- 减少不必要的网络流量消耗
- 提升整体页面性能

## 测试验证

### 验证方法
1. 在template gallery页面快速hover多个视频
2. 观察浏览器控制台，确认loading日志减少
3. 检查network tab，确认没有重复的视频请求
4. 使用React DevTools检查组件重渲染情况

### 预期结果
- ✅ 快速hover不会导致多次loading
- ✅ 预加载视频能够正常复用
- ✅ 视频播放流畅，无闪烁
- ✅ 内存使用正常，无内存泄露
- ✅ 控制台日志清晰，便于调试

## 技术要求遵循

- ✅ 保持现有的预加载逻辑和API接口
- ✅ 不破坏视频播放的用户体验
- ✅ 考虑React 18的并发特性
- ✅ 遵循项目现有的代码规范
- ✅ 保持代码可读性和性能

## 关键代码变更

1. `VideoCard` 组件：
   - 添加防抖hover处理
   - 使用稳定的预加载元素引用

2. `SmartVideoElement` 组件：
   - 添加元素复用逻辑
   - 优化useEffect依赖项
   - 添加初始化状态检查

3. 性能优化：
   - 减少不必要的DOM操作
   - 避免重复的网络请求
   - 优化组件重渲染
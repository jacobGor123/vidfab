# 快速添加积分调试日志

## 方案1: 在前端添加详细日志

### 修改位置: `image-to-video-panel.tsx` (或 `text-to-video-panel-new.tsx`)

在 `handleGenerate` 函数中添加日志:

```typescript
const handleGenerate = useCallback(async () => {
  // ✅ 强制刷新积分
  console.log('🔄 刷新积分中...')
  await refreshCredits()

  // 表单验证
  const errors = validateForm()
  if (errors.length > 0) {
    setValidationErrors(errors)
    return
  }

  // 权限和积分检查
  if (session?.user?.uuid) {
    try {
      console.log('📊 开始积分检查...', {
        model: params.model,
        resolution: params.resolution,
        duration: params.duration,
        用户UUID: session.user.uuid
      })

      const [modelAccess, budgetInfo] = await Promise.all([
        canAccessModel(params.model, params.resolution),
        checkCreditsAvailability(params.model, params.resolution, params.duration)
      ])

      console.log('✅ 积分检查结果:', {
        模型访问权限: modelAccess.can_access,
        当前余额: budgetInfo.current_balance,
        所需积分: budgetInfo.required_credits,
        是否足够: budgetInfo.can_afford,
        剩余可生成: budgetInfo.remaining_jobs
      })

      // 检查模型访问权限
      if (!modelAccess.can_access) {
        console.error('❌ 模型访问被拒:', modelAccess)
        setShowUpgradeDialog(true)
        return
      }

      // 检查积分是否足够
      if (!budgetInfo.can_afford) {
        console.error('❌ 积分不足!', {
          需要: budgetInfo.required_credits,
          当前: budgetInfo.current_balance,
          差额: budgetInfo.required_credits - budgetInfo.current_balance
        })

        // ✅ 显示详细错误信息
        setValidationErrors([
          `Insufficient credits. You need ${budgetInfo.required_credits} credits but only have ${budgetInfo.current_balance}.`
        ])

        // 延迟显示升级对话框
        setTimeout(() => {
          setShowUpgradeDialog(true)
        }, 3000)

        return
      }

      console.log('✅ 积分检查通过,继续生成...')

    } catch (error) {
      console.error('❌ 权限检查失败:', error)
      setShowUpgradeDialog(true)
      return
    }
  }

  // 继续后续逻辑...
}, [params, session, refreshCredits, ...])
```

## 方案2: 在按钮上显示积分信息

### 修改位置: 生成按钮部分

```typescript
// 在组件顶部获取积分信息
const [budgetPreview, setBudgetPreview] = useState<SimpleCreditsBudgetInfo | null>(null)

// 在 params 变化时计算所需积分
useEffect(() => {
  const fetchBudget = async () => {
    if (params.model && params.resolution && params.duration) {
      const budget = await checkCreditsAvailability(
        params.model,
        params.resolution,
        params.duration
      )
      setBudgetPreview(budget)
    }
  }
  fetchBudget()
}, [params.model, params.resolution, params.duration, checkCreditsAvailability])

// 修改按钮显示
<Button
  onClick={handleGenerate}
  disabled={...}
  className="..."
>
  {videoGeneration.isGenerating ? (
    <>
      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
      Submitting...
    </>
  ) : (
    <div className="w-full flex flex-col items-center gap-1">
      <div className="flex items-center gap-2">
        <span>Generate Video</span>
        {budgetPreview && (
          <span className="flex items-center text-sm opacity-90">
            <Zap className="w-3 h-3 mr-1" />
            {budgetPreview.required_credits}
          </span>
        )}
      </div>
      {budgetPreview && (
        <span className="text-xs opacity-70">
          Balance: {budgetPreview.current_balance} credits
          {budgetPreview.can_afford ? (
            <span className="text-green-400 ml-2">✓ Sufficient</span>
          ) : (
            <span className="text-red-400 ml-2">✗ Insufficient</span>
          )}
        </span>
      )}
    </div>
  )}
</Button>
```

## 方案3: 临时禁用前端预检

如果怀疑是前端缓存问题,可以临时禁用前端预检,让后端来判断:

```typescript
const handleGenerate = useCallback(async () => {
  // ✅ 强制刷新积分
  await refreshCredits()

  // 表单验证
  const errors = validateForm()
  if (errors.length > 0) {
    setValidationErrors(errors)
    return
  }

  // ⚠️ 临时注释掉前端预检
  /*
  if (session?.user?.uuid) {
    try {
      const [modelAccess, budgetInfo] = await Promise.all([
        canAccessModel(params.model, params.resolution),
        checkCreditsAvailability(params.model, params.resolution, params.duration)
      ])

      if (!modelAccess.can_access || !budgetInfo.can_afford) {
        setShowUpgradeDialog(true)
        return
      }
    } catch (error) {
      console.error('权限检查失败:', error)
      setShowUpgradeDialog(true)
      return
    }
  }
  */

  setValidationErrors([])

  // 直接调用生成API,让后端来检查
  try {
    const isAuthenticated = await authModal.requireAuth(async () => {
      await videoGeneration.generateImageToVideo(...)
    })
    ...
  } catch (error) {
    // ✅ 显示后端返回的错误
    setValidationErrors([error instanceof Error ? error.message : 'Generation failed'])
  }
}, [...])
```

## 测试步骤

1. 添加上述日志代码
2. 刷新页面
3. 尝试生成视频
4. 查看控制台输出
5. 将日志截图或复制给我

这样我就能精确知道问题出在哪里!

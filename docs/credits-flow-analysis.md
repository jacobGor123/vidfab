# /create 页面积分判断和 "Insufficient credits" 提示逻辑分析报告

## 一、系统架构概览

### 1.1 主要涉及的组件和文件

#### 前端组件 (`components/create/`)
- `image-to-video-panel.tsx` - 图片转视频面板
- `text-to-video-panel-new.tsx` - 文本转视频面板
- `video-effects-panel.tsx` - 视频特效面板

#### 前端 Hooks (`hooks/`)
- `use-subscription-simple.ts` - 简化的积分订阅管理
- `use-video-generation.tsx` - 视频生成核心逻辑

#### 后端 API (`app/api/video/`)
- `generate/route.ts` - 文本转视频 API
- `generate-image-to-video/route.ts` - 图片转视频 API
- `effects/route.ts` - 视频特效 API

#### 工具库 (`lib/`)
- `simple-credits-check.ts` - 服务端积分检查工具
- `credits-calculator.ts` - 积分计算工具

---

## 二、积分检查流程（完整链路）

### 2.1 前端预检查（用户点击生成按钮时）

#### 位置：三个主要面板组件的 `handleGenerate` 函数

**以 `image-to-video-panel.tsx` 为例（第 285-394 行）：**

```typescript
const handleGenerate = useCallback(async () => {
  // 1. 表单验证
  const errors = validateForm()
  if (errors.length > 0) {
    setValidationErrors(errors)
    return
  }

  // 2. 权限和积分检查（前端预检）
  if (session?.user?.uuid) {
    try {
      const [modelAccess, budgetInfo] = await Promise.all([
        canAccessModel(params.model, params.resolution),
        checkCreditsAvailability(params.model, params.resolution, params.duration)
      ])

      // 2.1 检查模型访问权限
      if (!modelAccess.can_access) {
        setShowUpgradeDialog(true)  // ❌ 弹出升级对话框
        return
      }

      // 2.2 检查积分是否足够
      if (!budgetInfo.can_afford) {
        setShowUpgradeDialog(true)  // ❌ 弹出升级对话框
        return
      }
    } catch (error) {
      console.error('权限检查失败:', error)
      setShowUpgradeDialog(true)  // ❌ 检查失败也弹升级对话框
      return
    }
  }

  // 3. 继续后续生成逻辑...
}, [...])
```

**关键发现：**
- ⚠️ 前端检查失败时，**不显示** "Insufficient credits" 错误，而是直接显示升级对话框
- ⚠️ 这可能导致用户看不到具体的积分不足信息

---

### 2.2 前端积分检查实现（use-subscription-simple.ts）

#### `checkCreditsAvailability` 函数（第 96-145 行）

```typescript
const checkCreditsAvailability = useCallback(async (
  model: VideoModel,
  resolution: string,
  duration: string
): Promise<SimpleCreditsBudgetInfo> => {
  if (!creditsInfo) {
    return {
      current_balance: 0,
      required_credits: 0,
      can_afford: false,
      warning_level: 'critical',
      remaining_jobs: 0
    }
  }

  try {
    // 🔥 本地计算所需积分（高性能，无API调用）
    const requiredCredits = calculateRequiredCredits(model, resolution, duration)
    const currentBalance = creditsInfo.credits
    const canAfford = hasEnoughCredits(currentBalance, model, resolution, duration)

    // 计算警告级别
    let warningLevel: 'none' | 'low' | 'critical' = 'none'
    if (currentBalance === 0) {
      warningLevel = 'critical'
    } else if (currentBalance < requiredCredits * 2) {
      warningLevel = 'low'
    }

    // 计算可以生成多少个视频
    const remainingJobs = Math.floor(currentBalance / requiredCredits)

    return {
      current_balance: currentBalance,
      required_credits: requiredCredits,
      can_afford: canAfford,  // ✅ 这是关键字段
      warning_level: warningLevel,
      remaining_jobs: remainingJobs
    }
  } catch (err) {
    console.error('Error calculating credits:', err)
    return {
      current_balance: creditsInfo.credits,
      required_credits: 0,
      can_afford: false,  // ❌ 出错默认为不可用
      warning_level: 'critical',
      remaining_jobs: 0
    }
  }
}, [creditsInfo])
```

**关键发现：**
- ✅ 使用本地计算，响应快速
- ⚠️ 依赖 `creditsInfo` 的准确性（如果未及时刷新会有问题）
- ⚠️ 异常处理时默认返回 `can_afford: false`

---

### 2.3 后端积分检查（API 路由层）

#### 三个 API 的处理逻辑完全一致，以 `generate/route.ts` 为例（第 96-139 行）：

```typescript
// 1. 积分检查
const creditsCheck = await checkUserCredits(
  session.user.uuid,
  modelForCredits as any,
  resolution,
  duration
)

if (!creditsCheck.success) {
  console.error('❌ Text-to-Video 积分检查失败:', creditsCheck.error)
  return NextResponse.json(
    {
      error: "Credits verification failed",
      code: "CREDITS_ERROR",
      message: "Unable to verify credits. Please try again later."
    },
    { status: 500 }
  )
}

// 2. 积分不足检查
if (!creditsCheck.canAfford) {
  console.log(`❌ Text-to-Video 积分不足: 需要 ${creditsCheck.requiredCredits}, 用户有 ${creditsCheck.userCredits}`)
  return NextResponse.json(
    {
      error: "Insufficient credits",  // ✅ 这里返回 "Insufficient credits"
      code: "INSUFFICIENT_CREDITS",
      message: `You need ${creditsCheck.requiredCredits} credits but only have ${creditsCheck.userCredits}. Please upgrade your plan.`,
      requiredCredits: creditsCheck.requiredCredits,
      userCredits: creditsCheck.userCredits
    },
    { status: 402 }
  )
}

// 3. 扣除积分
const deductResult = await deductUserCredits(session.user.uuid, creditsCheck.requiredCredits)
if (!deductResult.success) {
  console.error('❌ Text-to-Video 积分扣除失败:', deductResult.error)
  return NextResponse.json(
    {
      error: "Credits deduction failed",
      code: "CREDITS_ERROR",
      message: "Failed to deduct credits. Please try again later."
    },
    { status: 500 }
  )
}
```

**关键发现：**
- ✅ 后端会返回详细的 "Insufficient credits" 错误信息
- ✅ HTTP 状态码为 402（Payment Required）
- ✅ 包含 `requiredCredits` 和 `userCredits` 详细信息

---

### 2.4 服务端积分检查实现（simple-credits-check.ts）

#### `checkUserCredits` 函数（第 26-77 行）

```typescript
export async function checkUserCredits(
  userUuid: string,
  model: VideoModel,
  resolution: string,
  duration: string
): Promise<SimpleCreditCheckResult> {
  try {
    // 计算所需积分
    const requiredCredits = calculateRequiredCredits(model, resolution, duration)

    // 查询用户当前积分（直接查数据库）
    const { data: user, error } = await supabaseAdmin
      .from(TABLES.USERS)
      .select('credits_remaining')
      .eq('uuid', userUuid)
      .single()

    if (error) {
      console.error('❌ Failed to fetch user credits:', error)
      return {
        success: false,
        canAfford: false,
        userCredits: 0,
        requiredCredits,
        remainingCredits: 0,
        error: 'Failed to fetch user credits'
      }
    }

    const userCredits = user?.credits_remaining || 0
    const canAfford = userCredits >= requiredCredits
    const remainingCredits = Math.max(0, userCredits - requiredCredits)

    return {
      success: true,
      canAfford,  // ✅ 关键判断字段
      userCredits,
      requiredCredits,
      remainingCredits
    }
  } catch (error) {
    console.error('❌ Credits check error:', error)
    return {
      success: false,
      canAfford: false,
      userCredits: 0,
      requiredCredits: calculateRequiredCredits(model, resolution, duration),
      remainingCredits: 0,
      error: 'Credits check failed'
    }
  }
}
```

**关键发现：**
- ✅ 直接查询数据库，保证准确性
- ✅ 异常处理完善
- ⚠️ 查询失败时默认返回 `canAfford: false`

---

### 2.5 积分扣除实现（simple-credits-check.ts）

#### `deductUserCredits` 函数（第 85-139 行）

```typescript
export async function deductUserCredits(
  userUuid: string,
  creditsToDeduct: number
): Promise<{ success: boolean; newBalance?: number; error?: string }> {
  try {
    // 1. 先获取当前积分
    const { data: user, error: fetchError } = await supabaseAdmin
      .from(TABLES.USERS)
      .select('credits_remaining')
      .eq('uuid', userUuid)
      .single()

    if (fetchError) {
      console.error('❌ Failed to fetch user credits for deduction:', fetchError)
      return { success: false, error: 'Failed to fetch user credits' }
    }

    const currentCredits = user?.credits_remaining || 0

    // 2. 再次检查积分是否足够（双重保险）
    if (currentCredits < creditsToDeduct) {
      return {
        success: false,
        error: 'Insufficient credits',  // ✅ 这里也有 "Insufficient credits"
        newBalance: currentCredits
      }
    }

    const newBalance = currentCredits - creditsToDeduct

    // 3. 更新用户积分
    const { error: updateError } = await supabaseAdmin
      .from(TABLES.USERS)
      .update({ credits_remaining: newBalance })
      .eq('uuid', userUuid)

    if (updateError) {
      console.error('❌ Failed to update user credits:', updateError)
      return { success: false, error: 'Failed to update credits' }
    }

    console.log(`✅ Successfully deducted ${creditsToDeduct} credits from user ${userUuid}. New balance: ${newBalance}`)

    return {
      success: true,
      newBalance
    }
  } catch (error) {
    console.error('❌ Credits deduction error:', error)
    return {
      success: false,
      error: 'Credits deduction failed'
    }
  }
}
```

**关键发现：**
- ✅ 在扣除前再次检查积分（双重保险）
- ✅ 支持负数扣除（用于恢复积分）
- ⚠️ 有并发风险（未使用数据库事务）

---

## 三、"Insufficient credits" 提示触发路径分析

### 3.1 前端捕获后端错误（use-video-generation.tsx）

#### `generateTextToVideo` 函数（第 90-183 行）

```typescript
const generateTextToVideo = useCallback(async (
  prompt: string,
  settings: {...},
  options?: GenerationOptions
): Promise<string> => {
  // ...

  try {
    // 调用API
    const response = await fetch('/api/video/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({...})
    })

    const data = await response.json()

    if (!response.ok) {
      // 🔥 API失败时，移除已创建的本地job
      videoContext.removeJob(job.id)
      throw new Error(data.error || `HTTP ${response.status}`)  // ⚠️ 这里抛出错误
    }

    // ...
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('VideoGeneration: 文本转视频失败:', errorMessage)

    // 🔥 重置生成状态
    setState(prev => ({ ...prev, isGenerating: false, error: errorMessage }))

    // 🔥 调用onError回调
    hookOptionsRef.current?.onError?.(errorMessage)  // ⚠️ 传递错误给组件

    throw error  // ⚠️ 继续向上抛出
  }
}, [...])
```

**关键发现：**
- ✅ 会捕获后端返回的 "Insufficient credits" 错误
- ✅ 通过 `onError` 回调传递给组件
- ⚠️ 错误信息为 `data.error`，即 "Insufficient credits"（字符串）

---

### 3.2 组件层错误处理

#### 以 `image-to-video-panel.tsx` 为例（第 110-121 行）

```typescript
const videoGeneration = useVideoGeneration({
  onSuccess: (jobId) => {
    console.log('Image-to-video generation started successfully:', jobId)
    startPolling(jobId)
  },
  onError: (error) => {
    console.error('Image-to-video generation failed:', error)
    // ⚠️ 这里只打印日志，没有显示给用户！
  },
  onAuthRequired: () => {
    authModal.showAuthModal()
  }
})
```

**关键发现：**
- ❌ **严重问题**：`onError` 回调只打印日志，**没有设置 `validationErrors` 或显示错误给用户**
- ❌ 这就是为什么用户看不到 "Insufficient credits" 提示的根本原因！

---

### 3.3 错误显示组件

#### 三个面板都有错误显示区域（以 `image-to-video-panel.tsx` 第 428-443 行为例）

```typescript
{(validationErrors.length > 0 || videoGeneration.error) && (
  <Alert className="border-red-800 bg-red-900/20">
    <AlertTriangle className="h-4 w-4" />
    <AlertDescription className="text-red-300">
      {validationErrors.length > 0 ? (
        <ul className="list-disc list-inside space-y-1">
          {validationErrors.map((error, index) => (
            <li key={index}>{error}</li>
          ))}
        </ul>
      ) : (
        videoGeneration.error  // ✅ 这里会显示 Hook 的 error 状态
      )}
    </AlertDescription>
  </Alert>
)}
```

**关键发现：**
- ✅ 组件会显示 `videoGeneration.error`
- ✅ `use-video-generation.tsx` 的确在错误时设置了 `error` 状态（第 176 行）
- ✅ **理论上应该可以显示** "Insufficient credits" 错误

---

## 四、识别的问题总结

### 🔴 问题 1：前端预检失败直接显示升级对话框，缺少具体错误信息

**位置：** `image-to-video-panel.tsx:329-344`, `text-to-video-panel-new.tsx:258-274`, `video-effects-panel.tsx:515-531`

**影响：**
- 用户不知道具体是积分不足还是权限不足
- 无法看到需要多少积分、当前有多少积分

**建议修复：**
```typescript
// 检查积分是否足够
if (!budgetInfo.can_afford) {
  // ✅ 显示具体的积分不足信息，而不是直接弹升级对话框
  setValidationErrors([
    `Insufficient credits. You need ${budgetInfo.required_credits} credits but only have ${budgetInfo.current_balance}.`
  ])
  // 可选：延迟显示升级对话框
  setTimeout(() => setShowUpgradeDialog(true), 3000)
  return
}
```

---

### 🔴 问题 2：前端积分信息可能不同步

**位置：** `use-subscription-simple.ts:96-145`

**问题：**
- 前端缓存的 `creditsInfo` 可能过期
- 用户充值或其他操作后，前端未及时刷新

**当前机制：**
- 监听 `credits-updated` 事件自动刷新（第 212-224 行）
- 视频完成后调用 `refreshCredits()`（第 99-100 行）

**可能的问题：**
- 其他页面充值后，create 页面未刷新
- 同时打开多个标签页的情况

**建议改进：**
```typescript
// 在用户点击生成按钮前，强制刷新一次积分
const handleGenerate = useCallback(async () => {
  // ✅ 强制刷新积分，确保数据最新
  await refreshCredits()

  // 然后再进行检查
  const budgetInfo = await checkCreditsAvailability(...)
  // ...
}, [...])
```

---

### 🔴 问题 3：后端错误未正确传递到前端 UI

**位置：** `image-to-video-panel.tsx:115-117`

**问题：**
- `onError` 回调只打印日志
- 没有调用 `setValidationErrors` 或其他 UI 更新

**证据：**
```typescript
onError: (error) => {
  console.error('Image-to-video generation failed:', error)
  // ❌ 缺少：setValidationErrors([error])
},
```

**建议修复：**
```typescript
const videoGeneration = useVideoGeneration({
  onSuccess: (jobId) => {
    console.log('Image-to-video generation started successfully:', jobId)
    startPolling(jobId)
  },
  onError: (error) => {
    console.error('Image-to-video generation failed:', error)
    // ✅ 显示错误给用户
    setValidationErrors([error])
  },
  onAuthRequired: () => {
    authModal.showAuthModal()
  }
})
```

---

### 🟡 问题 4：积分扣除存在并发风险

**位置：** `simple-credits-check.ts:85-139`

**问题：**
- 分三步操作：查询 → 计算 → 更新
- 如果用户同时发起多个生成请求，可能导致积分被重复扣除或扣除失败

**建议改进：**
使用数据库原子操作（Supabase RPC 函数）：
```sql
CREATE OR REPLACE FUNCTION deduct_credits_atomic(
  p_user_uuid uuid,
  p_credits_to_deduct int
) RETURNS jsonb AS $$
DECLARE
  v_new_balance int;
BEGIN
  -- 原子性更新并返回新余额
  UPDATE users
  SET credits_remaining = credits_remaining - p_credits_to_deduct
  WHERE uuid = p_user_uuid
    AND credits_remaining >= p_credits_to_deduct
  RETURNING credits_remaining INTO v_new_balance;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient credits'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'newBalance', v_new_balance
  );
END;
$$ LANGUAGE plpgsql;
```

---

### 🟢 问题 5：video-effects-panel.tsx 的错误处理不一致

**位置：** `video-effects-panel.tsx:561-569`

**问题：**
```typescript
} catch (error) {
  console.error('视频特效生成失败:', error)
  // ⚠️ 这里判断错误类型来决定显示什么
  if (error instanceof Error && error.message.includes('insufficient') || error.message.includes('credits')) {
    setShowUpgradeDialog(true)  // ❌ 积分不足直接弹升级对话框
  } else {
    setValidationErrors(['视频生成失败，请稍后重试'])  // ❌ 其他错误显示中文
  }
}
```

**问题：**
- 错误信息显示为中文（项目要求英文）
- 积分不足时不显示具体信息

---

## 五、优化建议优先级

### ⭐⭐⭐ 高优先级（必须修复）

1. **修复 `onError` 回调不显示错误的问题**
   - 位置：三个面板的 `useVideoGeneration` 配置
   - 影响：用户完全看不到后端返回的错误信息

2. **统一错误处理逻辑**
   - 确保所有错误都通过 `validationErrors` 显示
   - 移除直接弹升级对话框的逻辑，先显示错误

3. **前端预检失败时显示具体信息**
   - 告诉用户需要多少积分、当前有多少积分
   - 提供明确的下一步操作建议

---

### ⭐⭐ 中优先级（建议修复）

4. **在生成前强制刷新积分**
   - 避免前端缓存过期导致的误判

5. **改进并发控制**
   - 使用数据库原子操作扣除积分
   - 避免竞态条件

6. **统一错误信息语言**
   - 所有错误提示使用英文
   - 保持风格一致

---

### ⭐ 低优先级（可选优化）

7. **添加积分余额实时显示**
   - 在生成按钮旁显示当前积分和所需积分
   - 类似：`Generate Video (Cost: 20 credits, You have: 150)`

8. **优化升级对话框的触发时机**
   - 延迟 3 秒显示，让用户先看到错误信息
   - 或添加"了解详情"按钮，而不是自动弹窗

---

## 六、测试建议

### 测试场景

1. **正常积分不足场景**
   - 用户积分 < 所需积分
   - 预期：显示具体错误信息 + 升级提示

2. **前端缓存过期场景**
   - 在另一标签页充值/消费积分
   - 切换回 create 页面生成视频
   - 预期：自动刷新积分或提示刷新

3. **并发生成场景**
   - 同时点击多个生成按钮
   - 预期：正确扣除积分，不重复扣除

4. **网络异常场景**
   - API 调用失败
   - 预期：显示友好错误信息，不扣积分

---

## 七、代码修复示例

### 修复 1：改进 `onError` 回调

```typescript
// 位置：image-to-video-panel.tsx, text-to-video-panel-new.tsx, video-effects-panel.tsx

const videoGeneration = useVideoGeneration({
  onSuccess: (jobId) => {
    console.log('Generation started successfully:', jobId)
    startPolling(jobId)
  },
  onError: (error) => {
    console.error('Generation failed:', error)

    // ✅ 显示错误给用户
    setValidationErrors([error])

    // ✅ 如果是积分不足，延迟显示升级对话框
    if (error.toLowerCase().includes('insufficient') || error.toLowerCase().includes('credits')) {
      setTimeout(() => {
        setShowUpgradeDialog(true)
      }, 3000)
    }
  },
  onAuthRequired: () => {
    authModal.showAuthModal()
  }
})
```

### 修复 2：前端预检显示具体信息

```typescript
// 位置：三个面板的 handleGenerate 函数

// 检查积分是否足够
if (!budgetInfo.can_afford) {
  // ✅ 显示具体的积分不足信息
  const errorMessage = `Insufficient credits. You need ${budgetInfo.required_credits} credits but only have ${budgetInfo.current_balance}. Please upgrade your plan or purchase more credits.`

  setValidationErrors([errorMessage])

  // ✅ 延迟显示升级对话框，让用户先看到错误
  setTimeout(() => {
    setShowUpgradeDialog(true)
  }, 3000)

  return
}
```

### 修复 3：生成前强制刷新积分

```typescript
// 位置：三个面板的 handleGenerate 函数开头

const handleGenerate = useCallback(async () => {
  // ✅ 强制刷新积分，确保数据最新
  console.log('🔄 Refreshing credits before generation...')
  await refreshCredits()

  // 表单验证
  const errors = validateForm()
  if (errors.length > 0) {
    setValidationErrors(errors)
    return
  }

  // 权限和积分检查
  // ...
}, [validateForm, refreshCredits, ...])
```

---

## 八、总结

### 核心问题

"Insufficient credits" 提示不显示的**根本原因**是：

1. ❌ **前端 `onError` 回调只打印日志，不更新 UI**
2. ⚠️ **前端预检失败时直接弹升级对话框，不显示具体错误**
3. ⚠️ **前端积分缓存可能过期，导致误判**

### 修复路径

1. ✅ 后端已正确返回 "Insufficient credits" 错误（402 状态码）
2. ✅ `use-video-generation.tsx` 已正确捕获错误并设置状态
3. ❌ **组件层未将错误显示给用户** ← 需要修复的地方
4. ⚠️ 前端预检逻辑需要改进，显示具体信息

### 修复后的效果

用户将看到：
```
❌ Insufficient credits. You need 100 credits but only have 50.
   Please upgrade your plan or purchase more credits.

[3 秒后自动显示升级对话框]
```

而不是现在的：
```
[直接弹出升级对话框，没有任何错误提示]
```

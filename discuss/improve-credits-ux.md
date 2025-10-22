# 优化积分不足时的用户体验

## 当前逻辑验证

✅ **按钮逻辑正确**: 积分不足时按钮可以点击
✅ **弹框逻辑正确**: 点击后会弹出升级对话框

## 存在的问题

❌ **缺少明确的错误提示**: 用户不知道需要多少积分、当前有多少积分

## 优化方案

### 方案 1: 弹框前显示错误提示（推荐）⭐⭐⭐

**效果**: 先显示 3 秒错误信息，然后自动弹出升级对话框

**修改位置**: 三个面板的 `handleGenerate` 函数

```typescript
// 检查Credits是否足够
if (!budgetInfo.can_afford) {
  // ✅ 先显示详细的错误信息
  setValidationErrors([
    `Insufficient credits. You need ${budgetInfo.required_credits} credits but only have ${budgetInfo.current_balance}. Please upgrade your plan or purchase more credits.`
  ])

  // ✅ 延迟 3 秒后弹出升级对话框
  setTimeout(() => {
    setShowUpgradeDialog(true)
  }, 3000)

  return
}
```

**用户体验流程**:
1. 用户点击按钮
2. 显示错误提示: "Insufficient credits. You need 20 credits but only have 10..."
3. 3 秒后自动弹出升级对话框
4. 用户可以选择升级

---

### 方案 2: 在升级对话框中显示积分信息 ⭐⭐

**效果**: 升级对话框直接显示积分不足的详细信息

**修改位置**: `UpgradeDialog` 组件

```typescript
// 调用时传递积分信息
<UpgradeDialog
  open={showUpgradeDialog}
  onOpenChange={setShowUpgradeDialog}
  recommendedPlan="pro"
  context="Unlock advanced models and get more credits for video generation"
  // ✅ 新增: 传递积分信息
  creditsInfo={{
    required: budgetInfo?.required_credits,
    current: budgetInfo?.current_balance,
    shortage: (budgetInfo?.required_credits || 0) - (budgetInfo?.current_balance || 0)
  }}
/>
```

然后在 `UpgradeDialog` 中显示:
```typescript
{creditsInfo && (
  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
    <p className="text-red-800 text-sm">
      <AlertTriangle className="inline w-4 h-4 mr-1" />
      You need {creditsInfo.shortage} more credits to generate this video.
    </p>
    <p className="text-gray-600 text-xs mt-1">
      Required: {creditsInfo.required} credits · Current: {creditsInfo.current} credits
    </p>
  </div>
)}
```

---

### 方案 3: 按钮下方实时显示积分状态 ⭐⭐⭐

**效果**: 在按钮下方始终显示积分余额和所需积分

**修改位置**: 生成按钮区域

```typescript
{/* Generate button */}
<div className="space-y-2">
  <Button
    onClick={handleGenerate}
    disabled={...}
    className="..."
  >
    {/* 按钮内容 */}
  </Button>

  {/* ✅ 新增: 积分状态显示 */}
  {budgetPreview && (
    <div className="flex justify-between items-center text-sm px-2">
      <span className="text-gray-400">
        Cost: <span className="text-white font-medium">{budgetPreview.required_credits}</span> credits
      </span>
      <span className={`flex items-center ${
        budgetPreview.can_afford
          ? 'text-green-400'
          : 'text-red-400'
      }`}>
        Balance: <span className="font-medium ml-1">{budgetPreview.current_balance}</span>
        {budgetPreview.can_afford ? (
          <CheckCircle className="w-4 h-4 ml-1" />
        ) : (
          <AlertTriangle className="w-4 h-4 ml-1" />
        )}
      </span>
    </div>
  )}
</div>
```

需要添加状态:
```typescript
const [budgetPreview, setBudgetPreview] = useState<SimpleCreditsBudgetInfo | null>(null)

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
```

---

### 方案 4: 组合方案（最佳体验）⭐⭐⭐⭐⭐

**结合方案 1 + 方案 3**

1. **平时**: 按钮下方实时显示积分状态
2. **积分不足时**:
   - 显示错误提示
   - 3秒后弹出升级对话框
   - 对话框中也显示积分信息

**用户体验**:
```
[正常状态]
┌─────────────────────────────┐
│   Generate Video (20 credits) │
└─────────────────────────────┘
Cost: 20 credits  Balance: 150 ✓

[积分不足状态]
┌─────────────────────────────┐
│   Generate Video (20 credits) │
└─────────────────────────────┘
Cost: 20 credits  Balance: 10 ⚠

[点击后]
⚠ Insufficient credits. You need 20 credits but only have 10.
   Please upgrade your plan or purchase more credits.

[3秒后自动弹出]
┌───────────────────────────────────┐
│  Upgrade Your Plan                │
│                                   │
│  ⚠ You need 10 more credits       │
│     Required: 20 · Current: 10    │
│                                   │
│  [View Plans]  [Buy Credits]      │
└───────────────────────────────────┘
```

---

## 实施建议

### 优先级

1. **高优先级 (立即实施)**:
   - 方案 1: 弹框前显示错误提示
   - 方案 3: 按钮下方显示积分状态

2. **中优先级 (后续优化)**:
   - 方案 2: 优化升级对话框显示

3. **低优先级 (可选)**:
   - 方案 4: 完整组合方案

### 实施步骤

**Step 1**: 修改 `handleGenerate` 函数（所有三个面板）

```typescript
// image-to-video-panel.tsx:335-337
// text-to-video-panel-new.tsx:265-267
// video-effects-panel.tsx:521-523

if (!budgetInfo.can_afford) {
  // ✅ 显示详细错误信息
  setValidationErrors([
    `Insufficient credits. You need ${budgetInfo.required_credits} credits but only have ${budgetInfo.current_balance}. Please upgrade your plan or purchase more credits.`
  ])

  // ✅ 延迟弹出升级对话框
  setTimeout(() => {
    setShowUpgradeDialog(true)
  }, 3000)

  return
}
```

**Step 2**: 添加积分预览状态（可选但推荐）

在每个面板添加:
```typescript
const [budgetPreview, setBudgetPreview] = useState<SimpleCreditsBudgetInfo | null>(null)

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
}, [params.model, params.resolution, params.duration])
```

**Step 3**: 在按钮下方显示积分信息

参考方案 3 的代码

---

## 总结

**当前逻辑**:
- ✅ 按钮可以点击
- ✅ 会弹出升级对话框
- ❌ 缺少具体的错误提示

**优化建议**:
- 先显示错误提示（告诉用户需要多少积分）
- 3秒后弹出升级对话框
- 在按钮下方实时显示积分状态

这样用户体验会更好！

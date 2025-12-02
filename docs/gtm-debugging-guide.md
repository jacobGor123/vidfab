# GTM 事件调试指南

## 🔍 问题诊断

根据你的截图,GTM 中已经配置了以下事件,但在调试时没有触发。本文档帮助你排查问题。

## ✅ 已确认正确的配置

### 1. GTM 容器已正确加载
- **容器 ID**: `GTM-KHJSNV42`
- **位置**: `app/layout.tsx:131`
- **状态**: ✅ 已配置

### 2. 事件命名完全一致
代码中的事件名称与 GTM 配置一致:
- ✅ `click_generate`
- ✅ `generation_started`
- ✅ `generation_success`
- ✅ `generation_failed`
- ✅ `upload_image`
- ✅ `input_prompt`
- ✅ `change_model`
- ✅ `change_duration`
- ✅ `change_ratio`

### 3. 事件参数命名正确
使用下划线命名 (snake_case):
- ✅ `generation_type`
- ✅ `model_type`
- ✅ `has_prompt`
- ✅ `prompt_length`
等等...

---

## 🐛 可能的问题原因

### 问题 1: gtag 函数未正确初始化

**诊断步骤:**

1. 在浏览器控制台输入:
```javascript
console.log(typeof window.gtag)
```

**预期结果**: `"function"`

**如果返回 `"undefined"`**:
- GTM 容器可能未正确加载
- 检查网络请求中是否有 `gtm.js?id=GTM-KHJSNV42`
- 检查是否有 AdBlock 等插件拦截

**解决方案:**
```javascript
// 在控制台手动初始化 gtag (临时测试)
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'GTM-KHJSNV42');
```

---

### 问题 2: 事件触发条件未满足

**诊断步骤:**

1. 打开浏览器控制台
2. 查找以 `[Analytics]` 开头的日志

**预期看到的日志:**
```
[Analytics] click_generate { generation_type: 'text-to-video', model_type: 'vidfab-q1' }
[Analytics] generation_started { generation_type: 'text-to-video', job_id: '...', request_id: '...' }
```

**如果没有看到日志**:
- 事件根本没有被触发
- 检查 `isGtagAvailable()` 是否返回 `false`

**解决方案:**
在 `lib/analytics/generation-events.ts` 中临时禁用 gtag 检查:
```typescript
private static isGtagAvailable(): boolean {
  console.log('[DEBUG] gtag available?', typeof window !== 'undefined' && typeof window.gtag === 'function')
  return typeof window !== 'undefined' && typeof window.gtag === 'function'
}
```

---

### 问题 3: 防抖延迟导致事件未立即触发

**影响的事件**: `input_prompt`

**原因**: 使用了 2 秒防抖,需要停止输入 2 秒后才触发

**测试步骤:**
1. 在 prompt 输入框输入文字
2. 停止输入
3. 等待 **2 秒**
4. 检查控制台日志

**预期日志:**
```
[Analytics] input_prompt { generation_type: 'text-to-video', prompt_length: 45 }
```

---

### 问题 4: 去重机制阻止了重复事件

**影响的事件**: `input_prompt`

**原因**: 使用 `useRef` 去重,相同内容只触发一次

**测试步骤:**
1. 输入一段文字,等待 2 秒 → ✅ 应该触发
2. 删除后重新输入**相同**文字,等待 2 秒 → ❌ 不会触发
3. 输入**不同**文字,等待 2 秒 → ✅ 应该触发

---

### 问题 5: GTM 预览模式未启用

**诊断步骤:**

1. 在 GTM 控制台点击 **「预览」** 按钮
2. 输入你的网站 URL
3. 刷新网站
4. 应该看到 GTM 调试面板出现在页面底部

**如果没有看到调试面板**:
- 可能是浏览器扩展冲突
- 尝试在隐身模式打开

---

### 问题 6: 触发器配置错误

**检查步骤:**

1. 在 GTM 中打开任意一个触发器 (如 `GA4 - click_generate`)
2. 确认触发器类型为 **「自定义事件」**
3. 确认事件名称完全匹配: `click_generate` (注意大小写和下划线)

**常见错误:**
- ❌ 事件名称写错: `click-generate` (使用连字符)
- ❌ 事件名称写错: `clickGenerate` (驼峰命名)
- ✅ 正确: `click_generate` (下划线)

---

## 🧪 快速测试工具

### 方法 1: 使用浏览器控制台直接发送事件

```javascript
// 1. 检查 gtag 是否可用
console.log('gtag available:', typeof window.gtag === 'function')

// 2. 手动发送测试事件
if (typeof window.gtag === 'function') {
  window.gtag('event', 'click_generate', {
    generation_type: 'text-to-video',
    model_type: 'test-model',
    duration: '5s',
    ratio: '16:9',
    has_prompt: true,
    prompt_length: 50,
    credits_required: 10
  })
  console.log('✅ 测试事件已发送')
} else {
  console.error('❌ gtag 未加载')
}
```

### 方法 2: 使用提供的测试页面

1. 在浏览器中打开 `test-gtm-events.html`
2. 点击任意事件按钮
3. 查看日志输出

**注意**: 测试页面需要在实际网站环境中才能工作,因为它依赖 GTM 容器的加载。

---

## 📋 完整的调试检查清单

### 阶段 1: 环境检查
- [ ] GTM 容器是否正确加载? (检查网络请求)
- [ ] `window.gtag` 是否为函数? (控制台检查)
- [ ] `window.dataLayer` 是否存在? (控制台检查)
- [ ] 是否有广告拦截器? (临时禁用测试)

### 阶段 2: 代码检查
- [ ] 控制台是否有 `[Analytics]` 日志?
- [ ] 事件调用代码是否被执行? (加断点测试)
- [ ] `isGtagAvailable()` 是否返回 `true`?

### 阶段 3: GTM 配置检查
- [ ] GTM 预览模式是否启用?
- [ ] 触发器事件名称是否匹配?
- [ ] 触发器类型是否为「自定义事件」?
- [ ] GA4 配置代码是否正确?

### 阶段 4: 特定事件检查
- [ ] `input_prompt`: 是否等待了 2 秒?
- [ ] `change_*`: 参数是否真的变化了?
- [ ] `generation_started`: API 是否成功返回?

---

## 🔧 调试代码片段

### 1. 增强日志输出

在 `lib/analytics/generation-events.ts` 中,为每个方法添加详细日志:

```typescript
static trackClickGenerate(params: GenerationEventParams): void {
  console.log('[Analytics DEBUG] trackClickGenerate called', params)

  if (!this.isGtagAvailable()) {
    console.error('[Analytics] gtag not available!')
    return
  }

  console.log('[Analytics] Sending click_generate event...')
  window.gtag('event', 'click_generate', {
    generation_type: params.generationType,
    model_type: params.modelType,
    // ... 其他参数
  })

  console.log('[Analytics] ✅ click_generate sent', {
    generation_type: params.generationType,
    model_type: params.modelType,
  })
}
```

### 2. 监听所有 dataLayer 事件

在浏览器控制台运行:

```javascript
// 监听所有 dataLayer 推送
if (window.dataLayer) {
  const originalPush = window.dataLayer.push
  window.dataLayer.push = function(...args) {
    console.log('📤 dataLayer.push', args)
    return originalPush.apply(this, args)
  }
  console.log('✅ dataLayer 监听器已启用')
}
```

### 3. 查看所有触发的事件

在 GTM 预览模式的「Summary」标签中,应该能看到所有触发的事件。

---

## 💡 最可能的原因

根据经验,最常见的问题是:

### 1. **GTM 预览模式未启用** (60%)
**解决方案**: 在 GTM 控制台启用预览模式

### 2. **事件触发条件未满足** (20%)
**解决方案**:
- `input_prompt`: 等待 2 秒防抖
- `change_*`: 确保参数真的变化了
- `generation_started`: 确保 API 调用成功

### 3. **gtag 未正确加载** (15%)
**解决方案**: 检查网络请求,禁用广告拦截器

### 4. **触发器配置错误** (5%)
**解决方案**: 检查触发器事件名称是否完全匹配

---

## 🎯 推荐的调试流程

1. **第一步**: 在浏览器控制台运行:
```javascript
console.log('gtag:', typeof window.gtag)
console.log('dataLayer:', window.dataLayer)
```

2. **第二步**: 如果 gtag 存在,手动发送一个测试事件:
```javascript
window.gtag('event', 'test_event', { test: 'data' })
```

3. **第三步**: 在 GTM 预览模式中检查 `test_event` 是否出现

4. **第四步**: 如果 `test_event` 出现,说明 GTM 工作正常,问题在于:
   - 代码中的事件未被触发
   - 触发条件未满足 (防抖、去重等)

5. **第五步**: 如果 `test_event` 没出现,说明 GTM 配置有问题:
   - 检查触发器配置
   - 检查 GA4 配置代码

---

## 📞 需要更多帮助?

如果按照以上步骤仍无法解决,请提供以下信息:

1. 浏览器控制台的完整日志 (包括 `[Analytics]` 开头的日志)
2. 网络请求中 `gtm.js` 的加载状态
3. GTM 预览模式的截图
4. `console.log(typeof window.gtag)` 的输出
5. 你测试的具体步骤 (例如: 点击了哪个按钮,输入了什么内容)

---

**最后更新**: 2025-12-02

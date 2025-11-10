# /Create 代码结构梳理

本目录包含对 `/create` 功能模块的详细分析和文档。

## 文档清单

### 1. CREATE_CODEBASE_STRUCTURE.md (952 行)
**完整的代码结构分析**
- 项目概览和模块说明
- 菜单组件结构（Sidebar + Tabs）
- 图片生成模块详解（Hook、Context、轮询）
- My Assets 资产管理（数据加载、删除、分页）
- Discover 模板和 Remix 功能
- 动画和 UI 交互
- API 端点映射
- 关键类型定义
- 状态管理总结
- 代码行数统计
- 最佳实践和优化建议

### 2. CREATE_QUICK_REFERENCE.md (430 行)
**快速查找和开发指南**
- 文件快速定位表
- 核心流程图（文生图、资产管理、Remix）
- 状态流向说明
- 常见开发任务（添加菜单、修改配置、调试技巧）
- 常见问题排查
- 性能优化点
- 关键 Props 和返回值
- 文件依赖关系

### 3. CREATE_KEY_CODE_SNIPPETS.md (869 行)
**可复用的代码片段**
- 菜单配置示例
- 文生图完整工作流
- 图片轮询生命周期详解
- My Assets 加载和删除流程
- Discover 数据加载和 Remix 逻辑
- Remix Hook 完整实现
- Image-to-Video 接收 Remix 数据
- 状态管理使用示例

---

## 快速导航

### 我想...

**修改菜单**
→ 打开 `CREATE_QUICK_REFERENCE.md` 的"常见开发任务"部分

**理解图片生成流程**
→ 阅读 `CREATE_CODEBASE_STRUCTURE.md` 的"图片生成模块"和"关键 Hooks 详解"

**看完整代码例子**
→ 查看 `CREATE_KEY_CODE_SNIPPETS.md` 的相应部分

**查找某个文件位置**
→ 参考 `CREATE_QUICK_REFERENCE.md` 的"文件快速定位"

**调试轮询问题**
→ 阅读 `CREATE_QUICK_REFERENCE.md` 的"调试技巧"

**优化性能**
→ 参考 `CREATE_CODEBASE_STRUCTURE.md` 的"最佳实践提示"和"性能优化点"

---

## 核心概念速览

### 菜单系统
- **Sidebar**（桌面端）：categories → items 树形结构
- **Tabs**（移动端）：扁平的标签数组
- **Router**：基于 URL 参数 `?tool=xxx` 的页面切换

### 图片生成
```
用户输入 → generateTextToImage() → POST API → startPolling()
  ↓
每2秒轮询一次，直到：
  • 完成：显示图片 + 后台保存数据库
  • 失败：显示错误
  • 超时（5分钟）：停止轮询
```

### 资产管理
- 并行加载：视频和图片列表
- 合并显示：统一的 UnifiedAsset 类型
- 分页：10条/页，可配置
- 删除：确认 → API 调用 → 重新加载 → 刷新配额

### Discover Remix
```
用户点击 Remix → sessionStorage 保存数据（5分钟有效）
  ↓
导航到 Image-to-Video 页面
  ↓
读取 sessionStorage → 下载图片 + 填充 prompt
  ↓
清理 sessionStorage
```

---

## 关键 Hook 速查

| Hook | 位置 | 用途 |
|------|------|------|
| `useImageGenerationManager()` | hooks/ | **推荐使用**：统一的图片生成管理 |
| `useImageGeneration()` | hooks/ | 单次请求（由 Manager 调用） |
| `useImagePolling()` | hooks/ | 轮询和数据库存储 |
| `useImageContext()` | lib/contexts/ | 访问图片任务状态 |
| `useRemix()` | hooks/ | Remix 数据传递 |
| `useVideoContext()` | lib/contexts/ | 视频任务和存储配额 |

---

## API 端点速查

### 图片相关
```
POST /api/image/generate-text-to-image
POST /api/image/generate-image-to-image
GET /api/image/status/{requestId}
POST /api/image/store
POST /api/images/upload
```

### 资产管理
```
GET /api/user/videos?page=X&limit=10
GET /api/user/images?page=X&limit=10
DELETE /api/user/videos/delete
DELETE /api/user/images/delete
```

### Discover
```
GET /api/discover
GET /api/discover/categories
```

---

## 文件组织

```
components/create/
├── 菜单：create-sidebar.tsx, create-tabs.tsx, create-content.tsx
├── 图片生成：
│   └── image/
│       ├── text-to-image-panel.tsx
│       ├── image-to-image-panel.tsx
│       ├── image-task-grid-item.tsx
│       ├── image-preview-dialog.tsx
│       └── ...
├── 资产管理：my-assets.tsx, video-skeleton.tsx
└── Discover：template-gallery.tsx

hooks/
├── use-image-generation.tsx
├── use-image-generation-manager.tsx
├── use-image-polling.ts
└── use-remix.ts

lib/contexts/
├── image-context.tsx
└── video-context.tsx

lib/types/
├── image.ts
└── asset.ts
```

---

## 开发检查清单

实现新功能时：

- [ ] 检查现有类似功能的实现方式
- [ ] 遵循 Hook + Context 的状态管理模式
- [ ] 添加适当的 loading 和 error 状态
- [ ] 实现重试机制（网络请求）
- [ ] 添加 console.log 便于调试
- [ ] 考虑移动端响应式设计
- [ ] 测试边界情况（空数据、超时、错误）
- [ ] 更新相关文档

---

## 常见陷阱

1. **轮询没停止**：忘记调用 `stopPolling()`，导致持续请求
2. **重复触发**：useEffect 依赖数组不完整，导致 Remix 数据重复处理
3. **内存泄漏**：未清理 setTimeout/setInterval
4. **状态不同步**：修改了 context 但忘记更新 UI
5. **分页错误**：总数计算错误，导致分页按钮错位

---

## 下一步

1. **快速开始**：先读 `CREATE_QUICK_REFERENCE.md`
2. **深入理解**：读 `CREATE_CODEBASE_STRUCTURE.md` 相关部分
3. **开始编码**：参考 `CREATE_KEY_CODE_SNIPPETS.md`
4. **遇到问题**：查看"常见问题排查"或"调试技巧"
5. **优化性能**：参考"最佳实践提示"

---

**最后更新**：2025-11-07
**涵盖范围**：图片生成、资产管理、Discover、菜单系统
**文档总行数**：2251 行

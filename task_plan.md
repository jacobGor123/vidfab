# Task Plan: 修复 Video Agent 脚本分析的两个严重 Bug

## Goal
修复 Video Agent 在脚本分析过程中的两个关键 bug：
1. **Bug #1**: 初次分析脚本时只生成 1 个镜头（应该生成多个镜头）
2. **Bug #2**: 重新分析脚本后，分镜图编辑弹框中的人物引用全部消失

## Success Criteria
- [ ] 初次分析脚本能生成正确数量的镜头（多个）
- [ ] 重新分析脚本后，分镜图编辑弹框仍能正常显示人物引用
- [ ] 人物数据在脚本重新分析后保持完整
- [ ] 测试通过：初次分析 → 正常，重新分析 → 正常

## Phases

### Phase 1: 调研与诊断 [complete]
**Goal**: 定位两个 bug 的根本原因

**Tasks**:
- [ ] 查找脚本分析 API 端点（analyze-script）
- [ ] 检查初次分析的镜头生成逻辑
- [ ] 检查重新分析时的数据处理流程
- [ ] 分析人物数据的存储和传递链路
- [ ] 对比初次分析和重新分析的差异

**Files to examine**:
- `/api/video-agent/projects/[id]/analyze-script/route.ts`
- StoryboardEditDialog 相关组件
- 人物数据的 store/state 管理

**Success Criteria**:
- 找到 Bug #1 的根因（为什么只生成 1 个镜头）
- 找到 Bug #2 的根因（为什么重新分析后人物消失）

---

### Phase 2: 修复 Bug #1 - 镜头数量问题 [complete]
**Goal**: 确保初次分析能生成正确数量的镜头

**Tasks**:
- [ ] 检查脚本分析响应的 shots 数组
- [ ] 验证前端是否正确接收和显示所有镜头
- [ ] 检查是否有过滤或截断逻辑
- [ ] 修复镜头生成逻辑
- [ ] 添加日志记录镜头生成过程

**Success Criteria**:
- 初次分析能生成 3+ 个镜头（根据脚本内容）
- 所有镜头都能正确显示在 UI 上

---

### Phase 3: 修复 Bug #2 - 人物引用消失 [complete]
**Goal**: 确保重新分析脚本后人物引用保持可用

**Tasks**:
- [ ] 检查重新分析时的数据更新逻辑
- [ ] 验证人物数据是否被错误清空或覆盖
- [ ] 检查 StoryboardEditDialog 的数据源
- [ ] 修复人物数据持久化逻辑
- [ ] 确保重新分析时保留现有人物数据

**Success Criteria**:
- 重新分析后，人物数据仍然存在
- 分镜图编辑弹框能正常显示所有人物
- 人物引用状态保持一致

---

### Phase 4: 测试与验证 [pending]
**Goal**: 全面测试修复后的功能

**Tasks**:
- [ ] 测试场景 1：初次分析 → 验证镜头数量
- [ ] 测试场景 2：初次分析 → 验证人物引用
- [ ] 测试场景 3：重新分析 → 验证镜头数量
- [ ] 测试场景 4：重新分析 → 验证人物引用
- [ ] 边缘情况测试

**Success Criteria**:
- 所有测试场景通过
- 无回归问题

---

### Phase 5: 提交与部署 [pending]
**Goal**: 提交修复代码并部署

**Tasks**:
- [ ] Build 验证
- [ ] 提交 Git commit（详细说明两个 bug 的修复）
- [ ] 推送到远程仓库

**Success Criteria**:
- Build 成功
- 代码成功推送到 GitLab 和 GitHub

---

## Current Status
**Active Phase**: Phase 5 - 提交与部署
**Blocked**: No
**Last Updated**: 2026-02-11 19:07

---

## Errors Encountered
| Error | Phase | Attempt | Resolution |
|-------|-------|---------|------------|
| (暂无) | - | - | - |

---

## Key Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| 采用文件计划模式 | 系统性分析和修复复杂 bug | 2026-02-11 |

---

## Notes
- 这两个 bug 都与脚本分析流程相关
- 需要特别注意初次分析和重新分析的数据处理差异
- 人物数据的生命周期管理是关键

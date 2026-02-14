# 任务计划：实现脚本解析/创建次数限制权益系统

## 目标
实现基于订阅等级的脚本解析/创建次数限制，包括：
- YouTube 视频分析模式
- 正常创建项目模式
- 每月次数配额管理
- 超额时积分扣除机制

## 权益配置

| 订阅等级 | 免费次数/月 | 超额费用 |
|---------|------------|---------|
| Free    | 5次        | 3积分/次 |
| Lite    | 10次       | 3积分/次 |
| Pro     | 20次       | 3积分/次 |
| Premium | 50次       | 3积分/次 |

## 执行阶段

### Phase 1: 需求分析与代码探索 [completed]
**目标：** 理解现有代码结构，找到关键入口点

**任务：**
- [x] 1.1 找到 YouTube 分析的 API 入口
- [x] 1.2 找到正常创建项目的 API 入口
- [x] 1.3 查看现有订阅系统的实现
- [x] 1.4 查看现有积分系统的实现
- [x] 1.5 了解数据库表结构（users, subscriptions 等）

**输出：** ✅ findings.md 已完成，包含所有关键发现和技术决策

---

### Phase 2: 数据库设计 [completed]
**目标：** 设计月度使用次数跟踪表

**任务：**
- [x] 2.1 设计 `script_creation_usage` 表结构
  - user_id
  - month (YYYY-MM 格式)
  - count (使用次数)
  - created_at
  - updated_at
- [x] 2.2 创建数据库迁移文件
- [x] 2.3 更新 TypeScript 类型定义

**输出：** ✅ 数据库迁移文件已创建
- SQL 文件：`lib/database/migrations/add-script-creation-usage-table.sql`
- 执行脚本：`scripts/run-script-creation-usage-migration.ts`
- TypeScript 类型：`lib/database.types.ts` 已更新
- TABLES 常量：`lib/supabase.ts` 已更新

---

### Phase 3: 核心逻辑实现 [completed]
**目标：** 实现次数检查和扣除逻辑

**任务：**
- [x] 3.1 创建 `lib/video-agent/script-creation-quota.ts`
  - `getMonthlyQuota(tier)` - 获取配额
  - `getCurrentUsage(userId, month)` - 获取当前使用次数
  - `checkAndDeductScriptCreation(userId)` - 检查并扣除
- [x] 3.2 处理免费配额内的情况
- [x] 3.3 处理超额扣积分的情况（3积分/次）
- [x] 3.4 实现月度重置逻辑（自动）

**输出：** ✅ script-creation-quota.ts 已完成
- 配额常量：free=5, lite=10, pro=20, premium=50
- 核心函数：`checkAndDeductScriptCreation(userId)`
- 状态查询：`getScriptCreationQuotaStatus(userId)` 用于前端显示
- 完整的错误处理和日志记录

---

### Phase 4: API 集成 [completed]
**目标：** 在两个入口点集成次数检查

**任务：**
- [x] 4.1 集成到 YouTube 分析 API
  - `app/api/video-agent/analyze-video/route.ts`
  - 调用 `checkAndDeductScriptCreation` 在分析之前
- [x] 4.2 集成到正常创建项目 API
  - `app/api/video-agent/projects/route.ts`
  - 调用 `checkAndDeductScriptCreation` 在创建之前
- [x] 4.3 返回 402 错误（积分不足）触发前端 UpgradeDialog

**输出：** ✅ 修改后的 route.ts 文件
- analyze-video/route.ts: 在 URL 验证后添加配额检查
- projects/route.ts: 在参数验证后添加配额检查
- 统一返回 402 错误，与其他功能保持一致

---

### Phase 5: 前端错误处理 [skipped]
**目标：** 处理配额不足和积分不足的错误

**说明：** 此阶段已在 Phase 4 中完成
- API 统一返回 402 错误
- 前端已配置 UpgradeDialog 显示
- 错误处理与其他功能保持一致

---

### Phase 6: 用户提示优化 [completed]
**目标：** 添加配额使用情况显示

**任务：**
- [x] 6.1 在 InputStage 显示"剩余 X/Y 次免费脚本创建"
- [x] 6.2 在 VideoUploadDialog 显示配额提示
- [x] 6.3 超额时提示"将消耗 3 积分"
- [x] 6.4 添加悬停提示说明规则

**输出：** ✅ UI 组件更新
- 新建 API: `/api/video-agent/quota-status`
- 新建 Hook: `use-script-quota.ts`
- 新建组件: `ScriptQuotaDisplay.tsx`
- 已集成到 InputStage 和 VideoUploadDialog

---

### Phase 7: 测试验证 [pending]
**目标：** 全面测试各种场景

**任务：**
- [ ] 7.1 测试 Free 用户 5 次配额
- [ ] 7.2 测试超额扣积分（3积分/次）
- [ ] 7.3 测试月度重置
- [ ] 7.4 测试不同订阅等级的配额
- [ ] 7.5 测试积分不足场景
- [ ] 7.6 测试前端提示显示

**输出：** 测试报告

---

### Phase 8: 文档更新 [pending]
**目标：** 更新文档说明新权益

**任务：**
- [ ] 8.1 更新订阅计划说明
- [ ] 8.2 添加积分消耗规则文档
- [ ] 8.3 更新 API 文档

**输出：** 文档文件

---

## 关键决策点

1. **错误码选择：**
   - 402: 积分不足
   - 403: 配额超限且积分不足
   - 或统一用 402？

2. **月度重置时机：**
   - 每月1号 00:00 UTC？
   - 还是用户订阅周期？

3. **超额提示方式：**
   - 事前提示（确认弹框）？
   - 事后扣除（直接扣）？

## 风险与注意事项

1. **并发问题：** 多个请求同时检查配额可能导致超额扣除
2. **时区问题：** 月度重置需要统一时区
3. **向后兼容：** 老用户可能已经创建了多个项目
4. **测试数据：** 需要准备测试账号

## 成功标准

- ✅ 各订阅等级配额正确生效
- ✅ 超额时正确扣除 3 积分
- ✅ 积分不足时阻止操作并提示
- ✅ 月度自动重置
- ✅ 前端正确显示配额使用情况
- ✅ 所有错误场景都有友好提示

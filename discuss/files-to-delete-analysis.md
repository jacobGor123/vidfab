# 项目清理分析 - 待删除文件清单

**分析时间**：2025-11-11
**目的**：清理过时、一次性的文档、脚本和测试文件

---

## 📋 待删除文件分类

### 1. 🔧 一次性调试/修复脚本（6个）

这些脚本是为了解决特定的一次性问题而创建的，问题已解决，不再需要。

| 文件 | 大小 | 用途 | 删除理由 |
|------|------|------|---------|
| `scripts/check-all-users.js` | 3.5K | 检查所有用户记录 | 一次性诊断脚本 |
| `scripts/check-foreign-key.js` | 4.0K | 检查外键约束 | 一次性诊断脚本 |
| `scripts/check-users-table-structure.js` | 3.7K | 检查用户表结构 | 一次性诊断脚本 |
| `scripts/check-video-user-ids.js` | 2.8K | 检查视频用户ID | 一次性诊断脚本 |
| `scripts/fix-user-record.js` | 3.1K | 修复用户记录 | 一次性修复脚本 |
| `scripts/create-user-manual.js` | 2.4K | 手动创建用户 | 一次性操作脚本 |

**删除原因**：
- ✅ 问题已解决
- ✅ 不会再次使用
- ✅ 如需类似功能，可从 git 历史恢复

---

### 2. 🗄️ 已应用的数据库迁移 SQL（8个）

这些 SQL 文件是历史数据库迁移脚本，已经应用到生产环境。

| 文件 | 大小 | 用途 | 删除理由 |
|------|------|------|---------|
| `lib/database/migrate-fix-subscription-orders-complete.sql` | 5.4K | 修复订阅订单状态 | 迁移已完成 |
| `lib/database/migrate-add-stripe-subscription-id.sql` | 1.2K | 添加 Stripe ID 字段 | 迁移已完成 |
| `lib/database/migrate-data.sql` | 50K | 大规模数据迁移 | 迁移已完成 |
| `lib/database/fix-supabase-406-constraints.sql` | 1.6K | 修复 Supabase 约束 | 问题已修复 |
| `lib/database/fix-supabase-406-rls.sql` | 2.0K | 修复 RLS 策略 | 问题已修复 |
| `lib/database/fix-subscription-constraint.sql` | 997B | 修复订阅约束 | 问题已修复 |
| `lib/database/fix-subscription-plan-enum.sql` | 1.1K | 修复计划枚举 | 问题已修复 |
| `lib/database/fix-subscription-schema.sql` | 1.7K | 修复订阅表结构 | 问题已修复 |

**删除原因**：
- ✅ 迁移已应用到生产环境
- ✅ 当前表结构已是最新状态
- ✅ 保留在 git 历史中即可
- ⚠️ 如果需要回滚或重新部署，可从 git 历史恢复

**保留的 SQL 文件**：
- ✅ `lib/database/credits-functions.sql` - 当前使用的函数
- ✅ `lib/database/subscription-schema.sql` - 当前使用的表结构
- ✅ `lib/database/user-quota-functions.sql` - 当前使用的函数
- ✅ `lib/database/create-discover-videos-table.sql` - 当前使用的表

---

### 3. 📄 已解决问题的诊断文档（3个）

这些是 401 认证问题的诊断和修复文档，问题已解决。

| 文件 | 大小 | 用途 | 删除理由 |
|------|------|------|---------|
| `discuss/diagnose-401-session-token-issue.md` | 8.1K | 401 问题诊断分析 | 问题已修复 |
| `discuss/fix-production-401-auth-issue.md` | 3.7K | 401 问题修复方案 | 问题已修复 |
| `discuss/test-401-fix-steps.md` | 4.8K | 401 修复测试步骤 | 问题已修复 |

**删除原因**：
- ✅ 401 认证问题已彻底解决
- ✅ 代码已修复并提交
- ✅ 保留在 git 历史中即可追溯

---

### 4. 📝 过时/错误的 README（1个）

| 文件 | 大小 | 用途 | 删除理由 |
|------|------|------|---------|
| `discuss/README.md` | 5.5K | 引导文档 | 引用不存在的文档 |

**内容问题**：
- ❌ 引用了 `CREATE_CODEBASE_STRUCTURE.md`（不存在）
- ❌ 引用了 `CREATE_QUICK_REFERENCE.md`（不存在）
- ❌ 引用了 `CREATE_KEY_CODE_SNIPPETS.md`（不存在）
- ℹ️ 实际文档在 `docs/` 目录下，名称不同

**删除原因**：
- ✅ 引用的文档全部不存在
- ✅ 会误导开发者
- ✅ 可用新的 README 替代（如需要）

---

### 5. 🎯 已完成功能的临时实现文档（2个）

这些是功能实现过程中的分析和总结文档。

| 文件 | 大小 | 用途 | 删除理由 |
|------|------|------|---------|
| `discuss/admin-tasks-add-images-analysis.md` | 19K | Admin Tasks 添加图片分析 | 功能已实现并上线 |
| `discuss/admin-tasks-add-images-implementation-summary.md` | 10K | Admin Tasks 实现总结 | 功能已实现并上线 |

**删除原因**：
- ✅ 功能已完整实现
- ✅ 代码已合并到主分支
- ✅ 临时文档，不需要长期保留
- ⚠️ 如需查看实现过程，可从 git 历史查看

**保留的实现文档**：
- ✅ `discuss/image-to-image-button-implementation.md` - 最新功能的详细方案

---

## 📊 删除统计

| 类别 | 文件数 | 总大小 | 占比 |
|------|--------|--------|------|
| 一次性脚本 | 6 | ~20K | 30% |
| 数据库迁移 SQL | 8 | ~65K | 35% |
| 问题诊断文档 | 3 | ~17K | 15% |
| 过时 README | 1 | ~6K | 5% |
| 临时实现文档 | 2 | ~30K | 15% |
| **总计** | **20** | **~138K** | **100%** |

---

## ⚠️ 保留的重要文件

### Scripts（保留）
- ✅ `scripts/build.sh` - 构建脚本
- ✅ `scripts/dev.sh` - 开发启动脚本
- ✅ `scripts/start.sh` - 生产启动脚本
- ✅ `scripts/install.sh` - 安装脚本
- ✅ `scripts/clean.sh` - 清理脚本
- ✅ `scripts/lint.sh` - 代码检查脚本
- ✅ `scripts/docker-*.sh` - Docker 相关脚本
- ✅ `scripts/redis-*.sh` - Redis 相关脚本
- ✅ `scripts/setup-*.sh` - 数据库设置脚本
- ✅ `scripts/init-*.sql` - 数据库初始化 SQL

### SQL（保留）
- ✅ `lib/database/credits-functions.sql` - 积分函数（当前使用）
- ✅ `lib/database/subscription-schema.sql` - 订阅表结构（当前使用）
- ✅ `lib/database/user-quota-functions.sql` - 配额函数（当前使用）
- ✅ `lib/database/create-discover-videos-table.sql` - Discover 表（当前使用）
- ✅ `lib/database-schema.sql` - 主数据库结构（当前使用）

### Docs（保留）
- ✅ `docs/create-route-ai-image-exploration.md` - AI Image 功能文档
- ✅ `docs/image-feature-quick-reference.md` - 快速参考
- ✅ `docs/README-image-features.md` - 文档导航
- ✅ `docs/gtm-ga4-events-configuration.md` - GA4 配置
- ✅ `docs/admin-tasks-quick-reference.md` - Admin 快速参考
- ✅ `docs/admin-tasks-module-overview.md` - Admin 模块概览
- ✅ `docs/video-cdn-integration.md` - CDN 集成文档

### Discuss（保留）
- ✅ `discuss/image-to-image-button-implementation.md` - 最新功能实现方案

---

## 🎯 建议的删除命令

```bash
# 1. 删除一次性脚本
rm scripts/check-all-users.js
rm scripts/check-foreign-key.js
rm scripts/check-users-table-structure.js
rm scripts/check-video-user-ids.js
rm scripts/fix-user-record.js
rm scripts/create-user-manual.js

# 2. 删除已应用的迁移 SQL
rm lib/database/migrate-fix-subscription-orders-complete.sql
rm lib/database/migrate-add-stripe-subscription-id.sql
rm lib/database/migrate-data.sql
rm lib/database/fix-supabase-406-constraints.sql
rm lib/database/fix-supabase-406-rls.sql
rm lib/database/fix-subscription-constraint.sql
rm lib/database/fix-subscription-plan-enum.sql
rm lib/database/fix-subscription-schema.sql

# 3. 删除已解决问题的文档
rm discuss/diagnose-401-session-token-issue.md
rm discuss/fix-production-401-auth-issue.md
rm discuss/test-401-fix-steps.md

# 4. 删除过时的 README
rm discuss/README.md

# 5. 删除临时实现文档
rm discuss/admin-tasks-add-images-analysis.md
rm discuss/admin-tasks-add-images-implementation-summary.md
```

---

## ✅ 删除后的好处

1. **减少仓库大小**：清理 ~138K 的过时文件
2. **避免混淆**：移除过时文档，防止误导新开发者
3. **保持简洁**：只保留当前需要的文件
4. **Git 历史完整**：所有文件仍可通过 git 历史访问

---

## 🔄 如需恢复

所有文件删除前都已提交到 Git，如需恢复：

```bash
# 查看某个文件的历史
git log -- <file_path>

# 恢复某个文件
git checkout <commit_hash> -- <file_path>
```

---

**分析完成！请确认后执行删除。**

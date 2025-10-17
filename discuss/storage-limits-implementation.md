# VidFab 存储限制功能实现文档

## 概述

本文档说明了 VidFab AI 视频平台的存储限制功能实现，包括订阅用户 1GB 和普通用户 100MB 的配额管理，以及自动删除旧视频的功能。

## 功能特性

### 1. 存储配额管理
- **免费用户**: 100MB 存储限制
- **订阅用户**: 1GB 存储限制
- **动态配额检查**: 根据用户订阅状态自动调整存储限制
- **精确计算**: 使用精确的字节转换确保计算准确性

### 2. 自动清理功能
- **智能删除**: 优先删除最旧的非收藏视频
- **存储监控**: 当用户存储超限时自动触发清理
- **保护机制**: 收藏的视频不会被自动删除

### 3. 用户界面增强
- **存储状态显示**: 实时显示存储使用量和百分比
- **警告系统**: 当存储使用量超过 80% 时显示警告
- **手动清理**: 用户可以手动触发存储清理
- **升级提示**: 为免费用户提供升级到 Pro 的建议

## 文件结构

```
/Users/jacob/Desktop/vidfab/
├── scripts/
│   ├── update-storage-quota.sql      # 数据库配额更新脚本
│   └── test-storage-limits.js        # 存储限制测试脚本
├── lib/
│   ├── utils/
│   │   └── storage-helpers.ts        # 存储工具函数
│   ├── database/
│   │   └── user-videos.ts           # 用户视频数据库操作（已更新）
│   ├── contexts/
│   │   └── video-context.tsx        # 视频上下文（已增强）
│   └── supabase.ts                  # Supabase 类型定义（已更新）
├── components/
│   └── create/
│       └── my-assets.tsx            # 我的资产组件（已增强）
└── tests/
    └── storage-limits.test.ts       # 完整测试套件
```

## 部署步骤

### 1. 数据库更新

首先在 Supabase SQL 编辑器中运行配额更新脚本：

```sql
-- 运行此文件更新存储配额设置
-- /Users/jacob/Desktop/vidfab/scripts/update-storage-quota.sql
```

这个脚本会：
- 更新默认存储配额（免费用户 100MB，订阅用户 1GB）
- 创建自动删除旧视频的函数
- 增强配额管理触发器
- 添加手动清理功能

### 2. 前端代码部署

确保以下文件已正确部署：

```bash
# 新增文件
lib/utils/storage-helpers.ts

# 更新的文件
lib/database/user-videos.ts
lib/contexts/video-context.tsx
lib/supabase.ts
components/create/my-assets.tsx
```

### 3. 验证部署

运行测试脚本验证功能：

```bash
node scripts/test-storage-limits.js
```

应该看到所有测试通过的输出。

## 功能验证

### 数据库级别验证

```sql
-- 检查用户配额
SELECT * FROM get_user_quota('用户UUID');

-- 手动清理测试
SELECT * FROM manual_cleanup_user_storage('用户UUID');

-- 检查用户是否为订阅用户
SELECT is_user_subscribed('用户UUID');
```

### 前端功能验证

1. **存储显示**: 在 my-assets 页面查看存储使用情况
2. **警告系统**: 当存储使用量超过 80% 时应显示警告横幅
3. **手动清理**: 点击"自动清理"按钮应该删除旧视频
4. **升级提示**: 免费用户应该看到升级到 Pro 的建议

## 配置参数

### 存储限制配置

```typescript
// 在 storage-helpers.ts 中定义
static readonly FREE_USER_LIMIT_MB = 100        // 免费用户限制
static readonly SUBSCRIBED_USER_LIMIT_MB = 1024 // 订阅用户限制
```

### 警告阈值

```typescript
// 存储使用量警告阈值
const WARNING_THRESHOLD = 80  // 80% 显示警告
const CRITICAL_THRESHOLD = 95 // 95% 显示严重警告
```

### 自动清理配置

```sql
-- 在数据库函数中配置
-- 清理时保留的缓冲空间百分比
buffer_percentage := 10  -- 保留 10% 缓冲空间
```

## API 接口

### 新增的 VideoContext 方法

```typescript
// 手动清理存储空间
cleanupUserStorage(targetSizeMB?: number): Promise<{
  deletedVideos: number
  freedSizeMB: number
  remainingSizeMB: number
}>

// 检查存储状态
checkStorageStatus(): Promise<boolean>
```

### 新增的 UserVideosDB 方法

```typescript
// 手动清理用户存储
static cleanupUserStorage(userId: string, targetSizeMB?: number)

// 检查存储是否超限
static isStorageExceeded(userId: string): Promise<boolean>
```

## 数据库函数

### 主要新增函数

1. **`is_user_subscribed(user_uuid)`**: 检查用户订阅状态
2. **`get_user_storage_limit(user_uuid)`**: 获取用户存储限制
3. **`auto_delete_old_videos(user_uuid)`**: 自动删除旧视频
4. **`manual_cleanup_user_storage(user_uuid, target_size_mb)`**: 手动清理存储

### 触发器增强

- **`update_user_quota_with_auto_cleanup()`**: 增强的配额更新函数，包含自动清理逻辑

## 监控和日志

### 自动清理日志

数据库函数会输出详细的清理日志：

```sql
RAISE NOTICE '用户 % 存储超限: %MB / %MB，开始自动删除旧视频'
RAISE NOTICE '删除视频: % (大小: %MB, 创建时间: %)'
RAISE NOTICE '自动删除完成: 删除了 % 个视频，释放了 %MB 存储空间'
```

### 前端日志

VideoContext 会记录存储操作：

```javascript
console.log('🎬 Starting video storage for user:', userId)
console.log('✅ Video storage completed for user:', userId)
console.error('Failed to cleanup user storage:', error)
```

## 性能考虑

### 数据库优化

- 索引优化：在 `user_id`, `created_at`, `is_favorite` 字段上创建复合索引
- 查询优化：使用 `ORDER BY created_at ASC` 确保删除最旧的视频

### 前端优化

- 缓存：配额信息在 VideoContext 中缓存
- 懒加载：存储状态检查只在需要时执行
- 防抖：避免频繁的配额查询

## 错误处理

### 数据库错误

- 自动清理失败时记录错误但不阻止操作
- 配额查询失败时返回默认值
- 触发器失败时继续执行其他操作

### 前端错误

- 网络错误时显示用户友好的错误消息
- 清理失败时提供重试选项
- 配额查询失败时使用缓存数据

## 未来扩展

### 计划中的功能

1. **批量操作**: 批量删除多个视频
2. **存储分析**: 详细的存储使用分析报告
3. **自定义规则**: 用户自定义自动清理规则
4. **云存储**: 集成第三方云存储服务

### 扩展点

- 存储提供商抽象：支持多种存储后端
- 配额策略：支持更复杂的配额策略
- 通知系统：存储状态变化通知

## 测试覆盖

### 单元测试

- 存储工具函数测试（`storage-limits.test.ts`）
- 字节转换准确性测试
- 配额计算逻辑测试

### 集成测试

- 端到端存储限制测试（`test-storage-limits.js`）
- 数据库触发器测试
- 用户界面交互测试

### 场景测试

- 免费用户达到限制场景
- 订阅用户大文件上传场景
- 自动清理触发场景

## 维护建议

### 定期检查

1. **存储使用监控**: 定期检查用户存储使用情况
2. **自动清理效果**: 监控自动清理功能的效果
3. **性能指标**: 监控存储操作的性能

### 数据清理

```sql
-- 定期清理软删除的视频记录（30天后）
DELETE FROM user_videos
WHERE status = 'deleted'
AND updated_at < NOW() - INTERVAL '30 days';
```

### 备份策略

- 定期备份用户配额数据
- 重要视频文件的备份策略
- 配额历史记录的保留

## 故障排除

### 常见问题

1. **配额显示不准确**: 检查 `get_user_quota` 函数和触发器
2. **自动清理不工作**: 验证触发器是否正确安装
3. **存储计算错误**: 检查字节转换函数的精度

### 调试命令

```sql
-- 检查用户配额状态
SELECT * FROM user_storage_quotas WHERE user_id = '用户UUID';

-- 查看用户视频列表
SELECT id, prompt, file_size, status, created_at, is_favorite
FROM user_videos
WHERE user_id = '用户UUID'
ORDER BY created_at DESC;

-- 测试自动清理
SELECT auto_delete_old_videos('用户UUID');
```

## 联系支持

如果在部署或使用过程中遇到问题，请：

1. 检查日志输出是否有错误信息
2. 运行测试脚本验证功能
3. 查看数据库函数执行结果
4. 联系技术团队寻求支持

---

**文档版本**: 1.0
**最后更新**: 2025-09-19
**作者**: Claude Code Assistant
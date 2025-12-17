# Video Agent 数据库 Schema 执行指南

**执行日期:** 2025-12-09
**数据库:** Supabase PostgreSQL
**执行人:** [你的名字]

---

## 🚨 执行前检查清单

### 1. 确认 Supabase 项目信息

```bash
# 确认你的 Supabase 项目 URL
echo $NEXT_PUBLIC_SUPABASE_URL

# 确认你有 Service Role Key (用于数据库操作)
echo $SUPABASE_SERVICE_ROLE_KEY
```

### 2. 登录 Supabase Dashboard

1. 打开浏览器访问: https://supabase.com/dashboard
2. 选择你的项目 (VidFab)
3. 点击左侧菜单 **SQL Editor**

### 3. 备份现有数据库 (重要!)

```sql
-- 在 SQL Editor 中执行以下命令查看现有表
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- 如果有重要数据,请先导出备份
```

---

## 📝 执行步骤

### Step 1: 验证依赖 (5 分钟)

#### 1.1 检查 users 表是否存在

```sql
-- 在 Supabase SQL Editor 中执行
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users';
```

**预期结果:**
应该看到包含以下字段:
- `uuid` (UUID) - ✅ 必需
- `subscription_plan` (VARCHAR or TEXT) - ⚠️ 如果缺失,需要添加或修改 `can_user_create_project` 函数

**如果 subscription_plan 字段不存在:**

```sql
-- 添加 subscription_plan 字段 (如果需要)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(20) DEFAULT 'free';
```

#### 1.2 检查 update_updated_at_column() 函数

```sql
-- 查询函数是否存在
SELECT routine_name
FROM information_schema.routines
WHERE routine_name = 'update_updated_at_column'
AND routine_schema = 'public';
```

**如果函数不存在,先创建:**

```sql
-- 创建 updated_at 自动更新触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

### Step 2: 执行主 Schema 文件 (10 分钟)

#### 2.1 打开 SQL 文件

在 Supabase SQL Editor 中:
1. 点击 **New query**
2. 复制粘贴 `/lib/database/video-agent-schema.sql` 的全部内容
3. 点击 **Run** 按钮

#### 2.2 观察执行结果

**成功标志:**
```
Success. No rows returned
```

**如果出现错误:**
- 检查错误信息中的行号
- 根据错误类型修复 (见下方常见错误)

---

### Step 3: 验证表创建 (5 分钟)

```sql
-- 验证所有表是否创建成功
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND (
  table_name LIKE 'video_agent%'
  OR table_name LIKE 'project_%'
  OR table_name LIKE 'shot_%'
  OR table_name LIKE 'character_%'
)
ORDER BY table_name;
```

**预期结果 (应该看到 7 个表):**
```
character_reference_images
project_characters
project_shots
project_storyboards
project_video_clips
shot_characters
video_agent_projects
```

---

### Step 4: 验证索引和约束 (3 分钟)

```sql
-- 检查索引
SELECT
  tablename,
  indexname
FROM pg_indexes
WHERE tablename LIKE 'video_agent%'
   OR tablename LIKE 'project_%'
   OR tablename LIKE 'shot_%'
   OR tablename LIKE 'character_%'
ORDER BY tablename, indexname;
```

**预期结果:** 应该看到:
- `idx_video_agent_projects_user_status`
- `idx_video_agent_projects_created_at`
- `idx_project_characters_project_id`
- `idx_character_reference_images_character_id`
- `idx_project_shots_project_id`
- `idx_project_storyboards_project_id`
- `idx_project_storyboards_status`
- `idx_project_storyboards_task_id`
- `idx_project_video_clips_project_id`
- `idx_project_video_clips_status`
- `idx_project_video_clips_task_id`
- `idx_shot_characters_shot_id`
- `idx_shot_characters_character_id`

---

### Step 5: 验证 RLS 策略 (3 分钟)

```sql
-- 检查 RLS 是否启用
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND (
  tablename LIKE 'video_agent%'
  OR tablename LIKE 'project_%'
  OR tablename LIKE 'shot_%'
  OR tablename LIKE 'character_%'
);
```

**预期结果:** 所有表的 `rowsecurity` 都应该是 `true`

```sql
-- 检查 RLS 策略
SELECT
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
AND (
  tablename LIKE 'video_agent%'
  OR tablename LIKE 'project_%'
  OR tablename LIKE 'shot_%'
  OR tablename LIKE 'character_%'
)
ORDER BY tablename;
```

**预期结果:** 应该看到 7 个策略 (每个表一个)

---

### Step 6: 测试 Helper Functions (5 分钟)

#### 6.1 测试 get_project_stats()

```sql
-- 创建一个测试项目 (先获取你的 user_id)
SELECT uuid FROM users LIMIT 1;

-- 使用你的 user_id 创建测试项目
INSERT INTO video_agent_projects (
  user_id,
  duration,
  story_style,
  original_script
) VALUES (
  'YOUR_USER_UUID_HERE',  -- 替换为你的 user_id
  45,
  'auto',
  'Test script'
) RETURNING id;

-- 使用返回的 project_id 测试函数
SELECT get_project_stats('YOUR_PROJECT_ID_HERE');
```

**预期结果:** 返回 JSON 对象
```json
{
  "total_shots": 0,
  "completed_storyboards": 0,
  "completed_videos": 0,
  "failed_storyboards": 0,
  "failed_videos": 0,
  "total_characters": 0,
  "regenerate_quota_remaining": 3,
  "current_step": 0,
  "status": "draft"
}
```

#### 6.2 测试 deduct_regenerate_quota()

```sql
-- 使用上一步的 project_id
SELECT deduct_regenerate_quota('YOUR_PROJECT_ID_HERE');

-- 验证配额是否减少
SELECT regenerate_quota_remaining
FROM video_agent_projects
WHERE id = 'YOUR_PROJECT_ID_HERE';
```

**预期结果:** `regenerate_quota_remaining` 应该变成 2

#### 6.3 测试 can_user_create_project()

```sql
SELECT can_user_create_project('YOUR_USER_UUID_HERE');
```

**预期结果:** 返回 `true` 或 `false`

---

### Step 7: 清理测试数据 (2 分钟)

```sql
-- 删除测试项目
DELETE FROM video_agent_projects
WHERE id = 'YOUR_PROJECT_ID_HERE';

-- 验证删除成功
SELECT COUNT(*) FROM video_agent_projects
WHERE id = 'YOUR_PROJECT_ID_HERE';
```

**预期结果:** 返回 0

---

## ⚠️ 常见错误处理

### 错误 1: "function update_updated_at_column() does not exist"

**解决方案:**
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 错误 2: "column users.subscription_plan does not exist"

**解决方案 A (推荐):** 添加字段
```sql
ALTER TABLE users
ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(20) DEFAULT 'free';
```

**解决方案 B:** 修改 `can_user_create_project` 函数
```sql
-- 如果你的 users 表使用不同的字段名,修改函数
CREATE OR REPLACE FUNCTION can_user_create_project(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  project_count INT;
BEGIN
  SELECT COUNT(*) INTO project_count
  FROM video_agent_projects
  WHERE user_id = p_user_id
  AND status IN ('draft', 'processing');

  -- 简化版本: 所有用户最多 10 个进行中项目
  RETURN project_count < 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 错误 3: "relation 'users' does not exist"

**问题:** users 表不存在

**解决方案:** 检查你的数据库中 users 表的实际名称
```sql
-- 查找用户表
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE '%user%';
```

如果表名不同(例如 `auth_users`),需要修改 schema 文件中的外键引用。

---

## ✅ 执行完成检查清单

完成后,确认以下所有项:

- [ ] 7 个表全部创建成功
- [ ] 所有索引创建成功 (至少 13 个)
- [ ] 所有表的 RLS 已启用
- [ ] 7 个 RLS 策略全部创建
- [ ] 3 个 Trigger 创建成功
- [ ] 3 个 Helper Function 可以正常调用
- [ ] 测试数据已清理

---

## 📊 预期执行时间

| 步骤 | 预计时间 |
|------|---------|
| Step 1: 验证依赖 | 5 分钟 |
| Step 2: 执行主 Schema | 10 分钟 |
| Step 3: 验证表创建 | 5 分钟 |
| Step 4: 验证索引约束 | 3 分钟 |
| Step 5: 验证 RLS | 3 分钟 |
| Step 6: 测试函数 | 5 分钟 |
| Step 7: 清理 | 2 分钟 |
| **总计** | **33 分钟** |

---

## 🚀 下一步

执行完 Schema 后,继续完成:

1. ✅ 配置环境变量 (`KIE_API_KEY`)
2. ⚠️ 联系 BytePlus 确认 Seedream 4.5 发布时间
3. ⚠️ 测试 `cameraFixed=true` 参数效果
4. ⚠️ 测试 GPT-OSS-120B JSON 输出

参考: `/discuss/Video-Agent-快速开始指南.md`

---

**文档版本:** v1.0
**最后更新:** 2025-12-09

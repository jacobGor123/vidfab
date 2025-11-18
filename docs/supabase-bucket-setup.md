# Supabase Storage Bucket 初始化指南

## 📋 问题描述

如果你在使用 Image-to-Video 功能时遇到以下错误：
- `Storage attempt 4 failed: Unknown error`
- `Failed to upload image`
- HTTP 500 错误

**最可能的原因是：`user-images` bucket 尚未在 Supabase 中创建。**

---

## ✅ 解决方案：初始化 Supabase Storage Bucket

### 方法 1：使用 SQL 编辑器（推荐）

1. **登录 Supabase Dashboard**
   - 访问：https://app.supabase.com/
   - 选择你的项目：`ycahbhhuzgixfrljtqmi`

2. **打开 SQL 编辑器**
   - 在左侧菜单中点击 "SQL Editor"
   - 点击 "New Query"

3. **执行初始化 SQL**
   - 复制 `scripts/init-image-storage.sql` 文件的全部内容
   - 粘贴到 SQL 编辑器中
   - 点击 "Run" 执行

4. **验证执行结果**
   - 检查是否有错误信息
   - 如果看到 "Success. No rows returned" 或类似提示，说明执行成功

### 方法 2：使用命令行脚本

1. **设置环境变量**
   ```bash
   export SUPABASE_URL="https://ycahbhhuzgixfrljtqmi.supabase.co"
   export SUPABASE_SERVICE_ROLE_KEY="eyJhbGc..."  # 从 .env.local 获取
   ```

2. **运行初始化脚本**
   ```bash
   chmod +x scripts/setup-image-storage.sh
   ./scripts/setup-image-storage.sh
   ```

3. **查看输出**
   - 如果看到 "✅ user-images bucket 创建成功"，说明初始化完成
   - 如果看到警告，按照提示手动创建 bucket

### 方法 3：手动创建 Bucket

如果上述方法都失败，可以手动创建：

1. **打开 Supabase Dashboard**
   - 访问：https://app.supabase.com/project/ycahbhhuzgixfrljtqmi

2. **进入 Storage 页面**
   - 在左侧菜单中点击 "Storage"
   - 点击 "New bucket"

3. **配置 Bucket**
   - **Name**: `user-images`
   - **Public bucket**: ✅ 勾选
   - **File size limit**: `10485760` (10MB)
   - **Allowed MIME types**: 添加以下类型
     - `image/jpeg`
     - `image/jpg`
     - `image/png`
     - `image/webp`

4. **创建 RLS 策略**

   进入 SQL 编辑器，执行以下 SQL：

   ```sql
   -- 用户图片查看权限
   INSERT INTO storage.policies (id, bucket_id, command, definition, roles)
   VALUES (
     'user-images-select-policy',
     'user-images',
     'SELECT',
     'bucket_id = ''user-images'' AND auth.uid()::text = (storage.foldername(name))[1]',
     '{authenticated}'
   ) ON CONFLICT (id) DO UPDATE SET definition = EXCLUDED.definition;

   -- 用户图片上传权限
   INSERT INTO storage.policies (id, bucket_id, command, definition, roles)
   VALUES (
     'user-images-insert-policy',
     'user-images',
     'INSERT',
     'bucket_id = ''user-images'' AND auth.uid()::text = (storage.foldername(name))[1]',
     '{authenticated}'
   ) ON CONFLICT (id) DO UPDATE SET definition = EXCLUDED.definition;

   -- 用户图片更新权限
   INSERT INTO storage.policies (id, bucket_id, command, definition, roles)
   VALUES (
     'user-images-update-policy',
     'user-images',
     'UPDATE',
     'bucket_id = ''user-images'' AND auth.uid()::text = (storage.foldername(name))[1]',
     '{authenticated}'
   ) ON CONFLICT (id) DO UPDATE SET definition = EXCLUDED.definition;

   -- 用户图片删除权限
   INSERT INTO storage.policies (id, bucket_id, command, definition, roles)
   VALUES (
     'user-images-delete-policy',
     'user-images',
     'DELETE',
     'bucket_id = ''user-images'' AND auth.uid()::text = (storage.foldername(name))[1]',
     '{authenticated}'
   ) ON CONFLICT (id) DO UPDATE SET definition = EXCLUDED.definition;
   ```

---

## 🔍 验证 Bucket 是否创建成功

### 方法 1：通过 Dashboard 验证

1. 访问：https://app.supabase.com/project/ycahbhhuzgixfrljtqmi/storage/buckets
2. 检查是否能看到 `user-images` bucket
3. 点击进入，确认配置正确

### 方法 2：通过 API 验证

```bash
curl -X GET \
  "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/bucket/user-images" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "apikey: YOUR_SERVICE_ROLE_KEY"
```

如果返回 bucket 信息（而不是 404），说明创建成功。

### 方法 3：通过测试上传验证

1. 重新启动开发服务器
2. 登录应用
3. 进入 `/create?tool=image-to-video`
4. 尝试上传一张图片
5. 检查浏览器控制台是否有错误

---

## 📝 相关文件

- **SQL 初始化脚本**: `scripts/init-image-storage.sql`
- **Shell 初始化脚本**: `scripts/setup-image-storage.sh`
- **Storage 配置**: `lib/storage.ts`
- **图片上传 Hook**: `components/create/hooks/use-image-upload.ts`
- **图片上传 API**: `app/api/images/upload/route.ts`

---

## ❓ 常见问题

### Q: 执行 SQL 时出现权限错误
**A**: 确保使用的是 `service_role` key，而不是 `anon` key。service_role key 在 `.env.local` 文件中定义。

### Q: Bucket 创建成功，但上传仍然失败
**A**: 检查以下几点：
1. RLS 策略是否正确配置
2. 用户是否已登录（`auth.uid()` 需要认证用户）
3. 检查浏览器控制台的详细错误信息
4. 检查服务器日志（`npm run dev` 的输出）

### Q: 如何检查 RLS 策略是否生效？
**A**: 进入 Supabase Dashboard → Storage → user-images → Policies，检查是否有 4 个策略：
- `user-images-select-policy`
- `user-images-insert-policy`
- `user-images-update-policy`
- `user-images-delete-policy`

---

## 🚨 紧急修复步骤（生产环境）

如果生产环境出现问题，按照以下步骤快速修复：

1. **立即执行 SQL**
   ```bash
   # 使用 psql 连接到生产数据库
   psql "postgresql://postgres:[PASSWORD]@db.ycahbhhuzgixfrljtqmi.supabase.co:5432/postgres"

   # 执行初始化脚本
   \i scripts/init-image-storage.sql
   ```

2. **验证**
   - 检查 Supabase Dashboard
   - 测试图片上传功能
   - 监控错误日志

3. **回滚方案**（如果出现问题）
   ```sql
   -- 删除 bucket
   DELETE FROM storage.buckets WHERE id = 'user-images';

   -- 删除所有相关策略
   DELETE FROM storage.policies WHERE bucket_id = 'user-images';
   ```

---

## 📞 需要帮助？

如果以上方法都无法解决问题，请：
1. 检查浏览器控制台的完整错误信息
2. 检查服务器日志（包括 Supabase 日志）
3. 提供错误截图和日志
4. 联系开发团队

---

**最后更新**: 2025-01-18
**维护者**: VidFab 开发团队

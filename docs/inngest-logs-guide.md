# Inngest 执行日志查看指南

## 🔍 如何查看博客生成任务的执行日志

### 方法一：Inngest Dashboard（推荐）

**步骤 1: 访问 Inngest Dashboard**
- 访问: https://www.inngest.com/dashboard
- 使用你的 Inngest 账号登录

**步骤 2: 查看 Runs（执行记录）**
1. 在左侧菜单点击 **"Runs"**
2. 你会看到所有任务的执行记录列表
3. 找到 **"Generate and Publish Blog Article"** 的执行记录

**步骤 3: 查看详细日志**
1. 点击任意一条执行记录
2. 你会看到完整的执行流程：
   - ✅ **select-topic**: AI 选题阶段
   - ✅ **create-draft-placeholder**: 创建草稿占位
   - ✅ **generate-content**: 生成文章内容
   - ✅ **publish-article**: 发布文章
   - ✅ **revalidate-cache**: 重新验证缓存
   - ✅ **send-success-notification**: 发送成功邮件

3. 点击每个 Step，可以查看：
   - **Input**: 输入参数
   - **Output**: 输出结果
   - **Logs**: 该步骤的日志

**步骤 4: 查看失败原因（如果任务失败）**
- 失败的 Step 会标记为红色 ❌
- 点击该 Step 可以看到完整的错误信息和堆栈跟踪

---

### 方法二：Vercel Dashboard 日志

**步骤 1: 访问 Vercel Dashboard**
- 访问: https://vercel.com/
- 进入你的项目 **vidfab**

**步骤 2: 查看 Cron Job 日志**
1. 点击顶部菜单的 **"Cron Jobs"**
2. 找到 **"generate-blog"** 任务
3. 点击任意一条执行记录，查看日志

**注意**: Vercel 日志只显示 Cron 端点 (`/api/cron/generate-blog`) 的执行情况，不包含 Inngest 函数内部的详细日志。

---

### 方法三：Vercel Runtime 日志

**步骤 1: 查看 Function 日志**
1. 在 Vercel Dashboard 点击 **"Logs"**
2. 选择 **"Functions"** 标签
3. 找到以下函数的日志：
   - `/api/cron/generate-blog`
   - `/api/inngest`

**步骤 2: 过滤日志**
使用搜索框过滤关键词：
- `Blog generation` - 博客生成相关
- `Topic selected` - 选题信息
- `Content generated` - 内容生成
- `Article published` - 发布成功
- `Blog generation failed` - 失败日志

---

## 📊 日志级别说明

### Inngest 日志级别
- **INFO**: 正常流程日志（蓝色）
- **WARN**: 警告信息（黄色）
- **ERROR**: 错误信息（红色）
- **DEBUG**: 调试信息（灰色）

### 关键日志示例

**成功执行**:
```
✅ Blog generation started
✅ Topic selected: "AI Video Generator Best Practices 2025"
✅ Draft placeholder created
✅ Content generated (12,543 characters)
✅ Content validation passed
✅ Article published successfully
✅ Cache revalidated
✅ Success notification email sent
```

**失败执行**:
```
❌ Blog generation failed
❌ Error: Topic validation failed: Slug already exists
🔍 Stage: select-topic
📧 Failure notification email sent
```

---

## 🚨 常见问题排查

### Q1: 任务为什么会重复执行？
**已解决**: 添加了 `concurrency: { limit: 1 }` 和 `idempotency: '5m'` 配置

### Q2: 为什么每次部署都触发任务？
**已解决**: 添加了 `source` 参数验证，只允许 `cron` 或 `manual` 触发

### Q3: AI 选择了已存在的 Slug？
**排查方法**:
1. 在 Inngest Dashboard 查看 **select-topic** Step 的 Output
2. 检查 AI 接收到的文章列表 (`existingPosts`)
3. 确认数据库查询是否正常

### Q4: 邮件通知没有收到？
**排查方法**:
1. 检查 Vercel 环境变量中的邮件服务配置
2. 查看 Inngest 日志中的 **send-success-notification** Step
3. 检查邮件服务商（AWS SES/SendGrid）的发送日志

---

## 🔗 相关链接

- **Inngest Dashboard**: https://www.inngest.com/dashboard
- **Vercel Dashboard**: https://vercel.com/
- **Inngest 文档**: https://www.inngest.com/docs
- **Vercel Cron 文档**: https://vercel.com/docs/cron-jobs

---

## 📝 快速访问脚本

```bash
# 手动触发博客生成（需要管理员权限）
curl -X POST https://vidfab.ai/api/admin/blog/generate \
  -H "Authorization: Bearer YOUR_TOKEN"

# 查看数据库中的草稿文章
npm run check-blog-drafts

# 清理失败的草稿文章
npm run clean-failed-drafts

# 测试 Inngest 事件发送
node scripts/debug-inngest-event.mjs
```

---

## 💡 最佳实践

1. **监控 Cron 执行**: 定期检查 Vercel Cron Jobs 页面，确保任务按时执行
2. **查看成功通知邮件**: 每次成功后会发送详细的邮件报告
3. **关注失败邮件**: 失败时会立即收到邮件，包含错误信息和失败阶段
4. **定期清理草稿**: 使用 `clean-failed-drafts` 脚本清理失败的草稿文章
5. **使用 Inngest Dashboard**: 这是最详细、最直观的日志查看方式

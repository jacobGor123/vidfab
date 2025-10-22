# 管理员配置说明

## 如何设置管理员

管理员权限通过环境变量 `ADMIN_EMAILS` 控制，支持配置多个管理员邮箱。

### 单个管理员

```bash
# .env.local
ADMIN_EMAILS=admin@vidfab.ai
```

### 多个管理员

使用逗号分隔多个邮箱地址：

```bash
# .env.local
ADMIN_EMAILS=admin1@vidfab.ai,admin2@vidfab.ai,admin3@vidfab.ai
```

### 配置规则

1. **邮箱格式**：必须是完整的邮箱地址
2. **分隔符**：多个邮箱用英文逗号 `,` 分隔
3. **空格处理**：邮箱前后的空格会自动去除（所以可以这样写以提高可读性）：
   ```bash
   ADMIN_EMAILS=admin1@vidfab.ai, admin2@vidfab.ai, admin3@vidfab.ai
   ```
4. **大小写**：邮箱地址不区分大小写，会自动转换为小写比较

### 配置示例

```bash
# 开发环境 - 单个管理员
ADMIN_EMAILS=jsdasww593@gmail.com

# 生产环境 - 多个管理员
ADMIN_EMAILS=ceo@vidfab.ai,cto@vidfab.ai,admin@vidfab.ai

# 带空格的格式（更易读）
ADMIN_EMAILS=ceo@vidfab.ai, cto@vidfab.ai, admin@vidfab.ai
```

## 验证配置

配置完成后，可以通过以下方式验证：

1. **重启开发服务器**
   ```bash
   # 停止当前服务器 (Ctrl+C)
   npm run dev
   ```

2. **访问测试页面**
   ```
   http://localhost:3000/test-auth
   ```
   这个页面会显示：
   - 当前登录用户邮箱
   - 配置的管理员邮箱列表
   - 是否具有管理员权限

3. **访问管理后台**
   ```
   http://localhost:3000/admin/users
   ```
   如果配置正确，应该能看到管理后台界面

## 权限说明

只有在 `ADMIN_EMAILS` 列表中的邮箱登录后，才能访问：

- `/admin/users` - 用户管理
- `/admin/paid-orders` - 订单管理
- `/admin/tasks` - 任务管理
- `/admin/*` - 所有管理后台功能

其他用户访问这些页面会被重定向到首页。

## 安全建议

1. **不要提交到 Git**：`.env.local` 文件已在 `.gitignore` 中，不会被提交
2. **生产环境配置**：在服务器环境变量中设置，不要硬编码
3. **定期审查**：定期检查管理员列表，移除不再需要的账号
4. **使用公司邮箱**：生产环境建议使用公司域名邮箱，便于管理

## 故障排查

### 问题：设置了邮箱但仍无法访问

**检查清单：**
1. ✅ 确认已重启开发服务器
2. ✅ 确认已使用对应的邮箱登录
3. ✅ 确认 `.env.local` 中的邮箱拼写正确
4. ✅ 确认没有多余的空格或特殊字符
5. ✅ 访问 `/test-auth` 查看详细状态

### 问题：添加了新管理员但不生效

**解决方案：**
1. 保存 `.env.local` 文件
2. 重启开发服务器 (Ctrl+C 然后 `npm run dev`)
3. 新管理员需要先登录网站
4. 登录后访问 `/admin/users`

## 技术实现

管理员验证的核心代码在 `lib/admin/auth.ts`：

```typescript
const ADMIN_EMAILS = process.env.ADMIN_EMAILS
  ? process.env.ADMIN_EMAILS.split(',').map((email) => email.trim())
  : [];

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}
```

这段代码会：
1. 读取环境变量 `ADMIN_EMAILS`
2. 按逗号分隔成数组
3. 去除每个邮箱的前后空格
4. 比较时转换为小写（不区分大小写）

# 管理员认证调试指南

## 🐛 问题描述

线上环境访问管理后台时,即使使用管理员邮箱登录,也会被重定向到首页,无法访问管理后台。

## 🔍 调试工具

### 1. 调试页面 (无需管理员权限)

访问 **`/debug-admin`** 页面,无需管理员权限即可查看详细的认证信息。

**注意:** 请使用 `/debug-admin` 而不是 `/admin-debug` 或 `/admin/debug`,因为只有 `/debug-admin` 路径不受管理员权限保护。

**显示信息包括:**
- ✅ 当前登录状态
- ✅ 当前用户邮箱
- ✅ 管理员邮箱配置
- ✅ 邮箱匹配详情
- ✅ Session 完整信息
- ✅ 环境变量配置

**使用步骤:**
1. 在线上环境登录你的管理员账号
2. 访问 `https://your-domain.com/debug-admin`
3. 查看页面显示的详细信息
4. 根据 "Troubleshooting Steps" 部分的提示排查问题

**重要:** 必须访问 `/debug-admin`,其他路径会被重定向!

### 2. 服务端日志

在 `lib/admin/auth.ts` 中已添加详细的日志输出,所有认证相关的操作都会在服务端日志中输出。

**日志格式:**
```
[Admin Auth] Checking if current user is admin...
[Admin Auth] Session status: { hasSession: true, hasUser: true, userEmail: 'xxx@gmail.com' }
[Admin Auth] Checking email: { email: 'xxx@gmail.com', adminEmails: ['xxx@gmail.com'], isAdmin: true }
[Admin Auth] Final result: { userEmail: 'xxx@gmail.com', isAdmin: true }
```

**查看日志方法:**

#### 本地开发环境:
直接在运行 `npm run dev` 的终端查看日志输出

#### 线上生产环境 (Docker):
```bash
# 查看实时日志
docker logs -f vidfab-app --tail=100

# 或使用项目脚本
./scripts/docker-logs.sh
```

#### 线上生产环境 (Vercel/其他):
在部署平台的 Logs/Runtime Logs 面板查看

## 🔧 常见问题排查

### 问题 1: 环境变量未设置

**现象:**
- 调试页面显示 `ADMIN_EMAILS: (NOT SET)`
- 日志显示 `adminEmails: []`

**解决方案:**
1. 检查线上环境的环境变量配置
2. 确保 `ADMIN_EMAILS` 已正确设置
3. 格式: `ADMIN_EMAILS=email1@example.com,email2@example.com`
4. 重启服务器使环境变量生效

### 问题 2: 邮箱不匹配

**现象:**
- 调试页面显示 `Email Matching Analysis` 中所有邮箱都是 "✗ NO MATCH"
- 日志显示 `isAdmin: false`

**可能原因:**
1. **大小写问题**: 邮箱匹配是大小写不敏感的,但环境变量中可能有多余的大写
2. **空格问题**: 环境变量中的邮箱前后可能有空格
3. **邮箱不一致**: 登录的邮箱和配置的管理员邮箱不同

**解决方案:**
1. 在调试页面检查 "User Email Details" 和 "Admin Emails Configuration"
2. 对比两者是否完全一致(忽略大小写)
3. 检查是否有不可见字符或空格
4. 重新配置环境变量,确保邮箱完全一致

### 问题 3: Session 问题

**现象:**
- 调试页面显示 `Logged In: ✗ NO`
- 日志显示 `hasSession: false`

**可能原因:**
1. NextAuth Session 配置问题
2. Cookie 设置问题
3. 域名配置问题

**解决方案:**
1. 检查 `NEXTAUTH_URL` 环境变量是否正确
2. 检查 `NEXTAUTH_SECRET` 是否设置
3. 清除浏览器 Cookie 后重新登录
4. 检查是否跨域访问导致 Cookie 丢失

### 问题 4: 缓存问题

**现象:**
- 修改了环境变量,但调试页面仍显示旧值

**解决方案:**
1. 重启服务器/容器
2. 清除浏览器缓存
3. 使用无痕模式测试

## 📝 调试流程

### 步骤 1: 访问调试页面

在线上环境访问 `/debug-admin` 页面,无需管理员权限。

### 步骤 2: 检查登录状态

查看 "Status Summary" 部分:
- 如果 `Logged In: ✗ NO` → 先登录
- 如果 `Logged In: ✓ YES` → 继续下一步

### 步骤 3: 检查环境变量

查看 "Admin Emails Configuration" 部分:
- 如果 `Raw ADMIN_EMAILS env: (NOT SET)` → 设置环境变量
- 如果已设置 → 检查邮箱列表是否包含你的邮箱

### 步骤 4: 检查邮箱匹配

查看 "Email Matching Analysis" 部分:
- 逐个对比你的邮箱和每个管理员邮箱
- 查找 `✓ MATCH` 标记
- 如果都是 `✗ NO MATCH` → 检查邮箱是否完全一致

### 步骤 5: 查看服务端日志

如果前端调试页面看不出问题,查看服务端日志:
```bash
docker logs -f vidfab-app --tail=200 | grep "Admin Auth"
```

查找关键信息:
- Session 是否存在
- 用户邮箱是什么
- 管理员邮箱列表是什么
- 最终是否判定为管理员

### 步骤 6: 修复问题

根据上述排查结果:
1. 设置或修正环境变量
2. 重启服务器
3. 清除浏览器缓存
4. 重新登录
5. 再次访问 `/debug-admin` 验证
6. 如果显示 `✅ 管理员访问已启用`,点击 "前往管理后台" 按钮

## 🚀 快速检查清单

在排查问题时,按以下顺序检查:

- [ ] 是否已登录?
- [ ] 登录的邮箱是什么?
- [ ] `ADMIN_EMAILS` 环境变量是否设置?
- [ ] 环境变量中的邮箱列表是什么?
- [ ] 你的邮箱是否在列表中?
- [ ] 邮箱是否完全匹配(忽略大小写)?
- [ ] 是否有多余的空格或特殊字符?
- [ ] 修改环境变量后是否重启了服务器?
- [ ] 是否清除了浏览器缓存?

## 📞 获取帮助

如果按照上述步骤仍无法解决问题,请提供以下信息:

1. `/debug-admin` 页面的完整截图
2. 服务端日志中包含 `[Admin Auth]` 的所有行
3. 环境变量 `ADMIN_EMAILS` 的配置(脱敏处理)
4. 部署环境信息(Docker/Vercel/其他)

---

**文档更新日期:** 2025-01-24
**适用版本:** v1.0+

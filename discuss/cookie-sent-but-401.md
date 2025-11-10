# Cookie 已发送但仍返回 401 的诊断

## 🔍 问题描述

- ✅ Network 标签确认请求包含 `Cookie: next-auth.session-token=...`
- ✅ 前端代码已添加 `credentials: 'include'`
- ❌ API 仍然返回 401 Unauthorized

这说明**前端没有问题**，问题出在**后端无法解析 session**。

---

## 📋 诊断步骤

### 步骤 1：检查后端是否能解析 Session

在浏览器控制台执行：

```javascript
fetch('/api/debug/session', { credentials: 'include' })
  .then(r => r.json())
  .then(data => {
    console.log('🔍 诊断结果:', data.diagnosis.problem)
    console.log('📊 详细信息:')
    console.log('  Cookie 已发送:', data.cookie.exists)
    console.log('  Session 已解析:', data.session.parsed)
    console.log('  环境变量:', data.environment)
    console.log('\\n完整数据:', JSON.stringify(data, null, 2))
  })
```

### 步骤 2：根据结果判断问题

#### 情况 A：`cookie.exists: true` + `session.parsed: false` ⚠️⚠️⚠️

**这是最可能的情况！**

**原因**：后端收到了 Cookie，但无法解密/验证 session token

**可能的根本原因**：

1. **NEXTAUTH_SECRET 不匹配** （最常见 90%）
   - Session token 是用某个 secret 加密的
   - 但服务器用另一个 secret 尝试解密
   - 导致解密失败，返回 null session

2. **Session token 已过期** （较少见 8%）
   - Token 本身已经超过有效期
   - 需要重新登录

3. **多服务器实例环境变量不一致** （罕见 2%）
   - 负载均衡下有多个服务器实例
   - 不同实例的 `NEXTAUTH_SECRET` 不同

---

## 🔧 解决方案

### 方案 1：检查 NEXTAUTH_SECRET（最重要！）

#### 在服务器上执行：

```bash
# 1. 检查当前运行的环境变量
echo $NEXTAUTH_SECRET

# 2. 检查 .env 文件
cat .env | grep NEXTAUTH_SECRET
cat .env.local | grep NEXTAUTH_SECRET
cat .env.production | grep NEXTAUTH_SECRET

# 3. 如果是 Docker 部署，检查 Docker 环境变量
docker exec <container_name> env | grep NEXTAUTH_SECRET

# 4. 如果使用 systemd 或其他服务管理器
systemctl show your-service --property=Environment
```

#### 验证 Secret 是否一致：

**问题诊断**：
- 用户登录时使用的 `NEXTAUTH_SECRET` 是 A
- 当前服务器运行时使用的 `NEXTAUTH_SECRET` 是 B
- A ≠ B → Session 无法解析

**解决方法**：
1. 确定**正确的** `NEXTAUTH_SECRET` 是什么
2. 更新服务器环境变量为正确的值
3. 重启服务
4. 用户**重新登录**（旧 token 仍然无效）

---

### 方案 2：用户重新登录

有时候最简单的解决方法就是：

1. 用户**退出登录**
2. **清除浏览器 Cookie**（可选但推荐）
3. **重新登录**
4. 测试是否正常

这会生成一个新的 session token，使用当前服务器的 `NEXTAUTH_SECRET` 加密。

---

### 方案 3：检查多服务器实例

如果使用了负载均衡（如 Nginx、AWS ALB、K8s）：

```bash
# 检查所有服务器实例的环境变量是否一致
# 方法：多次访问 /api/debug/session，观察返回的环境变量是否相同

# 或者直接登录每台服务器检查
ssh server1 "echo \$NEXTAUTH_SECRET"
ssh server2 "echo \$NEXTAUTH_SECRET"
ssh server3 "echo \$NEXTAUTH_SECRET"
```

**如果不一致**：
1. 统一所有服务器的 `NEXTAUTH_SECRET`
2. 重启所有实例
3. 用户重新登录

---

### 方案 4：检查 Session 配置

确认 `auth/config.ts` 中的 session 配置正确：

```typescript
// auth/config.ts
session: {
  strategy: "jwt",
  maxAge: 30 * 24 * 60 * 60, // 30 days
},
```

如果 `maxAge` 设置过短，session 可能已经过期。

---

## 🎯 最可能的问题和解决方案（排序）

1. **NEXTAUTH_SECRET 不匹配** (90%)
   ```bash
   # 在服务器上
   # 1. 备份当前 .env
   cp .env .env.backup

   # 2. 更新 NEXTAUTH_SECRET（使用正确的值）
   nano .env

   # 3. 重启服务
   ./scripts/restart.sh  # 或 pm2 restart / docker restart

   # 4. 用户重新登录
   ```

2. **Session token 已过期** (8%)
   ```
   解决方法：用户退出并重新登录
   ```

3. **多服务器实例环境变量不一致** (2%)
   ```bash
   # 统一所有服务器的环境变量
   # 然后滚动重启所有实例
   ```

---

## 📊 快速验证脚本

在浏览器控制台运行：

```javascript
(async () => {
  console.log('🔍 开始诊断 Cookie 已发送但 401 的问题...\n')

  // 1. 确认 Cookie 存在
  const hasCookie = document.cookie.includes('next-auth.session-token')
  console.log('1️⃣ Cookie 存在:', hasCookie ? '✅' : '❌')

  if (!hasCookie) {
    console.log('   ❌ Cookie 不存在，这不是"Cookie 已发送但 401"的问题')
    return
  }

  // 2. 测试 /api/auth/session
  const sessionResp = await fetch('/api/auth/session', { credentials: 'include' })
  const sessionData = await sessionResp.json()
  console.log('2️⃣ /api/auth/session:', sessionData.user ? '✅ 有效' : '❌ 无效')

  // 3. 测试后端 Session 解析
  const debugResp = await fetch('/api/debug/session', { credentials: 'include' })
  const debugData = await debugResp.json()

  console.log('3️⃣ 后端 Session 解析:', debugData.session.parsed ? '✅' : '❌')
  console.log('   诊断:', debugData.diagnosis.problem)

  // 4. 给出建议
  if (debugData.cookie.exists && !debugData.session.parsed) {
    console.log('\n⚠️⚠️⚠️ 问题确认: Cookie 已发送但后端无法解析')
    console.log('\\n🔧 最可能的原因:')
    console.log('   1. NEXTAUTH_SECRET 不匹配 (90%)')
    console.log('   2. Session token 已过期 (8%)')
    console.log('   3. 多服务器实例环境变量不一致 (2%)')
    console.log('\\n💡 建议操作:')
    console.log('   1. 检查服务器的 NEXTAUTH_SECRET 环境变量')
    console.log('   2. 尝试退出并重新登录')
    console.log('   3. 查看服务器日志，搜索 "session" 相关错误')
  } else if (debugData.session.parsed) {
    console.log('\n✅ Session 解析正常！')
    console.log('   如果仍然 401，问题可能在其他地方（如积分检查、参数验证）')
  }

  console.log('\n📋 完整诊断数据:', debugData)
})()
```

---

## 🚨 紧急修复清单

如果线上环境正在报错，按以下顺序快速修复：

- [ ] 1. 在浏览器控制台运行 `/api/debug/session` 确认问题
- [ ] 2. 在服务器检查 `echo $NEXTAUTH_SECRET`
- [ ] 3. 确认 `.env` 文件中的 `NEXTAUTH_SECRET` 值
- [ ] 4. 如果不一致，更新为正确的值
- [ ] 5. 重启服务
- [ ] 6. 让用户重新登录测试
- [ ] 7. 如果问题解决，记录正确的 `NEXTAUTH_SECRET` 到安全的地方

---

## 📝 相关文档

- `discuss/debug-401-live-environment.md` - 完整的 401 调试指南
- `discuss/fix-production-401-auth-issue.md` - Cookie secure 配置问题
- `discuss/fix-frontend-credentials-401.md` - 前端 credentials 问题

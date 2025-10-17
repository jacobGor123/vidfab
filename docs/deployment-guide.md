# VidFab 部署指南

## 环境变量管理

### 问题说明

`.env.local` 和 `.env` 文件包含敏感信息，已被 `.gitignore` 排除，不会提交到 Git 仓库。这意味着在不同环境部署时需要单独配置环境变量。

### 解决方案

## 方案一：使用 .env.example 模板（推荐本地开发）

**适用场景**：本地开发、新团队成员加入

**步骤**：
```bash
# 1. 复制模板文件
cp .env.example .env.local

# 2. 编辑 .env.local 填入实际值
nano .env.local

# 3. 启动 Docker
bash scripts/docker-start.sh
```

**优点**：
- ✅ 简单直接
- ✅ 团队成员知道需要哪些环境变量
- ✅ 不会意外提交敏感信息

**缺点**：
- ❌ 每个环境需要手动配置
- ❌ 不适合自动化部署

---

## 方案二：CI/CD 环境变量注入（推荐生产环境）

### GitLab CI/CD

**步骤**：
1. 在 GitLab 项目中：Settings → CI/CD → Variables
2. 添加所有必需的环境变量（标记为 Protected 和 Masked）
3. 创建 `.gitlab-ci.yml`：

```yaml
# .gitlab-ci.yml
variables:
  DOCKER_DRIVER: overlay2

stages:
  - build
  - deploy

build:
  stage: build
  image: docker:latest
  services:
    - docker:dind
  before_script:
    - echo "$CI_REGISTRY_PASSWORD" | docker login -u "$CI_REGISTRY_USER" --password-stdin $CI_REGISTRY
  script:
    # 从 GitLab CI Variables 创建 .env 文件
    - |
      cat > .env <<EOF
      NODE_ENV=production
      NEXT_PUBLIC_AUTH_GOOGLE_ENABLED=$NEXT_PUBLIC_AUTH_GOOGLE_ENABLED
      NEXT_PUBLIC_AUTH_GOOGLE_ID=$NEXT_PUBLIC_AUTH_GOOGLE_ID
      NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
      NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
      SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY
      EOF
    - docker compose build
    - docker compose push
  only:
    - main
    - staging

deploy:
  stage: deploy
  script:
    - ssh user@server "cd /app && docker compose pull && docker compose up -d"
  only:
    - main
```

### GitHub Actions

创建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main, staging ]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Create .env file from secrets
        run: |
          cat > .env <<EOF
          NODE_ENV=production
          NEXT_PUBLIC_AUTH_GOOGLE_ENABLED=${{ secrets.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED }}
          NEXT_PUBLIC_AUTH_GOOGLE_ID=${{ secrets.NEXT_PUBLIC_AUTH_GOOGLE_ID }}
          NEXT_PUBLIC_SUPABASE_URL=${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY=${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
          SUPABASE_SERVICE_ROLE_KEY=${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          EOF

      - name: Build and push Docker image
        run: |
          docker compose build
          docker compose up -d
```

**配置 GitHub Secrets**：
1. 进入仓库的 Settings → Secrets and variables → Actions
2. 点击 "New repository secret" 添加所有环境变量

---

## 方案三：服务器直接配置（推荐小型项目）

**适用场景**：单台服务器部署、测试环境

**步骤**：

```bash
# 1. SSH 登录服务器
ssh user@your-server

# 2. 进入项目目录
cd /path/to/vidfab

# 3. 拉取最新代码
git pull origin main

# 4. 创建 .env 文件（只需配置一次）
nano .env
# 粘贴所有环境变量并保存

# 5. 启动 Docker
bash scripts/docker-start.sh
```

**优点**：
- ✅ 一次配置，长期使用
- ✅ 不依赖 CI/CD 平台
- ✅ 适合快速部署

**缺点**：
- ❌ 服务器重建需要重新配置
- ❌ 多服务器部署需要重复操作

---

## 方案四：使用密钥管理服务（推荐大型项目）

### AWS Secrets Manager

**步骤**：

1. 在 AWS Secrets Manager 创建密钥：
```bash
aws secretsmanager create-secret \
  --name vidfab/production \
  --secret-string file://secrets.json
```

2. 修改 docker-compose.yml 添加密钥获取：
```yaml
services:
  app:
    build:
      context: .
    environment:
      - AWS_REGION=us-west-1
    command: >
      sh -c "
        aws secretsmanager get-secret-value --secret-id vidfab/production --query SecretString --output text > /tmp/.env &&
        export $(cat /tmp/.env | xargs) &&
        npm start
      "
```

### HashiCorp Vault

```bash
# 1. 启动 Vault
docker run --cap-add=IPC_LOCK -d --name=vault vault

# 2. 存储密钥
vault kv put secret/vidfab \
  NEXT_PUBLIC_SUPABASE_URL=xxx \
  SUPABASE_SERVICE_ROLE_KEY=xxx

# 3. 在应用启动时获取
vault kv get -format=json secret/vidfab | jq -r '.data.data' > .env
```

**优点**：
- ✅ 集中管理所有密钥
- ✅ 支持密钥轮换
- ✅ 详细的访问审计日志
- ✅ 支持多环境管理

**缺点**：
- ❌ 配置复杂
- ❌ 需要额外的基础设施

---

## 不同环境的推荐方案

| 环境 | 推荐方案 | 原因 |
|------|----------|------|
| 本地开发 | 方案一：.env.example | 简单直接 |
| 测试环境 | 方案二：CI/CD + 方案三：服务器配置 | 自动化 + 灵活性 |
| 生产环境 | 方案二：CI/CD + 方案四：密钥管理 | 安全 + 可追溯 |
| 小型项目 | 方案三：服务器配置 | 成本低，维护简单 |
| 企业级项目 | 方案四：密钥管理服务 | 最佳安全实践 |

---

## Docker 构建时的环境变量处理

### 当前实现

docker-compose.yml 从 `.env` 文件读取变量：
```yaml
build:
  args:
    - NEXT_PUBLIC_AUTH_GOOGLE_ID=${NEXT_PUBLIC_AUTH_GOOGLE_ID}
    - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
    - NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
```

### 确保 .env 文件存在

在部署脚本中添加检查：

```bash
# scripts/docker-start.sh
#!/bin/bash

# 检查 .env 文件
if [ ! -f .env ] && [ ! -f .env.local ]; then
    echo "❌ 错误: 未找到 .env 或 .env.local 文件"
    echo "请从 .env.example 复制并配置："
    echo "  cp .env.example .env"
    echo "  nano .env"
    exit 1
fi

# 如果只有 .env.local，创建 .env 软链接
if [ ! -f .env ] && [ -f .env.local ]; then
    echo "📝 从 .env.local 提取 Docker 所需变量..."
    grep "^NEXT_PUBLIC_" .env.local > .env
    grep "^NODE_ENV" .env.local >> .env
    grep "^SUPABASE_SERVICE_ROLE_KEY" .env.local >> .env
fi

echo "🐳 Starting VidFab Docker Environment..."
docker compose up -d
```

---

## 安全最佳实践

### ✅ 应该做的

1. **永远不要提交 .env 文件**
   ```bash
   # 确保 .gitignore 包含
   .env
   .env.local
   .env.*.local
   ```

2. **使用强密钥**
   ```bash
   # 生成 NEXTAUTH_SECRET
   openssl rand -base64 32
   ```

3. **为不同环境使用不同的密钥**
   - 开发环境：使用测试密钥
   - 生产环境：使用正式密钥

4. **定期轮换密钥**
   - Stripe webhook secret
   - JWT secret
   - Database passwords

5. **限制环境变量访问**
   - CI/CD 中标记为 Protected + Masked
   - 服务器上设置正确的文件权限：`chmod 600 .env`

### ❌ 不应该做的

1. ❌ 在代码中硬编码密钥
2. ❌ 通过聊天工具发送 .env 文件
3. ❌ 将生产密钥用于开发环境
4. ❌ 在日志中打印敏感信息
5. ❌ 提交包含真实密钥的 docker-compose.yml

---

## 故障排查

### 问题：Docker 构建时提示环境变量未设置

**错误信息**：
```
level=warning msg="The \"NEXT_PUBLIC_XXX\" variable is not set. Defaulting to a blank string."
```

**解决方案**：
```bash
# 1. 确认 .env 文件存在
ls -la .env

# 2. 检查文件内容
cat .env

# 3. 如果不存在，从模板创建
cp .env.example .env
nano .env

# 4. 重新构建
bash scripts/docker-build.sh
```

### 问题：应用运行时提示 "Missing Supabase environment variables"

**原因**：运行时环境变量未传递到容器

**解决方案**：
```bash
# 确保 docker-compose.yml 的 env_file 配置正确
services:
  app:
    env_file:
      - .env.local  # 或 .env
```

### 问题：不同分支/环境部署失败

**解决方案**：为每个环境创建独立的 .env 文件

```bash
# 开发环境
.env.development

# 测试环境
.env.staging

# 生产环境
.env.production

# 部署时指定
docker compose --env-file .env.staging up -d
```

---

## 推荐的项目结构

```
vidfab/
├── .env.example          # ✅ 提交到 Git (模板)
├── .env                  # ❌ 不提交 (Docker 用)
├── .env.local            # ❌ 不提交 (本地开发用)
├── .env.development      # ❌ 不提交 (开发环境)
├── .env.staging         # ❌ 不提交 (测试环境)
├── .env.production      # ❌ 不提交 (生产环境)
├── .gitignore           # 包含所有 .env* 规则
├── docker-compose.yml   # 使用环境变量占位符
└── docs/
    ├── deployment-guide.md        # 本文档
    └── environment-variables.md   # 环境变量说明
```

---

## 快速开始检查清单

### 本地开发
- [ ] 复制 `.env.example` 为 `.env.local`
- [ ] 填写所有必需的环境变量
- [ ] 运行 `bash scripts/docker-start.sh`
- [ ] 访问 http://localhost:3000 验证

### 测试环境部署
- [ ] 在 CI/CD 平台配置所有环境变量
- [ ] 或在服务器上创建 `.env` 文件
- [ ] 验证 `.gitignore` 包含 `.env*`
- [ ] 部署并验证应用正常运行

### 生产环境部署
- [ ] 使用密钥管理服务或 CI/CD Secrets
- [ ] 设置环境变量访问权限
- [ ] 配置自动化部署流程
- [ ] 建立密钥轮换机制
- [ ] 配置监控和告警

---

## 相关文档

- [Docker 修复总结](./docker-fixes-summary.md)
- [项目 README](../README.md)
- [环境变量配置模板](../.env.example)

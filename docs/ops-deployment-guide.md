# VidFab AI 视频平台 - 运维部署指南

> **文档版本**: 1.0.0
> **最后更新**: 2025-10-13
> **适用环境**: 生产环境 / 测试环境

---

## 目录

- [1. 项目概述](#1-项目概述)
- [2. 系统要求](#2-系统要求)
- [3. 部署前准备](#3-部署前准备)
- [4. Docker 部署（推荐）](#4-docker-部署推荐)
- [5. 源码部署](#5-源码部署)
- [6. 环境变量配置详解](#6-环境变量配置详解)
- [7. 服务管理](#7-服务管理)
- [8. 健康检查与监控](#8-健康检查与监控)
- [9. 日志管理](#9-日志管理)
- [10. 备份与恢复](#10-备份与恢复)
- [11. 安全加固](#11-安全加固)
- [12. 性能优化](#12-性能优化)
- [13. 故障排查](#13-故障排查)
- [14. 常见问题 FAQ](#14-常见问题-faq)

---

## 1. 项目概述

### 1.1 技术栈

- **前端框架**: Next.js 14 (App Router)
- **运行时**: Node.js 20.x
- **数据库**: Supabase (PostgreSQL)
- **缓存/队列**: Redis 7.x
- **认证**: NextAuth.js (支持 Google OAuth)
- **支付**: Stripe
- **容器化**: Docker + Docker Compose
- **反向代理**: 建议使用 Nginx/Caddy

### 1.2 架构组件

```
┌─────────────────┐
│  Nginx/Caddy    │  ← 反向代理、SSL 终止
│  (Port 80/443)  │
└────────┬────────┘
         │
┌────────▼────────┐
│  Next.js App    │  ← 主应用服务
│  (Port 3000)    │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼──┐  ┌──▼────┐
│ Redis│  │Supabase│  ← 外部服务
└──────┘  └────────┘
```

### 1.3 端口占用

| 服务 | 端口 | 说明 |
|------|------|------|
| Next.js 应用 | 3000 | 主应用端口 |
| Redis | 6379 | 缓存和队列服务 |
| Redis Commander | 8081 | Redis 管理界面（调试用） |

---

## 2. 系统要求

### 2.1 硬件要求

#### 最低配置（测试环境）
- **CPU**: 2 核
- **内存**: 4 GB
- **硬盘**: 20 GB SSD
- **网络**: 10 Mbps

#### 推荐配置（生产环境）
- **CPU**: 4 核或更多
- **内存**: 8 GB 或更多
- **硬盘**: 50 GB SSD 或更多
- **网络**: 100 Mbps 或更快

### 2.2 软件要求

| 软件 | 版本要求 | 用途 |
|------|----------|------|
| Docker | 20.10+ | 容器运行时 |
| Docker Compose | 2.0+ | 服务编排 |
| Node.js | 20.x | 源码部署（可选） |
| npm | 10.x | 包管理器（可选） |
| Git | 2.x+ | 代码拉取 |

### 2.3 操作系统支持

- ✅ Ubuntu 20.04 LTS / 22.04 LTS（推荐）
- ✅ Debian 11+
- ✅ CentOS 8+ / Rocky Linux 8+
- ✅ macOS 12+ (开发环境)
- ✅ Windows Server 2019+ (使用 WSL2)

---

## 3. 部署前准备

### 3.1 安装 Docker 和 Docker Compose

#### Ubuntu/Debian

```bash
# 更新包索引
sudo apt-get update

# 安装依赖
sudo apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# 添加 Docker 官方 GPG 密钥
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# 设置仓库
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 安装 Docker Engine
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 验证安装
sudo docker --version
sudo docker compose version
```

#### CentOS/Rocky Linux

```bash
# 安装 Docker
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 启动 Docker
sudo systemctl start docker
sudo systemctl enable docker

# 验证安装
sudo docker --version
sudo docker compose version
```

### 3.2 配置 Docker 用户权限（可选）

```bash
# 将当前用户添加到 docker 组
sudo usermod -aG docker $USER

# 重新登录以使更改生效
newgrp docker

# 测试（不需要 sudo）
docker ps
```

### 3.3 准备外部服务

在部署前，确保以下外部服务已准备就绪：

#### ✅ Supabase 项目

1. 访问 [supabase.com](https://supabase.com)
2. 创建新项目或使用现有项目
3. 获取以下凭据：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

#### ✅ Google OAuth（可选）

1. 访问 [Google Cloud Console](https://console.cloud.google.com)
2. 创建 OAuth 2.0 客户端 ID
3. 配置授权重定向 URI: `https://your-domain.com/api/auth/callback/google`
4. 获取凭据：
   - `AUTH_GOOGLE_ID`
   - `AUTH_GOOGLE_SECRET`

#### ✅ Stripe（可选）

1. 访问 [Stripe Dashboard](https://dashboard.stripe.com)
2. 获取 API 密钥：
   - `STRIPE_SECRET_KEY`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_WEBHOOK_SECRET`

---

## 4. Docker 部署（推荐）

### 4.1 克隆代码仓库

```bash
# 使用 HTTPS
git clone https://github.com/jacobGor123/vidfab.git
cd vidfab

# 或使用 SSH
git clone git@github.com:jacobGor123/vidfab.git
cd vidfab

# 切换到稳定分支
git checkout main  # 或指定的发布分支
```

### 4.2 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env.local

# 编辑环境变量（使用你喜欢的编辑器）
nano .env.local
# 或
vim .env.local
```

**必须配置的环境变量**（参见 [6. 环境变量配置详解](#6-环境变量配置详解)）：

```bash
# 最小化配置示例
NEXTAUTH_SECRET=your_random_secret_min_32_chars_aBcDeFgHiJkLmNoPqRsTuVwXyZ123456
NEXTAUTH_URL=https://your-domain.com

NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### 4.3 使用部署脚本启动（推荐）

项目提供了自动化部署脚本，会执行环境检查、镜像构建和服务启动：

```bash
# 赋予脚本执行权限
chmod +x scripts/docker-start.sh
chmod +x scripts/docker-stop.sh
chmod +x scripts/docker-logs.sh

# 启动服务
./scripts/docker-start.sh
```

**脚本功能**：
- ✅ 自动检查环境变量配置
- ✅ 验证必需的环境变量
- ✅ 从 `.env.local` 提取构建变量到 `.env`
- ✅ 启动所有 Docker 服务
- ✅ 输出详细日志到 `logs/docker-start-*.log`
- ✅ 执行健康检查

### 4.4 手动部署（不使用脚本）

```bash
# 1. 创建 .env 文件（Docker 构建需要）
grep "^NEXT_PUBLIC_" .env.local > .env
grep "^NODE_ENV" .env.local >> .env

# 2. 构建镜像
docker compose build --no-cache

# 3. 启动服务
docker compose up -d

# 4. 查看容器状态
docker compose ps

# 5. 查看日志
docker compose logs -f app
```

### 4.5 验证部署

```bash
# 检查容器状态
docker compose ps

# 期望输出：
# NAME            IMAGE         STATUS         PORTS
# vidfab-app      vidfab-app    Up (healthy)   0.0.0.0:3000->3000/tcp
# vidfab-redis    redis:7-alpine Up (healthy)  0.0.0.0:6379->6379/tcp

# 测试应用健康检查端点
curl http://localhost:3000/api/health

# 期望响应：
# {"status":"ok","timestamp":"2025-10-13T..."}

# 测试主页
curl -I http://localhost:3000

# 期望响应：
# HTTP/1.1 200 OK
```

### 4.6 配置反向代理（生产环境必需）

#### Nginx 配置示例

```nginx
# /etc/nginx/sites-available/vidfab
upstream vidfab_app {
    server 127.0.0.1:3000;
    keepalive 32;
}

server {
    listen 80;
    server_name your-domain.com;

    # 重定向到 HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL 证书配置
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # 客户端最大请求体大小（用于文件上传）
    client_max_body_size 100M;

    # 代理配置
    location / {
        proxy_pass http://vidfab_app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 静态资源缓存
    location /_next/static {
        proxy_pass http://vidfab_app;
        proxy_cache_valid 200 30d;
        add_header Cache-Control "public, max-age=2592000, immutable";
    }

    # 日志
    access_log /var/log/nginx/vidfab_access.log;
    error_log /var/log/nginx/vidfab_error.log;
}
```

```bash
# 启用站点配置
sudo ln -s /etc/nginx/sites-available/vidfab /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重载 Nginx
sudo systemctl reload nginx
```

#### Caddy 配置示例（更简单）

```caddyfile
# /etc/caddy/Caddyfile
your-domain.com {
    reverse_proxy localhost:3000

    # 自动 HTTPS
    encode gzip

    # 安全头
    header {
        X-Frame-Options "SAMEORIGIN"
        X-Content-Type-Options "nosniff"
        X-XSS-Protection "1; mode=block"
        Referrer-Policy "strict-origin-when-cross-origin"
    }
}
```

```bash
# 重载 Caddy
sudo systemctl reload caddy
```

---

## 5. 源码部署

### 5.1 安装 Node.js 20

```bash
# 使用 nvm（推荐）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20

# 验证版本
node --version  # 应输出 v20.x.x
npm --version   # 应输出 10.x.x
```

### 5.2 安装 Redis

```bash
# Ubuntu/Debian
sudo apt-get install -y redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server

# 验证
redis-cli ping  # 应返回 PONG
```

### 5.3 部署应用

```bash
# 1. 克隆代码
git clone https://github.com/jacobGor123/vidfab.git
cd vidfab

# 2. 配置环境变量
cp .env.example .env.local
nano .env.local

# 3. 安装依赖
npm install

# 4. 构建应用
npm run build

# 5. 启动应用
npm start
```

### 5.4 使用 PM2 进行进程管理（推荐）

```bash
# 全局安装 PM2
npm install -g pm2

# 创建 PM2 配置文件
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'vidfab',
    script: 'npm',
    args: 'start',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    max_memory_restart: '1G'
  }]
}
EOF

# 启动应用
pm2 start ecosystem.config.js

# 保存 PM2 配置
pm2 save

# 设置开机自启
pm2 startup
# 按照提示执行命令

# 常用命令
pm2 list           # 查看进程列表
pm2 logs vidfab    # 查看日志
pm2 restart vidfab # 重启应用
pm2 stop vidfab    # 停止应用
pm2 delete vidfab  # 删除应用
pm2 monit          # 监控面板
```

---

## 6. 环境变量配置详解

### 🎯 配置管理理念

本项目采用**智能默认值 + 环境变量覆盖**的配置管理策略，遵循以下原则：

#### 核心优势

1. **零配置启动** 🚀
   - 本地开发：克隆代码后直接 `npm run dev`，无需配置 Redis
   - Docker 环境：`docker compose up` 即可，自动使用容器服务

2. **环境自适应** 🔄
   - 本地开发：默认连接 `localhost:6379`
   - Docker 容器：默认连接容器名 `redis:6379`
   - 生产环境：通过 `.env.local` 覆盖配置

3. **配置分离** 🔒
   - 敏感配置（密码、密钥）：通过 `.env.local` 管理，不提交到 Git
   - 通用配置（端口、主机）：在 `docker-compose.yml` 设置默认值
   - 应用代码：从环境变量读取，支持默认值 fallback

4. **易于调试** 🐛
   - 开发时不需要配置一堆环境变量
   - 生产环境只需关注必需的配置项
   - 减少"在我机器上能跑"的问题

#### 配置优先级（从高到低）

```
1. .env.local 中的配置（最高优先级，不提交到 Git）
   ↓
2. docker-compose.yml 中的环境变量（Docker 环境）
   ↓
3. 应用代码中的默认值（兜底保障）
```

#### 示例：Redis 配置的三层架构

```javascript
// lib/redis.ts - 应用代码层（第 3 层：默认值）
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',  // 兜底默认值
  port: parseInt(process.env.REDIS_PORT || '6379'),
  // ...
}
```

```yaml
# docker-compose.yml - Docker 编排层（第 2 层）
environment:
  - REDIS_HOST=${REDIS_HOST:-redis}  # Docker 环境默认值
  - REDIS_PORT=${REDIS_PORT:-6379}
```

```bash
# .env.local - 环境特定层（第 1 层：最高优先级）
REDIS_HOST=redis.production.com  # 覆盖所有默认值
REDIS_PORT=6380
REDIS_PASSWORD=secure_password
```

---

### 6.1 必需的环境变量

| 变量名 | 说明 | 示例 | 获取方式 |
|--------|------|------|----------|
| `NEXTAUTH_SECRET` | NextAuth 会话加密密钥（≥32字符） | `abc...xyz123` | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | 应用的完整 URL | `https://app.com` | 你的域名 |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL | `https://xxx.supabase.co` | Supabase 控制台 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名密钥 | `eyJhbG...` | Supabase 控制台 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 服务密钥 | `eyJhbG...` | Supabase 控制台 |
| `NODE_ENV` | 运行环境 | `production` | 手动设置 |
| `NEXT_PUBLIC_APP_URL` | 应用公开 URL | `https://app.com` | 你的域名 |

### 6.2 可选的环境变量

#### Google OAuth

```bash
AUTH_GOOGLE_ID=your_google_client_id
AUTH_GOOGLE_SECRET=your_google_client_secret
NEXT_PUBLIC_AUTH_GOOGLE_ENABLED=true
NEXT_PUBLIC_AUTH_GOOGLE_ONE_TAP_ENABLED=true
NEXT_PUBLIC_AUTH_GOOGLE_ID=your_google_client_id  # 前端使用
```

#### Stripe 支付

```bash
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

#### AWS SES 邮件

```bash
AWS_SES_SMTP_HOST=email-smtp.us-west-1.amazonaws.com
AWS_SES_SMTP_USERNAME=AKIAXXXXXX
AWS_SES_SMTP_PASSWORD=XXXXXX
AWS_SES_FROM_EMAIL=noreply@yourdomain.com
AWS_SES_REPLY_TO_EMAIL=support@yourdomain.com
```

#### Redis 配置

**重要说明**：Redis 配置采用**环境变量 + 默认值**的方式，无需在每个环境单独配置。

```bash
# 方式 1: 使用 REDIS_URL（推荐）
REDIS_URL=redis://localhost:6379        # 本地开发
REDIS_URL=redis://redis:6379            # Docker 环境
REDIS_URL=redis://:password@host:6379/0 # 生产环境（带密码）

# 方式 2: 使用独立参数（更灵活）
REDIS_HOST=localhost                    # Redis 主机地址
REDIS_PORT=6379                         # Redis 端口
REDIS_PASSWORD=                         # Redis 密码（可选）
REDIS_DB=0                              # Redis 数据库编号
```

**默认值说明**：
- ✅ **本地开发**：不配置环境变量时，默认使用 `localhost:6379`
- ✅ **Docker 环境**：不配置环境变量时，默认使用 `redis:6379`（容器名）
- ✅ **生产环境**：通过 `.env.local` 文件覆盖默认值

**配置优先级**：
1. 如果设置了 `REDIS_URL`，将优先使用 `REDIS_URL`
2. 否则使用 `REDIS_HOST`、`REDIS_PORT`、`REDIS_PASSWORD`、`REDIS_DB`
3. 如果都未设置，使用默认值（localhost:6379, 无密码, db=0）

**示例场景**：

```bash
# 场景 1: 本地开发（不配置任何 Redis 变量）
# 系统自动使用 localhost:6379
# 无需任何配置！

# 场景 2: Docker 环境（不配置任何 Redis 变量）
# docker-compose.yml 自动配置为 redis:6379
# 无需任何配置！

# 场景 3: 生产环境（使用外部 Redis）
# 在 .env.local 中配置：
REDIS_URL=redis://:my_secure_password@redis.production.com:6379/0

# 场景 4: 本地开发连接远程 Redis
# 在 .env.local 中配置：
REDIS_HOST=dev.redis.company.com
REDIS_PORT=6379
REDIS_PASSWORD=dev_password
REDIS_DB=1
```

#### 队列配置

```bash
QUEUE_PREFIX=vidfab-video-processing
QUEUE_CONCURRENCY=3          # 并发处理任务数
QUEUE_MAX_RETRIES=3          # 失败重试次数
QUEUE_RETRY_DELAY=60000      # 重试延迟（毫秒）
```

### 6.3 生成安全密钥

```bash
# 生成 NEXTAUTH_SECRET
openssl rand -base64 32

# 生成强随机密码
openssl rand -hex 32

# 使用 Node.js 生成
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## 7. 服务管理

### 7.1 Docker Compose 命令

```bash
# 启动服务（后台运行）
docker compose up -d

# 停止服务
docker compose stop

# 停止并删除容器
docker compose down

# 停止并删除容器、数据卷、网络
docker compose down -v

# 重启服务
docker compose restart

# 重启指定服务
docker compose restart app

# 查看服务状态
docker compose ps

# 查看服务日志
docker compose logs -f app
docker compose logs -f redis

# 查看资源使用情况
docker stats vidfab-app vidfab-redis

# 进入容器 Shell
docker exec -it vidfab-app sh
docker exec -it vidfab-redis redis-cli

# 重新构建镜像
docker compose build --no-cache

# 拉取最新镜像
docker compose pull
```

### 7.2 使用项目脚本

```bash
# 启动服务（包含环境检查）
./scripts/docker-start.sh

# 停止服务
./scripts/docker-stop.sh

# 查看实时日志
./scripts/docker-logs.sh

# 重新构建并启动
./scripts/docker-build.sh
./scripts/docker-start.sh
```

### 7.3 滚动更新（零停机部署）

```bash
#!/bin/bash
# update.sh - 滚动更新脚本

set -e

echo "🚀 开始滚动更新..."

# 1. 拉取最新代码
git pull origin main

# 2. 备份当前环境变量
cp .env.local .env.local.backup

# 3. 构建新镜像
docker compose build --no-cache app

# 4. 启动新容器（不停止旧容器）
docker compose up -d --no-deps --scale app=2 app

# 5. 等待健康检查通过
echo "⏳ 等待新容器健康检查..."
sleep 30

# 6. 检查新容器是否健康
if docker compose ps | grep "vidfab-app" | grep -q "healthy"; then
    echo "✅ 新容器健康检查通过"

    # 7. 停止旧容器
    docker compose up -d --no-deps --scale app=1 app

    echo "✅ 滚动更新完成"
else
    echo "❌ 新容器健康检查失败，回滚"
    docker compose up -d --no-deps --scale app=1 app
    exit 1
fi
```

---

## 8. 健康检查与监控

### 8.1 内置健康检查端点

```bash
# HTTP 健康检查
curl http://localhost:3000/api/health

# 响应示例（健康）
{
  "status": "ok",
  "timestamp": "2025-10-13T12:34:56.789Z",
  "services": {
    "redis": "connected",
    "database": "connected"
  }
}
```

### 8.2 Docker 健康检查

```bash
# 查看健康状态
docker inspect --format='{{.State.Health.Status}}' vidfab-app

# 查看健康检查日志
docker inspect --format='{{range .State.Health.Log}}{{.Output}}{{end}}' vidfab-app
```

### 8.3 监控指标

#### 使用 Docker Stats

```bash
# 实时监控容器资源
docker stats vidfab-app vidfab-redis

# 输出示例：
# CONTAINER    CPU %   MEM USAGE / LIMIT   MEM %   NET I/O       BLOCK I/O
# vidfab-app   5.0%    512MB / 8GB         6.4%    1.2MB / 800KB 4MB / 0B
# vidfab-redis 0.5%    32MB / 8GB          0.4%    800KB / 1.2MB 0B / 8MB
```

#### 集成 Prometheus + Grafana（推荐）

在 `docker-compose.yml` 中添加监控服务：

```yaml
# 添加到 docker-compose.yml
  prometheus:
    image: prom/prometheus:latest
    container_name: vidfab-prometheus
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"
    networks:
      - vidfab-network

  grafana:
    image: grafana/grafana:latest
    container_name: vidfab-grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin123
    volumes:
      - grafana_data:/var/lib/grafana
    networks:
      - vidfab-network

volumes:
  prometheus_data:
  grafana_data:
```

创建 Prometheus 配置：

```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'vidfab-app'
    static_configs:
      - targets: ['app:3000']
    metrics_path: '/api/metrics'
```

### 8.4 日志监控告警

使用 `monit` 进行进程监控：

```bash
# 安装 monit
sudo apt-get install -y monit

# 配置监控
sudo nano /etc/monit/conf.d/vidfab

# 添加配置
check process vidfab-app with pidfile /var/run/docker/vidfab-app.pid
  start program = "/usr/bin/docker compose -f /opt/vidfab/docker-compose.yml start app"
  stop program = "/usr/bin/docker compose -f /opt/vidfab/docker-compose.yml stop app"
  if failed host localhost port 3000 protocol http
    and request "/api/health"
    with timeout 10 seconds
    for 2 cycles
  then restart
  if cpu > 80% for 5 cycles then alert
  if memory > 80% for 5 cycles then alert

# 重启 monit
sudo systemctl restart monit
```

---

## 9. 日志管理

### 9.1 日志位置

| 日志类型 | Docker 部署 | 源码部署 | 说明 |
|---------|-------------|----------|------|
| 应用日志 | `logs/*.log` | `logs/*.log` | 应用运行日志 |
| Docker 日志 | `docker logs vidfab-app` | N/A | 容器标准输出 |
| Nginx 日志 | `/var/log/nginx/` | `/var/log/nginx/` | 访问和错误日志 |
| 系统日志 | `/var/log/syslog` | `/var/log/syslog` | 系统级别日志 |

### 9.2 查看日志

```bash
# 查看 Docker 容器日志（实时）
docker compose logs -f app

# 查看最近 100 行
docker compose logs --tail=100 app

# 查看特定时间范围
docker compose logs --since 2025-10-13T10:00:00 app

# 查看应用日志文件
tail -f logs/docker-start-*.log
tail -f logs/docker-build-*.log

# 使用脚本查看日志
./scripts/docker-logs.sh
```

### 9.3 日志轮转

创建日志轮转配置：

```bash
sudo nano /etc/logrotate.d/vidfab
```

```conf
/opt/vidfab/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 0644 root root
    sharedscripts
    postrotate
        docker compose -f /opt/vidfab/docker-compose.yml restart app > /dev/null 2>&1 || true
    endscript
}
```

### 9.4 集中日志管理（可选）

#### 使用 ELK Stack

```yaml
# 添加到 docker-compose.yml
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.x
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    networks:
      - vidfab-network

  kibana:
    image: docker.elastic.co/kibana/kibana:8.x
    ports:
      - "5601:5601"
    depends_on:
      - elasticsearch
    networks:
      - vidfab-network

  filebeat:
    image: docker.elastic.co/beats/filebeat:8.x
    volumes:
      - ./logs:/var/log/vidfab:ro
      - ./filebeat.yml:/usr/share/filebeat/filebeat.yml:ro
    depends_on:
      - elasticsearch
    networks:
      - vidfab-network
```

---

## 10. 备份与恢复

### 10.1 备份策略

#### 需要备份的内容

1. **环境变量配置**: `.env.local`
2. **Redis 数据**: `redis_data` 卷
3. **日志文件**: `logs/` 目录（可选）
4. **上传文件**: 如果有本地存储

#### 自动备份脚本

```bash
#!/bin/bash
# backup.sh - 自动备份脚本

BACKUP_DIR="/opt/backups/vidfab"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/vidfab_backup_$DATE.tar.gz"

mkdir -p $BACKUP_DIR

echo "🔄 开始备份..."

# 1. 备份环境变量
cp /opt/vidfab/.env.local $BACKUP_DIR/.env.local.$DATE

# 2. 备份 Redis 数据
docker exec vidfab-redis redis-cli BGSAVE
sleep 5
docker cp vidfab-redis:/data/dump.rdb $BACKUP_DIR/redis_dump_$DATE.rdb

# 3. 打包所有备份
tar -czf $BACKUP_FILE \
    $BACKUP_DIR/.env.local.$DATE \
    $BACKUP_DIR/redis_dump_$DATE.rdb

# 4. 清理临时文件
rm -f $BACKUP_DIR/.env.local.$DATE
rm -f $BACKUP_DIR/redis_dump_$DATE.rdb

# 5. 删除 30 天前的备份
find $BACKUP_DIR -name "vidfab_backup_*.tar.gz" -mtime +30 -delete

echo "✅ 备份完成: $BACKUP_FILE"
```

#### 设置定时备份

```bash
# 编辑 crontab
crontab -e

# 每天凌晨 2 点执行备份
0 2 * * * /opt/vidfab/scripts/backup.sh >> /var/log/vidfab-backup.log 2>&1
```

### 10.2 恢复数据

```bash
#!/bin/bash
# restore.sh - 恢复脚本

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
    echo "用法: ./restore.sh <备份文件路径>"
    exit 1
fi

echo "🔄 开始恢复..."

# 1. 解压备份
TEMP_DIR="/tmp/vidfab_restore_$$"
mkdir -p $TEMP_DIR
tar -xzf $BACKUP_FILE -C $TEMP_DIR

# 2. 恢复环境变量
if [ -f $TEMP_DIR/.env.local.* ]; then
    cp $TEMP_DIR/.env.local.* /opt/vidfab/.env.local
    echo "✅ 环境变量已恢复"
fi

# 3. 恢复 Redis 数据
if [ -f $TEMP_DIR/redis_dump_*.rdb ]; then
    docker compose stop redis
    docker cp $TEMP_DIR/redis_dump_*.rdb vidfab-redis:/data/dump.rdb
    docker compose start redis
    echo "✅ Redis 数据已恢复"
fi

# 4. 清理临时目录
rm -rf $TEMP_DIR

echo "✅ 恢复完成"
```

---

## 11. 安全加固

### 11.1 环境变量安全

```bash
# 设置严格的文件权限
chmod 600 .env.local
chown root:root .env.local

# 禁止 .env 文件被提交到 Git
echo ".env*" >> .gitignore
echo "!.env.example" >> .gitignore
```

### 11.2 Docker 安全

```bash
# 使用非 root 用户运行容器（已在 Dockerfile 中配置）
# 限制容器资源

# 在 docker-compose.yml 中添加：
services:
  app:
    # ... 其他配置
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M
```

### 11.3 网络安全

#### 配置防火墙

```bash
# UFW (Ubuntu)
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# 只允许本地访问 Redis
sudo ufw deny 6379
```

#### 限制 Docker 端口暴露

在生产环境中，修改 `docker-compose.yml`：

```yaml
services:
  redis:
    ports:
      - "127.0.0.1:6379:6379"  # 只监听本地

  redis-commander:
    profiles:
      - debug  # 生产环境不启动
```

### 11.4 HTTPS/SSL 配置

#### 使用 Let's Encrypt 免费证书

```bash
# 安装 Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# 获取证书（自动配置 Nginx）
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 自动续期
sudo certbot renew --dry-run

# 设置自动续期定时任务（已自动配置）
# /etc/cron.d/certbot
```

### 11.5 安全头配置

已在 Nginx 配置中包含：

```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

---

## 12. 性能优化

### 12.1 Redis 优化

```bash
# 修改 docker-compose.yml 中的 Redis 配置
services:
  redis:
    command: redis-server \
      --appendonly yes \
      --maxmemory 512mb \
      --maxmemory-policy allkeys-lru \
      --tcp-backlog 511 \
      --timeout 300 \
      --tcp-keepalive 60 \
      --maxclients 10000
```

### 12.2 Next.js 优化

在 `next.config.js` 中：

```javascript
module.exports = {
  compress: true,           // 启用 gzip 压缩
  poweredByHeader: false,   // 隐藏 X-Powered-By 头
  generateEtags: true,      // 生成 ETags

  images: {
    formats: ['image/avif', 'image/webp'],  // 现代图片格式
    minimumCacheTTL: 60,                    // 图片缓存时间
  },

  experimental: {
    optimizeCss: true,      // 优化 CSS
  },
}
```

### 12.3 数据库连接池

确保 Supabase 客户端使用连接池：

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    db: {
      schema: 'public',
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    global: {
      headers: {
        'x-connection-pool': 'true'
      }
    }
  }
)
```

### 12.4 CDN 配置

使用 Cloudflare 或其他 CDN 加速静态资源：

```javascript
// next.config.js
module.exports = {
  assetPrefix: process.env.NODE_ENV === 'production'
    ? 'https://cdn.your-domain.com'
    : '',
}
```

---

## 13. 故障排查

### 13.1 容器无法启动

**问题**: `docker compose up -d` 失败

**排查步骤**:

```bash
# 1. 查看详细错误日志
docker compose logs app

# 2. 检查环境变量
docker compose config

# 3. 验证镜像构建
docker compose build --no-cache

# 4. 检查端口占用
sudo lsof -i :3000
sudo netstat -tlnp | grep 3000

# 5. 检查磁盘空间
df -h

# 6. 检查 Docker 服务状态
sudo systemctl status docker
```

**常见原因**:
- ❌ 环境变量缺失或格式错误
- ❌ 端口已被占用
- ❌ 磁盘空间不足
- ❌ Docker 服务未运行

### 13.2 健康检查失败

**问题**: 容器显示 `unhealthy` 状态

**排查步骤**:

```bash
# 1. 查看健康检查日志
docker inspect vidfab-app | grep -A 10 Health

# 2. 手动测试健康检查端点
docker exec vidfab-app curl -f http://localhost:3000/api/health

# 3. 检查应用日志
docker compose logs --tail=50 app

# 4. 检查依赖服务
docker compose ps redis
redis-cli ping
```

**常见原因**:
- ❌ Redis 连接失败
- ❌ Supabase 配置错误
- ❌ 应用启动时间过长（增加 `start_period`）

### 13.3 Redis 连接错误

**问题**: `Error: Redis connection failed`

**排查步骤**:

```bash
# 1. 检查 Redis 容器状态
docker compose ps redis

# 2. 测试 Redis 连接
docker exec vidfab-redis redis-cli ping

# 3. 检查 Redis 日志
docker compose logs redis

# 4. 验证网络连通性
docker exec vidfab-app ping redis

# 5. 检查环境变量
docker exec vidfab-app printenv | grep REDIS
```

**解决方案**:

```bash
# 重启 Redis
docker compose restart redis

# 或重建 Redis 容器
docker compose up -d --force-recreate redis
```

### 13.4 内存泄漏

**问题**: 应用内存持续增长

**排查步骤**:

```bash
# 1. 监控内存使用
docker stats vidfab-app

# 2. 查看 Node.js 内存使用
docker exec vidfab-app node -e "console.log(process.memoryUsage())"

# 3. 生成堆快照
docker exec vidfab-app node --heapsnapshot-signal=SIGUSR2 app.js &
docker exec vidfab-app kill -USR2 <pid>
```

**解决方案**:

```yaml
# 在 docker-compose.yml 中限制内存
services:
  app:
    deploy:
      resources:
        limits:
          memory: 2G
    environment:
      - NODE_OPTIONS="--max-old-space-size=1536"
```

### 13.5 构建失败

**问题**: `npm run build` 失败

**排查步骤**:

```bash
# 1. 查看完整构建日志
docker compose build app 2>&1 | tee build.log

# 2. 检查 Node 版本
docker run --rm node:20-alpine node --version

# 3. 清理缓存重新构建
docker compose build --no-cache app

# 4. 本地测试构建
npm run build
```

**常见错误**:

```bash
# 错误: Missing environment variables
# 解决: 确保 .env 文件包含所有 NEXT_PUBLIC_ 变量

# 错误: Cannot find module
# 解决: 删除 node_modules 重新安装
rm -rf node_modules
npm install

# 错误: TypeScript compilation error
# 解决: 修复类型错误或临时禁用类型检查
# next.config.js:
module.exports = {
  typescript: {
    ignoreBuildErrors: true  // 仅临时使用
  }
}
```

### 13.6 SSL/TLS 证书问题

**问题**: HTTPS 无法访问或证书错误

**排查步骤**:

```bash
# 1. 测试证书
openssl s_client -connect your-domain.com:443 -servername your-domain.com

# 2. 验证证书有效期
sudo certbot certificates

# 3. 检查 Nginx 配置
sudo nginx -t

# 4. 查看 Nginx 错误日志
sudo tail -f /var/log/nginx/error.log
```

**解决方案**:

```bash
# 续期证书
sudo certbot renew --force-renewal

# 重载 Nginx
sudo systemctl reload nginx
```

---

## 14. 常见问题 FAQ

### Q1: 如何更换端口？

**A**: 修改 `.env.local` 或 `docker-compose.yml`：

```bash
# .env.local
PORT=8080

# docker-compose.yml
services:
  app:
    ports:
      - "8080:8080"
```

### Q2: 如何扩展到多实例？

**A**: 使用 Docker Compose 的 scale 功能：

```bash
# 启动 3 个应用实例
docker compose up -d --scale app=3

# 配合 Nginx 负载均衡
upstream vidfab_app {
    server 127.0.0.1:3000;
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
}
```

### Q3: 如何迁移到新服务器？

**A**: 迁移步骤：

```bash
# 旧服务器
1. ./scripts/backup.sh           # 创建备份
2. scp backup.tar.gz new-server:/tmp/

# 新服务器
3. 安装 Docker 和 Docker Compose
4. git clone 项目代码
5. ./scripts/restore.sh /tmp/backup.tar.gz
6. ./scripts/docker-start.sh
7. 配置域名 DNS 指向新服务器
```

### Q4: 如何查看应用性能指标？

**A**: 使用内置 API 或监控工具：

```bash
# API 端点
curl http://localhost:3000/api/health
curl http://localhost:3000/api/metrics  # 如果已实现

# Docker 统计
docker stats vidfab-app

# 系统资源
htop
iotop
```

### Q5: 如何处理数据库迁移？

**A**: Supabase 使用 SQL 迁移：

```bash
# 1. 在 Supabase 控制台 SQL 编辑器执行迁移
# 2. 或使用 Supabase CLI
npx supabase migration new add_new_table
npx supabase migration up
```

### Q6: 如何禁用 Redis Commander？

**A**: Redis Commander 默认仅在 `debug` profile 中启用：

```bash
# 不启动 Redis Commander（默认）
docker compose up -d

# 启动 Redis Commander（调试时）
docker compose --profile debug up -d

# 停止 Redis Commander
docker compose stop redis-commander
```

### Q7: 如何配置邮件服务？

**A**: 在 `.env.local` 中配置 AWS SES：

```bash
AWS_SES_SMTP_HOST=email-smtp.us-west-1.amazonaws.com
AWS_SES_SMTP_USERNAME=your_username
AWS_SES_SMTP_PASSWORD=your_password
AWS_SES_FROM_EMAIL=noreply@yourdomain.com
```

### Q8: 如何更新应用到最新版本？

**A**: 使用滚动更新脚本（见 [7.3](#73-滚动更新零停机部署)）：

```bash
# 标准更新流程
git pull origin main
docker compose build --no-cache
docker compose up -d
```

### Q9: 如何排查 "502 Bad Gateway" 错误？

**A**: 检查以下几点：

```bash
# 1. 应用是否正常运行
docker compose ps app

# 2. 应用日志
docker compose logs app

# 3. Nginx 配置
sudo nginx -t

# 4. 健康检查
curl http://localhost:3000/api/health

# 5. 网络连通性
telnet localhost 3000
```

### Q10: 如何配置自定义域名？

**A**: 三个步骤：

1. **DNS 配置**: 添加 A 记录指向服务器 IP
2. **SSL 证书**: `sudo certbot --nginx -d your-domain.com`
3. **环境变量**: 更新 `NEXT_PUBLIC_APP_URL` 和 `NEXTAUTH_URL`

---

## 附录

### A. 快速命令参考

```bash
# 启动服务
./scripts/docker-start.sh

# 停止服务
./scripts/docker-stop.sh

# 查看日志
./scripts/docker-logs.sh

# 重新构建
docker compose build --no-cache && docker compose up -d

# 查看状态
docker compose ps

# 健康检查
curl http://localhost:3000/api/health

# 进入容器
docker exec -it vidfab-app sh

# 查看资源使用
docker stats

# 备份数据
./scripts/backup.sh

# 查看环境变量
docker exec vidfab-app printenv
```

### B. 目录结构

```
vidfab/
├── app/                    # Next.js App Router 应用代码
├── public/                 # 静态资源
├── lib/                    # 共享库
├── components/             # React 组件
├── scripts/                # 运维脚本
│   ├── docker-start.sh    # 启动脚本
│   ├── docker-stop.sh     # 停止脚本
│   ├── docker-logs.sh     # 日志查看脚本
│   └── docker-build.sh    # 构建脚本
├── logs/                   # 日志目录（被 .gitignore）
├── docs/                   # 文档目录
│   ├── deployment-guide.md
│   ├── environment-variables.md
│   └── ops-deployment-guide.md  # 本文档
├── docker-compose.yml      # Docker Compose 配置
├── Dockerfile              # Docker 镜像构建文件
├── .env.example            # 环境变量模板
├── .env.local              # 实际环境变量（不提交）
├── .env                    # Docker 构建变量（不提交）
├── .gitignore              # Git 忽略配置
├── package.json            # npm 依赖配置
└── next.config.js          # Next.js 配置
```

### C. 相关文档

- [部署策略指南](./deployment-guide.md)
- [环境变量详解](./environment-variables.md)
- [Next.js 官方文档](https://nextjs.org/docs)
- [Docker 官方文档](https://docs.docker.com)
- [Supabase 官方文档](https://supabase.com/docs)

### D. 联系支持

- **技术支持**: support@yourdomain.com
- **紧急联系**: +86-xxx-xxxx-xxxx
- **GitHub Issues**: https://github.com/jacobGor123/vidfab/issues
- **文档更新**: [项目 Wiki](https://github.com/jacobGor123/vidfab/wiki)

---

**文档维护**: 请在每次部署变更后更新此文档。

**版本历史**:
- v1.0.0 (2025-10-13): 初始版本

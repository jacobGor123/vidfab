# VidFab Scripts 脚本说明

## 📋 可用脚本

### 🚀 开发环境
- `./scripts/dev.sh` - **统一开发环境启动** (推荐)
  - 自动启动 Redis + 队列系统 + Next.js 开发服务器
  - 一键启动完整开发环境
  - 优雅关闭所有服务 (Ctrl+C)
  - 带彩色日志输出和进程管理

### 🔧 独立服务启动 (可选)
如需单独启动某个服务，可使用以下脚本：
- `./scripts/redis-start.sh` - 单独启动 Redis
- `./scripts/redis-stop.sh` - 停止 Redis

### 🏗️ 构建和部署
- `./scripts/build.sh` - 构建生产版本
- `./scripts/start.sh` - 启动生产服务器
- `./scripts/lint.sh` - 运行代码检查

### 🛠️ 维护相关
- `./scripts/install.sh` - 安装依赖包
- `./scripts/clean.sh` - 清理构建产物
- `./scripts/clean.sh --full` - 完全清理（包括node_modules）

### 📊 数据库管理
- `./scripts/setup-database.sh` - 初始化数据库
- `./scripts/migrate-database.sh` - 运行数据库迁移
- `./scripts/seed-database.sh` - 填充测试数据

## 🚀 快速开始

### 一键启动开发环境
```bash
# 启动完整开发环境（Redis + 队列 + Next.js）
./scripts/dev.sh
```

启动后你将看到：
- 🌍 Next.js 应用: http://localhost:3000
- 🔗 Redis: localhost:6379
- ⚡ 队列工作进程在后台运行
- 📝 所有日志自动记录到 `logs/` 目录

### 分步启动（可选）
```bash
# 1. 先启动 Redis
./scripts/redis-start.sh

# 2. 然后启动开发服务器（包含队列）
./scripts/dev.sh
```

### 构建和部署
```bash
# 构建项目
./scripts/build.sh

# 启动生产服务器
./scripts/start.sh
```

## 📝 日志记录

所有脚本都会自动记录日志到 `logs/` 目录：
- **格式**: `服务名称-YYYY-MM-DD_HH-MM-SS.log`
- **统一开发环境日志**:
  - `nextjs-dev-[timestamp].log` - Next.js 开发服务器日志
  - `queue-worker-[timestamp].log` - 队列工作进程日志
- **进程跟踪**: 所有进程 PID 保存在 `logs/` 目录

### 查看实时日志
```bash
# 查看 Next.js 日志
tail -f logs/nextjs-dev-*.log

# 查看队列工作进程日志
tail -f logs/queue-worker-*.log

# Redis 日志
docker logs vidfab-redis -f
```

## 🔧 使用规范

根据项目规范，**所有运行和调试操作都必须使用scripts目录下的.sh脚本**，禁止直接使用 `npm`、`pnpm` 等命令。

## 🛑 停止服务

- **统一开发环境**: 使用 `Ctrl+C` 优雅停止所有服务
- **单独服务**: 使用各自的停止脚本

## 💡 开发建议

1. **推荐使用统一启动**: `./scripts/dev.sh` 一键启动所有必要服务
2. **查看日志**: 遇到问题时检查 `logs/` 目录下的相应日志文件
3. **Redis 管理**: 使用 `docker exec -it vidfab-redis redis-cli` 进入 Redis 命令行
4. **服务状态**: 使用 `docker ps` 查看 Redis 容器状态
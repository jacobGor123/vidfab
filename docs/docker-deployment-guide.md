# Docker 部署指南 - 压缩功能版本

## 📋 前提条件

- ✅ EC2 服务器已安装 Docker 和 Docker Compose
- ✅ 项目代码已部署到 EC2
- ✅ `.env` 或 `.env.local` 文件已配置

## 🚀 部署步骤（完整流程）

### 步骤 1：SSH 登录到 EC2 服务器

```bash
ssh your-ec2-server
# 例如：ssh ubuntu@ec2-xx-xx-xx-xx.compute.amazonaws.com
```

### 步骤 2：进入项目目录

```bash
cd /path/to/vidfab
# 例如：cd /home/ubuntu/vidfab
```

### 步骤 3：拉取最新代码

```bash
# 检查当前分支
git branch

# 拉取最新代码
git pull origin master
# 或者如果你在其他分支：git pull origin <branch-name>
```

### 步骤 4：查看更改的文件

```bash
git log --oneline -5
# 应该看到：feat: 添加图片和视频自动压缩功能
```

### 步骤 5：停止现有容器

```bash
# 使用项目脚本（推荐）
./scripts/docker-stop.sh

# 或者直接使用 docker-compose
docker-compose down
```

### 步骤 6：重新构建 Docker 镜像

⚠️ **重要！必须重新构建，因为 Dockerfile 已修改（添加了 ffmpeg）**

```bash
# 使用项目脚本（推荐）
./scripts/docker-build.sh

# 或者直接使用 docker-compose
docker-compose build --no-cache
```

**说明：**
- `--no-cache`：强制重新构建，不使用缓存
- 构建时间：约 2-5 分钟（取决于网络速度）

### 步骤 7：启动新容器

```bash
# 使用项目脚本（推荐）
./scripts/docker-start.sh

# 或者直接使用 docker-compose
docker-compose up -d
```

### 步骤 8：验证 ffmpeg 安装

```bash
# 进入容器
docker exec -it vidfab-app sh

# 检查 ffmpeg 版本
ffmpeg -version

# 应该看到类似输出：
# ffmpeg version 6.x.x
# built with gcc 12.x.x (Alpine 12.x.x)

# 退出容器
exit
```

### 步骤 9：查看日志

```bash
# 查看实时日志
docker-compose logs -f app

# 或者使用项目脚本
./scripts/docker-logs.sh

# 只看最近 50 行
docker-compose logs --tail=50 app
```

### 步骤 10：测试上传功能

1. 访问管理后台：`https://your-domain.com/admin/discover/new`
2. 上传一个大于 1MB 的视频
3. 查看日志，确认压缩成功：

```bash
docker-compose logs -f app | grep "压缩"
```

应该看到：
```
原始视频大小: 5.23MB
视频超过 1MB，开始压缩...
压缩后视频大小: 0.98MB
```

## 📝 完整命令汇总（复制粘贴版）

```bash
# 1. SSH 登录
ssh your-ec2-server

# 2. 进入项目目录
cd /path/to/vidfab

# 3. 拉取最新代码
git pull origin master

# 4. 停止容器
./scripts/docker-stop.sh

# 5. 重新构建镜像（重要！）
./scripts/docker-build.sh

# 6. 启动容器
./scripts/docker-start.sh

# 7. 验证 ffmpeg
docker exec -it vidfab-app ffmpeg -version

# 8. 查看日志
./scripts/docker-logs.sh
```

## 🔍 故障排查

### 问题 1：ffmpeg 命令未找到

**症状：**
```
视频压缩失败: ffmpeg 未安装
```

**解决：**
```bash
# 1. 检查是否重新构建了镜像
docker images | grep vidfab

# 2. 如果镜像构建时间是旧的，重新构建
docker-compose build --no-cache

# 3. 重启容器
docker-compose down && docker-compose up -d
```

### 问题 2：容器无法启动

**症状：**
```
docker-compose up -d
# 容器立即退出
```

**解决：**
```bash
# 查看错误日志
docker-compose logs app

# 常见原因：
# - .env 文件缺失或配置错误
# - 端口被占用
# - 依赖服务（如 Redis）未启动
```

### 问题 3：构建时间过长

**症状：**
```
docker-compose build 卡住很久
```

**解决：**
```bash
# 使用国内镜像加速（可选）
# 编辑 /etc/docker/daemon.json
sudo vi /etc/docker/daemon.json

# 添加：
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn"
  ]
}

# 重启 Docker
sudo systemctl restart docker
```

### 问题 4：视频压缩失败但图片正常

**症状：**
```
图片上传成功，视频上传失败
```

**解决：**
```bash
# 1. 进入容器检查 ffmpeg
docker exec -it vidfab-app sh
ffmpeg -version
exit

# 2. 检查 /tmp 目录权限
docker exec -it vidfab-app ls -la /tmp

# 3. 如果 /tmp 没有写权限，需要修改 Dockerfile
```

## 🛠️ 高级配置

### 修改压缩参数

如果 1MB 的视频限制太严格，可以修改：

```bash
# 1. 编辑 API 文件
vi app/api/admin/discover/route.ts

# 2. 找到第 126 行，修改 targetSizeMB
const compressResult = await compressVideo(buffer, {
  targetSizeMB: 2  // 改为 2MB
})

# 3. 重新构建并部署
git add .
git commit -m "调整视频压缩目标大小为 2MB"
git push
# 然后在 EC2 上执行部署步骤
```

### 添加日志输出到文件

项目已经配置了日志挂载：

```yaml
# docker-compose.yml
volumes:
  - ./logs:/app/logs
```

在 EC2 上查看日志文件：
```bash
cd /path/to/vidfab
tail -f logs/app.log
```

## 📊 监控和维护

### 查看容器状态

```bash
# 查看运行中的容器
docker ps

# 查看容器资源使用
docker stats vidfab-app

# 查看容器详细信息
docker inspect vidfab-app
```

### 定期清理

```bash
# 清理未使用的镜像（节省空间）
docker image prune -a

# 清理未使用的容器
docker container prune

# 清理未使用的卷
docker volume prune
```

### 备份和回滚

```bash
# 备份当前代码
git tag backup-$(date +%Y%m%d-%H%M%S)
git push --tags

# 回滚到上一个版本
git log --oneline
git checkout <commit-hash>
./scripts/docker-stop.sh
./scripts/docker-build.sh
./scripts/docker-start.sh
```

## 🔐 安全建议

1. **不要在 Docker 镜像中包含敏感信息**
   - `.env` 文件应该在 `.dockerignore` 中

2. **定期更新基础镜像**
   ```bash
   docker pull node:20-alpine
   docker-compose build --no-cache
   ```

3. **限制容器资源使用**
   ```yaml
   # docker-compose.yml
   services:
     app:
       deploy:
         resources:
           limits:
             cpus: '2'
             memory: 4G
   ```

## 📞 需要帮助？

如果遇到问题：
1. 查看日志：`./scripts/docker-logs.sh`
2. 检查容器状态：`docker ps -a`
3. 进入容器调试：`docker exec -it vidfab-app sh`
4. 联系开发团队

## 📚 相关文档

- [媒体压缩功能文档](./media-compression-feature.md)
- [Admin Dashboard 部署指南](./admin-dashboard-deployment-guide.md)
- [Docker 官方文档](https://docs.docker.com/)

## 🔄 更新日志

### 2025-11-04
- ✅ Dockerfile 添加 ffmpeg 支持
- ✅ 编写完整的 Docker 部署指南
- ✅ 添加故障排查章节

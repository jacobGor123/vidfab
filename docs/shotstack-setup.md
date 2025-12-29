# Shotstack API 设置指南

## 1. 注册 Shotstack 账号

访问：https://shotstack.io/register/

免费额度：**每月 20 次视频渲染**

## 2. 获取 API Key

1. 登录后访问：https://dashboard.shotstack.io/
2. 点击左侧菜单 **"API Keys"**
3. 复制你的 API Key（以 `pXXXXXXXXXXXXXXXX` 开头）

## 3. 配置环境变量

### 本地开发（.env.local）

在 `.env.local` 文件添加：

```bash
# Shotstack API (视频合成服务)
SHOTSTACK_API_KEY=你的_API_KEY
SHOTSTACK_API_URL=https://api.shotstack.io/v1
```

### Vercel 生产环境

1. 打开 Vercel 项目设置：https://vercel.com/your-project/settings/environment-variables

2. 添加以下环境变量：
   - `SHOTSTACK_API_KEY`: 你的 API Key
   - `SHOTSTACK_API_URL`: `https://api.shotstack.io/v1`

3. 适用范围：选择 **Production, Preview, Development**

4. 保存后重新部署

## 4. 测试

部署完成后，尝试使用 Video Agent 的视频合成功能：

1. 生成分镜和视频片段
2. 点击 "Start Composition" 按钮
3. 查看 Vercel 日志，应该看到：
   ```
   [Shotstack] 🎬 开始拼接视频
   [Shotstack] 📤 提交渲染任务...
   [Shotstack] ✅ 渲染任务已提交: xxx-xxx-xxx
   [Shotstack] ⏳ 等待渲染完成...
   [Shotstack] ✅ 视频合成完成
   ```

## 5. 功能说明

### 当前支持
- ✅ 视频拼接（多个片段合成一个视频）
- ✅ 过渡效果（淡入淡出、交叉淡化）
- ✅ 背景音乐添加
- ✅ 自定义宽高比（16:9 或 9:16）

### 暂不支持（后续添加）
- ⚠️ 旁白音频（ElevenLabs TTS + Shotstack 音频轨道）
- ⚠️ 字幕叠加

## 6. 定价参考

- **免费版**: 20 次/月
- **Starter**: $29/月，200 次渲染
- **Pro**: $99/月，1000 次渲染

官方定价：https://shotstack.io/pricing/

## 7. API 文档

- 核心概念：https://shotstack.io/docs/guide/getting-started/core-concepts/
- 视频拼接：https://shotstack.io/docs/guide/using-sequences/
- 音频混合：https://shotstack.io/docs/guide/using-audio/

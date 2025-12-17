# 测试指南

## 测试策略

### 单元测试
- API 调用 Mock 测试
- 函数逻辑验证
- 边界条件测试

### 集成测试
- 完整工作流测试（2-3 个分镜）
- API 真实调用测试
- 数据库持久化测试

### 端到端测试
- 两种模式完整流程
- 错误恢复测试
- 性能测试

---

## 测试检查清单

### Phase 1: 首尾帧链式过渡

- [ ] 数据库字段 `last_frame_url` 已添加
- [ ] 第一个片段使用分镜图作为首帧
- [ ] 第二个片段使用第一个片段的末尾帧
- [ ] 末尾帧 URL 正确保存到数据库
- [ ] 日志显示 `firstFrameSource: previous_last_frame`
- [ ] 视觉检查：片段 1 末尾与片段 2 开头连贯

### Phase 2: 统一时长和淡入淡出

- [ ] 所有分镜时长为 5 秒
- [ ] FFmpeg xfade 滤镜正确执行
- [ ] 视频总时长 = (片段数 × 5) - ((片段数 - 1) × 0.5)
- [ ] 视觉检查：片段之间有淡入淡出
- [ ] 音视频同步

### Phase 3: Doubao TTS 集成

- [ ] Doubao TTS API 调用成功
- [ ] 旁白音频保存到数据库
- [ ] 每个视频片段成功添加旁白
- [ ] 旁白清晰可听

### Phase 4: Veo3.1 和字幕

- [ ] Veo3.1 生成的视频无音频轨道
- [ ] SRT 字幕文件正确生成
- [ ] 字幕显示在视频中
- [ ] 字幕与旁白同步

---

## 快速测试脚本

### 测试 Phase 1

```bash
node scripts/test-last-frame-transition.js
```

**scripts/test-last-frame-transition.js:**
```javascript
const { batchGenerateVideosWithTransition } = require('../lib/services/video-agent/video-generator')

async function test() {
  const result = await batchGenerateVideosWithTransition(
    [
      { shot_number: 1, image_url: 'https://...', status: 'success' },
      { shot_number: 2, image_url: 'https://...', status: 'success' }
    ],
    [
      { shot_number: 1, duration_seconds: 5, description: '...', /* ... */ },
      { shot_number: 2, duration_seconds: 5, description: '...', /* ... */ }
    ],
    { userId: 'test', resolution: '720p' }
  )

  console.assert(result[0].lastFrameUrl, 'Clip 1 should have lastFrameUrl')
  console.assert(result[1].status === 'completed', 'Clip 2 should complete')
  console.log('✓ Phase 1 test passed')
}

test()
```

### 完整端到端测试

```bash
npm run test:e2e:video-agent
```

---

## 性能基准

| 阶段 | 操作 | 预期时间 |
|-----|------|---------|
| Phase 1 | 生成 1 个视频片段 | 30-60 秒 |
| Phase 1 | 生成 6 个视频片段（顺序） | 3-6 分钟 |
| Phase 2 | FFmpeg xfade 拼接 6 个片段 | 10-30 秒 |
| Phase 3 | Doubao TTS 生成 6 段旁白 | 5-15 秒 |
| Phase 4 | 添加字幕 | 5-10 秒 |
| **总计** | 完整流程（6 个片段） | **4-8 分钟** |

---

## 常见问题排查

### 首尾帧链式失败

1. 检查 BytePlus API 响应是否包含 `last_frame_url`
2. 检查数据库字段是否正确保存
3. 查看日志确认 `firstFrameSource`

### 视频拼接失败

1. 检查 FFmpeg 版本 >= 4.3
2. 检查临时文件是否存在
3. 查看 FFmpeg 日志定位错误

### Doubao TTS 调用失败

1. 验证 API 凭证正确
2. 检查网络连接
3. 查看 API 响应错误信息

---

## 测试报告模板

```markdown
# Video Agent 测试报告

**测试日期：** 2025-XX-XX
**测试人员：** XXX
**测试环境：** Production / Staging

## Phase 1: 首尾帧链式过渡
- [ ] 通过 / [ ] 失败
- 问题：

## Phase 2: 统一时长和淡入淡出
- [ ] 通过 / [ ] 失败
- 问题：

## Phase 3: Doubao TTS
- [ ] 通过 / [ ] 失败
- 问题：

## Phase 4: Veo3.1 和字幕
- [ ] 通过 / [ ] 失败
- 问题：

## 总结
- 成功率：X/4
- 主要问题：
- 下一步行动：
```

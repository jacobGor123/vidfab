# Phase 4 快速启动指南

## 🚀 立即测试

### 1️⃣ 验证 Poster 文件

```bash
./scripts/verify-posters.sh
```

**预期输出**:
```
✅ 已找到: 14 / 14
✅ 平均大小: 54.61 KB
🎉 所有 poster 验证通过！
```

---

### 2️⃣ 启动开发服务器

```bash
./scripts/dev.sh
```

**访问**: http://localhost:3000

---

### 3️⃣ 检查 Poster 效果

1. 打开首页
2. 滚动到 **Community CTA** 部分（底部瀑布流视频）
3. 打开 Chrome DevTools
4. 切换到 **Network** 标签
5. 筛选 **Img** 类型
6. 刷新页面

**预期结果**:
- ✅ 应该看到 `discover-new-*.webp` 文件加载（~50KB）
- ✅ Poster 图立即显示（不再黑屏）
- ✅ 视频在 poster 显示后才开始加载

---

### 4️⃣ Lighthouse 性能测试

```bash
npm run lighthouse
```

**预期分数**:
- Performance: **85-92** (之前 80-85)
- LCP: **< 2.5s** (目标 1.8-2.2s)
- FCP: **< 1.5s**

---

## 📊 已完成工作

### ✅ 脚本工具

- `scripts/generate-posters.sh` - Poster 生成脚本
- `scripts/verify-posters.sh` - Poster 验证脚本

### ✅ 工具函数

- `lib/utils/video-poster.ts` - Poster 工具函数库

### ✅ 组件更新

- `components/sections/community-cta.tsx` - 添加 poster 属性

### ✅ 生成文件

- `public/posters/discover-new/` - 14 个 WebP poster（平均 54KB）

### ✅ 配置更新

- `.gitignore` - 添加 tmp/ 和 queue-worker.js

### ✅ 文档

- `discuss/poster-implementation-report.md` - 详细实施报告
- `discuss/phase-4-poster-completion-summary.md` - 总结报告
- `discuss/QUICK-START-PHASE-4.md` - 本文档

---

## 🎯 预期性能提升

| 指标 | Phase 3 | Phase 4 | 改善 |
|-----|---------|---------|------|
| **Lighthouse** | 80-85 | **85-92** | +5-7 分 |
| **LCP** | 2.5s | **1.8-2.2s** | -28-36% |
| **首屏带宽** | 5MB | **3-4MB** | -20-40% |

---

## 📝 下一步

### 必需

1. ✅ 验证 poster 文件
2. ⏳ 本地测试
3. ⏳ Lighthouse 验证
4. ⏳ 提交代码

### 可选

1. 上传 poster 到 CDN
2. 为其他页面视频生成 poster
3. 优化 discover-new-13.webp（107KB → 100KB）

---

## 💡 提示

如果遇到问题：

1. **Poster 显示不正常**
   ```bash
   # 重新生成
   ./scripts/generate-posters.sh --force
   ```

2. **文件缺失**
   ```bash
   # 验证文件
   ./scripts/verify-posters.sh
   ```

3. **性能未改善**
   - 清除浏览器缓存
   - 使用无痕模式测试
   - 检查 Network 标签确认 poster 已加载

---

**准备好了吗？开始测试吧！** 🚀

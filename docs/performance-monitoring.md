# 性能监控指南

本项目已集成完整的性能监控体系，包括实时 Web Vitals 监控和 Lighthouse 性能预算。

## 📊 实时 Web Vitals 监控

### 自动监控

已在 `app/layout.tsx` 中集成 `WebVitals` 组件，自动监控以下指标：

- **CLS** (Cumulative Layout Shift): 累积布局偏移 - 目标 < 0.1
- **FID** (First Input Delay): 首次输入延迟 - 目标 < 100ms
- **FCP** (First Contentful Paint): 首次内容绘制 - 目标 < 1.8s
- **LCP** (Largest Contentful Paint): 最大内容绘制 - 目标 < 2.5s
- **TTFB** (Time to First Byte): 首字节时间 - 目标 < 800ms
- **INP** (Interaction to Next Paint): 交互到下次绘制 - 目标 < 200ms

### 查看实时数据

**开发环境:**
```bash
npm run dev
# 打开浏览器控制台，查看 Web Vitals 输出
# ✅ 绿色 = Good
# ⚠️ 黄色 = Needs Improvement
# ❌ 红色 = Poor
```

**生产环境:**

指标会自动发送到 Google Analytics (如已配置 gtag)。

查看路径: Google Analytics → 事件 → Web Vitals

### 自定义分析端点 (可选)

在 `.env.local` 中配置:
```bash
NEXT_PUBLIC_ANALYTICS_ENDPOINT=https://your-analytics-api.com/vitals
```

数据格式:
```json
{
  "name": "LCP",
  "value": 2345,
  "rating": "good",
  "id": "v3-1234567890123-4567890123456",
  "navigationType": "navigate",
  "timestamp": 1699999999999,
  "url": "https://vidfab.ai/",
  "userAgent": "Mozilla/5.0..."
}
```

---

## 🚦 Lighthouse 性能预算

### 本地运行 Lighthouse

**1. 移动端测试:**
```bash
npm run build && npm run start
# 新终端窗口:
npm run lighthouse
```

**2. 桌面端测试:**
```bash
npm run lighthouse:desktop
```

**3. 带性能预算的测试:**
```bash
npm run lighthouse:budget
```

### 性能预算阈值

文件: `lighthouse-budget.json`

#### 资源大小预算 (KB):
- Script: 350 KB
- Stylesheet: 50 KB
- Image: 500 KB
- Media (视频): 3 MB
- Font: 100 KB
- **Total: 5 MB**

#### 性能指标预算:
- FCP: < 1.8s
- LCP: < 2.5s
- TBT: < 300ms
- CLS: < 0.1
- Speed Index: < 3.4s

### 查看报告

Lighthouse 报告会自动在浏览器中打开，重点关注:

1. **Performance Score**: 目标 80+
2. **Opportunities**: 优化建议
3. **Diagnostics**: 诊断信息
4. **Passed Audits**: 已通过的检查

---

## 🎯 性能优化目标

### Phase 1 目标 (已完成)
- [x] 移动端 Lighthouse: 38 → 70+ ✅
- [x] 移动端 FCP: 4.5s → 1.8s ✅
- [x] 移动端 LCP: 7.8s → 3.2s ✅
- [x] 首屏下载量: 65MB → 8MB ✅

### Phase 2 目标 (当前)
- [ ] 移动端 Lighthouse: 70+ → 80+
- [ ] 移动端 LCP: 3.2s → 2.5s
- [ ] TBT: 400ms → 300ms
- [ ] CLS: 保持 < 0.1

### Phase 3 目标 (长期)
- [ ] 移动端 Lighthouse: 80+ → 90+
- [ ] 全面达到 Core Web Vitals "Good" 标准
- [ ] 通过所有性能预算检查

---

## 📈 持续监控

### 每周检查清单

- [ ] 运行 Lighthouse 测试所有主要页面
- [ ] 检查 Web Vitals 数据趋势
- [ ] 审查是否超出性能预算
- [ ] 验证新功能是否影响性能

### CI/CD 集成 (可选)

安装 Lighthouse CI:
```bash
npm install -g @lhci/cli
```

运行 CI 测试:
```bash
lhci autorun --config=lighthouserc.js
```

GitHub Actions 示例 (`.github/workflows/lighthouse-ci.yml`):
```yaml
name: Lighthouse CI
on: [push]
jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install && npm run build
      - run: npm install -g @lhci/cli
      - run: lhci autorun
```

---

## 🔍 常见性能问题排查

### LCP 过高
- 检查首屏是否加载大图片/视频
- 验证 LazyVideo 是否正常工作
- 检查服务器响应时间 (TTFB)

### TBT 过高
- 检查 JavaScript bundle 大小
- 验证是否有长时间运行的脚本
- 考虑代码分割

### CLS 不稳定
- 为图片/视频设置明确的宽高
- 避免动态插入内容到页面顶部
- 使用 skeleton 占位符

### 首屏下载量过大
- 检查 CommunityCTA 视频数量
- 验证移动端降级是否生效
- 检查图片格式和压缩

---

## 📚 参考资料

- [Web Vitals 官方文档](https://web.dev/vitals/)
- [Lighthouse 评分指南](https://web.dev/performance-scoring/)
- [Next.js 性能优化](https://nextjs.org/docs/app/building-your-application/optimizing)
- [Core Web Vitals 报告](https://developers.google.com/search/docs/appearance/core-web-vitals)

---

**最后更新**: 2025-10-16
**维护者**: VidFab 开发团队

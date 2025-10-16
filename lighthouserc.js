module.exports = {
  ci: {
    collect: {
      // 收集配置
      numberOfRuns: 3, // 运行 3 次取中位数
      startServerCommand: 'npm run build && npm run start',
      startServerReadyPattern: 'Ready',
      url: [
        'http://localhost:3000/', // 首页
        'http://localhost:3000/text-to-video', // Text-to-Video 落地页
        'http://localhost:3000/image-to-video', // Image-to-Video 落地页
        'http://localhost:3000/ai-video-effects', // AI Video Effects 落地页
        'http://localhost:3000/pricing', // Pricing 页面
      ],
      settings: {
        preset: 'desktop', // 或 'mobile'
        budgetsFile: './lighthouse-budget.json', // 性能预算文件
        throttling: {
          // 模拟 Fast 3G 网络
          rttMs: 40,
          throughputKbps: 1638.4,
          cpuSlowdownMultiplier: 4,
        },
      },
    },
    upload: {
      target: 'temporary-public-storage', // 临时存储结果（7天）
      // 如需永久存储，可使用 Lighthouse Server
      // target: 'lhci',
      // serverBaseUrl: 'https://your-lhci-server.com',
      // token: process.env.LHCI_TOKEN,
    },
    assert: {
      // 断言规则 - 如果不满足则 CI 失败
      assertions: {
        // Core Web Vitals
        'first-contentful-paint': ['error', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 3000 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['warn', { maxNumericValue: 400 }],
        'max-potential-fid': ['warn', { maxNumericValue: 200 }],

        // Performance Score
        'categories:performance': ['warn', { minScore: 0.8 }],
        'categories:accessibility': ['warn', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
        'categories:seo': ['warn', { minScore: 0.9 }],

        // 资源大小
        'resource-summary:script:size': ['warn', { maxNumericValue: 350000 }],
        'resource-summary:stylesheet:size': ['warn', { maxNumericValue: 50000 }],
        'resource-summary:image:size': ['warn', { maxNumericValue: 500000 }],
        'resource-summary:total:size': ['warn', { maxNumericValue: 5000000 }],

        // 性能最佳实践
        'uses-text-compression': 'off', // 生产环境由 CDN 处理
        'uses-responsive-images': 'warn',
        'offscreen-images': 'warn',
        'render-blocking-resources': 'warn',
        'unminified-css': 'error',
        'unminified-javascript': 'error',
        'unused-css-rules': 'warn',
        'unused-javascript': 'warn',
        'modern-image-formats': 'warn',
        'uses-optimized-images': 'warn',
        'uses-webp-images': 'warn',

        // 可访问性
        'color-contrast': 'warn',
        'image-alt': 'error',
        'button-name': 'error',
        'link-name': 'error',

        // SEO
        'meta-description': 'error',
        'document-title': 'error',
        'link-text': 'warn',
      },
    },
  },
}

/**
 * Next.js Instrumentation
 * 在应用启动时执行的初始化代码
 *
 * 文档: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 *
 * 🔄 CLOUD NATIVE MIGRATION:
 * - ❌ 禁用了 node-cron 定时任务
 * - ✅ 现在使用 Vercel Cron + Inngest Functions
 * - 配置文件: vercel.json
 * - Cron 端点: /api/cron/generate-blog
 * - Inngest 函数: lib/inngest/functions/blog-generation.ts
 */

export async function register() {
  // 仅在 Node.js 运行时执行（不在 Edge Runtime）
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // ❌ 禁用旧的 node-cron 定时任务
    // const { initBlogSystem } = await import('./lib/blog/init')
    // initBlogSystem()

    console.log('✅ Using Vercel Cron + Inngest instead of node-cron')
    console.log('📅 Cron schedule configured in vercel.json')
    console.log('🔗 Cron endpoint: /api/cron/generate-blog')
    console.log('⚡ Inngest function: blog/generate.requested')
  }
}

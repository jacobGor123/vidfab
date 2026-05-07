/**
 * Next.js Instrumentation
 * 在应用启动时执行的初始化代码
 *
 * 文档: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // 仅在 Node.js 运行时执行（不在 Edge Runtime）
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // 当前无需启动时初始化任务
  }
}

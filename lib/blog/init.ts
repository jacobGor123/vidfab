/**
 * Blog System Initialization
 * 在应用启动时初始化博客相关的定时任务
 *
 * 使用方法:
 * 在 server.ts 或 instrumentation.ts 中调用 initBlogSystem()
 */

import { startBlogCronJobs, stopBlogCronJobs } from './cron-service'

let isInitialized = false

/**
 * 初始化博客系统
 * 启动定时任务
 */
export function initBlogSystem() {
  if (isInitialized) {
    console.log('⚠️  博客系统已经初始化过了')
    return
  }

  console.log('\n' + '='.repeat(60))
  console.log('🚀 初始化博客系统...')
  console.log('='.repeat(60))

  try {
    // 启动定时任务
    startBlogCronJobs()

    isInitialized = true

    console.log('✅ 博客系统初始化完成')
    console.log('='.repeat(60) + '\n')

  } catch (error: any) {
    console.error('❌ 博客系统初始化失败:', error.message)
    console.error('='.repeat(60) + '\n')
    throw error
  }
}

/**
 * 关闭博客系统
 * 停止定时任务
 */
export function shutdownBlogSystem() {
  if (!isInitialized) {
    return
  }

  console.log('\n' + '='.repeat(60))
  console.log('🛑 关闭博客系统...')
  console.log('='.repeat(60))

  try {
    // 停止定时任务
    stopBlogCronJobs()

    isInitialized = false

    console.log('✅ 博客系统已关闭')
    console.log('='.repeat(60) + '\n')

  } catch (error: any) {
    console.error('❌ 博客系统关闭失败:', error.message)
    console.error('='.repeat(60) + '\n')
  }
}

/**
 * 检查博客系统是否已初始化
 */
export function isBlogSystemInitialized(): boolean {
  return isInitialized
}

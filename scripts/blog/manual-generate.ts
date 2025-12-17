#!/usr/bin/env tsx

/**
 * 手动触发博客生成
 * 用于测试和调试博客生成流程
 */

// 🔥 关键:在导入任何模块之前加载环境变量
import { config } from 'dotenv'
import path from 'path'
config({ path: path.join(process.cwd(), '.env.local') })

async function main() {
  console.log('\n🚀 手动触发博客生成...\n')

  // 动态导入确保环境变量已加载
  const { inngest } = await import('@/lib/inngest/client')

  try {
    console.log('📤 发送生成请求到 Inngest...')

    const result = await inngest.send({
      name: 'blog/generate.requested',
      data: {
        force: true,  // 强制生成
        source: 'manual',  // 手动触发
        triggeredBy: 'script',
      }
    })

    console.log('\n✅ 生成请求已发送!')
    console.log('   Event IDs:', result.ids)
    console.log('\n📊 查看任务状态:')
    console.log('   开发环境: http://localhost:3000/api/inngest')
    console.log('   生产环境: https://app.inngest.com/')
    console.log('\n⏰ 预计耗时: 1-3 分钟')
    console.log('   请在 Inngest Dashboard 中查看任务进度')

  } catch (error: any) {
    console.error('\n❌ 发送失败:', error.message)
    process.exit(1)
  }
}

main().catch(console.error)

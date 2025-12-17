/**
 * 测试 AI 灵感生成服务
 *
 * 使用方法:
 * npx tsx scripts/test-inspiration-generator.ts
 */

import { generateInspirations } from '../lib/services/video-agent/inspiration-generator'

async function testInspirationGenerator() {
  console.log('🧪 开始测试 AI 灵感生成服务...\n')

  try {
    console.log('🚀 调用 generateInspirations...\n')

    const inspirations = await generateInspirations()

    console.log('✅ 灵感生成成功!\n')
    console.log(`📊 生成了 ${inspirations.length} 个脚本创意:\n`)

    inspirations.forEach((inspiration, index) => {
      console.log(`\n--- 创意 #${index + 1} ---`)
      console.log(`标题: ${inspiration.title}`)
      console.log(`风格: ${inspiration.style}`)
      console.log(`时长: ${inspiration.duration}s`)
      console.log(`描述: ${inspiration.description}`)
      console.log(`话题: ${inspiration.hashtags.join(' ')}`)
      console.log(`脚本预览: ${inspiration.script.substring(0, 100)}...`)
    })

    console.log('\n✅ 测试通过!')

  } catch (error) {
    console.error('❌ 测试失败:', error)
    process.exit(1)
  }
}

// 运行测试
testInspirationGenerator()

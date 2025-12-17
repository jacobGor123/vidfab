/**
 * 测试 Gemini API 集成 - 脚本分析服务
 *
 * 使用方法:
 * npx tsx scripts/test-gemini-script-analyzer.ts
 */

import { analyzeScript } from '../lib/services/video-agent/script-analyzer'

async function testGeminiScriptAnalyzer() {
  console.log('🧪 开始测试 Gemini 脚本分析服务...\n')

  // 测试脚本
  const testScript = `
    一个年轻人在地铁站等车,他低头看手机。
    突然,一位老人摔倒了,他立刻上前扶起老人。
    老人对他微笑表示感谢,年轻人也微笑回应。
    最后,年轻人帮老人上了地铁。
  `

  const duration = 30  // 30秒视频
  const storyStyle = 'warmth'  // 温情风格

  try {
    console.log('📝 测试参数:')
    console.log(`   脚本: ${testScript.trim()}`)
    console.log(`   时长: ${duration} 秒`)
    console.log(`   风格: ${storyStyle}\n`)

    console.log('🚀 调用 analyzeScript...\n')

    const result = await analyzeScript(testScript.trim(), duration, storyStyle)

    console.log('✅ 脚本分析成功!\n')
    console.log('📊 分析结果:')
    console.log(JSON.stringify(result, null, 2))

    console.log('\n✅ 测试通过!')

  } catch (error) {
    console.error('❌ 测试失败:', error)
    process.exit(1)
  }
}

// 运行测试
testGeminiScriptAnalyzer()

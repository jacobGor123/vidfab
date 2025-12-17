#!/usr/bin/env tsx

/**
 * 测试 Claude API 连接
 * 用于验证 API 配置是否正确
 */

// 🔥 关键:在导入任何模块之前加载环境变量
import { config } from 'dotenv'
import path from 'path'
config({ path: path.join(process.cwd(), '.env.local') })

import Anthropic from '@anthropic-ai/sdk'

async function main() {
  console.log('\n🧪 测试 Claude API 连接...\n')

  const apiKey = process.env.ANTHROPIC_API_KEY
  const baseURL = process.env.ANTHROPIC_BASE_URL

  console.log('📋 当前配置:')
  console.log(`   API Key: ${apiKey?.substring(0, 15)}...`)
  console.log(`   Base URL: ${baseURL || '(使用官方端点)'}`)
  console.log()

  if (!apiKey) {
    console.error('❌ 错误: ANTHROPIC_API_KEY 未配置')
    process.exit(1)
  }

  // 检测 API Key 类型
  const isRelay = apiKey.startsWith('th_')
  const isOfficial = apiKey.startsWith('sk-ant-')

  if (isRelay && !baseURL) {
    console.error('⚠️  警告: 使用中继 API Key 但未配置 ANTHROPIC_BASE_URL')
  }

  if (isOfficial && baseURL) {
    console.warn('⚠️  警告: 使用官方 API Key 但配置了自定义 BASE_URL')
  }

  console.log(`🔑 API Key 类型: ${isRelay ? '中继服务器' : isOfficial ? '官方 API' : '未知'}`)
  console.log()

  try {
    console.log('📡 发送测试请求...')

    const anthropic = new Anthropic({
      apiKey,
      baseURL,
    })

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 100,
      messages: [
        {
          role: 'user',
          content: 'Say "Hello, VidFab!" in exactly 3 words.',
        },
      ],
    })

    const response = message.content[0]
    if (response.type === 'text') {
      console.log('✅ API 连接成功!')
      console.log(`   模型: ${message.model}`)
      console.log(`   响应: ${response.text}`)
      console.log(`   Token 用量: ${message.usage.input_tokens} in / ${message.usage.output_tokens} out`)
      console.log('\n✅ Claude API 工作正常，可以用于博客生成!')
    }
  } catch (error: any) {
    console.error('\n❌ API 连接失败!')
    console.error(`   错误类型: ${error.constructor.name}`)
    console.error(`   错误信息: ${error.message}`)

    if (error.status) {
      console.error(`   HTTP 状态码: ${error.status}`)
    }

    if (isRelay) {
      console.error('\n💡 建议:')
      console.error('   1. 检查中继服务器状态: curl -I ' + baseURL)
      console.error('   2. 联系中继服务器管理员')
      console.error('   3. 或切换到官方 Claude API (参考 .env.claude-official)')
    } else {
      console.error('\n💡 建议:')
      console.error('   1. 检查 API Key 是否正确')
      console.error('   2. 检查网络连接')
      console.error('   3. 检查 API Key 是否有足够的额度')
    }

    process.exit(1)
  }
}

main().catch(console.error)

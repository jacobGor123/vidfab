#!/usr/bin/env node

/**
 * 调试 Inngest 事件发送
 * 手动发送事件并检查响应
 */

import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const INNGEST_EVENT_KEY = process.env.INNGEST_EVENT_KEY

console.log('🔍 调试 Inngest 事件发送...\n')
console.log(`INNGEST_EVENT_KEY: ${INNGEST_EVENT_KEY ? INNGEST_EVENT_KEY.substring(0, 20) + '...' : '未设置'}`)

if (!INNGEST_EVENT_KEY) {
  console.error('❌ INNGEST_EVENT_KEY 未设置')
  process.exit(1)
}

// 检查 Event Key 长度 (Inngest 新版本的 Event Key 不再使用 evt_ 前缀)
if (INNGEST_EVENT_KEY.length < 50) {
  console.warn('⚠️  Event Key 长度较短，可能不正确')
  console.warn(`   当前长度: ${INNGEST_EVENT_KEY.length} 字符`)
  console.warn('')
}

console.log('✅ Event Key 已配置\n')

// 发送测试事件
console.log('📤 发送测试事件到 Inngest...\n')

const eventData = {
  name: 'blog/generate.requested',
  data: {
    force: false,
    test: true,
    manualTrigger: true,
    timestamp: new Date().toISOString(),
  },
  ts: Date.now(),
}

console.log('事件数据:')
console.log(JSON.stringify(eventData, null, 2))
console.log('')

try {
  const response = await fetch(`https://inn.gs/e/${INNGEST_EVENT_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(eventData),
  })

  const responseText = await response.text()

  console.log(`HTTP 状态码: ${response.status}`)
  console.log('响应内容:')

  try {
    const json = JSON.parse(responseText)
    console.log(JSON.stringify(json, null, 2))
  } catch {
    console.log(responseText)
  }

  console.log('')

  if (response.status === 200 || response.status === 201) {
    console.log('✅ 事件发送成功！')
    console.log('')
    console.log('📊 请到 Inngest Dashboard 检查:')
    console.log('   1. Events 页面 → 应该看到 "blog/generate.requested" 事件')
    console.log('   2. Runs 页面 → 应该看到 "Generate and Publish Blog Article" 执行记录')
    console.log('')
    console.log('🔗 Inngest Dashboard: https://www.inngest.com/dashboard')
  } else {
    console.log('❌ 事件发送失败！')
    console.log('')
    console.log('可能的原因:')
    console.log('  1. INNGEST_EVENT_KEY 不正确')
    console.log('  2. Inngest 服务问题')
    console.log('  3. 网络连接问题')
  }
} catch (error) {
  console.error('❌ 请求失败:', error.message)
  console.error('')
  console.error('可能的原因:')
  console.error('  1. 网络连接问题')
  console.error('  2. Inngest API 不可用')
  process.exit(1)
}

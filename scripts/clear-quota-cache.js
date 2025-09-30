#!/usr/bin/env node

/**
 * Clear Quota Cache Script
 * 清除配额缓存，强制重新计算
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// 手动读取.env.local文件
let supabaseUrl, supabaseServiceKey
try {
  const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8')
  const envLines = envContent.split('\n')

  envLines.forEach(line => {
    const [key, value] = line.split('=', 2)
    if (key === 'NEXT_PUBLIC_SUPABASE_URL') {
      supabaseUrl = value
    } else if (key === 'SUPABASE_SERVICE_ROLE_KEY') {
      supabaseServiceKey = value
    }
  })
} catch (error) {
  console.error('❌ 无法读取 .env.local 文件:', error.message)
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少 Supabase 环境变量')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testStorageCalculation() {
  try {
    console.log('🧪 测试存储配额计算...')

    // 查找一个有视频的用户进行测试
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('uuid, email')
      .limit(10)

    if (usersError) {
      console.error('❌ 查询用户失败:', usersError)
      return
    }

    for (const user of users) {
      // 查询该用户的视频
      const { data: videos, error: videosError } = await supabase
        .from('user_videos')
        .select('id, status, file_size, created_at, prompt')
        .eq('user_id', user.uuid)
        .eq('status', 'completed')
        .not('file_size', 'is', null)

      if (videosError) {
        console.error(`❌ 查询用户 ${user.email} 的视频失败:`, videosError)
        continue
      }

      if (videos.length > 0) {
        console.log(`\n👤 用户: ${user.email} (${user.uuid})`)
        console.log(`📹 完成的视频数: ${videos.length}`)

        let totalSize = 0
        videos.forEach(video => {
          const sizeMB = video.file_size ? (video.file_size / 1024 / 1024).toFixed(2) : 'N/A'
          console.log(`  - ${video.id}: ${sizeMB}MB - ${video.prompt?.substring(0, 30)}...`)
          totalSize += video.file_size || 0
        })

        const totalSizeMB = (totalSize / 1024 / 1024).toFixed(2)
        console.log(`💾 计算总大小: ${totalSizeMB}MB`)

        // 直接调用UnifiedStorageManager测试
        try {
          console.log(`🔧 测试UnifiedStorageManager计算...`)

          // 模拟UnifiedStorageManager.getStorageStatus的查询
          const { data: testVideos, error: testError } = await supabase
            .from('user_videos')
            .select('*')
            .eq('user_id', user.uuid)
            .eq('status', 'completed')
            .not('file_size', 'is', null)
            .neq('file_size', 'null')

          if (testError) {
            console.error('❌ UnifiedStorageManager查询失败:', testError)
          } else {
            const testTotalSize = testVideos.reduce((sum, video) => sum + (video.file_size || 0), 0)
            const testTotalSizeMB = (testTotalSize / 1024 / 1024).toFixed(2)
            console.log(`🔍 UnifiedStorageManager计算结果: ${testTotalSizeMB}MB`)
          }

        } catch (error) {
          console.error('❌ UnifiedStorageManager测试失败:', error)
        }

        // 测试API调用
        try {
          console.log(`📡 测试配额API...`)
          const response = await fetch(`http://localhost:3000/api/user/quota`, {
            headers: {
              'Cookie': `next-auth.session-token=test; user-id=${user.uuid}`
            }
          })

          if (response.ok) {
            const result = await response.json()
            console.log(`📊 API返回结果:`, result)
          } else {
            console.log(`⚠️ API调用失败: ${response.status}`)
          }
        } catch (apiError) {
          console.log(`⚠️ API测试跳过 (需要在浏览器中测试)`)
        }

        break // 只测试第一个有视频的用户
      }
    }

  } catch (error) {
    console.error('❌ 测试过程出错:', error)
  }
}

testStorageCalculation()
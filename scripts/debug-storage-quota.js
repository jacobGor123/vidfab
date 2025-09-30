#!/usr/bin/env node

/**
 * Debug Storage Quota Script
 * 直接查询数据库，检查存储配额计算问题
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

async function debugStorageQuota() {
  try {
    console.log('🔍 开始调试存储配额...')

    // 1. 查询所有用户
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('uuid, email, subscription_plan, subscription_status')
      .limit(5)

    if (usersError) {
      console.error('❌ 查询用户失败:', usersError)
      return
    }

    console.log(`📊 找到 ${users.length} 个用户:`)
    users.forEach(user => {
      console.log(`  - ${user.email} (${user.uuid}) - ${user.subscription_plan || 'free'}`)
    })

    // 2. 对每个用户查询视频数据
    for (const user of users) {
      console.log(`\n🔍 检查用户 ${user.email} 的视频数据:`)

      // 查询该用户的所有视频
      const { data: videos, error: videosError } = await supabase
        .from('user_videos')
        .select('id, status, file_size, created_at, updated_at, prompt')
        .eq('user_id', user.uuid)
        .order('created_at', { ascending: false })

      if (videosError) {
        console.error(`❌ 查询用户 ${user.email} 的视频失败:`, videosError)
        continue
      }

      console.log(`  📹 总视频数: ${videos.length}`)

      // 统计各状态的视频
      const statusCounts = {}
      let totalSize = 0
      let completedWithSize = 0

      videos.forEach(video => {
        statusCounts[video.status] = (statusCounts[video.status] || 0) + 1
        if (video.file_size !== null && video.file_size !== undefined) {
          totalSize += video.file_size
          if (video.status === 'completed') {
            completedWithSize++
          }
        }
      })

      console.log(`  📊 状态统计:`, statusCounts)
      console.log(`  💾 总存储大小: ${(totalSize / 1024 / 1024).toFixed(2)}MB`)
      console.log(`  ✅ 有文件大小的已完成视频: ${completedWithSize}`)

      // 显示最近几个视频的详细信息
      if (videos.length > 0) {
        console.log(`  🎬 最近的视频:`)
        videos.slice(0, 3).forEach(video => {
          console.log(`    - ${video.id}: ${video.status}, ${video.file_size ? (video.file_size / 1024 / 1024).toFixed(2) + 'MB' : 'no size'}, ${video.prompt?.substring(0, 30)}...`)
        })
      }
    }

    // 3. 查询存储配额表
    console.log(`\n🔍 检查存储配额表:`)
    const { data: quotas, error: quotasError } = await supabase
      .from('user_storage_quotas')
      .select('*')
      .limit(10)

    if (quotasError) {
      console.error('❌ 查询存储配额表失败:', quotasError)
    } else {
      console.log(`📊 存储配额记录数: ${quotas.length}`)
      quotas.forEach(quota => {
        console.log(`  - 用户: ${quota.user_id}, 视频数: ${quota.total_videos}, 大小: ${(quota.total_size_bytes / 1024 / 1024).toFixed(2)}MB`)
      })
    }

  } catch (error) {
    console.error('❌ 调试过程出错:', error)
  }
}

debugStorageQuota()
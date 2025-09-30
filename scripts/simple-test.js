#!/usr/bin/env node

/**
 * Simple Test Script
 * 简单测试来定位具体问题
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

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function simpleTest() {
  try {
    console.log('🧪 开始简单测试...')

    // 测试1: 基本查询
    console.log('\n📊 测试1: 查询所有已完成的视频')
    const { data: allCompleted, error: allError } = await supabase
      .from('user_videos')
      .select('id, file_size, status, user_id')
      .eq('status', 'completed')

    if (allError) {
      console.error('❌ 基本查询失败:', allError)
      return
    }

    console.log(`📹 找到 ${allCompleted.length} 个已完成的视频`)
    allCompleted.forEach(video => {
      console.log(`  - ${video.id}: file_size=${video.file_size} (${typeof video.file_size})`)
    })

    // 测试2: 只查询有file_size的
    console.log('\n📊 测试2: 查询有file_size的视频')
    try {
      const { data: withSize, error: sizeError } = await supabase
        .from('user_videos')
        .select('id, file_size, status, user_id')
        .eq('status', 'completed')
        .not('file_size', 'is', null)

      if (sizeError) {
        console.error('❌ file_size查询失败:', sizeError)
      } else {
        console.log(`📹 有file_size的视频: ${withSize.length} 个`)

        // 计算总大小
        let totalSize = 0
        withSize.forEach(video => {
          console.log(`  - ${video.id}: ${video.file_size} bytes (${typeof video.file_size})`)
          if (typeof video.file_size === 'number') {
            totalSize += video.file_size
          } else {
            console.log(`    ⚠️ 异常数据类型: ${typeof video.file_size}, 值: ${video.file_size}`)
          }
        })

        console.log(`💾 总大小: ${(totalSize / 1024 / 1024).toFixed(2)}MB`)
      }
    } catch (error) {
      console.error('❌ 测试2异常:', error)
    }

    // 测试3: 检查特定用户
    console.log('\n📊 测试3: 检查特定用户')
    const testUserId = '18a675b6-2828-407a-bf63-c5ba27dce935'

    const { data: userVideos, error: userError } = await supabase
      .from('user_videos')
      .select('*')
      .eq('user_id', testUserId)
      .eq('status', 'completed')

    if (userError) {
      console.error('❌ 用户查询失败:', userError)
    } else {
      console.log(`👤 用户 ${testUserId} 的视频:`)
      userVideos.forEach(video => {
        const sizeMB = video.file_size ? (video.file_size / 1024 / 1024).toFixed(2) : 'N/A'
        console.log(`  - ${video.prompt?.substring(0, 30)}...: ${sizeMB}MB`)
      })

      const totalUserSize = userVideos.reduce((sum, v) => sum + (v.file_size || 0), 0)
      console.log(`💾 用户总大小: ${(totalUserSize / 1024 / 1024).toFixed(2)}MB`)
    }

  } catch (error) {
    console.error('❌ 测试过程出错:', error)
  }
}

simpleTest()
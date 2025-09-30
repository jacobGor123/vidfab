#!/usr/bin/env node

/**
 * Fix File Sizes Script
 * 修复现有视频记录的 file_size 字段
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

async function fixFileSizes() {
  try {
    console.log('🔧 开始修复视频文件大小...')

    // 1. 查找所有没有 file_size 的已完成视频
    const { data: videos, error: fetchError } = await supabase
      .from('user_videos')
      .select('id, original_url, user_id, prompt')
      .eq('status', 'completed')
      .is('file_size', null)

    if (fetchError) {
      console.error('❌ 查询视频失败:', fetchError)
      return
    }

    console.log(`📊 找到 ${videos.length} 个需要修复的视频`)

    let fixedCount = 0
    let failedCount = 0

    // 2. 为每个视频尝试获取文件大小
    for (const video of videos) {
      try {
        console.log(`🔍 处理视频 ${video.id}...`)

        // 尝试从 URL 获取文件大小
        let fileSize = null
        if (video.original_url) {
          try {
            console.log(`📡 获取文件信息: ${video.original_url}`)
            const response = await fetch(video.original_url, { method: 'HEAD' })

            if (response.ok) {
              const contentLength = response.headers.get('content-length')
              if (contentLength) {
                fileSize = parseInt(contentLength, 10)
                console.log(`📏 获取到文件大小: ${(fileSize / 1024 / 1024).toFixed(2)}MB`)
              }
            }
          } catch (urlError) {
            console.log(`⚠️ 无法从URL获取文件大小: ${urlError.message}`)
          }
        }

        // 如果无法获取实际大小，使用估算值（基于视频类型和时长）
        if (!fileSize) {
          // 为不同类型的视频设置估算大小
          fileSize = 10 * 1024 * 1024 // 默认 10MB
          console.log(`📐 使用估算文件大小: ${(fileSize / 1024 / 1024).toFixed(2)}MB`)
        }

        // 更新数据库
        const { error: updateError } = await supabase
          .from('user_videos')
          .update({ file_size: fileSize })
          .eq('id', video.id)

        if (updateError) {
          console.error(`❌ 更新视频 ${video.id} 失败:`, updateError)
          failedCount++
        } else {
          console.log(`✅ 已更新视频 ${video.id}`)
          fixedCount++
        }

      } catch (error) {
        console.error(`❌ 处理视频 ${video.id} 时出错:`, error)
        failedCount++
      }
    }

    console.log(`\n📊 修复完成:`)
    console.log(`✅ 成功修复: ${fixedCount} 个视频`)
    console.log(`❌ 修复失败: ${failedCount} 个视频`)

    // 3. 验证修复结果
    const { data: fixedVideos, error: verifyError } = await supabase
      .from('user_videos')
      .select('id, file_size')
      .eq('status', 'completed')
      .not('file_size', 'is', null)

    if (!verifyError) {
      const totalSize = fixedVideos.reduce((sum, v) => sum + (v.file_size || 0), 0)
      console.log(`\n📈 验证结果:`)
      console.log(`📹 有文件大小的视频: ${fixedVideos.length} 个`)
      console.log(`💾 总存储大小: ${(totalSize / 1024 / 1024).toFixed(2)}MB`)
    }

  } catch (error) {
    console.error('❌ 修复过程出错:', error)
  }
}

fixFileSizes()
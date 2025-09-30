#!/usr/bin/env node

/**
 * Fix Null Strings Script
 * 修复数据库中的字符串"null"值
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

async function fixNullStrings() {
  try {
    console.log('🔧 修复数据库中的字符串"null"值...')

    // 1. 使用SQL直接修复字符串"null"值
    console.log('🔧 使用SQL直接修复字符串"null"值...')

    try {
      // 使用raw SQL来处理这个问题
      const { data, error: sqlError } = await supabase.rpc('fix_null_file_sizes')

      if (sqlError) {
        console.log('⚠️ 存储过程不存在，使用备用方法...')

        // 备用方法：查询所有记录，在应用层过滤
        const { data: allVideos, error: allError } = await supabase
          .from('user_videos')
          .select('id, file_size')
          .not('file_size', 'is', null)

        if (allError) {
          console.error('❌ 查询失败:', allError)
          return
        }

        console.log(`📊 查询到 ${allVideos.length} 个有file_size值的记录`)

        // 在应用层检查并修复
        let fixedCount = 0
        for (const video of allVideos) {
          if (typeof video.file_size === 'string' && video.file_size === 'null') {
            const { error: updateError } = await supabase
              .from('user_videos')
              .update({ file_size: null })
              .eq('id', video.id)

            if (!updateError) {
              fixedCount++
            }
          }
        }

        console.log(`✅ 修复了 ${fixedCount} 个字符串"null"记录`)
      } else {
        console.log(`✅ SQL修复完成`)
      }
    } catch (error) {
      console.error('❌ SQL修复失败:', error)
    }

    // 3. 清理user_storage_quotas表中的错误数据
    console.log('\n🧹 清理user_storage_quotas表...')
    const { error: deleteQuotaError } = await supabase
      .from('user_storage_quotas')
      .delete()
      .neq('user_id', '')

    if (deleteQuotaError) {
      console.error('❌ 清理配额表失败:', deleteQuotaError)
    } else {
      console.log('✅ 已清理配额表，将通过触发器重新计算')
    }

    // 4. 触发重新计算（通过更新一个视频记录）
    const { data: oneVideo, error: oneVideoError } = await supabase
      .from('user_videos')
      .select('id, updated_at')
      .eq('status', 'completed')
      .limit(1)
      .single()

    if (!oneVideoError && oneVideo) {
      console.log('\n🔄 触发配额重新计算...')
      const { error: triggerError } = await supabase
        .from('user_videos')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', oneVideo.id)

      if (triggerError) {
        console.error('❌ 触发失败:', triggerError)
      } else {
        console.log('✅ 已触发配额重新计算')
      }
    }

    // 5. 验证修复结果
    console.log('\n📈 验证修复结果...')
    const { data: verifyVideos, error: verifyError } = await supabase
      .from('user_videos')
      .select('user_id, file_size')
      .eq('status', 'completed')
      .not('file_size', 'is', null)

    if (!verifyError) {
      // 按用户分组统计
      const userStats = {}
      verifyVideos.forEach(video => {
        if (!userStats[video.user_id]) {
          userStats[video.user_id] = { count: 0, totalSize: 0 }
        }
        userStats[video.user_id].count++
        userStats[video.user_id].totalSize += video.file_size || 0
      })

      console.log('📊 按用户统计:')
      Object.entries(userStats).forEach(([userId, stats]) => {
        const sizeMB = (stats.totalSize / 1024 / 1024).toFixed(2)
        console.log(`  - ${userId.substring(0, 8)}...: ${stats.count} 视频, ${sizeMB}MB`)
      })
    }

  } catch (error) {
    console.error('❌ 修复过程出错:', error)
  }
}

fixNullStrings()
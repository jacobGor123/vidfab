#!/usr/bin/env tsx

/**
 * 检查 Supabase Storage 配置和权限
 */

// 🔥 关键:在导入任何模块之前加载环境变量
import { config } from 'dotenv'
import path from 'path'
config({ path: path.join(process.cwd(), '.env.local') })

async function main() {
  const { supabaseAdmin } = await import('@/lib/supabase')

  console.log('\n📦 检查 Supabase Storage 配置...\n')

  // 1. 检查 user-images bucket 是否存在
  console.log('1️⃣ 检查 bucket 是否存在...')
  try {
    const { data: buckets, error: bucketsError } = await supabaseAdmin.storage.listBuckets()

    if (bucketsError) {
      console.error('❌ 无法列出 buckets:', bucketsError)
      return
    }

    const userImagesBucket = buckets?.find(b => b.name === 'user-images')
    if (!userImagesBucket) {
      console.error('❌ user-images bucket 不存在!')
      console.log('可用的 buckets:', buckets?.map(b => b.name).join(', '))
      return
    }

    console.log('✅ user-images bucket 存在')
    console.log('   Bucket 详情:', {
      id: userImagesBucket.id,
      name: userImagesBucket.name,
      public: userImagesBucket.public,
      created_at: userImagesBucket.created_at,
    })
  } catch (error) {
    console.error('❌ 检查 bucket 失败:', error)
    return
  }

  // 2. 尝试列出 blog-system 文件夹
  console.log('\n2️⃣ 检查 blog-system 文件夹...')
  try {
    const { data: files, error: listError } = await supabaseAdmin.storage
      .from('user-images')
      .list('images/blog-system', { limit: 10 })

    if (listError) {
      console.error('❌ 无法列出文件:', listError)
    } else {
      console.log(`✅ 成功列出文件 (${files?.length || 0} 个文件)`)
      if (files && files.length > 0) {
        console.log('   最近的文件:')
        files.slice(0, 3).forEach(f => {
          console.log(`   - ${f.name}`)
        })
      }
    }
  } catch (error) {
    console.error('❌ 列出文件失败:', error)
  }

  // 3. 测试上传权限
  console.log('\n3️⃣ 测试上传权限...')
  // 创建一个 1x1 像素的 JPEG 图片
  const testContent = Buffer.from(
    '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAIBAQIBAQICAgICAgICAwUDAwMDAwYEBAMFBwYHBwcGBwcICQsJCAgKCAcHCg0KCgsMDAwMBwkODw0MDgsMDAz/2wBDAQICAgMDAwYDAwYMCAcIDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAz/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlbaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD9/KKKKAP/2Q==',
    'base64'
  )
  const testPath = 'images/blog-system/test-upload-' + Date.now() + '.jpg'

  try {
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('user-images')
      .upload(testPath, testContent, {
        contentType: 'image/jpeg',
        upsert: true,
      })

    if (uploadError) {
      console.error('❌ 上传测试失败:', uploadError)
      console.error('   错误详情:', JSON.stringify(uploadError, null, 2))
    } else {
      console.log('✅ 上传测试成功!')
      console.log('   上传路径:', uploadData.path)

      // 清理测试文件
      await supabaseAdmin.storage.from('user-images').remove([testPath])
      console.log('   已清理测试文件')
    }
  } catch (error: any) {
    console.error('❌ 上传测试异常:', error)
    console.error('   错误类型:', error.constructor.name)
    console.error('   错误消息:', error.message)
    if (error.response) {
      console.error('   响应状态:', error.response.status)
      console.error('   响应数据:', error.response.data)
    }
  }

  // 4. 检查 Storage RLS 策略
  console.log('\n4️⃣ 检查 Storage RLS 策略...')
  try {
    const { data: policies, error: policiesError } = await supabaseAdmin
      .from('storage.policies')
      .select('*')
      .eq('bucket_id', 'user-images')

    if (policiesError) {
      console.log('⚠️  无法直接查询策略表 (正常情况,需要在 Supabase Dashboard 查看)')
    } else if (policies) {
      console.log('✅ 找到以下策略:')
      policies.forEach((p: any) => {
        console.log(`   - ${p.name} (${p.definition})`)
      })
    }
  } catch (error) {
    console.log('⚠️  策略查询跳过 (需要在 Supabase Dashboard 手动检查)')
  }

  console.log('\n📋 下一步操作建议:')
  console.log('1. 登录 Supabase Dashboard: https://app.supabase.com/')
  console.log('2. 进入项目 → Storage → user-images bucket')
  console.log('3. 点击 "Policies" 标签页')
  console.log('4. 检查是否有允许 service_role 上传的策略')
  console.log('')
}

main().catch(console.error)

/**
 * 上传背景音乐到 Supabase Storage
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

// 加载环境变量
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function uploadMusic() {
  const musicPath = '/Users/jacob/Downloads/funny-comedy-cartoon-background-music-359484.mp3'
  const fileName = 'preset-music/funny-comedy-cartoon.mp3'
  const bucketName = 'video-agent-files'

  console.log('📤 Uploading music to Supabase Storage...')
  console.log('File:', musicPath)
  console.log('Bucket:', bucketName)
  console.log('Path:', fileName)

  try {
    // 检查并创建 bucket
    const { data: buckets } = await supabase.storage.listBuckets()
    const bucketExists = buckets?.some(b => b.name === bucketName)

    if (!bucketExists) {
      console.log('🔨 Creating bucket:', bucketName)
      const { error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 52428800 // 50MB
      })

      if (createError) {
        console.error('❌ Failed to create bucket:', createError)
        process.exit(1)
      }
      console.log('✅ Bucket created')
    } else {
      console.log('✅ Bucket exists')
    }

    // 读取文件
    const fileBuffer = readFileSync(musicPath)

    // 上传到 Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, fileBuffer, {
        contentType: 'audio/mpeg',
        upsert: true
      })

    if (error) {
      console.error('❌ Upload failed:', error)
      process.exit(1)
    }

    console.log('✅ Upload successful:', data)

    // 获取公开 URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName)

    console.log('\n🎵 Music CDN URL:')
    console.log(urlData.publicUrl)
    console.log('\n📋 Add this to your code:')
    console.log(`const DEFAULT_MUSIC_URL = '${urlData.publicUrl}'`)

  } catch (err) {
    console.error('❌ Error:', err)
    process.exit(1)
  }
}

uploadMusic()

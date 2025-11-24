#!/usr/bin/env tsx

/**
 * 视频 Poster 提取脚本
 * 从指定的视频 URL 中提取第一帧作为 poster 图片并上传到 CDN
 *
 * 使用方法:
 *   tsx scripts/extract-video-posters.ts
 *   或
 *   ./scripts/extract-video-posters.sh
 */

import { extractVideoThumbnail, checkFfmpegInstalled } from '../lib/discover/extract-thumbnail'
import { createWriteStream } from 'fs'
import { mkdir, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import { pipeline } from 'stream/promises'

// 需要提取 poster 的视频列表
const VIDEO_URLS = [
  // Text-to-Image 相关视频
  'https://static.vidfab.ai/public/video/text-to-imagine-banner.mp4',
  'https://static.vidfab.ai/public/video/text-to-image-001.mp4',
  'https://static.vidfab.ai/public/video/text-to-image-02.mp4',
  'https://static.vidfab.ai/public/video/text-to-image-03.mp4',
  'https://static.vidfab.ai/public/video/text-to-image-04.mp4',

  // Image-to-Image 相关视频
  'https://static.vidfab.ai/public/video/image-to-image-banner.mp4',
  'https://static.vidfab.ai/public/video/image-to-image-01.mp4',
  'https://static.vidfab.ai/public/video/image-to-image-02.mp4',
  'https://static.vidfab.ai/public/video/image-to-image-03.mp4',
  'https://static.vidfab.ai/public/video/image-to-image-04.mp4',
]

/**
 * 下载视频到临时文件
 */
async function downloadVideo(url: string, outputPath: string): Promise<void> {
  console.log(`📥 下载视频: ${url}`)

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`下载失败: HTTP ${response.status}`)
  }

  if (!response.body) {
    throw new Error('响应体为空')
  }

  // 确保目录存在
  await mkdir(dirname(outputPath), { recursive: true })

  // 使用 Node.js stream 下载
  const fileStream = createWriteStream(outputPath)
  await pipeline(response.body as any, fileStream)

  console.log(`✅ 下载完成: ${outputPath}`)
}

/**
 * 生成 poster 文件名
 */
function getPosterFilename(videoUrl: string): string {
  const url = new URL(videoUrl)
  const pathname = url.pathname // /public/video/text-to-image-01.mp4
  const filename = pathname.split('/').pop()?.replace('.mp4', '.webp') || 'poster.webp'
  return filename
}

/**
 * 生成输出路径
 */
function getOutputPath(videoUrl: string): string {
  const filename = getPosterFilename(videoUrl)
  // 输出到 public/image/ 目录
  return join(process.cwd(), 'public', 'image', filename)
}

/**
 * 主函数
 */
async function main() {
  console.log('🎬 视频 Poster 提取工具')
  console.log('=' .repeat(60))

  // 检查 ffmpeg
  console.log('\n🔍 检查 ffmpeg 安装状态...')
  const ffmpegInstalled = await checkFfmpegInstalled()

  if (!ffmpegInstalled) {
    console.error('\n❌ 错误: ffmpeg 未安装')
    console.error('请运行以下命令安装 ffmpeg:')
    console.error('  ./scripts/install-ffmpeg.sh')
    process.exit(1)
  }

  console.log('✅ ffmpeg 已安装\n')

  // 统计
  let successCount = 0
  let failCount = 0
  const results: Array<{ url: string; success: boolean; output?: string; error?: string }> = []

  // 处理每个视频
  for (const videoUrl of VIDEO_URLS) {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`📹 处理视频: ${videoUrl}`)

    try {
      // 生成临时文件路径和输出路径
      const tempVideoPath = `/tmp/video-${Date.now()}.mp4`
      const outputPath = getOutputPath(videoUrl)

      // 下载视频
      await downloadVideo(videoUrl, tempVideoPath)

      // 提取 poster
      console.log(`🖼️  提取 poster...`)
      const result = await extractVideoThumbnail(tempVideoPath, {
        timestamp: 0.1, // 0.1秒，避免黑屏
        format: 'webp',
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 90,
        targetSizeKB: 200 // poster 可以稍大一些
      })

      if (!result.success || !result.buffer) {
        throw new Error(result.error || '提取失败')
      }

      // 保存 poster
      await mkdir(dirname(outputPath), { recursive: true })
      await writeFile(outputPath, result.buffer)

      console.log(`✅ Poster 已保存: ${outputPath}`)
      console.log(`   尺寸: ${result.width}x${result.height}`)
      console.log(`   大小: ${(result.size! / 1024).toFixed(2)} KB`)

      results.push({
        url: videoUrl,
        success: true,
        output: outputPath
      })
      successCount++
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error(`❌ 失败: ${errorMsg}`)

      results.push({
        url: videoUrl,
        success: false,
        error: errorMsg
      })
      failCount++
    }
  }

  // 输出汇总
  console.log(`\n${'='.repeat(60)}`)
  console.log('📊 处理完成\n')
  console.log(`总计: ${VIDEO_URLS.length} 个视频`)
  console.log(`✅ 成功: ${successCount}`)
  console.log(`❌ 失败: ${failCount}`)

  if (failCount > 0) {
    console.log('\n失败列表:')
    results
      .filter((r) => !r.success)
      .forEach((r) => {
        console.log(`  - ${r.url}`)
        console.log(`    错误: ${r.error}`)
      })
  }

  console.log('\n📝 下一步:')
  console.log('1. 检查生成的 poster 图片: public/image/')
  console.log('2. 将图片上传到 CDN: https://static.vidfab.ai/public/image/')
  console.log('3. 确保 CDN 路径与代码中的配置一致')

  // 退出码
  process.exit(failCount > 0 ? 1 : 0)
}

// 运行
main().catch((error) => {
  console.error('💥 未捕获的错误:', error)
  process.exit(1)
})

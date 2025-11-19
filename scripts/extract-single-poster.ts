#!/usr/bin/env tsx

/**
 * 单个视频 Poster 提取脚本
 * 从指定视频 URL 提取第一帧作为 poster 图片
 */

import { extractVideoThumbnail } from '../lib/discover/extract-thumbnail'
import { writeFile } from 'fs/promises'
import { basename } from 'path'

const VIDEO_URL = 'https://static.vidfab.ai/public/video/home-step-03.mp4'

async function downloadVideo(url: string, outputPath: string): Promise<void> {
  console.log(`📥 下载视频: ${url}`)
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`下载失败: HTTP ${response.status}`)
  }

  const buffer = await response.arrayBuffer()
  await writeFile(outputPath, Buffer.from(buffer))
  console.log(`✅ 下载完成: ${outputPath}`)
}

async function extractPoster(videoUrl: string): Promise<void> {
  console.log(`\n============================================================`)
  console.log(`📹 处理视频: ${videoUrl}`)

  try {
    // 下载视频到临时文件
    const tempVideoPath = `/tmp/video-${Date.now()}.mp4`
    await downloadVideo(videoUrl, tempVideoPath)

    // 提取 poster
    console.log(`🖼️  提取 poster...`)
    const result = await extractVideoThumbnail(tempVideoPath, {
      timestamp: 0.1,
      format: 'webp',
      maxWidth: 1920,
      maxHeight: 1080,
      quality: 90,
      targetSizeKB: 200
    })

    // 生成输出文件名
    const videoFilename = basename(videoUrl, '.mp4')
    const outputFilename = `${videoFilename}-poster.webp`
    const outputPath = `/Users/jacob/Desktop/vidfab/public/image/${outputFilename}`

    // 保存 poster
    await writeFile(outputPath, result.buffer)

    const sizeKB = (result.buffer.length / 1024).toFixed(2)
    console.log(`✅ Poster 已保存: ${outputPath}`)
    console.log(`   尺寸: ${result.width}x${result.height}`)
    console.log(`   大小: ${sizeKB} KB`)

  } catch (error) {
    console.error(`❌ 失败: ${videoUrl}`)
    console.error(`   错误: ${error instanceof Error ? error.message : String(error)}`)
    throw error
  }
}

async function main() {
  console.log('🎬 视频 Poster 提取工具')
  console.log('============================================================\n')

  // 检查 ffmpeg
  console.log('🔍 检查 ffmpeg 安装状态...')
  try {
    const { execSync } = require('child_process')
    execSync('which ffmpeg', { stdio: 'pipe' })
    console.log('✅ ffmpeg 已安装\n')
  } catch {
    console.error('❌ Error: ffmpeg is not installed')
    console.error('请先安装 ffmpeg: brew install ffmpeg')
    process.exit(1)
  }

  await extractPoster(VIDEO_URL)

  console.log('\n============================================================')
  console.log('✅ 处理完成')
  console.log('\n📝 下一步:')
  console.log('1. 检查生成的 poster 图片: public/image/')
  console.log('2. 将图片上传到 CDN: https://static.vidfab.ai/public/image/')
}

main().catch(error => {
  console.error('\n❌ 脚本执行失败:', error)
  process.exit(1)
})

/**
 * Discover 数据迁移辅助脚本
 * 将 video-templates.ts 中的硬编码数据迁移到数据库
 *
 * 使用方法：
 * 1. 确保数据库表已创建：执行 lib/database/create-discover-videos-table.sql
 * 2. 运行此脚本：npx tsx scripts/migrate-discover-data.ts
 * 3. 复制生成的 SQL 文件内容
 * 4. 在 Supabase Dashboard 或数据库客户端中执行 SQL
 */

import * as fs from 'fs'
import * as path from 'path'

// 模拟导入（实际运行时需要调整路径）
const videoTemplatesPath = path.join(__dirname, '../data/video-templates.ts')

interface RawVideoEntry {
  prompt: string
  imageUrl: string
  videoUrl: string
}

// 分类关键词映射（复制自 categorize.ts）
const categoryKeywords: Record<string, string[]> = {
  portrait: ['woman', 'girl', 'boy', 'man', 'person', 'face', 'eyes', 'hair', 'smile', '女子', '美女', '男子'],
  nature: ['butterfly', 'flowers', 'tree', 'water', 'ocean', 'mountain', 'sky', 'sunlight', 'panda', 'cat', 'dog', '猫', '狮子'],
  fantasy: ['fairy', 'mermaid', 'dragon', 'magic', 'mystical', 'werewolf', 'space', 'astronaut', 'floating', 'glowing'],
  lifestyle: ['kitchen', 'home', 'office', 'laundry', 'cooking', 'coffee', 'beer', 'sofa', '锅', '土豆丝'],
  abstract: ['animate', 'move', 'particles', 'transform', 'gears', 'abstract', 'minimal', 'texture'],
  cinematic: ['camera', 'zoom', 'tracking', 'cinematic', 'film', 'professional', 'lighting', 'composition'],
  vehicles: ['car', 'motorcycle', 'spaceship', 'satellite', 'bicycle', 'train'],
  technology: ['cyberpunk', 'futuristic', 'sci-fi', 'robot', 'AI', 'digital', 'gaming', 'tech']
}

function categorizePrompt(prompt: string): string {
  const lowerPrompt = prompt.toLowerCase()
  const scores: Record<string, number> = {}

  Object.entries(categoryKeywords).forEach(([category, keywords]) => {
    scores[category] = keywords.filter(keyword =>
      lowerPrompt.includes(keyword.toLowerCase())
    ).length
  })

  const entries = Object.entries(scores)
  if (entries.length === 0) return 'abstract'

  const bestCategory = entries.reduce((a, b) =>
    scores[a[0]] > scores[b[0]] ? a : b
  )[0]

  return scores[bestCategory] > 0 ? bestCategory : 'abstract'
}

function escapeSQL(str: string): string {
  return str.replace(/'/g, "''")
}

async function generateMigrationSQL() {
  console.log('🚀 开始生成数据迁移 SQL...')

  // 这里需要手动复制 video-templates.ts 中的 rawVideoEntries 数据
  // 或者通过动态导入（需要配置 TypeScript/ESM）

  const rawVideoEntries: RawVideoEntry[] = [
    // 示例数据 - 实际使用时需要从 video-templates.ts 复制完整数据
    {
      prompt: "animate the image",
      imageUrl: "https://static.vidfab.ai/user-image/vidfab-2910ad47-9d15-4ab4-8a59-aea9cf2500d8.png",
      videoUrl: "https://static.vidfab.ai/user-video/vidfab-2910ad47-9d15-4ab4-8a59-aea9cf2500d8.mp4"
    },
    // ... 其他 92 条数据
  ]

  console.log(`📊 找到 ${rawVideoEntries.length} 条数据`)

  const sqlValues = rawVideoEntries.map((entry, index) => {
    const prompt = escapeSQL(entry.prompt)
    const category = categorizePrompt(entry.prompt)
    const displayOrder = 1000 - index // 倒序排列

    // 修正图片 URL：将 .png/.jpg/.jpeg 改为 .webp
    let imageUrl = entry.imageUrl
    if (imageUrl) {
      imageUrl = imageUrl.replace(/\.(png|jpg|jpeg)$/i, '.webp')
    }

    return `  (
    '${prompt}',
    '${entry.videoUrl}',
    '${imageUrl}',
    '${category}',
    'active',
    false,
    ${displayOrder},
    NOW() - INTERVAL '${index} days'
  )`
  }).join(',\n')

  const sql = `-- =====================================================
-- Discover Videos 数据迁移脚本
-- 生成时间: ${new Date().toISOString()}
-- 数据条数: ${rawVideoEntries.length}
-- =====================================================

-- 注意：执行前请确保已创建 discover_videos 表

INSERT INTO discover_videos (
  prompt,
  video_url,
  image_url,
  category,
  status,
  is_featured,
  display_order,
  created_at
)
VALUES
${sqlValues}
ON CONFLICT (id) DO NOTHING;

-- 验证插入结果
SELECT
  category,
  COUNT(*) as count
FROM discover_videos
GROUP BY category
ORDER BY count DESC;

-- 查看总数
SELECT COUNT(*) as total FROM discover_videos;
`

  const outputPath = path.join(__dirname, '../lib/database/migrate-discover-videos.sql')
  fs.writeFileSync(outputPath, sql, 'utf-8')

  console.log(`✅ 迁移脚本已生成：${outputPath}`)
  console.log(`📝 数据条数：${rawVideoEntries.length}`)
  console.log('')
  console.log('🔄 下一步：')
  console.log('1. 打开 Supabase Dashboard 或数据库客户端')
  console.log('2. 执行生成的 SQL 文件')
  console.log('3. 验证数据是否正确导入')
  console.log('')
  console.log('⚠️  注意：')
  console.log('- 此脚本仅包含示例数据')
  console.log('- 需要手动从 video-templates.ts 复制完整的 rawVideoEntries 数据')
  console.log('- 或使用动态导入（需要配置 ESM）')
}

// 执行
generateMigrationSQL().catch(console.error)

/**
 * 手动迁移步骤（推荐）：
 *
 * 1. 打开 /data/video-templates.ts
 * 2. 复制 rawVideoEntries 数组（约 93 条数据）
 * 3. 粘贴到本文件的 rawVideoEntries 变量中
 * 4. 运行：npx tsx scripts/migrate-discover-data.ts
 * 5. 生成的 SQL 文件在：lib/database/migrate-discover-videos.sql
 * 6. 在 Supabase 执行该 SQL 文件
 */

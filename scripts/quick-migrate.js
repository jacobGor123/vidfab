/**
 * 快速数据迁移脚本
 * 直接读取 video-templates.ts 并生成 SQL
 *
 * 使用方法：
 * node scripts/quick-migrate.js > lib/database/migrate-data.sql
 */

const fs = require('fs');
const path = require('path');

// 读取 video-templates.ts 文件
const filePath = path.join(__dirname, '../data/video-templates.ts');
const content = fs.readFileSync(filePath, 'utf-8');

// 提取 rawVideoEntries 数组
const match = content.match(/const rawVideoEntries = \[([\s\S]*?)\]/);
if (!match) {
  console.error('❌ 无法找到 rawVideoEntries 数组');
  process.exit(1);
}

// 解析数据
const entriesText = '[' + match[1] + ']';
let entries;
try {
  // 使用 eval 解析（仅在受信任的本地脚本中使用）
  entries = eval(entriesText);
} catch (error) {
  console.error('❌ 解析数据失败:', error.message);
  process.exit(1);
}

console.log(`-- =====================================================`);
console.log(`-- Discover Videos 数据迁移脚本`);
console.log(`-- 生成时间: ${new Date().toISOString()}`);
console.log(`-- 数据条数: ${entries.length}`);
console.log(`-- =====================================================\n`);

// 分类关键词
const categoryKeywords = {
  portrait: ['woman', 'girl', 'boy', 'man', 'person', 'face', 'eyes', 'hair', 'smile', '女子', '美女', '男子'],
  nature: ['butterfly', 'flowers', 'tree', 'water', 'ocean', 'mountain', 'sky', 'sunlight', 'panda', 'cat', 'dog', '猫', '狮子'],
  fantasy: ['fairy', 'mermaid', 'dragon', 'magic', 'mystical', 'werewolf', 'space', 'astronaut', 'floating', 'glowing'],
  lifestyle: ['kitchen', 'home', 'office', 'laundry', 'cooking', 'coffee', 'beer', 'sofa', '锅', '土豆丝'],
  abstract: ['animate', 'move', 'particles', 'transform', 'gears', 'abstract', 'minimal', 'texture'],
  cinematic: ['camera', 'zoom', 'tracking', 'cinematic', 'film', 'professional', 'lighting', 'composition'],
  vehicles: ['car', 'motorcycle', 'spaceship', 'satellite', 'bicycle', 'train'],
  technology: ['cyberpunk', 'futuristic', 'sci-fi', 'robot', 'AI', 'digital', 'gaming', 'tech']
};

function categorizePrompt(prompt) {
  const lowerPrompt = prompt.toLowerCase();
  const scores = {};

  Object.entries(categoryKeywords).forEach(([category, keywords]) => {
    scores[category] = keywords.filter(keyword =>
      lowerPrompt.includes(keyword.toLowerCase())
    ).length;
  });

  const entries = Object.entries(scores);
  if (entries.length === 0) return 'abstract';

  const bestCategory = entries.reduce((a, b) =>
    scores[a[0]] > scores[b[0]] ? a : b
  )[0];

  return scores[bestCategory] > 0 ? bestCategory : 'abstract';
}

function escapeSQL(str) {
  return str.replace(/'/g, "''");
}

// 生成 SQL
console.log(`INSERT INTO discover_videos (`);
console.log(`  prompt,`);
console.log(`  video_url,`);
console.log(`  image_url,`);
console.log(`  category,`);
console.log(`  status,`);
console.log(`  is_featured,`);
console.log(`  display_order,`);
console.log(`  created_at`);
console.log(`) VALUES`);

const values = entries.map((entry, index) => {
  const prompt = escapeSQL(entry.prompt);
  const category = categorizePrompt(entry.prompt);
  const displayOrder = 1000 - index;

  // 修正图片 URL：将 .png/.jpg/.jpeg 改为 .webp
  let imageUrl = entry.imageUrl;
  if (imageUrl) {
    imageUrl = imageUrl.replace(/\.(png|jpg|jpeg)$/i, '.webp');
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
  )`;
}).join(',\n');

console.log(values);
console.log(`;\n`);

console.log(`-- 验证插入结果`);
console.log(`SELECT category, COUNT(*) as count`);
console.log(`FROM discover_videos`);
console.log(`GROUP BY category`);
console.log(`ORDER BY count DESC;`);
console.log(``);
console.log(`-- 查看总数`);
console.log(`SELECT COUNT(*) as total FROM discover_videos;`);

// 输出 SQL 注释格式的统计信息
console.log(``);
console.log(`-- =====================================================`);
console.log(`-- SQL 生成成功！`);
console.log(`-- 数据条数: ${entries.length}`);
console.log(`-- `);
console.log(`-- 下一步:`);
console.log(`-- 1. 复制上面的 SQL`);
console.log(`-- 2. 在 Supabase Dashboard 的 SQL Editor 中执行`);
console.log(`-- =====================================================`);

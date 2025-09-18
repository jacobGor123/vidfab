/**
 * 用户名生成器演示和测试
 * Username Generator Demo and Test
 */

import {
  UsernameGenerator,
  UsernameStyle,
  PRESET_USERNAMES,
  generateRandomUsername,
  generateRandomUsernames,
  type GeneratedUsername,
  type UsernameConfig
} from './username-generator';

/**
 * 演示所有功能
 */
export function runUsernameDemo(): void {
  console.log('🎯 VidFab 用户名生成器演示\n');

  // 1. 展示所有75个预设用户名
  console.log('📋 75个预设用户名按风格分类：\n');

  const styleGroups = {
    [UsernameStyle.CREATIVE_ARTISTIC]: '🎨 创意艺术风格',
    [UsernameStyle.TECH_STYLE]: '⚡ 科技风格',
    [UsernameStyle.REAL_NAME]: '👤 真实姓名风格',
    [UsernameStyle.ABSTRACT]: '🌀 抽象风格',
    [UsernameStyle.GAMING]: '🎮 游戏风格',
    [UsernameStyle.MINIMALIST]: '⚪ 极简风格'
  };

  Object.entries(styleGroups).forEach(([style, label]) => {
    const usernames = PRESET_USERNAMES.filter(u => u.style === style as UsernameStyle);
    console.log(`\n${label} (${usernames.length}个):`);
    usernames.forEach((u, index) => {
      console.log(`  ${index + 1}. ${u.username} - ${u.description}`);
    });
  });

  // 2. 演示动态生成
  console.log('\n\n🔄 动态用户名生成演示：\n');

  const generator = new UsernameGenerator();

  // 按不同风格生成
  Object.values(UsernameStyle).forEach(style => {
    const config: UsernameConfig = {
      style,
      includeNumbers: Math.random() > 0.5,
      includeSpecialChars: false,
      maxLength: 18,
      minLength: 6
    };

    const generated = generator.generateUsername(config);
    console.log(`${styleGroups[style]}: ${generated.username}`);
  });

  // 3. 批量生成演示
  console.log('\n\n📦 批量生成10个随机用户名：\n');
  const randomUsernames = generateRandomUsernames(10);
  randomUsernames.forEach((u, index) => {
    const styleLabel = styleGroups[u.style] || u.style;
    console.log(`${index + 1}. ${u.username} (${styleLabel})`);
  });

  // 4. 统计信息
  console.log('\n\n📊 用户名统计：\n');
  const stats = generateUsernameStats();
  console.log(`总用户名数量: ${stats.total}`);
  Object.entries(stats.byStyle).forEach(([style, count]) => {
    const styleLabel = styleGroups[style as UsernameStyle] || style;
    console.log(`${styleLabel}: ${count}个`);
  });

  console.log(`\n平均长度: ${stats.averageLength.toFixed(1)} 字符`);
  console.log(`最短: ${stats.shortest} (${stats.shortestExample})`);
  console.log(`最长: ${stats.longest} (${stats.longestExample})`);
}

/**
 * 生成用户名统计信息
 */
export function generateUsernameStats() {
  const stats = {
    total: PRESET_USERNAMES.length,
    byStyle: {} as Record<string, number>,
    averageLength: 0,
    shortest: Infinity,
    longest: 0,
    shortestExample: '',
    longestExample: ''
  };

  let totalLength = 0;

  PRESET_USERNAMES.forEach(u => {
    // 按风格统计
    stats.byStyle[u.style] = (stats.byStyle[u.style] || 0) + 1;

    // 长度统计
    const len = u.username.length;
    totalLength += len;

    if (len < stats.shortest) {
      stats.shortest = len;
      stats.shortestExample = u.username;
    }

    if (len > stats.longest) {
      stats.longest = len;
      stats.longestExample = u.username;
    }
  });

  stats.averageLength = totalLength / stats.total;

  return stats;
}

/**
 * 验证用户名唯一性
 */
export function validateUsernameUniqueness(): boolean {
  const usernames = new Set<string>();
  const duplicates: string[] = [];

  PRESET_USERNAMES.forEach(u => {
    const lower = u.username.toLowerCase();
    if (usernames.has(lower)) {
      duplicates.push(u.username);
    } else {
      usernames.add(lower);
    }
  });

  if (duplicates.length > 0) {
    console.error('❌ 发现重复用户名:', duplicates);
    return false;
  }

  console.log('✅ 所有用户名都是唯一的');
  return true;
}

/**
 * 测试用户名生成算法的多样性
 */
export function testGenerationDiversity(): void {
  console.log('🧪 测试用户名生成多样性...\n');

  const generator = new UsernameGenerator();
  const testCounts = [10, 25, 50];

  testCounts.forEach(count => {
    const generated = generator.generateMultiple(count);
    const uniqueCount = new Set(generated.map(u => u.username.toLowerCase())).size;
    const uniqueRate = (uniqueCount / count * 100).toFixed(1);

    console.log(`生成 ${count} 个用户名：`);
    console.log(`  - 唯一数量: ${uniqueCount}`);
    console.log(`  - 唯一率: ${uniqueRate}%`);

    // 风格分布
    const styleDistribution = {} as Record<string, number>;
    generated.forEach(u => {
      styleDistribution[u.style] = (styleDistribution[u.style] || 0) + 1;
    });

    console.log(`  - 风格分布:`, styleDistribution);
    console.log('');

    // 重置生成器以进行下一轮测试
    generator.resetUsedUsernames();
  });
}

/**
 * 导出预设用户名为JSON格式（用于API或数据库）
 */
export function exportUsernamesAsJSON(): string {
  const exportData = {
    meta: {
      total: PRESET_USERNAMES.length,
      generatedAt: new Date().toISOString(),
      version: '1.0.0',
      styles: Object.values(UsernameStyle)
    },
    usernames: PRESET_USERNAMES.map(u => ({
      username: u.username,
      style: u.style,
      description: u.description,
      length: u.username.length,
      hasNumbers: /\d/.test(u.username),
      hasUnderscores: /_/.test(u.username),
      category: getCategoryFromStyle(u.style)
    }))
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * 根据风格获取分类
 */
function getCategoryFromStyle(style: UsernameStyle): string {
  const categoryMap = {
    [UsernameStyle.CREATIVE_ARTISTIC]: 'Creative',
    [UsernameStyle.TECH_STYLE]: 'Technology',
    [UsernameStyle.REAL_NAME]: 'Personal',
    [UsernameStyle.ABSTRACT]: 'Abstract',
    [UsernameStyle.GAMING]: 'Gaming',
    [UsernameStyle.MINIMALIST]: 'Minimalist'
  };

  return categoryMap[style] || 'Other';
}

/**
 * 获取推荐的用户名（基于内容类型）
 */
export function getRecommendedUsernames(contentType: string, count: number = 5): GeneratedUsername[] {
  const recommendations = {
    'tech': [UsernameStyle.TECH_STYLE, UsernameStyle.ABSTRACT],
    'gaming': [UsernameStyle.GAMING, UsernameStyle.TECH_STYLE],
    'art': [UsernameStyle.CREATIVE_ARTISTIC, UsernameStyle.ABSTRACT],
    'lifestyle': [UsernameStyle.REAL_NAME, UsernameStyle.MINIMALIST],
    'education': [UsernameStyle.REAL_NAME, UsernameStyle.TECH_STYLE],
    'entertainment': [UsernameStyle.CREATIVE_ARTISTIC, UsernameStyle.GAMING]
  };

  const styles = recommendations[contentType.toLowerCase()] || [UsernameStyle.CREATIVE_ARTISTIC];
  const filtered = PRESET_USERNAMES.filter(u => styles.includes(u.style));

  // 随机选择并返回指定数量
  const shuffled = [...filtered].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// 如果直接运行此文件，执行演示
if (require.main === module) {
  runUsernameDemo();
  console.log('\n' + '='.repeat(80) + '\n');
  validateUsernameUniqueness();
  console.log('\n' + '='.repeat(80) + '\n');
  testGenerationDiversity();
}
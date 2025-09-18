/**
 * 用户名生成 API 端点
 * Username Generation API Endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  UsernameGenerator,
  UsernameStyle,
  PRESET_USERNAMES,
  generateRandomUsernames,
  type UsernameConfig,
  type GeneratedUsername
} from '../../../../utils/username-generator';

// POST /api/usernames/generate
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      count = 10,
      style,
      styles,
      includeNumbers = false,
      includeSpecialChars = false,
      maxLength = 20,
      minLength = 6,
      contentType,
      excludePresets = false
    } = body;

    const generator = new UsernameGenerator();
    let results: GeneratedUsername[] = [];

    // 验证参数
    if (count > 100) {
      return NextResponse.json(
        { error: '单次最多生成100个用户名' },
        { status: 400 }
      );
    }

    // 如果指定了内容类型，使用推荐算法
    if (contentType) {
      const recommendations = getRecommendationsByContentType(contentType);
      results = generator.generateMultiple(count, recommendations);
    }
    // 如果指定了特定风格
    else if (style && Object.values(UsernameStyle).includes(style)) {
      const config: UsernameConfig = {
        style,
        includeNumbers,
        includeSpecialChars,
        maxLength,
        minLength
      };

      for (let i = 0; i < count; i++) {
        results.push(generator.generateUsername(config));
      }
    }
    // 如果指定了多个风格
    else if (styles && Array.isArray(styles)) {
      const validStyles = styles.filter(s => Object.values(UsernameStyle).includes(s));
      if (validStyles.length === 0) {
        return NextResponse.json(
          { error: '未提供有效的用户名风格' },
          { status: 400 }
        );
      }
      results = generator.generateMultiple(count, validStyles);
    }
    // 默认随机生成
    else {
      results = generateRandomUsernames(count);
    }

    // 如果不排除预设，混合一些预设用户名
    if (!excludePresets && count > 5) {
      const presetCount = Math.min(Math.floor(count * 0.3), 10);
      const shuffledPresets = [...PRESET_USERNAMES]
        .sort(() => Math.random() - 0.5)
        .slice(0, presetCount);

      // 替换一些生成的用户名
      results.splice(0, presetCount, ...shuffledPresets);
    }

    // 确保唯一性
    const uniqueResults = deduplicateUsernames(results);

    return NextResponse.json({
      success: true,
      data: {
        usernames: uniqueResults.slice(0, count),
        total: uniqueResults.length,
        requestedCount: count,
        filters: {
          style,
          styles,
          contentType,
          includeNumbers,
          includeSpecialChars,
          maxLength,
          minLength
        }
      }
    });

  } catch (error) {
    console.error('用户名生成错误:', error);
    return NextResponse.json(
      { error: '用户名生成失败，请稍后重试' },
      { status: 500 }
    );
  }
}

// GET /api/usernames/generate - 获取预设用户名
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const style = searchParams.get('style') as UsernameStyle;
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '20');

    let results = [...PRESET_USERNAMES];

    // 按风格过滤
    if (style && Object.values(UsernameStyle).includes(style)) {
      results = results.filter(u => u.style === style);
    }

    // 按类别过滤（内容类型）
    if (category) {
      const recommendedStyles = getRecommendationsByContentType(category);
      results = results.filter(u => recommendedStyles.includes(u.style));
    }

    // 随机排序并限制数量
    const shuffled = results.sort(() => Math.random() - 0.5);
    const limited = shuffled.slice(0, limit);

    // 添加统计信息
    const stats = {
      total: PRESET_USERNAMES.length,
      filtered: results.length,
      returned: limited.length,
      byStyle: getStyleDistribution(results)
    };

    return NextResponse.json({
      success: true,
      data: {
        usernames: limited,
        stats
      }
    });

  } catch (error) {
    console.error('获取预设用户名错误:', error);
    return NextResponse.json(
      { error: '获取用户名失败，请稍后重试' },
      { status: 500 }
    );
  }
}

/**
 * 根据内容类型获取推荐的用户名风格
 */
function getRecommendationsByContentType(contentType: string): UsernameStyle[] {
  const recommendations: Record<string, UsernameStyle[]> = {
    'tech': [UsernameStyle.TECH_STYLE, UsernameStyle.ABSTRACT],
    'technology': [UsernameStyle.TECH_STYLE, UsernameStyle.ABSTRACT],
    'gaming': [UsernameStyle.GAMING, UsernameStyle.TECH_STYLE],
    'games': [UsernameStyle.GAMING, UsernameStyle.TECH_STYLE],
    'art': [UsernameStyle.CREATIVE_ARTISTIC, UsernameStyle.ABSTRACT],
    'creative': [UsernameStyle.CREATIVE_ARTISTIC, UsernameStyle.ABSTRACT],
    'lifestyle': [UsernameStyle.REAL_NAME, UsernameStyle.MINIMALIST],
    'personal': [UsernameStyle.REAL_NAME, UsernameStyle.MINIMALIST],
    'education': [UsernameStyle.REAL_NAME, UsernameStyle.TECH_STYLE],
    'educational': [UsernameStyle.REAL_NAME, UsernameStyle.TECH_STYLE],
    'entertainment': [UsernameStyle.CREATIVE_ARTISTIC, UsernameStyle.GAMING],
    'music': [UsernameStyle.CREATIVE_ARTISTIC, UsernameStyle.ABSTRACT],
    'fitness': [UsernameStyle.REAL_NAME, UsernameStyle.MINIMALIST],
    'food': [UsernameStyle.REAL_NAME, UsernameStyle.CREATIVE_ARTISTIC],
    'travel': [UsernameStyle.REAL_NAME, UsernameStyle.CREATIVE_ARTISTIC],
    'business': [UsernameStyle.REAL_NAME, UsernameStyle.MINIMALIST],
    'science': [UsernameStyle.TECH_STYLE, UsernameStyle.REAL_NAME],
    'minimal': [UsernameStyle.MINIMALIST],
    'abstract': [UsernameStyle.ABSTRACT]
  };

  return recommendations[contentType.toLowerCase()] || [
    UsernameStyle.CREATIVE_ARTISTIC,
    UsernameStyle.REAL_NAME
  ];
}

/**
 * 去重用户名
 */
function deduplicateUsernames(usernames: GeneratedUsername[]): GeneratedUsername[] {
  const seen = new Set<string>();
  return usernames.filter(u => {
    const lower = u.username.toLowerCase();
    if (seen.has(lower)) {
      return false;
    }
    seen.add(lower);
    return true;
  });
}

/**
 * 获取风格分布统计
 */
function getStyleDistribution(usernames: GeneratedUsername[]): Record<string, number> {
  const distribution: Record<string, number> = {};
  usernames.forEach(u => {
    distribution[u.style] = (distribution[u.style] || 0) + 1;
  });
  return distribution;
}
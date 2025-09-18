/**
 * 用户名验证 API 端点
 * Username Validation API Endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { PRESET_USERNAMES } from '../../../../utils/username-generator';

// POST /api/usernames/validate
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, usernames } = body;

    if (username) {
      // 验证单个用户名
      const result = validateSingleUsername(username);
      return NextResponse.json({
        success: true,
        data: result
      });
    }

    if (usernames && Array.isArray(usernames)) {
      // 批量验证用户名
      if (usernames.length > 50) {
        return NextResponse.json(
          { error: '单次最多验证50个用户名' },
          { status: 400 }
        );
      }

      const results = usernames.map(validateSingleUsername);
      return NextResponse.json({
        success: true,
        data: {
          validations: results,
          summary: {
            total: results.length,
            valid: results.filter(r => r.isValid).length,
            available: results.filter(r => r.isAvailable).length
          }
        }
      });
    }

    return NextResponse.json(
      { error: '请提供要验证的用户名' },
      { status: 400 }
    );

  } catch (error) {
    console.error('用户名验证错误:', error);
    return NextResponse.json(
      { error: '用户名验证失败，请稍后重试' },
      { status: 500 }
    );
  }
}

interface UsernameValidation {
  username: string;
  isValid: boolean;
  isAvailable: boolean;
  issues: string[];
  suggestions: string[];
  score: number; // 0-100, 用户名质量评分
  metadata: {
    length: number;
    hasNumbers: boolean;
    hasSpecialChars: boolean;
    hasUnderscores: boolean;
    readability: 'high' | 'medium' | 'low';
    memorability: 'high' | 'medium' | 'low';
  };
}

/**
 * 验证单个用户名
 */
function validateSingleUsername(username: string): UsernameValidation {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 100;

  // 基础验证
  if (!username || typeof username !== 'string') {
    return {
      username: username || '',
      isValid: false,
      isAvailable: false,
      issues: ['用户名不能为空'],
      suggestions: ['请输入有效的用户名'],
      score: 0,
      metadata: {
        length: 0,
        hasNumbers: false,
        hasSpecialChars: false,
        hasUnderscores: false,
        readability: 'low',
        memorability: 'low'
      }
    };
  }

  const cleanUsername = username.trim();

  // 长度检查
  if (cleanUsername.length < 3) {
    issues.push('用户名长度不能少于3个字符');
    score -= 30;
  } else if (cleanUsername.length < 6) {
    issues.push('用户名建议至少6个字符以上');
    score -= 10;
  }

  if (cleanUsername.length > 30) {
    issues.push('用户名长度不能超过30个字符');
    score -= 20;
  } else if (cleanUsername.length > 20) {
    issues.push('用户名过长，建议控制在20个字符以内');
    score -= 5;
  }

  // 字符检查
  const validCharsRegex = /^[a-zA-Z0-9_-]+$/;
  if (!validCharsRegex.test(cleanUsername)) {
    issues.push('用户名只能包含字母、数字、下划线和连字符');
    score -= 25;
  }

  // 开头结尾检查
  if (cleanUsername.startsWith('_') || cleanUsername.startsWith('-')) {
    issues.push('用户名不能以下划线或连字符开头');
    score -= 15;
  }

  if (cleanUsername.endsWith('_') || cleanUsername.endsWith('-')) {
    issues.push('用户名不能以下划线或连字符结尾');
    score -= 15;
  }

  // 连续特殊字符检查
  if (/_{2,}|(-{2,})/.test(cleanUsername)) {
    issues.push('不建议使用连续的下划线或连字符');
    score -= 10;
  }

  // 数字占比检查
  const digitCount = (cleanUsername.match(/\d/g) || []).length;
  const digitRatio = digitCount / cleanUsername.length;
  if (digitRatio > 0.5) {
    issues.push('数字占比过高，影响可读性');
    score -= 15;
  }

  // 可用性检查（检查是否与预设用户名冲突）
  const isAvailable = !PRESET_USERNAMES.some(
    preset => preset.username.toLowerCase() === cleanUsername.toLowerCase()
  );

  if (!isAvailable) {
    issues.push('此用户名已被使用');
    suggestions.push(`尝试 ${cleanUsername}_${Math.floor(Math.random() * 100)}`);
    suggestions.push(`尝试 ${cleanUsername}Pro`);
    suggestions.push(`尝试 ${cleanUsername}Official`);
  }

  // 常见问题检查
  const commonProblems = [
    { pattern: /^admin/i, issue: '不建议使用admin相关用户名' },
    { pattern: /^test/i, issue: '不建议使用test相关用户名' },
    { pattern: /^user\d+/i, issue: '不建议使用通用的user格式' },
    { pattern: /^\d+$/, issue: '不建议使用纯数字用户名' },
    { pattern: /^[aeiou]+$/i, issue: '不建议使用纯元音字母' },
    { pattern: /^[bcdfghjklmnpqrstvwxyz]+$/i, issue: '不建议使用纯辅音字母' }
  ];

  commonProblems.forEach(({ pattern, issue }) => {
    if (pattern.test(cleanUsername)) {
      issues.push(issue);
      score -= 10;
    }
  });

  // 生成改进建议
  if (issues.length > 0) {
    if (cleanUsername.length < 6) {
      suggestions.push(`延长用户名，如 ${cleanUsername}Creator`);
    }

    if (digitRatio > 0.3) {
      const withoutDigits = cleanUsername.replace(/\d/g, '');
      suggestions.push(`减少数字使用，如 ${withoutDigits}`);
    }

    if (/_{2,}/.test(cleanUsername)) {
      const fixed = cleanUsername.replace(/_{2,}/g, '_');
      suggestions.push(`简化下划线，如 ${fixed}`);
    }
  }

  // 计算元数据
  const metadata = {
    length: cleanUsername.length,
    hasNumbers: /\d/.test(cleanUsername),
    hasSpecialChars: /[_-]/.test(cleanUsername),
    hasUnderscores: /_/.test(cleanUsername),
    readability: calculateReadability(cleanUsername),
    memorability: calculateMemorability(cleanUsername)
  };

  // 根据元数据调整评分
  if (metadata.readability === 'high') score += 5;
  if (metadata.readability === 'low') score -= 10;
  if (metadata.memorability === 'high') score += 5;
  if (metadata.memorability === 'low') score -= 10;

  return {
    username: cleanUsername,
    isValid: issues.length === 0,
    isAvailable,
    issues,
    suggestions: [...new Set(suggestions)], // 去重
    score: Math.max(0, Math.min(100, score)),
    metadata
  };
}

/**
 * 计算可读性
 */
function calculateReadability(username: string): 'high' | 'medium' | 'low' {
  const length = username.length;
  const wordCount = username.split(/[_-]/).length;
  const hasWords = /[a-zA-Z]{3,}/.test(username);

  if (hasWords && length >= 6 && length <= 15 && wordCount <= 3) {
    return 'high';
  }

  if (hasWords && length >= 4 && length <= 20) {
    return 'medium';
  }

  return 'low';
}

/**
 * 计算记忆度
 */
function calculateMemorability(username: string): 'high' | 'medium' | 'low' {
  const length = username.length;
  const hasPattern = /(.)\1{2,}/.test(username); // 重复字符
  const isPronounceable = /^[a-zA-Z]*([_-][a-zA-Z]*)*$/.test(username);
  const complexity = (username.match(/[_-]/g) || []).length;

  if (isPronounceable && length >= 6 && length <= 12 && complexity <= 1 && !hasPattern) {
    return 'high';
  }

  if (length >= 4 && length <= 16 && complexity <= 2) {
    return 'medium';
  }

  return 'low';
}
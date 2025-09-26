/**
 * Verification System Status and Management API
 * 用于监控和测试邮箱验证码系统的状态
 */
import { NextRequest, NextResponse } from 'next/server';
import { redisVerificationCodeManager } from '@/lib/redis-verification-codes';
import { emailService } from '@/lib/email-service';
import { checkRedisHealth } from '@/lib/redis';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const email = url.searchParams.get('email');

    // 基础健康检查
    if (action === 'health') {
      const isRedisHealthy = await checkRedisHealth();
      const emailProviderInfo = emailService.getProviderInfo();

      return NextResponse.json({
        success: true,
        status: {
          redis: isRedisHealthy ? 'healthy' : 'unhealthy',
          email_service: {
            provider: emailProviderInfo.provider,
            configured: emailProviderInfo.configured,
            from_email: emailProviderInfo.config.from_email
          }
        },
        timestamp: new Date().toISOString()
      });
    }

    // 获取系统统计信息
    if (action === 'stats') {
      const stats = await redisVerificationCodeManager.getStats();
      const emailProviderInfo = emailService.getProviderInfo();

      return NextResponse.json({
        success: true,
        stats: {
          active_verification_codes: stats.active_codes,
          codes_sent_today: stats.total_sent_today,
          blacklisted_emails: stats.blacklisted_emails
        },
        system: {
          redis_healthy: await checkRedisHealth(),
          email_provider: emailProviderInfo.provider,
          email_configured: emailProviderInfo.configured
        },
        timestamp: new Date().toISOString()
      });
    }

    // 测试邮件服务配置
    if (action === 'test-email') {
      if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json(
          { success: false, error: 'Test email is only available in development mode' },
          { status: 403 }
        );
      }

      const result = await emailService.testConfiguration();

      return NextResponse.json({
        success: result.success,
        message: result.success ? 'Test email sent successfully' : 'Test email failed',
        details: result,
        timestamp: new Date().toISOString()
      });
    }

    // 获取特定邮箱的验证码信息（仅开发环境）
    if (action === 'code-info' && email) {
      if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json(
          { success: false, error: 'Code info is only available in development mode' },
          { status: 403 }
        );
      }

      const codeInfo = await redisVerificationCodeManager.getCodeInfo(email);

      if (!codeInfo) {
        return NextResponse.json({
          success: false,
          error: 'No active verification code found for this email'
        }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        code_info: {
          email: codeInfo.email,
          code: codeInfo.code, // 仅开发环境显示
          attempts: codeInfo.attempts,
          created_at: new Date(codeInfo.created_at).toISOString(),
          expires_at: new Date(codeInfo.expires_at).toISOString(),
          is_expired: Date.now() > codeInfo.expires_at
        },
        timestamp: new Date().toISOString()
      });
    }

    // 默认状态信息
    const isRedisHealthy = await checkRedisHealth();
    const emailProviderInfo = emailService.getProviderInfo();

    return NextResponse.json({
      success: true,
      message: 'VidFab Email Verification System Status',
      status: {
        system: 'operational',
        redis: isRedisHealthy ? 'healthy' : 'unhealthy',
        email_service: {
          provider: emailProviderInfo.provider,
          configured: emailProviderInfo.configured
        }
      },
      endpoints: {
        health_check: '?action=health',
        system_stats: '?action=stats',
        test_email: '?action=test-email (dev only)',
        code_info: '?action=code-info&email=user@example.com (dev only)'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Verification status API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve system status',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// POST method for administrative actions (development only)
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { success: false, error: 'Administrative actions are only available in development mode' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { action, email } = body;

    // 清理过期验证码
    if (action === 'cleanup-expired') {
      const cleanedCount = await redisVerificationCodeManager.cleanupExpiredCodes();

      return NextResponse.json({
        success: true,
        message: `Cleaned up ${cleanedCount} expired verification codes`,
        cleaned_count: cleanedCount,
        timestamp: new Date().toISOString()
      });
    }

    // 删除特定邮箱的验证码
    if (action === 'delete-code' && email) {
      await redisVerificationCodeManager.deleteCode(email);

      return NextResponse.json({
        success: true,
        message: `Verification code deleted for ${email}`,
        timestamp: new Date().toISOString()
      });
    }

    // 检查邮箱是否被黑名单
    if (action === 'check-blacklist' && email) {
      const isBlacklisted = await redisVerificationCodeManager.isEmailBlacklisted(email);

      return NextResponse.json({
        success: true,
        email,
        is_blacklisted: isBlacklisted,
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action or missing parameters' },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('Verification admin API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to perform administrative action',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
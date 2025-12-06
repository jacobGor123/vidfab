/**
 * Production-Ready Verify Code Login API for VidFab AI Video Platform
 * Redis-based verification with comprehensive security measures
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { redisVerificationCodeManager } from '@/lib/redis-verification-codes';
import { generateRandomString } from '@/lib/hash';
import { getClientIp } from '@/lib/ip';
import { checkRedisHealth } from '@/lib/redis-upstash';

const verifyCodeSchema = z.object({
  email: z.string().email('Invalid email address'),
  code: z.string().regex(/^\d{6}$/, 'Code must be 6 digits'),
});

export async function POST(request: NextRequest) {
  try {
    // Check Redis connectivity
    const isRedisHealthy = await checkRedisHealth();
    if (!isRedisHealthy) {
      console.error('❌ Redis connection failed');
      return NextResponse.json(
        {
          success: false,
          error: 'Service temporarily unavailable. Please try again later.'
        },
        { status: 503 }
      );
    }

    // Get client IP for rate limiting
    const clientIp = await getClientIp();

    // Parse and validate request body
    const body = await request.json();
    const validation = verifyCodeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid email or code format',
          details: validation.error.issues
        },
        { status: 400 }
      );
    }

    const { email, code } = validation.data;

    console.log(`🔐 Verifying code for email: ${email} from IP: ${clientIp}`);

    // Verify the code using Redis manager (includes rate limiting)
    const verificationResult = await redisVerificationCodeManager.verifyCode(email, code, clientIp);

    if (!verificationResult.success) {
      console.log(`❌ Code verification failed for ${email}: ${verificationResult.error}`);

      // Determine appropriate HTTP status based on error type
      let status = 400; // Bad Request (default for invalid codes)

      if (verificationResult.error?.includes('Too many verification attempts')) {
        status = 429; // Too Many Requests
      } else if (verificationResult.error?.includes('expired')) {
        status = 410; // Gone
      } else if (verificationResult.error?.includes('No verification code found')) {
        status = 404; // Not Found
      } else if (verificationResult.error?.includes('Internal server error')) {
        status = 500; // Internal Server Error
      }

      return NextResponse.json(
        {
          success: false,
          error: verificationResult.error,
          remaining_attempts: verificationResult.remaining_attempts
        },
        { status }
      );
    }

    // Generate a verified token that NextAuth can validate
    // This token tells NextAuth that the email has been verified
    const verifiedToken = `verified-${generateRandomString(32)}-${email.toLowerCase().trim()}-${Date.now()}`;

    console.log(`✅ Email verification successful for ${email}`);

    // Success response
    return NextResponse.json({
      success: true,
      message: 'Email verified successfully',
      verified_token: verifiedToken,
      email: email.toLowerCase().trim(),
      verified_at: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Verify code error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}
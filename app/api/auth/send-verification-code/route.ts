/**
 * Production-Ready Send Verification Code API for VidFab AI Video Platform
 * Redis-based with real email sending capability
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { redisVerificationCodeManager } from '@/lib/redis-verification-codes';
import { sendVerificationEmail } from '@/lib/email-service';
import { checkRedisHealth } from '@/lib/redis';

const sendCodeSchema = z.object({
  email: z.string().email('Invalid email address'),
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

    // Parse and validate request body
    const body = await request.json();
    const validation = sendCodeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid email address',
          details: validation.error.issues
        },
        { status: 400 }
      );
    }

    const { email } = validation.data;

    console.log(`📧 Generating verification code for: ${email}`);

    // Generate verification code using Redis manager
    const codeResult = await redisVerificationCodeManager.generateCode(email);

    if (!codeResult.success) {
      console.log(`❌ Code generation failed for ${email}: ${codeResult.error}`);

      // Determine appropriate HTTP status based on error type
      let status = 500;
      if (codeResult.error?.includes('wait') || codeResult.error?.includes('blocked')) {
        status = 429; // Too Many Requests
      } else if (codeResult.error?.includes('Invalid email')) {
        status = 400; // Bad Request
      }

      return NextResponse.json(
        {
          success: false,
          error: codeResult.error
        },
        { status }
      );
    }

    // Send email with verification code
    const emailResult = await sendVerificationEmail(email, codeResult.code!);

    if (!emailResult.success) {
      console.error(`❌ Email sending failed for ${email}:`, emailResult.error);

      // Clean up the generated code since email failed
      await redisVerificationCodeManager.deleteCode(email);

      // In development mode, still allow the process to continue
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔧 Development Mode - Email service failed but continuing with code: ${codeResult.code}`);

        return NextResponse.json({
          success: true,
          message: 'Verification code generated (email service unavailable in development)',
          expires_in: codeResult.expires_in,
          debug_code: process.env.NODE_ENV === 'development' ? codeResult.code : undefined,
          email_sent: false
        });
      }

      return NextResponse.json(
        {
          success: false,
          error: 'Failed to send verification email. Please try again.'
        },
        { status: 500 }
      );
    }

    console.log(`✅ Verification code sent successfully to ${email} via ${emailResult.provider}`);

    // Success response
    return NextResponse.json({
      success: true,
      message: 'Verification code sent successfully',
      expires_in: codeResult.expires_in,
      email_sent: true,
      provider: emailResult.provider,
      // Only include debug code in development mode
      debug_code: process.env.NODE_ENV === 'development' ? codeResult.code : undefined
    });

  } catch (error: any) {
    console.error('Send verification code error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}
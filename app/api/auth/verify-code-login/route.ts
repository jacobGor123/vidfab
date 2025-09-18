/**
 * Verify Code Login API for VidFab AI Video Platform
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verificationCodeManager } from '@/lib/verification-codes';
import { generateRandomString } from '@/lib/hash';
import { getClientIp } from '@/lib/ip';

// Rate limiting map (in production, use Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const verifyCodeSchema = z.object({
  email: z.string().email('Invalid email address'),
  code: z.string().regex(/^\d{6}$/, 'Code must be 6 digits'),
});

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const clientIp = await getClientIp();
    
    // Rate limiting: 10 attempts per 15 minutes per IP
    const now = Date.now();
    const rateLimitKey = `verify-code:${clientIp}`;
    const rateLimit = rateLimitMap.get(rateLimitKey);
    
    if (rateLimit) {
      if (now < rateLimit.resetTime) {
        if (rateLimit.count >= 10) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'Too many verification attempts. Please try again later.' 
            },
            { status: 429 }
          );
        }
        rateLimit.count++;
      } else {
        // Reset rate limit
        rateLimitMap.set(rateLimitKey, { count: 1, resetTime: now + 15 * 60 * 1000 });
      }
    } else {
      // First request
      rateLimitMap.set(rateLimitKey, { count: 1, resetTime: now + 15 * 60 * 1000 });
    }

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

    // Verify the code
    const verificationResult = await verificationCodeManager.verifyCode(email, code);
    
    if (!verificationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: verificationResult.error 
        },
        { status: 400 }
      );
    }

    // Generate a token that NextAuth can validate
    // This token tells NextAuth that the email has been verified
    const verifiedToken = `verified-${generateRandomString(32)}-${email}-${Date.now()}`;

    // Clean up the used verification code
    await verificationCodeManager.deleteCode(email);

    // Success response
    return NextResponse.json({
      success: true,
      message: 'Email verified successfully',
      verified_token: verifiedToken,
      email: email
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
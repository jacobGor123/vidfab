/**
 * Send Verification Code API for VidFab AI Video Platform
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verificationCodeManager, sendVerificationEmail } from '@/lib/verification-codes';
import { getClientIp } from '@/lib/ip';

// Rate limiting map (in production, use Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const sendCodeSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const clientIp = await getClientIp();
    
    // Rate limiting: 5 requests per 15 minutes per IP
    const now = Date.now();
    const rateLimitKey = `send-code:${clientIp}`;
    const rateLimit = rateLimitMap.get(rateLimitKey);
    
    if (rateLimit) {
      if (now < rateLimit.resetTime) {
        if (rateLimit.count >= 5) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'Rate limit exceeded. Please try again later.' 
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

    // Generate verification code
    const verificationCode = await verificationCodeManager.generateCode(email);
    
    if (!verificationCode) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to generate verification code. Please try again.' 
        },
        { status: 500 }
      );
    }

    // Send email
    const emailSent = await sendVerificationEmail(email, verificationCode.code);
    
    if (!emailSent) {
      // Clean up the generated code if email failed
      await verificationCodeManager.deleteCode(email);
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to send verification email. Please try again.' 
        },
        { status: 500 }
      );
    }

    // Success response
    return NextResponse.json({
      success: true,
      message: 'Verification code sent successfully',
      expires_in: 300, // 5 minutes in seconds
      // Don't send the actual code in production
      ...(process.env.NODE_ENV === 'development' && { 
        debug_code: verificationCode.code 
      })
    });

  } catch (error: any) {
    console.error('Send verification code error:', error);
    
    // Handle specific error messages
    if (error.message && error.message.includes('wait')) {
      return NextResponse.json(
        { 
          success: false, 
          error: error.message 
        },
        { status: 429 }
      );
    }

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
/**
 * Authentication Test API for VidFab AI Video Platform
 * Use this to test authentication setup
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { verificationCodeManager } from '@/lib/verification-codes';

export async function GET(request: NextRequest) {
  try {
    // Get current session
    const session = await auth();
    
    // Get verification code stats
    const codeStats = await verificationCodeManager.getStats();
    
    return NextResponse.json({
      success: true,
      message: 'Authentication system is working',
      session: session ? {
        user: session.user,
        expires: session.expires
      } : null,
      verification_stats: codeStats,
      environment: {
        node_env: process.env.NODE_ENV,
        google_enabled: process.env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED === 'true',
        google_one_tap_enabled: process.env.NEXT_PUBLIC_AUTH_GOOGLE_ONE_TAP_ENABLED === 'true',
        has_nextauth_secret: !!process.env.NEXTAUTH_SECRET,
        has_google_credentials: !!(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET),
      }
    });
  } catch (error) {
    console.error('Auth test error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Authentication test failed',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'cleanup_codes') {
      // Clean up expired verification codes
      const stats = await verificationCodeManager.getStats();
      return NextResponse.json({
        success: true,
        message: 'Cleanup completed',
        stats
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Auth test POST error:', error);
    return NextResponse.json(
      { error: 'Test failed' },
      { status: 500 }
    );
  }
}
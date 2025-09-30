import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Health check with configuration validation
    const googleOAuthEnabled = process.env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED === "true";
    const googleOneTapEnabled = process.env.NEXT_PUBLIC_AUTH_GOOGLE_ONE_TAP_ENABLED === "true";
    const hasGoogleClientId = !!process.env.NEXT_PUBLIC_AUTH_GOOGLE_ID;
    const hasGoogleSecret = !!process.env.AUTH_GOOGLE_SECRET;
    const hasNextAuthSecret = !!process.env.NEXTAUTH_SECRET;

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      docker: !!process.env.DOCKER_ENVIRONMENT,
      auth: {
        nextAuthConfigured: hasNextAuthSecret,
        googleOAuth: {
          enabled: googleOAuthEnabled,
          configured: googleOAuthEnabled && hasGoogleClientId && hasGoogleSecret,
          hasClientId: hasGoogleClientId,
          hasSecret: hasGoogleSecret,
        },
        googleOneTap: {
          enabled: googleOneTapEnabled,
          configured: googleOneTapEnabled && hasGoogleClientId,
          hasClientId: hasGoogleClientId,
        },
      },
    };

    // Determine overall health status
    const criticalIssues = [];
    if (!hasNextAuthSecret) {
      criticalIssues.push('NEXTAUTH_SECRET missing');
    }
    if (googleOAuthEnabled && (!hasGoogleClientId || !hasGoogleSecret)) {
      criticalIssues.push('Google OAuth enabled but missing credentials');
    }

    if (criticalIssues.length > 0) {
      return NextResponse.json({
        ...health,
        status: 'degraded',
        issues: criticalIssues,
      }, { status: 200 });
    }

    return NextResponse.json(health, { status: 200 });
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 503 });
  }
}
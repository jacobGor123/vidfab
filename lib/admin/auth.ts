/**
 * Admin Authentication & Authorization
 * Validates admin access based on email whitelist
 */

import { getServerSession } from 'next-auth';
import { authConfig } from '@/auth/config';

/**
 * Admin email whitelist
 * TODO: Move this to environment variable for production
 */
const ADMIN_EMAILS = process.env.ADMIN_EMAILS
  ? process.env.ADMIN_EMAILS.split(',').map((email) => email.trim())
  : [];

/**
 * Check if an email is an admin
 * @param email - Email address to check
 * @returns True if email is in admin whitelist
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) {
    console.log('[Admin Auth] No email provided');
    return false;
  }

  const emailLower = email.toLowerCase();
  const isAdmin = ADMIN_EMAILS.includes(emailLower);

  console.log('[Admin Auth] Checking email:', {
    email: emailLower,
    adminEmails: ADMIN_EMAILS,
    isAdmin,
  });

  return isAdmin;
}

/**
 * Get current user from NextAuth session
 * @returns User object or null
 */
export async function getCurrentUser() {
  try {
    const session = await getServerSession(authConfig as any);

    console.log('[Admin Auth] Session status:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      userEmail: session?.user?.email || 'N/A',
    });

    if (!session || !session.user) {
      return null;
    }

    return session.user;
  } catch (err) {
    console.error('[Admin Auth] Error in getCurrentUser:', err);
    return null;
  }
}

/**
 * Check if current user is an admin
 * @returns True if current user is admin
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  console.log('[Admin Auth] Checking if current user is admin...');

  const user = await getCurrentUser();

  if (!user || !user.email) {
    console.log('[Admin Auth] No user or email found');
    return false;
  }

  const isAdmin = isAdminEmail(user.email);

  console.log('[Admin Auth] Final result:', {
    userEmail: user.email,
    isAdmin,
  });

  return isAdmin;
}

/**
 * Require admin authentication
 * Throws error if user is not authenticated or not an admin
 * Use this in API routes and server components
 */
export async function requireAdmin(): Promise<void> {
  const isAdmin = await isCurrentUserAdmin();

  if (!isAdmin) {
    throw new Error('Unauthorized: Admin access required');
  }
}

/**
 * Get admin emails list (for display purposes)
 * Masks email addresses for security
 */
export function getAdminEmailsList(): string[] {
  return ADMIN_EMAILS.map((email) => {
    const [username, domain] = email.split('@');
    const maskedUsername = username.substring(0, 2) + '***';
    return `${maskedUsername}@${domain}`;
  });
}

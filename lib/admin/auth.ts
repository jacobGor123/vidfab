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
  ? process.env.ADMIN_EMAILS.split(',').map((email) => email.trim().toLowerCase())
  : [];

/**
 * Check if an email is an admin
 * @param email - Email address to check
 * @returns True if email is in admin whitelist
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) {
    return false;
  }

  const emailLower = email.toLowerCase();
  return ADMIN_EMAILS.includes(emailLower);
}

/**
 * Get current user from NextAuth session
 * @returns User object or null
 */
export async function getCurrentUser() {
  try {
    const session = await getServerSession(authConfig as any);

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
  const user = await getCurrentUser();

  if (!user || !user.email) {
    return false;
  }

  return isAdminEmail(user.email);
}

/**
 * Require admin authentication
 * Throws error if user is not authenticated or not an admin
 * Use this in API routes and server components
 * @returns The admin user object
 */
export async function requireAdmin() {
  const user = await getCurrentUser();

  if (!user || !user.email) {
    throw new Error('Unauthorized: Not authenticated');
  }

  if (!isAdminEmail(user.email)) {
    throw new Error('Unauthorized: Admin access required');
  }

  return user;
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

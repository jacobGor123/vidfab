/**
 * User Model - Data Access Layer
 * Handles all user-related database operations
 */

import { getSupabaseAdminClient } from './db';
import { User } from '@/types/admin/user';

/**
 * Get paginated list of users
 * @param page - Page number (1-indexed)
 * @param limit - Number of users per page
 * @returns Array of users or undefined on error
 */
export async function getUsers(
  page: number = 1,
  limit: number = 50
): Promise<User[] | undefined> {
  const supabase = getSupabaseAdminClient();
  const offset = (page - 1) * limit;

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .range(offset, offset + limit - 1)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching users:', error);
    return undefined;
  }

  return data as User[];
}

/**
 * Find user by email
 * @param email - User email address
 * @returns User object or undefined
 */
export async function findUserByEmail(email: string): Promise<User | undefined> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error) {
    console.error('Error finding user by email:', error);
    return undefined;
  }

  return data as User;
}

/**
 * Find user by UUID
 * @param uuid - User UUID
 * @returns User object or undefined
 */
export async function findUserByUuid(uuid: string): Promise<User | undefined> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('uuid', uuid)
    .single();

  if (error) {
    console.error('Error finding user by UUID:', error);
    return undefined;
  }

  return data as User;
}

/**
 * Find user by email and signin provider
 * @param email - User email
 * @param provider - Signin provider (e.g., 'google', 'github')
 * @returns User object or undefined
 */
export async function findUserByEmailAndProvider(
  email: string,
  provider: string
): Promise<User | undefined> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .eq('signin_provider', provider)
    .single();

  if (error) {
    console.error('Error finding user by email and provider:', error);
    return undefined;
  }

  return data as User;
}

/**
 * Get total count of users
 * @returns Total number of users
 */
export async function getUsersCount(): Promise<number> {
  const supabase = getSupabaseAdminClient();

  const { count, error } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('Error getting users count:', error);
    return 0;
  }

  return count || 0;
}

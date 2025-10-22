/**
 * Database Client Configuration
 * Central module for Supabase client access
 */

import { supabase, supabaseAdmin } from '@/lib/supabase';

/**
 * Get Supabase client for public operations
 */
export function getSupabaseClient() {
  return supabase;
}

/**
 * Get Supabase admin client for privileged operations
 * Use this for admin dashboard operations
 */
export function getSupabaseAdminClient() {
  return supabaseAdmin;
}

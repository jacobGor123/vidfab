/**
 * Admin User Type Definitions
 */

export interface User {
  uuid: string;
  email: string;
  nickname: string | null;
  avatar_url?: string | null;
  signin_type?: 'oauth' | 'credentials';
  signin_provider?: string | null;
  signin_openid?: string | null;
  created_at: string;
  updated_at?: string | null;
  signin_ip?: string | null;
  email_verified?: boolean;
  last_login?: string | null;
  is_active?: boolean;
  subscription_status?: 'active' | 'inactive' | 'cancelled' | 'past_due';
  subscription_plan?: 'free' | 'lite' | 'pro' | 'premium';
  subscription_stripe_id?: string | null;
  credits_remaining?: number;
  total_videos_processed?: number;
  storage_used_mb?: number;
  max_storage_mb?: number;
}

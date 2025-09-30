/**
 * Supabase Client Configuration for VidFab AI Video Platform
 */
import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// 🔥 使用单例模式避免开发环境中的重复实例警告
declare const globalThis: {
  supabaseGlobalInstance?: ReturnType<typeof createClient>
  supabaseAdminGlobalInstance?: ReturnType<typeof createClient>
} & typeof global

// Public client (for client-side operations)
export const supabase = globalThis.supabaseGlobalInstance ?? createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
});

if (process.env.NODE_ENV === 'development') {
  globalThis.supabaseGlobalInstance = supabase
}

// Admin client (for server-side operations with elevated permissions)
export const supabaseAdmin = globalThis.supabaseAdminGlobalInstance ?? createClient(
  supabaseUrl,
  supabaseServiceKey || supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
    },
  }
);

if (process.env.NODE_ENV === 'development') {
  globalThis.supabaseAdminGlobalInstance = supabaseAdmin
}

// Database table types (these should match your Supabase schema)
export interface DatabaseUser {
  uuid: string;
  email: string;
  nickname: string;
  avatar_url?: string;
  signin_type: 'oauth' | 'credentials';
  signin_provider: string;
  signin_openid?: string;
  created_at: string;
  updated_at?: string;
  signin_ip?: string;
  email_verified: boolean;
  last_login?: string;
  is_active: boolean;
  // AI Video Platform specific fields
  subscription_status?: 'active' | 'inactive' | 'cancelled' | 'past_due';
  subscription_plan?: 'free' | 'lite' | 'pro' | 'premium';
  subscription_stripe_id?: string;
  credits_remaining?: number;
  total_videos_processed?: number;
  storage_used_mb?: number;
  max_storage_mb?: number;
}

export interface DatabaseVerificationCode {
  id: string;
  email: string;
  code: string;
  expires_at: string;
  created_at: string;
  attempts: number;
  is_used: boolean;
}

// Video generation and storage types
export interface UserVideo {
  id: string;
  user_id: string;

  // Generation information
  wavespeed_request_id: string;
  prompt: string;
  settings: {
    model: string;
    duration: string;
    resolution: string;
    aspectRatio: string;
    style?: string;
  };

  // File storage information
  original_url?: string;
  storage_path?: string;
  thumbnail_path?: string;

  // File metadata
  file_size?: number;
  duration_seconds?: number;
  video_resolution?: string;
  aspect_ratio?: string;

  // Status management
  status: 'generating' | 'downloading' | 'processing' | 'completed' | 'failed' | 'deleted';
  error_message?: string;
  download_progress: number;

  // User interaction
  is_favorite: boolean;
  view_count: number;
  last_viewed_at?: string;

  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface UserStorageQuota {
  user_id: string;
  total_videos: number;
  total_size_bytes: number;
  max_videos: number;
  max_size_bytes: number;
  plan_type: 'free' | 'pro' | 'enterprise';
  updated_at: string;
}

export interface UserQuotaInfo {
  current_videos: number;
  max_videos: number;
  current_size_bytes: number;
  max_size_bytes: number;
  current_size_mb: number;
  max_size_mb: number;
  videos_percentage: number;
  storage_percentage: number;
  can_upload: boolean;
  is_subscribed: boolean;
}

// Legacy interface (keeping for compatibility)
export interface DatabaseVideoJob {
  id: string;
  user_uuid: string;
  job_type: 'generate' | 'enhance' | 'convert';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  input_data: any; // JSON
  output_data?: any; // JSON
  error_message?: string;
  credits_used: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

// Table names
export const TABLES = {
  USERS: 'users',
  VERIFICATION_CODES: 'verification_codes',
  VIDEO_JOBS: 'video_jobs', // Legacy table
  USER_VIDEOS: 'user_videos', // New video storage table
  USER_STORAGE_QUOTAS: 'user_storage_quotas',
  SUBSCRIPTIONS: 'subscriptions',
  PAYMENTS: 'payments',
} as const;

// Helper function to handle Supabase errors
export function handleSupabaseError(error: any): never {
  console.error('Supabase error:', error);
  
  if (error?.code === 'PGRST116') {
    throw new Error('No rows found');
  }
  
  if (error?.code === '23505') {
    throw new Error('Resource already exists');
  }
  
  if (error?.message) {
    throw new Error(error.message);
  }
  
  throw new Error('Database operation failed');
}
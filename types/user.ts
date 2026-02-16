/**
 * User type definitions for VidFab AI Video Platform
 */

import { UsernameStyle } from '../utils/username-generator';

export interface User {
  uuid: string;
  email: string;
  nickname: string;
  avatar_url?: string;
  signin_type: 'oauth' | 'credentials';
  signin_provider: 'google' | 'verification-code' | 'google-one-tap';
  signin_openid?: string;
  created_at: string;
  updated_at?: string;
  signin_ip?: string;
  email_verified: boolean;
  last_login?: string;
  is_active: boolean;
  // AI Video Platform specific fields
  subscription_status?: 'active' | 'inactive' | 'cancelled' | 'past_due';
  subscription_plan?: 'free' | 'pro' | 'premium';
  credits_remaining?: number;
  total_videos_processed?: number;
}

export interface UserProfile {
  uuid: string;
  email: string;
  nickname: string;
  avatar_url?: string;
  created_at: string;
  subscription_status?: string;
  subscription_plan?: string;
  credits_remaining?: number;
}

export interface CreateUserData {
  email: string;
  nickname: string;
  avatar_url?: string;
  signin_type: 'oauth' | 'credentials';
  signin_provider: string;
  signin_openid?: string;
  signin_ip?: string;
  email_verified?: boolean;
}

export interface UpdateUserData {
  nickname?: string;
  avatar_url?: string;
  last_login?: string;
  subscription_status?: string;
  subscription_plan?: string;
  credits_remaining?: number;
  total_videos_processed?: number;
}

// NextAuth related types
export interface SessionUser {
  uuid: string;
  email: string;
  nickname: string;
  avatar_url?: string;
  created_at: string;
}

// Verification code types
export interface VerificationCode {
  id?: string;
  email: string;
  code: string;
  expires_at: string;
  created_at: string;
  attempts: number;
  is_used: boolean;
}

// Username generation related types
export interface UsernameSuggestion {
  username: string;
  style: UsernameStyle;
  description: string;
  isAvailable: boolean;
  alternatives?: string[];
}

export interface UsernamePreferences {
  preferredStyles: UsernameStyle[];
  includeNumbers: boolean;
  includeSpecialChars: boolean;
  maxLength: number;
  minLength: number;
  avoidWords?: string[];
}

// Creator profile types
export interface CreatorProfile {
  uuid: string;
  username: string;
  displayName: string;
  bio?: string;
  avatar_url?: string;
  coverImage?: string;
  usernameStyle: UsernameStyle;
  followerCount: number;
  followingCount: number;
  videoCount: number;
  totalViews: number;
  isVerified: boolean;
  creatorSince: string;
  socialLinks?: {
    youtube?: string;
    instagram?: string;
    tiktok?: string;
    twitter?: string;
    website?: string;
  };
  contentCategories: string[];
  averageVideoLength: number;
  uploadFrequency: 'daily' | 'weekly' | 'monthly' | 'irregular';
}

export interface CreatorStats {
  totalVideos: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  averageEngagementRate: number;
  topVideoViews: number;
  monthlyViews: number;
  subscriberGrowth: number;
}
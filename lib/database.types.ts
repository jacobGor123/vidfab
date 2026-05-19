/**
 * Supabase Database Types
 * 手动定义的数据库类型，用于 TypeScript 类型检查
 *
 * TODO: 使用 `npx supabase gen types typescript --project-id ycahbhhuzgixfrljtqmi` 自动生成
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      video_agent_projects: {
        Row: {
          id: string
          user_id: string
          duration: number
          story_style: string
          original_script: string
          aspect_ratio: '16:9' | '9:16'
          enable_narration: boolean
          mute_bgm: boolean
          status: string
          current_step: number
          script_analysis: Json | null
          music_generation_prompt: string | null
          music_url: string | null
          transition_effect: string | null
          image_style_id: string | null
          regenerate_quota_remaining: number | null
          suno_task_id: string | null
          step_1_status: string | null
          step_2_status: string | null
          step_3_status: string | null
          step_4_status: string | null
          step_5_status: string | null
          step_6_status: string | null
          final_video_url: string | null
          final_video_storage_path: string | null
          final_video_file_size: number | null
          final_video_resolution: string | null
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          duration: number
          story_style: string
          original_script: string
          aspect_ratio?: '16:9' | '9:16'
          enable_narration?: boolean
          mute_bgm?: boolean
          status?: string
          current_step?: number
          script_analysis?: Json | null
          music_generation_prompt?: string | null
          music_url?: string | null
          transition_effect?: string | null
          image_style_id?: string | null
          regenerate_quota_remaining?: number | null
          suno_task_id?: string | null
          step_1_status?: string | null
          step_2_status?: string | null
          step_3_status?: string | null
          step_4_status?: string | null
          step_5_status?: string | null
          step_6_status?: string | null
          final_video_url?: string | null
          final_video_storage_path?: string | null
          final_video_file_size?: number | null
          final_video_resolution?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          duration?: number
          story_style?: string
          original_script?: string
          aspect_ratio?: '16:9' | '9:16'
          enable_narration?: boolean
          mute_bgm?: boolean
          status?: string
          current_step?: number
          script_analysis?: Json | null
          music_generation_prompt?: string | null
          music_url?: string | null
          transition_effect?: string | null
          image_style_id?: string | null
          regenerate_quota_remaining?: number | null
          suno_task_id?: string | null
          step_1_status?: string | null
          step_2_status?: string | null
          step_3_status?: string | null
          step_4_status?: string | null
          step_5_status?: string | null
          step_6_status?: string | null
          final_video_url?: string | null
          final_video_storage_path?: string | null
          final_video_file_size?: number | null
          final_video_resolution?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_characters: {
        Row: {
          id: string
          project_id: string
          character_name: string
          source: string
          template_id: string | null
          generation_prompt: string | null
          negative_prompt: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          character_name: string
          source?: string
          template_id?: string | null
          generation_prompt?: string | null
          negative_prompt?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          character_name?: string
          source?: string
          template_id?: string | null
          generation_prompt?: string | null
          negative_prompt?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      character_reference_images: {
        Row: {
          id: string
          character_id: string
          image_url: string
          image_order: number
          created_at: string
        }
        Insert: {
          id?: string
          character_id: string
          image_url: string
          image_order: number
          created_at?: string
        }
        Update: {
          id?: string
          character_id?: string
          image_url?: string
          image_order?: number
          created_at?: string
        }
        Relationships: []
      }
      project_shots: {
        Row: {
          id: string
          project_id: string
          shot_number: number
          time_range: string
          description: string
          camera_angle: string
          character_action: string
          mood: string
          duration_seconds: number
          storyboard_url: string | null
          video_url: string | null
          video_prompt: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          shot_number: number
          time_range: string
          description: string
          camera_angle: string
          character_action: string
          mood: string
          duration_seconds: number
          storyboard_url?: string | null
          video_url?: string | null
          video_prompt?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          shot_number?: number
          time_range?: string
          description?: string
          camera_angle?: string
          character_action?: string
          mood?: string
          duration_seconds?: number
          storyboard_url?: string | null
          video_url?: string | null
          video_prompt?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_storyboards: {
        Row: {
          id: string
          project_id: string
          shot_number: number
          image_url: string | null
          image_storage_path: string | null
          generation_attempts: number
          status: string
          error_message: string | null
          seedream_task_id: string | null
          created_at: string
          updated_at: string
          image_url_external: string | null
          storage_path: string | null
          cdn_url: string | null
          storage_status: string | null
          file_size: number | null
        }
        Insert: {
          id?: string
          project_id: string
          shot_number: number
          image_url?: string | null
          image_storage_path?: string | null
          generation_attempts?: number
          status?: string
          error_message?: string | null
          seedream_task_id?: string | null
          created_at?: string
          updated_at?: string
          image_url_external?: string | null
          storage_path?: string | null
          cdn_url?: string | null
          storage_status?: string | null
          file_size?: number | null
        }
        Update: {
          id?: string
          project_id?: string
          shot_number?: number
          image_url?: string | null
          image_storage_path?: string | null
          generation_attempts?: number
          status?: string
          error_message?: string | null
          seedream_task_id?: string | null
          created_at?: string
          updated_at?: string
          image_url_external?: string | null
          storage_path?: string | null
          cdn_url?: string | null
          storage_status?: string | null
          file_size?: number | null
        }
        Relationships: []
      }
      project_video_clips: {
        Row: {
          id: string
          project_id: string
          shot_number: number
          video_url: string | null
          video_storage_path: string | null
          duration: number | null
          retry_count: number
          status: string
          error_message: string | null
          seedance_task_id: string | null
          created_at: string
          updated_at: string
          video_request_id: string | null
          video_status: string | null
          video_error: string | null
          last_frame_url: string | null
          last_frame_storage_path: string | null
          video_url_external: string | null
          storage_path: string | null
          cdn_url: string | null
          storage_status: string | null
        }
        Insert: {
          id?: string
          project_id: string
          shot_number: number
          video_url?: string | null
          video_storage_path?: string | null
          duration?: number | null
          retry_count?: number
          status?: string
          error_message?: string | null
          seedance_task_id?: string | null
          created_at?: string
          updated_at?: string
          video_request_id?: string | null
          video_status?: string | null
          video_error?: string | null
          last_frame_url?: string | null
          last_frame_storage_path?: string | null
          video_url_external?: string | null
          storage_path?: string | null
          cdn_url?: string | null
          storage_status?: string | null
        }
        Update: {
          id?: string
          project_id?: string
          shot_number?: number
          video_url?: string | null
          video_storage_path?: string | null
          duration?: number | null
          retry_count?: number
          status?: string
          error_message?: string | null
          seedance_task_id?: string | null
          created_at?: string
          updated_at?: string
          video_request_id?: string | null
          video_status?: string | null
          video_error?: string | null
          last_frame_url?: string | null
          last_frame_storage_path?: string | null
          video_url_external?: string | null
          storage_path?: string | null
          cdn_url?: string | null
          storage_status?: string | null
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          id: string
          title: string
          slug: string
          content: string
          excerpt: string | null
          featured_image_url: string | null
          meta_title: string | null
          meta_description: string | null
          keywords: string[] | null
          tags: string[] | null
          status: string
          published_at: string | null
          created_at: string
          updated_at: string
          author_id: string | null
          view_count: number
          read_time_minutes: number | null
        }
        Insert: {
          id?: string
          title: string
          slug: string
          content: string
          excerpt?: string | null
          featured_image_url?: string | null
          meta_title?: string | null
          meta_description?: string | null
          keywords?: string[] | null
          tags?: string[] | null
          status?: string
          published_at?: string | null
          created_at?: string
          updated_at?: string
          author_id?: string | null
          view_count?: number
          read_time_minutes?: number | null
        }
        Update: {
          id?: string
          title?: string
          slug?: string
          content?: string
          excerpt?: string | null
          featured_image_url?: string | null
          meta_title?: string | null
          meta_description?: string | null
          keywords?: string[] | null
          tags?: string[] | null
          status?: string
          published_at?: string | null
          created_at?: string
          updated_at?: string
          author_id?: string | null
          view_count?: number
          read_time_minutes?: number | null
        }
        Relationships: []
      }
      users: {
        Row: {
          uuid: string
          email: string
          nickname: string
          avatar_url: string | null
          signin_type: 'oauth' | 'credentials'
          signin_provider: string
          signin_openid: string | null
          created_at: string
          updated_at: string | null
          signin_ip: string | null
          email_verified: boolean
          last_login: string | null
          is_active: boolean
          subscription_status: 'active' | 'inactive' | 'cancelled' | 'past_due' | null
          subscription_plan: 'free' | 'lite' | 'pro' | 'premium' | null
          subscription_stripe_id: string | null
          subscription_period_end: string | null
          credits_remaining: number | null
          credits_monthly_total: number | null
          credits_monthly_balance: number | null
          credits_other_balance: number | null
          credits_next_reset_at: string | null
          concurrent_jobs_running: number | null
          credits_last_reset_date: string | null
          total_credits_earned: number | null
          total_credits_spent: number | null
          total_videos_processed: number | null
          storage_used_mb: number | null
          max_storage_mb: number | null
          is_credit_limited: boolean | null
          fraud_reason: string | null
        }
        Insert: {
          uuid?: string
          email: string
          nickname: string
          avatar_url?: string | null
          signin_type: 'oauth' | 'credentials'
          signin_provider: string
          signin_openid?: string | null
          created_at?: string
          updated_at?: string | null
          signin_ip?: string | null
          email_verified?: boolean
          last_login?: string | null
          is_active?: boolean
          subscription_status?: 'active' | 'inactive' | 'cancelled' | 'past_due' | null
          subscription_plan?: 'free' | 'lite' | 'pro' | 'premium' | null
          subscription_stripe_id?: string | null
          subscription_period_end?: string | null
          credits_remaining?: number | null
          credits_monthly_total?: number | null
          credits_monthly_balance?: number | null
          credits_other_balance?: number | null
          credits_next_reset_at?: string | null
          concurrent_jobs_running?: number | null
          credits_last_reset_date?: string | null
          total_credits_earned?: number | null
          total_credits_spent?: number | null
          total_videos_processed?: number | null
          storage_used_mb?: number | null
          max_storage_mb?: number | null
          is_credit_limited?: boolean | null
          fraud_reason?: string | null
        }
        Update: {
          uuid?: string
          email?: string
          nickname?: string
          avatar_url?: string | null
          signin_type?: 'oauth' | 'credentials'
          signin_provider?: string
          signin_openid?: string | null
          created_at?: string
          updated_at?: string | null
          signin_ip?: string | null
          email_verified?: boolean
          last_login?: string | null
          is_active?: boolean
          subscription_status?: 'active' | 'inactive' | 'cancelled' | 'past_due' | null
          subscription_plan?: 'free' | 'lite' | 'pro' | 'premium' | null
          subscription_stripe_id?: string | null
          subscription_period_end?: string | null
          credits_remaining?: number | null
          credits_monthly_total?: number | null
          credits_monthly_balance?: number | null
          credits_other_balance?: number | null
          credits_next_reset_at?: string | null
          concurrent_jobs_running?: number | null
          credits_last_reset_date?: string | null
          total_credits_earned?: number | null
          total_credits_spent?: number | null
          total_videos_processed?: number | null
          storage_used_mb?: number | null
          max_storage_mb?: number | null
          is_credit_limited?: boolean | null
          fraud_reason?: string | null
        }
        Relationships: []
      }
      subscription_orders: {
        Row: {
          id: string
          user_uuid: string
          order_type: string
          plan_id: string
          billing_cycle: string
          amount_cents: number
          currency: string | null
          credits_included: number
          status: string | null
          stripe_payment_intent_id: string | null
          stripe_subscription_id: string | null
          stripe_customer_id: string | null
          stripe_checkout_session_id: string | null
          period_start: string | null
          period_end: string | null
          created_at: string | null
          updated_at: string | null
          completed_at: string | null
          metadata: Json | null
          notes: string | null
        }
        Insert: {
          id?: string
          user_uuid: string
          order_type: string
          plan_id: string
          billing_cycle: string
          amount_cents?: number
          currency?: string | null
          credits_included?: number
          status?: string | null
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
          stripe_customer_id?: string | null
          stripe_checkout_session_id?: string | null
          period_start?: string | null
          period_end?: string | null
          created_at?: string | null
          updated_at?: string | null
          completed_at?: string | null
          metadata?: Json | null
          notes?: string | null
        }
        Update: {
          id?: string
          user_uuid?: string
          order_type?: string
          plan_id?: string
          billing_cycle?: string
          amount_cents?: number
          currency?: string | null
          credits_included?: number
          status?: string | null
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
          stripe_customer_id?: string | null
          stripe_checkout_session_id?: string | null
          period_start?: string | null
          period_end?: string | null
          created_at?: string | null
          updated_at?: string | null
          completed_at?: string | null
          metadata?: Json | null
          notes?: string | null
        }
        Relationships: []
      }
      credits_transactions: {
        Row: {
          id: string
          user_uuid: string
          order_id: string | null
          transaction_type: string
          credits_amount: number
          balance_before: number
          balance_after: number
          consumed_by: string | null
          video_job_id: string | null
          model_used: string | null
          resolution: string | null
          duration: string | null
          created_at: string | null
          metadata: Json | null
          description: string | null
        }
        Insert: {
          id?: string
          user_uuid: string
          order_id?: string | null
          transaction_type: string
          credits_amount: number
          balance_before?: number
          balance_after?: number
          consumed_by?: string | null
          video_job_id?: string | null
          model_used?: string | null
          resolution?: string | null
          duration?: string | null
          created_at?: string | null
          metadata?: Json | null
          description?: string | null
        }
        Update: {
          id?: string
          user_uuid?: string
          order_id?: string | null
          transaction_type?: string
          credits_amount?: number
          balance_before?: number
          balance_after?: number
          consumed_by?: string | null
          video_job_id?: string | null
          model_used?: string | null
          resolution?: string | null
          duration?: string | null
          created_at?: string | null
          metadata?: Json | null
          description?: string | null
        }
        Relationships: []
      }
      credits_reservations: {
        Row: {
          id: string
          user_uuid: string
          video_job_id: string | null
          reserved_credits: number
          model_name: string
          estimated_cost: number
          status: string | null
          created_at: string | null
          expires_at: string
          consumed_at: string | null
          metadata: Json | null
        }
        Insert: {
          id?: string
          user_uuid: string
          video_job_id?: string | null
          reserved_credits: number
          model_name: string
          estimated_cost: number
          status?: string | null
          created_at?: string | null
          expires_at?: string
          consumed_at?: string | null
          metadata?: Json | null
        }
        Update: {
          id?: string
          user_uuid?: string
          video_job_id?: string | null
          reserved_credits?: number
          model_name?: string
          estimated_cost?: number
          status?: string | null
          created_at?: string | null
          expires_at?: string
          consumed_at?: string | null
          metadata?: Json | null
        }
        Relationships: []
      }
      subscription_changes: {
        Row: {
          id: string
          user_uuid: string
          from_plan: string | null
          to_plan: string
          change_type: string
          order_id: string | null
          credits_before: number | null
          credits_after: number | null
          credits_adjustment: number | null
          effective_date: string | null
          created_at: string | null
          reason: string | null
          metadata: Json | null
        }
        Insert: {
          id?: string
          user_uuid: string
          from_plan?: string | null
          to_plan: string
          change_type: string
          order_id?: string | null
          credits_before?: number | null
          credits_after?: number | null
          credits_adjustment?: number | null
          effective_date?: string | null
          created_at?: string | null
          reason?: string | null
          metadata?: Json | null
        }
        Update: {
          id?: string
          user_uuid?: string
          from_plan?: string | null
          to_plan?: string
          change_type?: string
          order_id?: string | null
          credits_before?: number | null
          credits_after?: number | null
          credits_adjustment?: number | null
          effective_date?: string | null
          created_at?: string | null
          reason?: string | null
          metadata?: Json | null
        }
        Relationships: []
      }
      device_fingerprints: {
        Row: {
          id: string
          fingerprint: string
          user_uuid: string
          ip_address: string | null
          created_at: string
        }
        Insert: {
          id?: string
          fingerprint: string
          user_uuid: string
          ip_address?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          fingerprint?: string
          user_uuid?: string
          ip_address?: string | null
          created_at?: string
        }
        Relationships: []
      }
      script_creation_usage: {
        Row: {
          id: string
          user_id: string
          month: string
          count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          month: string
          count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          month?: string
          count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_admin_daily_stats: {
        Args: {
          p_days?: number
          p_timezone?: string
          p_include_video_agent?: boolean
        }
        Returns: {
          stat_date: string
          new_users: number
          video_tasks: number
          image_tasks: number
          video_agent_tasks: number
          total_tasks: number
        }[]
      }
      update_user_credits_balance: {
        Args: {
          p_user_uuid: string
          p_credits_change: number
          p_transaction_type: string
          p_description?: string | null
          p_metadata?: Json
        }
        Returns: number
      }
      deduct_user_credits_atomic: {
        Args: {
          p_user_uuid: string
          p_credits: number
          p_description?: string | null
          p_metadata?: Json
        }
        Returns: Json
      }
      add_user_credits_atomic: {
        Args: {
          p_user_uuid: string
          p_credits: number
          p_transaction_type?: string
          p_description?: string | null
          p_metadata?: Json
        }
        Returns: Json
      }
      reserve_user_credits: {
        Args: {
          p_user_uuid: string
          p_required_credits: number
          p_model_name: string
          p_video_job_id?: string | null
          p_metadata?: Json
        }
        Returns: string
      }
      consume_reserved_credits: {
        Args: {
          p_reservation_id: string
          p_actual_credits: number
          p_consumed_by: string
          p_video_job_id?: string | null
        }
        Returns: Json
      }
      update_concurrent_jobs: {
        Args: {
          p_user_uuid: string
          p_increment: number
        }
        Returns: number
      }
      cleanup_expired_reservations: {
        Args: Record<PropertyKey, never>
        Returns: void
      }
      batch_credits_update: {
        Args: {
          operations: Json
        }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

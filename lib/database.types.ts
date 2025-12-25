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
          status: string
          current_step: number
          script_analysis: Json | null
          music_generation_prompt: string | null
          music_url: string | null
          transition_effect: string | null
          image_style: string | null
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
          status?: string
          current_step?: number
          script_analysis?: Json | null
          music_generation_prompt?: string | null
          music_url?: string | null
          transition_effect?: string | null
          image_style?: string | null
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
          status?: string
          current_step?: number
          script_analysis?: Json | null
          music_generation_prompt?: string | null
          music_url?: string | null
          transition_effect?: string | null
          image_style?: string | null
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
          created_at?: string
          updated_at?: string
        }
      }
      project_storyboards: {
        Row: {
          id: string
          project_id: string
          shot_number: number
          image_url: string
          status: string
          task_id: string | null
          error_message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          shot_number: number
          image_url: string
          status?: string
          task_id?: string | null
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          shot_number?: number
          image_url?: string
          status?: string
          task_id?: string | null
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      project_video_clips: {
        Row: {
          id: string
          project_id: string
          shot_number: number
          video_url: string
          status: string
          video_status: string | null
          seedance_task_id: string | null
          video_request_id: string | null
          error_message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          shot_number: number
          video_url: string
          status?: string
          video_status?: string | null
          seedance_task_id?: string | null
          video_request_id?: string | null
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          shot_number?: number
          video_url?: string
          status?: string
          video_status?: string | null
          seedance_task_id?: string | null
          video_request_id?: string | null
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
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
          credits_remaining: number | null
          total_videos_processed: number | null
          storage_used_mb: number | null
          max_storage_mb: number | null
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
          credits_remaining?: number | null
          total_videos_processed?: number | null
          storage_used_mb?: number | null
          max_storage_mb?: number | null
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
          credits_remaining?: number | null
          total_videos_processed?: number | null
          storage_used_mb?: number | null
          max_storage_mb?: number | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

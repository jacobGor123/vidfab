/**
 * Verification Code Management for VidFab AI Video Platform
 */
import { VerificationCode } from "@/types/user";
import { generateVerificationCode, getUuid } from "@/lib/hash";
import { getIsoTimestr, getTimeAfterMinutes, isExpired } from "@/lib/time";
import { supabaseAdmin, TABLES, handleSupabaseError } from "@/lib/supabase";

// Supabase-based verification code manager
class VerificationCodeManager {
  /**
   * Generate and store a verification code
   */
  async generateCode(email: string): Promise<VerificationCode | null> {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      
      // Check rate limiting (4 minutes between sends)
      await this.checkRateLimit(normalizedEmail);

      // Clean up expired codes
      await this.cleanupExpiredCodes();

      // Delete any existing codes for this email
      await this.deleteCode(normalizedEmail);

      const code = generateVerificationCode();
      const verificationCode = {
        id: getUuid(),
        email: normalizedEmail,
        code,
        expires_at: getTimeAfterMinutes(5), // 5 minutes expiry
        created_at: getIsoTimestr(),
        attempts: 0,
        is_used: false,
      };

      // Insert into database
      const { data, error } = await supabaseAdmin
        .from(TABLES.VERIFICATION_CODES)
        .insert(verificationCode)
        .select()
        .single();

      if (error) {
        console.error('Database error inserting verification code:', error);
        handleSupabaseError(error);
      }

      console.log(`✅ Verification code generated for ${normalizedEmail}`);
      return data;
    } catch (error) {
      console.error('Error generating verification code:', error);
      return null;
    }
  }

  /**
   * Check rate limiting
   */
  private async checkRateLimit(email: string): Promise<void> {
    const fourMinutesAgo = getTimeAfterMinutes(-4);
    
    const { data, error } = await supabaseAdmin
      .from(TABLES.VERIFICATION_CODES)
      .select('created_at')
      .eq('email', email)
      .gte('created_at', fourMinutesAgo)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Rate limit check error:', error);
      return; // Allow on error
    }

    if (data && data.length > 0) {
      const lastSent = new Date(data[0].created_at);
      const now = new Date();
      const timeDiffMinutes = Math.ceil((now.getTime() - lastSent.getTime()) / (1000 * 60));
      const waitTime = Math.max(0, 4 - timeDiffMinutes);
      
      if (waitTime > 0) {
        throw new Error(`Please wait ${waitTime} minute(s) before requesting another code`);
      }
    }
  }

  /**
   * Verify a code
   */
  async verifyCode(email: string, code: string): Promise<{ success: boolean; error?: string }> {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      
      // Get the most recent code for this email
      const { data, error } = await supabaseAdmin
        .from(TABLES.VERIFICATION_CODES)
        .select('*')
        .eq('email', normalizedEmail)
        .eq('is_used', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { success: false, error: 'No verification code found for this email' };
        }
        console.error('Database error fetching verification code:', error);
        return { success: false, error: 'Internal error occurred' };
      }

      const verificationCode = data;

      if (verificationCode.is_used) {
        return { success: false, error: 'This verification code has already been used' };
      }

      if (isExpired(verificationCode.expires_at)) {
        // Delete expired code
        await this.deleteCodeById(verificationCode.id);
        return { success: false, error: 'Verification code has expired' };
      }

      if (verificationCode.attempts >= 3) {
        // Delete code after too many attempts
        await this.deleteCodeById(verificationCode.id);
        return { success: false, error: 'Too many failed attempts. Please request a new code' };
      }

      if (verificationCode.code !== code) {
        // Increment attempts
        const { error: updateError } = await supabaseAdmin
          .from(TABLES.VERIFICATION_CODES)
          .update({ attempts: verificationCode.attempts + 1 })
          .eq('id', verificationCode.id);

        if (updateError) {
          console.error('Error updating attempts:', updateError);
        }
        
        const remainingAttempts = 3 - (verificationCode.attempts + 1);
        return { 
          success: false, 
          error: `Invalid verification code. ${remainingAttempts} attempt(s) remaining` 
        };
      }

      // Success - mark as used
      const { error: markUsedError } = await supabaseAdmin
        .from(TABLES.VERIFICATION_CODES)
        .update({ is_used: true })
        .eq('id', verificationCode.id);

      if (markUsedError) {
        console.error('Error marking code as used:', markUsedError);
        return { success: false, error: 'Internal error occurred' };
      }

      console.log(`✅ Verification code verified for ${normalizedEmail}`);
      return { success: true };
    } catch (error) {
      console.error('Error verifying code:', error);
      return { success: false, error: 'Internal error occurred' };
    }
  }

  /**
   * Get code info (for debugging)
   */
  async getCodeInfo(email: string): Promise<VerificationCode | null> {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      
      const { data, error } = await supabaseAdmin
        .from(TABLES.VERIFICATION_CODES)
        .select('*')
        .eq('email', normalizedEmail)
        .eq('is_used', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No code found
        }
        console.error('Error getting code info:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error getting code info:', error);
      return null;
    }
  }

  /**
   * Clean up expired codes
   */
  private async cleanupExpiredCodes(): Promise<void> {
    try {
      const now = getIsoTimestr();
      
      const { error } = await supabaseAdmin
        .from(TABLES.VERIFICATION_CODES)
        .delete()
        .lt('expires_at', now);

      if (error) {
        console.error('Error cleaning up expired codes:', error);
      }
    } catch (error) {
      console.error('Error in cleanup:', error);
    }
  }

  /**
   * Delete code by email (for cleanup or reset)
   */
  async deleteCode(email: string): Promise<void> {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      
      const { error } = await supabaseAdmin
        .from(TABLES.VERIFICATION_CODES)
        .delete()
        .eq('email', normalizedEmail);

      if (error) {
        console.error('Error deleting code:', error);
      }
    } catch (error) {
      console.error('Error deleting code:', error);
    }
  }

  /**
   * Delete code by ID
   */
  private async deleteCodeById(id: string): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from(TABLES.VERIFICATION_CODES)
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting code by ID:', error);
      }
    } catch (error) {
      console.error('Error deleting code by ID:', error);
    }
  }

  /**
   * Get statistics (for monitoring)
   */
  async getStats(): Promise<{ active_codes: number; total_sent_today: number }> {
    try {
      await this.cleanupExpiredCodes();
      
      // Get active codes count
      const { count: activeCodes, error: activeError } = await supabaseAdmin
        .from(TABLES.VERIFICATION_CODES)
        .select('*', { count: 'exact', head: true })
        .eq('is_used', false)
        .gte('expires_at', getIsoTimestr());

      if (activeError) {
        console.error('Error getting active codes count:', activeError);
      }

      // Get codes sent today
      const todayStart = new Date().toISOString().split('T')[0] + 'T00:00:00Z';
      const { count: sentToday, error: sentError } = await supabaseAdmin
        .from(TABLES.VERIFICATION_CODES)
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayStart);

      if (sentError) {
        console.error('Error getting sent today count:', sentError);
      }
      
      return { 
        active_codes: activeCodes || 0, 
        total_sent_today: sentToday || 0 
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      return { active_codes: 0, total_sent_today: 0 };
    }
  }
}

// Export singleton instance
export const verificationCodeManager = new VerificationCodeManager();

// Helper function to send email
export async function sendVerificationEmail(email: string, code: string): Promise<boolean> {
  try {
    // AWS SES邮件发送
    console.log(`📧 Sending verification code ${code} to ${email}`);
    
    // 开发模式下也打印验证码方便调试
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔐 Development Mode - Verification code for ${email}: ${code}`);
    }

    // 导入AWS邮件服务
    const { sendVerificationCodeEmail } = await import('@/lib/aws-email');
    
    // 发送邮件
    const result = await sendVerificationCodeEmail(email, code);
    
    if (result.success) {
      console.log(`✅ Verification email sent successfully to ${email}`, {
        messageId: result.messageId
      });
      return true;
    } else {
      console.error(`❌ Failed to send verification email to ${email}:`, result.error);
      return false;
    }
  } catch (error: any) {
    console.error('Error sending verification email:', error);
    
    // 如果是AWS配置问题，在开发环境下仍然返回true（方便开发）
    if (process.env.NODE_ENV === 'development' && 
        (error.message?.includes('credentials') || error.message?.includes('SMTP'))) {
      console.log(`🔧 Development Mode - Email service not configured, but allowing verification to proceed`);
      return true;
    }
    
    return false;
  }
}
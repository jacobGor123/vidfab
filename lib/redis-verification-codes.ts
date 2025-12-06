/**
 * Redis-based Verification Code Management for VidFab AI Video Platform
 * Docker环境下的生产就绪验证码系统
 */
import { RedisCache } from '@/lib/redis-upstash';
import { generateVerificationCode } from '@/lib/hash';

// Redis key prefixes for different types of data
const REDIS_KEYS = {
  VERIFICATION_CODE: 'verification_code',
  RATE_LIMIT_SEND: 'rate_limit_send',
  RATE_LIMIT_VERIFY: 'rate_limit_verify',
  BLACKLIST: 'blacklist_email',
  DAILY_STATS: 'daily_stats'
} as const;

// Configuration constants
const CONFIG = {
  CODE_EXPIRY_SECONDS: 5 * 60, // 5 minutes
  RATE_LIMIT_SEND_SECONDS: 4 * 60, // 4 minutes between sends
  RATE_LIMIT_VERIFY_WINDOW: 15 * 60, // 15 minutes window
  MAX_VERIFY_ATTEMPTS: 10, // Max attempts per IP in window
  MAX_CODE_ATTEMPTS: 3, // Max attempts per code
  BLACKLIST_DURATION: 24 * 60 * 60, // 24 hours
  MAX_DAILY_CODES_PER_EMAIL: 20 // Max codes per email per day
} as const;

// Types for verification code data
interface VerificationCodeData {
  email: string;
  code: string;
  attempts: number;
  created_at: number;
  expires_at: number;
}

interface RateLimitData {
  count: number;
  reset_at: number;
}

interface VerificationResult {
  success: boolean;
  error?: string;
  remaining_attempts?: number;
}

interface EmailStats {
  codes_sent_today: number;
  last_sent: number;
}

// Redis-based verification code manager
export class RedisVerificationCodeManager {

  /**
   * Generate Redis key for verification code
   */
  private getCodeKey(email: string): string {
    const normalizedEmail = email.toLowerCase().trim();
    return `${REDIS_KEYS.VERIFICATION_CODE}:${normalizedEmail}`;
  }

  /**
   * Generate Redis key for send rate limiting
   */
  private getSendRateLimitKey(email: string): string {
    const normalizedEmail = email.toLowerCase().trim();
    return `${REDIS_KEYS.RATE_LIMIT_SEND}:${normalizedEmail}`;
  }

  /**
   * Generate Redis key for verify rate limiting (by IP)
   */
  private getVerifyRateLimitKey(ip: string): string {
    return `${REDIS_KEYS.RATE_LIMIT_VERIFY}:${ip}`;
  }

  /**
   * Generate Redis key for email blacklist
   */
  private getBlacklistKey(email: string): string {
    const normalizedEmail = email.toLowerCase().trim();
    return `${REDIS_KEYS.BLACKLIST}:${normalizedEmail}`;
  }

  /**
   * Generate Redis key for daily stats
   */
  private getDailyStatsKey(email: string): string {
    const normalizedEmail = email.toLowerCase().trim();
    const today = new Date().toISOString().split('T')[0];
    return `${REDIS_KEYS.DAILY_STATS}:${normalizedEmail}:${today}`;
  }

  /**
   * Check if email is blacklisted
   */
  async isEmailBlacklisted(email: string): Promise<boolean> {
    try {
      const key = this.getBlacklistKey(email);
      return await RedisCache.exists(key);
    } catch (error) {
      console.error('Error checking blacklist:', error);
      return false; // Allow on error
    }
  }

  /**
   * Add email to blacklist
   */
  async blacklistEmail(email: string, reason: string = 'abuse'): Promise<void> {
    try {
      const key = this.getBlacklistKey(email);
      const data = {
        email: email.toLowerCase().trim(),
        reason,
        blacklisted_at: Date.now()
      };
      await RedisCache.set(key, data, CONFIG.BLACKLIST_DURATION);
      console.log(`⚠️ Email ${email} blacklisted for: ${reason}`);
    } catch (error) {
      console.error('Error blacklisting email:', error);
    }
  }

  /**
   * Check daily stats for email
   */
  private async checkDailyLimits(email: string): Promise<EmailStats> {
    try {
      const key = this.getDailyStatsKey(email);
      const stats = await RedisCache.get<EmailStats>(key);

      if (!stats) {
        return { codes_sent_today: 0, last_sent: 0 };
      }

      return stats;
    } catch (error) {
      console.error('Error checking daily limits:', error);
      return { codes_sent_today: 0, last_sent: 0 };
    }
  }

  /**
   * Update daily stats for email
   */
  private async updateDailyStats(email: string): Promise<void> {
    try {
      const key = this.getDailyStatsKey(email);
      const stats = await this.checkDailyLimits(email);

      const newStats: EmailStats = {
        codes_sent_today: stats.codes_sent_today + 1,
        last_sent: Date.now()
      };

      // Set expiry to end of day
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      const secondsToEndOfDay = Math.floor((endOfDay.getTime() - Date.now()) / 1000);

      await RedisCache.set(key, newStats, secondsToEndOfDay);
    } catch (error) {
      console.error('Error updating daily stats:', error);
    }
  }

  /**
   * Check send rate limit for email
   */
  async checkSendRateLimit(email: string): Promise<{ allowed: boolean; wait_seconds?: number }> {
    try {
      // Check if email is blacklisted
      if (await this.isEmailBlacklisted(email)) {
        return { allowed: false };
      }

      // Check daily limits
      const stats = await this.checkDailyLimits(email);
      if (stats.codes_sent_today >= CONFIG.MAX_DAILY_CODES_PER_EMAIL) {
        await this.blacklistEmail(email, 'daily_limit_exceeded');
        return { allowed: false };
      }

      // Check rate limit
      const key = this.getSendRateLimitKey(email);
      const rateLimit = await RedisCache.get<RateLimitData>(key);

      const now = Date.now();

      if (rateLimit && now < rateLimit.reset_at) {
        const waitSeconds = Math.ceil((rateLimit.reset_at - now) / 1000);
        return { allowed: false, wait_seconds: waitSeconds };
      }

      return { allowed: true };
    } catch (error) {
      console.error('Error checking send rate limit:', error);
      return { allowed: true }; // Allow on error
    }
  }

  /**
   * Set send rate limit for email
   */
  private async setSendRateLimit(email: string): Promise<void> {
    try {
      const key = this.getSendRateLimitKey(email);
      const data: RateLimitData = {
        count: 1,
        reset_at: Date.now() + (CONFIG.RATE_LIMIT_SEND_SECONDS * 1000)
      };
      await RedisCache.set(key, data, CONFIG.RATE_LIMIT_SEND_SECONDS);
    } catch (error) {
      console.error('Error setting send rate limit:', error);
    }
  }

  /**
   * Check verify rate limit for IP
   */
  async checkVerifyRateLimit(ip: string): Promise<{ allowed: boolean; remaining?: number }> {
    try {
      const key = this.getVerifyRateLimitKey(ip);
      const rateLimit = await RedisCache.get<RateLimitData>(key);

      const now = Date.now();

      if (!rateLimit || now >= rateLimit.reset_at) {
        // Create new rate limit window
        const newData: RateLimitData = {
          count: 0,
          reset_at: now + (CONFIG.RATE_LIMIT_VERIFY_WINDOW * 1000)
        };
        await RedisCache.set(key, newData, CONFIG.RATE_LIMIT_VERIFY_WINDOW);
        return { allowed: true, remaining: CONFIG.MAX_VERIFY_ATTEMPTS };
      }

      if (rateLimit.count >= CONFIG.MAX_VERIFY_ATTEMPTS) {
        return { allowed: false, remaining: 0 };
      }

      return {
        allowed: true,
        remaining: CONFIG.MAX_VERIFY_ATTEMPTS - rateLimit.count
      };
    } catch (error) {
      console.error('Error checking verify rate limit:', error);
      return { allowed: true }; // Allow on error
    }
  }

  /**
   * Increment verify rate limit for IP
   */
  private async incrementVerifyRateLimit(ip: string): Promise<void> {
    try {
      const key = this.getVerifyRateLimitKey(ip);
      const rateLimit = await RedisCache.get<RateLimitData>(key);

      if (rateLimit) {
        const updatedData: RateLimitData = {
          count: rateLimit.count + 1,
          reset_at: rateLimit.reset_at
        };
        const remainingSeconds = Math.ceil((rateLimit.reset_at - Date.now()) / 1000);

        if (remainingSeconds > 0) {
          await RedisCache.set(key, updatedData, remainingSeconds);
        }
      }
    } catch (error) {
      console.error('Error incrementing verify rate limit:', error);
    }
  }

  /**
   * Generate and store verification code
   */
  async generateCode(email: string): Promise<{ success: boolean; code?: string; error?: string; expires_in?: number }> {
    try {
      const normalizedEmail = email.toLowerCase().trim();

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedEmail)) {
        return { success: false, error: 'Invalid email format' };
      }

      // Check send rate limit
      const rateLimitCheck = await this.checkSendRateLimit(normalizedEmail);
      if (!rateLimitCheck.allowed) {
        if (rateLimitCheck.wait_seconds) {
          return {
            success: false,
            error: `Please wait ${Math.ceil(rateLimitCheck.wait_seconds / 60)} minute(s) before requesting another code`
          };
        } else {
          return { success: false, error: 'Email is temporarily blocked due to abuse' };
        }
      }

      // Delete any existing code for this email
      await this.deleteCode(normalizedEmail);

      // Generate new verification code
      const code = generateVerificationCode();
      const now = Date.now();

      const codeData: VerificationCodeData = {
        email: normalizedEmail,
        code,
        attempts: 0,
        created_at: now,
        expires_at: now + (CONFIG.CODE_EXPIRY_SECONDS * 1000)
      };

      // Store in Redis with expiration
      const key = this.getCodeKey(normalizedEmail);
      await RedisCache.set(key, codeData, CONFIG.CODE_EXPIRY_SECONDS);

      // Set rate limit
      await this.setSendRateLimit(normalizedEmail);

      // Update daily stats
      await this.updateDailyStats(normalizedEmail);

      console.log(`✅ Verification code generated for ${normalizedEmail}`);

      return {
        success: true,
        code,
        expires_in: CONFIG.CODE_EXPIRY_SECONDS
      };
    } catch (error) {
      console.error('Error generating verification code:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  /**
   * Verify a code
   */
  async verifyCode(email: string, code: string, clientIp: string): Promise<VerificationResult> {
    try {
      const normalizedEmail = email.toLowerCase().trim();

      // Check verify rate limit by IP
      const rateLimitCheck = await this.checkVerifyRateLimit(clientIp);
      if (!rateLimitCheck.allowed) {
        return {
          success: false,
          error: 'Too many verification attempts from this IP. Please try again later.'
        };
      }

      // Increment rate limit counter
      await this.incrementVerifyRateLimit(clientIp);

      // Get verification code data
      const key = this.getCodeKey(normalizedEmail);
      const codeData = await RedisCache.get<VerificationCodeData>(key);

      if (!codeData) {
        return {
          success: false,
          error: 'No verification code found. Please request a new code.'
        };
      }

      // Check if code has expired
      if (Date.now() > codeData.expires_at) {
        await this.deleteCode(normalizedEmail);
        return {
          success: false,
          error: 'Verification code has expired. Please request a new code.'
        };
      }

      // Check if too many attempts for this code
      if (codeData.attempts >= CONFIG.MAX_CODE_ATTEMPTS) {
        await this.deleteCode(normalizedEmail);
        return {
          success: false,
          error: 'Too many failed attempts. Please request a new code.'
        };
      }

      // Verify the code
      if (codeData.code !== code) {
        // Increment attempts
        codeData.attempts += 1;
        const remainingSeconds = Math.ceil((codeData.expires_at - Date.now()) / 1000);

        if (remainingSeconds > 0) {
          await RedisCache.set(key, codeData, remainingSeconds);
        }

        const remainingAttempts = CONFIG.MAX_CODE_ATTEMPTS - codeData.attempts;
        return {
          success: false,
          error: `Invalid verification code. ${remainingAttempts} attempt(s) remaining.`,
          remaining_attempts: remainingAttempts
        };
      }

      // Success - delete the code
      await this.deleteCode(normalizedEmail);

      console.log(`✅ Verification code verified for ${normalizedEmail}`);
      return { success: true };

    } catch (error) {
      console.error('Error verifying code:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  /**
   * Get code info (for debugging)
   */
  async getCodeInfo(email: string): Promise<VerificationCodeData | null> {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      const key = this.getCodeKey(normalizedEmail);
      return await RedisCache.get<VerificationCodeData>(key);
    } catch (error) {
      console.error('Error getting code info:', error);
      return null;
    }
  }

  /**
   * Delete code by email
   */
  async deleteCode(email: string): Promise<void> {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      const key = this.getCodeKey(normalizedEmail);
      await RedisCache.delete(key);
    } catch (error) {
      console.error('Error deleting code:', error);
    }
  }

  /**
   * Clean up expired codes (Redis handles this automatically, but useful for stats)
   */
  async cleanupExpiredCodes(): Promise<number> {
    try {
      const pattern = `${REDIS_KEYS.VERIFICATION_CODE}:*`;
      const keys = await RedisCache.getKeysByPattern(pattern);

      let cleanedCount = 0;
      for (const key of keys) {
        const codeData = await RedisCache.get<VerificationCodeData>(key);
        if (codeData && Date.now() > codeData.expires_at) {
          await RedisCache.delete(key);
          cleanedCount++;
        }
      }

      return cleanedCount;
    } catch (error) {
      console.error('Error cleaning up expired codes:', error);
      return 0;
    }
  }

  /**
   * Get system statistics
   */
  async getStats(): Promise<{
    active_codes: number;
    total_sent_today: number;
    blacklisted_emails: number;
  }> {
    try {
      // Count active verification codes
      const codePattern = `${REDIS_KEYS.VERIFICATION_CODE}:*`;
      const codeKeys = await RedisCache.getKeysByPattern(codePattern);

      let activeCodes = 0;
      for (const key of codeKeys) {
        const codeData = await RedisCache.get<VerificationCodeData>(key);
        if (codeData && Date.now() <= codeData.expires_at) {
          activeCodes++;
        }
      }

      // Count codes sent today (approximate)
      const today = new Date().toISOString().split('T')[0];
      const statsPattern = `${REDIS_KEYS.DAILY_STATS}:*:${today}`;
      const statsKeys = await RedisCache.getKeysByPattern(statsPattern);

      let totalSentToday = 0;
      for (const key of statsKeys) {
        const stats = await RedisCache.get<EmailStats>(key);
        if (stats) {
          totalSentToday += stats.codes_sent_today;
        }
      }

      // Count blacklisted emails
      const blacklistPattern = `${REDIS_KEYS.BLACKLIST}:*`;
      const blacklistKeys = await RedisCache.getKeysByPattern(blacklistPattern);

      return {
        active_codes: activeCodes,
        total_sent_today: totalSentToday,
        blacklisted_emails: blacklistKeys.length
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      return {
        active_codes: 0,
        total_sent_today: 0,
        blacklisted_emails: 0
      };
    }
  }
}

// Export singleton instance
export const redisVerificationCodeManager = new RedisVerificationCodeManager();
/**
 * Upstash Redis Configuration for VidFab AI Video Platform (Cloud Native)
 * Serverless-optimized Redis client for Vercel deployment
 */

import { Redis } from '@upstash/redis'

// Create Upstash Redis client
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// Health check function
export async function checkRedisHealth(): Promise<boolean> {
  try {
    const result = await redis.ping()
    return result === 'PONG'
  } catch (error) {
    console.error('Redis health check failed:', error)
    return false
  }
}

// Graceful shutdown function (no-op for Upstash REST API)
export async function closeRedisConnection(): Promise<void> {
  // Upstash REST API doesn't need explicit connection closing
  console.log('Upstash Redis: No connection to close (REST API)')
}

// Cache utilities - compatible with existing RedisCache API
export class RedisCache {
  /**
   * Set a key-value pair with optional expiration
   */
  static async set(
    key: string,
    value: any,
    expirationSeconds?: number
  ): Promise<void> {
    if (expirationSeconds) {
      await redis.set(key, value, { ex: expirationSeconds })
    } else {
      await redis.set(key, value)
    }
  }

  /**
   * Get a value by key
   */
  static async get<T>(key: string): Promise<T | null> {
    try {
      const value = await redis.get<T>(key)
      return value
    } catch (error) {
      console.error(`Error getting cache key ${key}:`, error)
      return null
    }
  }

  /**
   * Delete a key
   */
  static async delete(key: string): Promise<boolean> {
    try {
      const result = await redis.del(key)
      return result > 0
    } catch (error) {
      console.error(`Error deleting cache key ${key}:`, error)
      return false
    }
  }

  /**
   * Check if a key exists
   */
  static async exists(key: string): Promise<boolean> {
    try {
      const result = await redis.exists(key)
      return result === 1
    } catch (error) {
      console.error(`Error checking cache key ${key}:`, error)
      return false
    }
  }

  /**
   * Set expiration for a key
   */
  static async expire(key: string, seconds: number): Promise<boolean> {
    try {
      const result = await redis.expire(key, seconds)
      return result === 1
    } catch (error) {
      console.error(`Error setting expiration for key ${key}:`, error)
      return false
    }
  }

  /**
   * Get multiple keys at once
   */
  static async getMultiple<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      if (keys.length === 0) return []

      const values = await redis.mget<T>(...keys)
      return values
    } catch (error) {
      console.error('Error getting multiple cache keys:', error)
      return new Array(keys.length).fill(null)
    }
  }

  /**
   * Get all keys matching a pattern
   */
  static async getKeysByPattern(pattern: string): Promise<string[]> {
    try {
      const keys = await redis.keys(pattern)
      return keys
    } catch (error) {
      console.error(`Error getting keys by pattern ${pattern}:`, error)
      return []
    }
  }

  /**
   * Clear all cache keys matching a pattern
   */
  static async clearByPattern(pattern: string): Promise<number> {
    try {
      const keys = await redis.keys(pattern)
      if (keys.length === 0) return 0

      const result = await redis.del(...keys)
      return result
    } catch (error) {
      console.error(`Error clearing keys by pattern ${pattern}:`, error)
      return 0
    }
  }

  /**
   * Batch set multiple keys (Pipeline)
   */
  static async setMultiple(
    data: Record<string, any>,
    expirationSeconds?: number
  ): Promise<void> {
    try {
      const pipeline = redis.pipeline()

      Object.entries(data).forEach(([key, value]) => {
        if (expirationSeconds) {
          pipeline.set(key, value, { ex: expirationSeconds })
        } else {
          pipeline.set(key, value)
        }
      })

      await pipeline.exec()
    } catch (error) {
      console.error('Error setting multiple cache keys:', error)
    }
  }
}

// Export the Redis instance and utilities
export default redis

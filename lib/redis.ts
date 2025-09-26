/**
 * Redis Configuration for VidFab AI Video Platform
 * Queue system and caching
 */

import Redis from 'ioredis'

// Redis connection configuration
const getRedisConfig = () => {
  // Support both REDIS_URL and individual config
  if (process.env.REDIS_URL) {
    return {
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
      lazyConnect: true,
      keepAlive: 30000,
      family: 4,
      connectTimeout: 10000,
      commandTimeout: 5000,
    }
  }

  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0'),
    retryDelayOnFailover: 100,
    enableReadyCheck: false,
    maxRetriesPerRequest: null,
    lazyConnect: true,
    keepAlive: 30000,
    family: 4,
    connectTimeout: 10000,
    commandTimeout: 5000,
  }
}

const redisConfig = getRedisConfig()

// Create Redis instance
export const redis = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, redisConfig)
  : new Redis(redisConfig)

// Connection event handlers
redis.on('connect', () => {
})

redis.on('ready', () => {
})

redis.on('error', (error) => {
  console.error('❌ Redis connection error:', error)
})

redis.on('close', () => {
})

redis.on('reconnecting', () => {
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

// Graceful shutdown function
export async function closeRedisConnection(): Promise<void> {
  try {
    await redis.quit()
  } catch (error) {
    console.error('Error closing Redis connection:', error)
  }
}

// Cache utilities
export class RedisCache {

  /**
   * Set a key-value pair with optional expiration
   */
  static async set(
    key: string,
    value: any,
    expirationSeconds?: number
  ): Promise<void> {
    const serializedValue = JSON.stringify(value)

    if (expirationSeconds) {
      await redis.setex(key, expirationSeconds, serializedValue)
    } else {
      await redis.set(key, serializedValue)
    }
  }

  /**
   * Get a value by key
   */
  static async get<T>(key: string): Promise<T | null> {
    try {
      const value = await redis.get(key)
      return value ? JSON.parse(value) : null
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

      const values = await redis.mget(...keys)
      return values.map(value => {
        try {
          return value ? JSON.parse(value) : null
        } catch {
          return null
        }
      })
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
      return await redis.keys(pattern)
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

      return await redis.del(...keys)
    } catch (error) {
      console.error(`Error clearing keys by pattern ${pattern}:`, error)
      return 0
    }
  }
}

// Export the Redis instance and utilities
export default redis
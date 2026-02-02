/**
 * Video Generation Fallback System
 * Automatically switches between BytePlus and Veo3 providers on failure
 */

import { submitVideoGeneration as submitByteplus } from '@/lib/services/byteplus/video/seedance-api'
import { generateVeo3Video } from '@/lib/services/video-agent/veo3-video-generator'
import type { VideoGenerationRequest } from '@/lib/types/video'

export type VideoProvider = 'byteplus' | 'veo3'

export interface FallbackVideoGenerationResponse {
  provider: VideoProvider
  taskId: string
  requestId?: string
}

interface BytePlusOptions {
  returnLastFrame?: boolean
  callbackUrl?: string
}

/**
 * Generate video with automatic provider fallback
 * @param request Video generation request
 * @param preferredProvider Primary provider to try first (default: 'byteplus')
 * @param options BytePlus-specific options (only used for BytePlus)
 * @returns Provider used and task/request ID
 */
export async function generateVideoWithFallback(
  request: VideoGenerationRequest,
  preferredProvider: VideoProvider = 'byteplus',
  options?: BytePlusOptions
): Promise<FallbackVideoGenerationResponse> {

  // Define provider order based on preference
  const providers: VideoProvider[] = preferredProvider === 'veo3'
    ? ['veo3', 'byteplus']
    : ['byteplus', 'veo3']

  let lastError: Error | null = null

  for (const provider of providers) {
    try {
      console.log(`[Fallback Generator] Attempting video generation with ${provider}...`)

      if (provider === 'byteplus') {
        // BytePlus Seedance
        const result = await submitByteplus(request, options)

        console.log(`[Fallback Generator] ✓ BytePlus generation submitted successfully: ${result.data.id}`)

        return {
          provider: 'byteplus',
          taskId: result.data.id,
        }
      } else {
        // Google Veo3
        const result = await generateVeo3Video({
          prompt: request.prompt,
          image: request.image || '',
          aspectRatio: request.aspectRatio,
          duration: request.duration,
          lastImage: undefined // Veo3 doesn't use lastImage in fallback scenario
        })

        console.log(`[Fallback Generator] ✓ Veo3 generation submitted successfully: ${result.requestId}`)

        return {
          provider: 'veo3',
          taskId: result.requestId,
          requestId: result.requestId,
        }
      }
    } catch (error) {
      console.error(`[Fallback Generator] ✗ ${provider} generation failed:`, error)
      lastError = error as Error

      // If this is not the last provider, try the next one
      const isLastProvider = provider === providers[providers.length - 1]
      if (!isLastProvider) {
        console.log(`[Fallback Generator] Switching to fallback provider...`)
        continue
      }
    }
  }

  // All providers failed
  throw new Error(
    `All video generation providers failed. Last error: ${lastError?.message || 'Unknown error'}`
  )
}

/**
 * Check if a provider should be retried based on error type
 * @param error Error from provider
 * @returns true if should retry with same provider, false if should switch
 */
export function shouldRetryProvider(error: Error): boolean {
  const errorMessage = error.message.toLowerCase()

  // Network/timeout errors - retry same provider
  if (errorMessage.includes('timeout') ||
      errorMessage.includes('network') ||
      errorMessage.includes('econnreset')) {
    return true
  }

  // Rate limit - retry same provider after delay
  if (errorMessage.includes('rate limit') ||
      errorMessage.includes('429')) {
    return true
  }

  // Server errors - retry same provider
  if (errorMessage.includes('500') ||
      errorMessage.includes('502') ||
      errorMessage.includes('503')) {
    return true
  }

  // Client errors - switch provider
  return false
}

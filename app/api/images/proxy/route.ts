/**
 * Image Proxy API
 * Downloads images from external URLs to bypass CORS restrictions
 */

import { NextRequest, NextResponse } from 'next/server'

// Retry helper with exponential backoff
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = 3
): Promise<Response> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout

      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      })

      clearTimeout(timeoutId)
      return response

    } catch (error) {
      lastError = error as Error

      console.error(`[Image Proxy] Attempt ${attempt}/${maxRetries} failed for ${url}:`, {
        error: error instanceof Error ? error.message : String(error),
        name: error instanceof Error ? error.name : 'Unknown'
      })

      // Don't retry on last attempt
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000) // Max 5s delay
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError || new Error('Failed to fetch after retries')
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    const url = request.nextUrl.searchParams.get('url')

    if (!url) {
      console.warn('[Image Proxy] Missing URL parameter')
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 }
      )
    }

    // Validate URL
    let imageUrl: URL
    try {
      imageUrl = new URL(url)
    } catch (error) {
      console.warn('[Image Proxy] Invalid URL format:', url)
      return NextResponse.json(
        { error: 'Invalid URL' },
        { status: 400 }
      )
    }

    // Security: Only allow specific domains
    const allowedDomains = ['static.vidfab.ai', 'vidfab.ai']
    if (!allowedDomains.some(domain => imageUrl.hostname.endsWith(domain))) {
      console.warn('[Image Proxy] Domain not allowed:', imageUrl.hostname)
      return NextResponse.json(
        { error: 'Domain not allowed' },
        { status: 403 }
      )
    }

    console.log('[Image Proxy] Fetching image:', {
      url: url,
      hostname: imageUrl.hostname
    })

    // Fetch the image with retry logic
    const response = await fetchWithRetry(url, {
      headers: {
        'User-Agent': 'VidFab/1.0',
        'Accept': 'image/*'
      }
    })

    if (!response.ok) {
      console.error('[Image Proxy] Fetch failed:', {
        url: url,
        status: response.status,
        statusText: response.statusText
      })

      return NextResponse.json(
        { error: `Failed to fetch image: ${response.statusText}` },
        { status: response.status }
      )
    }

    // Get the image data
    const imageData = await response.arrayBuffer()
    const contentType = response.headers.get('content-type') || 'image/webp'
    const duration = Date.now() - startTime

    console.log('[Image Proxy] Success:', {
      url: url,
      contentType: contentType,
      size: `${(imageData.byteLength / 1024).toFixed(1)}KB`,
      duration: `${duration}ms`
    })

    // Return the image with appropriate headers
    return new NextResponse(imageData, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Access-Control-Allow-Origin': '*',
      },
    })

  } catch (error) {
    const duration = Date.now() - startTime

    console.error('[Image Proxy] Error:', {
      url: request.nextUrl.searchParams.get('url'),
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${duration}ms`
    })

    return NextResponse.json(
      {
        error: 'Failed to proxy image',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

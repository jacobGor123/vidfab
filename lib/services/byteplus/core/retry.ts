// Exponential backoff retry helper for BytePlus API
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  initialDelayMs = 500,
  maxDelayMs = 8000
): Promise<T> {
  let lastError: unknown

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error

      // Do not retry on client errors (4xx), except for timeouts (408)
      const status = (error as any)?.status as number | undefined
      const code = (error as any)?.code as string | undefined

      // Always retry on timeout (408) or TIMEOUT code
      const isTimeout = status === 408 || code === 'TIMEOUT'

      if (status && status < 500 && !isTimeout) {
        throw error
      }

      if (attempt === maxRetries) {
        break
      }

      const delay = Math.min(
        initialDelayMs * Math.pow(2, attempt) + Math.random() * 200,
        maxDelayMs
      )
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

/**
 * Exponential backoff retry helper for BytePlus API
 *
 * 🔥 重试策略说明：
 * - 对于 5xx 服务器错误：总是重试（临时性故障）
 * - 对于 408 超时错误：总是重试（可能是网络波动或服务繁忙）
 * - 对于 4xx 客户端错误：不重试（参数错误等，重试无意义）
 * - 对于 429 限流错误：使用更长的延迟重试
 *
 * @param operation 要执行的操作
 * @param maxRetries 最大重试次数（默认 3 次，即总共 4 次尝试）
 * @param initialDelayMs 初始延迟（默认 500ms）
 * @param maxDelayMs 最大延迟（默认 8000ms）
 */
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

      // 提取错误信息
      const status = (error as any)?.status as number | undefined
      const code = (error as any)?.code as string | undefined
      const errorName = (error as any)?.name as string | undefined

      console.log(`[Retry] Attempt ${attempt + 1}/${maxRetries + 1} failed`, {
        status,
        code,
        errorName,
        message: error instanceof Error ? error.message : String(error)
      })

      // 🔥 判断是否应该重试
      const isTimeout = status === 408 || code === 'TIMEOUT'
      const isRateLimited = status === 429
      const isServerError = status !== undefined && status >= 500

      // 不应该重试的情况：客户端错误（除了超时和限流）
      if (status && status >= 400 && status < 500 && !isTimeout && !isRateLimited) {
        console.log('[Retry] Client error, will not retry', { status, code })
        throw error
      }

      // 达到最大重试次数
      if (attempt === maxRetries) {
        console.log('[Retry] Max retries reached, giving up')
        break
      }

      // 🔥 计算延迟时间
      let delay = Math.min(
        initialDelayMs * Math.pow(2, attempt) + Math.random() * 200,
        maxDelayMs
      )

      // 对于限流错误，使用更长的延迟
      if (isRateLimited) {
        delay = Math.max(delay * 2, 5000) // 至少等待 5 秒
        console.log('[Retry] Rate limited, using longer delay', { delay })
      }

      console.log(`[Retry] Waiting ${delay}ms before retry ${attempt + 2}/${maxRetries + 1}...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

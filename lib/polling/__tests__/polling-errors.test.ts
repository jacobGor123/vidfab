/**
 * 轮询错误处理系统单元测试
 */

import {
  PollingError,
  PollingErrorType,
  getErrorMessage,
  createPollingError,
  httpStatusToErrorType,
  getRecoveryStrategy,
  PollingErrorLogger
} from '../polling-errors'

describe('PollingError', () => {
  describe('错误类', () => {
    it('应该正确创建错误实例', () => {
      const error = new PollingError(
        PollingErrorType.NETWORK_ERROR,
        'Network failed'
      )

      expect(error.type).toBe(PollingErrorType.NETWORK_ERROR)
      expect(error.message).toBe('Network failed')
      expect(error.recoverable).toBe(true)
      expect(error.timestamp).toBeDefined()
    })

    it('应该提供用户友好的错误消息', () => {
      const error = new PollingError(
        PollingErrorType.TASK_TIMEOUT,
        'Technical timeout message'
      )

      const userMessage = error.getUserMessage()
      expect(userMessage).toBe('任务处理超时,请重新生成')
      expect(userMessage).not.toContain('Technical')
    })

    it('应该判断是否应该重试', () => {
      const retryableError = new PollingError(
        PollingErrorType.NETWORK_ERROR,
        'Network error'
      )
      expect(retryableError.shouldRetry()).toBe(true)

      const nonRetryableError = new PollingError(
        PollingErrorType.TASK_NOT_FOUND,
        'Not found'
      )
      expect(nonRetryableError.shouldRetry()).toBe(false)
    })

    it('应该正确序列化为JSON', () => {
      const error = new PollingError(
        PollingErrorType.API_ERROR,
        'API failed',
        { context: { jobId: '123' } }
      )

      const json = error.toJSON()
      expect(json.type).toBe(PollingErrorType.API_ERROR)
      expect(json.context).toEqual({ jobId: '123' })
      expect(json.userMessage).toBeDefined()
    })
  })

  describe('错误消息翻译', () => {
    it('应该为所有错误类型提供中文消息', () => {
      Object.values(PollingErrorType).forEach(type => {
        const message = getErrorMessage(type)
        expect(message).toBeDefined()
        expect(message.length).toBeGreaterThan(0)
        // 验证是中文
        expect(/[\u4e00-\u9fa5]/.test(message)).toBe(true)
      })
    })

    it('应该使用fallback消息', () => {
      const message = getErrorMessage(
        'INVALID_TYPE' as PollingErrorType,
        'Custom fallback'
      )
      expect(message).toBe('Custom fallback')
    })
  })

  describe('错误创建', () => {
    it('应该从标准Error创建PollingError', () => {
      const originalError = new Error('Network error')
      const pollingError = createPollingError(originalError)

      expect(pollingError).toBeInstanceOf(PollingError)
      expect(pollingError.type).toBe(PollingErrorType.NETWORK_ERROR)
      expect(pollingError.originalError).toBe(originalError)
    })

    it('应该识别AbortError', () => {
      const abortError = new Error('abort')
      abortError.name = 'AbortError'
      const pollingError = createPollingError(abortError)

      expect(pollingError.type).toBe(PollingErrorType.REQUEST_ABORTED)
    })

    it('应该识别超时错误', () => {
      const timeoutError = new Error('Request timeout')
      const pollingError = createPollingError(timeoutError)

      expect(pollingError.type).toBe(PollingErrorType.REQUEST_TIMEOUT)
    })

    it('应该保留已有的PollingError', () => {
      const originalError = new PollingError(
        PollingErrorType.TASK_FAILED,
        'Failed'
      )
      const result = createPollingError(originalError)

      expect(result).toBe(originalError)
    })
  })

  describe('HTTP状态码转换', () => {
    it('应该将404转换为TASK_NOT_FOUND', () => {
      expect(httpStatusToErrorType(404)).toBe(PollingErrorType.TASK_NOT_FOUND)
    })

    it('应该将429转换为RATE_LIMIT_EXCEEDED', () => {
      expect(httpStatusToErrorType(429)).toBe(PollingErrorType.RATE_LIMIT_EXCEEDED)
    })

    it('应该将402/403转换为INSUFFICIENT_CREDITS', () => {
      expect(httpStatusToErrorType(402)).toBe(PollingErrorType.INSUFFICIENT_CREDITS)
      expect(httpStatusToErrorType(403)).toBe(PollingErrorType.INSUFFICIENT_CREDITS)
    })

    it('应该将5xx转换为API_ERROR', () => {
      expect(httpStatusToErrorType(500)).toBe(PollingErrorType.API_ERROR)
      expect(httpStatusToErrorType(503)).toBe(PollingErrorType.API_ERROR)
    })
  })

  describe('恢复策略', () => {
    it('网络错误应该使用指数退避重试', () => {
      const error = new PollingError(PollingErrorType.NETWORK_ERROR, 'Network error')

      const strategy1 = getRecoveryStrategy(error, 0, 5)
      expect(strategy1.shouldRetry).toBe(true)
      expect(strategy1.retryDelay).toBe(1000)

      const strategy2 = getRecoveryStrategy(error, 1, 5)
      expect(strategy2.retryDelay).toBe(2000)

      const strategy3 = getRecoveryStrategy(error, 2, 5)
      expect(strategy3.retryDelay).toBe(4000)
    })

    it('达到最大重试次数应该停止', () => {
      const error = new PollingError(PollingErrorType.NETWORK_ERROR, 'Network error')
      const strategy = getRecoveryStrategy(error, 5, 5)

      expect(strategy.shouldRetry).toBe(false)
      expect(strategy.shouldStopPolling).toBe(true)
    })

    it('任务不存在应该立即停止', () => {
      const error = new PollingError(PollingErrorType.TASK_NOT_FOUND, 'Not found')
      const strategy = getRecoveryStrategy(error, 0, 5)

      expect(strategy.shouldRetry).toBe(false)
      expect(strategy.shouldStopPolling).toBe(true)
    })

    it('限流错误应该较长延迟重试', () => {
      const error = new PollingError(PollingErrorType.RATE_LIMIT_EXCEEDED, 'Rate limited')
      const strategy = getRecoveryStrategy(error, 0, 5)

      expect(strategy.shouldRetry).toBe(true)
      expect(strategy.retryDelay).toBe(10000)
      expect(strategy.shouldNotify).toBe(true)
    })
  })

  describe('错误日志记录', () => {
    let logger: PollingErrorLogger

    beforeEach(() => {
      logger = PollingErrorLogger.getInstance()
      logger.clear()
    })

    it('应该记录错误', () => {
      const error = new PollingError(PollingErrorType.NETWORK_ERROR, 'Error')
      logger.log(error)

      const recent = logger.getRecentErrors(1)
      expect(recent).toHaveLength(1)
      expect(recent[0]).toBe(error)
    })

    it('应该限制错误数量', () => {
      // 记录101个错误
      for (let i = 0; i < 101; i++) {
        logger.log(new PollingError(PollingErrorType.NETWORK_ERROR, `Error ${i}`))
      }

      const recent = logger.getRecentErrors(200)
      expect(recent.length).toBeLessThanOrEqual(100)
    })

    it('应该统计错误类型', () => {
      logger.log(new PollingError(PollingErrorType.NETWORK_ERROR, 'Error 1'))
      logger.log(new PollingError(PollingErrorType.NETWORK_ERROR, 'Error 2'))
      logger.log(new PollingError(PollingErrorType.API_ERROR, 'Error 3'))

      const stats = logger.getErrorStats()
      expect(stats[PollingErrorType.NETWORK_ERROR]).toBe(2)
      expect(stats[PollingErrorType.API_ERROR]).toBe(1)
    })

    it('应该能清空日志', () => {
      logger.log(new PollingError(PollingErrorType.NETWORK_ERROR, 'Error'))
      logger.clear()

      expect(logger.getRecentErrors()).toHaveLength(0)
    })
  })
})

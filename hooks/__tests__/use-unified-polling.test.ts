/**
 * 通用轮询引擎单元测试
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { useUnifiedPolling, type PollingStatusResponse, type StorageRequest } from '../use-unified-polling'
import { VIDEO_POLLING_CONFIG, IMAGE_POLLING_CONFIG } from '@/lib/polling/polling-config'
import { PollingErrorType } from '@/lib/polling/polling-errors'

// Mock fetch
global.fetch = jest.fn()

describe('useUnifiedPolling', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  describe('基础功能', () => {
    it('应该能启动和停止轮询', async () => {
      const fetchStatus = jest.fn<Promise<PollingStatusResponse>, [string, AbortSignal]>()
        .mockResolvedValue({ status: 'processing' })

      const { result } = renderHook(() =>
        useUnifiedPolling({
          config: VIDEO_POLLING_CONFIG,
          fetchStatus
        })
      )

      expect(result.current.isPolling).toBe(false)
      expect(result.current.pollingCount).toBe(0)

      // 开始轮询
      act(() => {
        result.current.startPolling('test-1', 'local-1')
      })

      expect(result.current.isPolling).toBe(true)
      expect(result.current.pollingCount).toBe(1)

      // 停止轮询
      act(() => {
        result.current.stopPolling('test-1')
      })

      expect(result.current.isPolling).toBe(false)
      expect(result.current.pollingCount).toBe(0)
    })

    it('应该能管理多个任务', async () => {
      const fetchStatus = jest.fn<Promise<PollingStatusResponse>, [string, AbortSignal]>()
        .mockResolvedValue({ status: 'processing' })

      const { result } = renderHook(() =>
        useUnifiedPolling({
          config: VIDEO_POLLING_CONFIG,
          fetchStatus
        })
      )

      // 开始3个任务
      act(() => {
        result.current.startPolling('test-1', 'local-1')
        result.current.startPolling('test-2', 'local-2')
        result.current.startPolling('test-3', 'local-3')
      })

      expect(result.current.pollingCount).toBe(3)
      expect(result.current.activeJobs).toHaveLength(3)

      // 停止单个任务
      act(() => {
        result.current.stopPolling('test-2')
      })

      expect(result.current.pollingCount).toBe(2)

      // 停止所有任务
      act(() => {
        result.current.stopAllPolling()
      })

      expect(result.current.pollingCount).toBe(0)
    })
  })

  describe('轮询逻辑', () => {
    it('应该在任务完成时触发回调', async () => {
      const onCompleted = jest.fn()
      const fetchStatus = jest.fn<Promise<PollingStatusResponse>, [string, AbortSignal]>()
        .mockResolvedValueOnce({ status: 'processing' })
        .mockResolvedValueOnce({ status: 'completed', outputs: ['https://example.com/video.mp4'] })

      const { result } = renderHook(() =>
        useUnifiedPolling({
          config: VIDEO_POLLING_CONFIG,
          fetchStatus,
          onCompleted
        })
      )

      act(() => {
        result.current.startPolling('test-1', 'local-1')
      })

      // 立即执行一次
      await act(async () => {
        jest.advanceTimersByTime(0)
      })

      // 等待第一次轮询
      await act(async () => {
        jest.advanceTimersByTime(VIDEO_POLLING_CONFIG.interval)
      })

      await waitFor(() => {
        expect(onCompleted).toHaveBeenCalledWith('test-1', 'https://example.com/video.mp4')
        expect(result.current.isPolling).toBe(false)
      })
    })

    it('应该在任务失败时触发回调', async () => {
      const onFailed = jest.fn()
      const fetchStatus = jest.fn<Promise<PollingStatusResponse>, [string, AbortSignal]>()
        .mockResolvedValue({ status: 'failed', error: 'Generation failed' })

      const { result } = renderHook(() =>
        useUnifiedPolling({
          config: VIDEO_POLLING_CONFIG,
          fetchStatus,
          onFailed
        })
      )

      act(() => {
        result.current.startPolling('test-1', 'local-1')
      })

      await act(async () => {
        jest.advanceTimersByTime(0)
      })

      await waitFor(() => {
        expect(onFailed).toHaveBeenCalled()
        const error = onFailed.mock.calls[0][1]
        expect(error.message).toContain('Generation failed')
        expect(result.current.isPolling).toBe(false)
      })
    })

    it('应该在超时时停止轮询', async () => {
      const onFailed = jest.fn()
      const fetchStatus = jest.fn<Promise<PollingStatusResponse>, [string, AbortSignal]>()
        .mockResolvedValue({ status: 'processing' })

      const shortConfig = {
        ...VIDEO_POLLING_CONFIG,
        maxDuration: 5000,
        interval: 1000
      }

      const { result } = renderHook(() =>
        useUnifiedPolling({
          config: shortConfig,
          fetchStatus,
          onFailed
        })
      )

      act(() => {
        result.current.startPolling('test-1', 'local-1')
      })

      // 超过最大时长
      await act(async () => {
        jest.advanceTimersByTime(6000)
      })

      await waitFor(() => {
        expect(onFailed).toHaveBeenCalled()
        expect(result.current.isPolling).toBe(false)
      })
    })

    it('应该报告进度', async () => {
      const onProgress = jest.fn()
      const fetchStatus = jest.fn<Promise<PollingStatusResponse>, [string, AbortSignal]>()
        .mockResolvedValueOnce({ status: 'processing', progress: 25 })
        .mockResolvedValueOnce({ status: 'processing', progress: 50 })
        .mockResolvedValueOnce({ status: 'processing', progress: 75 })
        .mockResolvedValueOnce({ status: 'completed', outputs: ['output'], progress: 100 })

      const { result } = renderHook(() =>
        useUnifiedPolling({
          config: VIDEO_POLLING_CONFIG,
          fetchStatus,
          onProgress
        })
      )

      act(() => {
        result.current.startPolling('test-1', 'local-1')
      })

      await act(async () => {
        jest.advanceTimersByTime(0)
      })

      await act(async () => {
        jest.advanceTimersByTime(VIDEO_POLLING_CONFIG.interval * 3)
      })

      await waitFor(() => {
        expect(onProgress).toHaveBeenCalledTimes(4)
        expect(onProgress).toHaveBeenCalledWith('test-1', 25)
        expect(onProgress).toHaveBeenCalledWith('test-1', 50)
        expect(onProgress).toHaveBeenCalledWith('test-1', 75)
        expect(onProgress).toHaveBeenCalledWith('test-1', 100)
      })
    })
  })

  describe('并发控制', () => {
    it('应该限制并发轮询数量', async () => {
      const fetchStatus = jest.fn<Promise<PollingStatusResponse>, [string, AbortSignal]>()
        .mockResolvedValue({ status: 'processing' })

      const { result } = renderHook(() =>
        useUnifiedPolling({
          config: {
            ...VIDEO_POLLING_CONFIG,
            maxConcurrentPolls: 2
          },
          fetchStatus
        })
      )

      // 启动5个任务
      act(() => {
        result.current.startPolling('test-1', 'local-1')
        result.current.startPolling('test-2', 'local-2')
        result.current.startPolling('test-3', 'local-3')
        result.current.startPolling('test-4', 'local-4')
        result.current.startPolling('test-5', 'local-5')
      })

      expect(result.current.pollingCount).toBe(5)

      await act(async () => {
        jest.advanceTimersByTime(0)
      })

      // 只应该轮询前2个
      await waitFor(() => {
        expect(fetchStatus).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('错误处理', () => {
    it('应该在达到最大错误次数时停止', async () => {
      const onFailed = jest.fn()
      const fetchStatus = jest.fn<Promise<PollingStatusResponse>, [string, AbortSignal]>()
        .mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() =>
        useUnifiedPolling({
          config: {
            ...VIDEO_POLLING_CONFIG,
            maxConsecutiveErrors: 3
          },
          fetchStatus,
          onFailed
        })
      )

      act(() => {
        result.current.startPolling('test-1', 'local-1')
      })

      // 触发3次错误
      await act(async () => {
        jest.advanceTimersByTime(0)
      })
      await act(async () => {
        jest.advanceTimersByTime(VIDEO_POLLING_CONFIG.interval)
      })
      await act(async () => {
        jest.advanceTimersByTime(VIDEO_POLLING_CONFIG.interval)
      })

      await waitFor(() => {
        expect(onFailed).toHaveBeenCalled()
        expect(result.current.isPolling).toBe(false)
      })
    })

    it('应该重置错误计数在成功后', async () => {
      const fetchStatus = jest.fn<Promise<PollingStatusResponse>, [string, AbortSignal]>()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ status: 'processing' })
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ status: 'processing' })

      const { result } = renderHook(() =>
        useUnifiedPolling({
          config: {
            ...VIDEO_POLLING_CONFIG,
            maxConsecutiveErrors: 2
          },
          fetchStatus
        })
      )

      act(() => {
        result.current.startPolling('test-1', 'local-1')
      })

      // 错误 -> 成功 -> 错误 -> 成功
      await act(async () => {
        jest.advanceTimersByTime(0)
      })
      await act(async () => {
        jest.advanceTimersByTime(VIDEO_POLLING_CONFIG.interval)
      })
      await act(async () => {
        jest.advanceTimersByTime(VIDEO_POLLING_CONFIG.interval)
      })
      await act(async () => {
        jest.advanceTimersByTime(VIDEO_POLLING_CONFIG.interval)
      })

      // 不应该停止（错误计数被重置）
      expect(result.current.isPolling).toBe(true)
    })
  })

  describe('数据库存储', () => {
    it('应该在完成后保存到数据库', async () => {
      const saveToDatabase = jest.fn<Promise<{ success: boolean; id?: string }>, [StorageRequest]>()
        .mockResolvedValue({ success: true, id: 'stored-1' })

      const onStored = jest.fn()
      const fetchStatus = jest.fn<Promise<PollingStatusResponse>, [string, AbortSignal]>()
        .mockResolvedValue({ status: 'completed', outputs: ['https://example.com/video.mp4'] })

      const { result } = renderHook(() =>
        useUnifiedPolling({
          config: {
            ...VIDEO_POLLING_CONFIG,
            storageStrategy: 'immediate'
          },
          fetchStatus,
          saveToDatabase,
          onStored
        })
      )

      act(() => {
        result.current.startPolling('test-1', 'local-1', { prompt: 'test video' })
      })

      await act(async () => {
        jest.advanceTimersByTime(0)
      })

      await waitFor(() => {
        expect(saveToDatabase).toHaveBeenCalled()
        expect(onStored).toHaveBeenCalledWith('test-1', 'stored-1')
      })
    })

    it('应该在存储失败时重试', async () => {
      const saveToDatabase = jest.fn<Promise<{ success: boolean; id?: string }>, [StorageRequest]>()
        .mockRejectedValueOnce(new Error('Storage failed'))
        .mockRejectedValueOnce(new Error('Storage failed'))
        .mockResolvedValueOnce({ success: true, id: 'stored-1' })

      const onStored = jest.fn()
      const fetchStatus = jest.fn<Promise<PollingStatusResponse>, [string, AbortSignal]>()
        .mockResolvedValue({ status: 'completed', outputs: ['https://example.com/video.mp4'] })

      const { result } = renderHook(() =>
        useUnifiedPolling({
          config: {
            ...VIDEO_POLLING_CONFIG,
            storageRetries: 3,
            storageRetryDelay: 1000
          },
          fetchStatus,
          saveToDatabase,
          onStored
        })
      )

      act(() => {
        result.current.startPolling('test-1', 'local-1')
      })

      await act(async () => {
        jest.advanceTimersByTime(0)
      })

      // 等待重试
      await act(async () => {
        jest.advanceTimersByTime(1000)
      })
      await act(async () => {
        jest.advanceTimersByTime(2000)
      })

      await waitFor(() => {
        expect(saveToDatabase).toHaveBeenCalledTimes(3)
        expect(onStored).toHaveBeenCalledWith('test-1', 'stored-1')
      })
    })

    it('应该支持延迟存储策略', async () => {
      const saveToDatabase = jest.fn<Promise<{ success: boolean; id?: string }>, [StorageRequest]>()
        .mockResolvedValue({ success: true, id: 'stored-1' })

      const fetchStatus = jest.fn<Promise<PollingStatusResponse>, [string, AbortSignal]>()
        .mockResolvedValue({ status: 'completed', outputs: ['https://example.com/video.mp4'] })

      const { result } = renderHook(() =>
        useUnifiedPolling({
          config: {
            ...VIDEO_POLLING_CONFIG,
            storageStrategy: 'delayed',
            storageDelay: 500
          },
          fetchStatus,
          saveToDatabase
        })
      )

      act(() => {
        result.current.startPolling('test-1', 'local-1')
      })

      await act(async () => {
        jest.advanceTimersByTime(0)
      })

      // 不应该立即保存
      expect(saveToDatabase).not.toHaveBeenCalled()

      // 等待延迟
      await act(async () => {
        jest.advanceTimersByTime(500)
      })

      await waitFor(() => {
        expect(saveToDatabase).toHaveBeenCalled()
      })
    })
  })

  describe('健康检查', () => {
    it('应该清理超龄任务', async () => {
      const onFailed = jest.fn()
      const fetchStatus = jest.fn<Promise<PollingStatusResponse>, [string, AbortSignal]>()
        .mockResolvedValue({ status: 'processing' })

      const { result } = renderHook(() =>
        useUnifiedPolling({
          config: {
            ...VIDEO_POLLING_CONFIG,
            healthCheckInterval: 1000,
            maxTaskAge: 5000
          },
          fetchStatus,
          onFailed
        })
      )

      act(() => {
        result.current.startPolling('test-1', 'local-1')
      })

      // 等待任务超龄
      await act(async () => {
        jest.advanceTimersByTime(6000)
      })

      await waitFor(() => {
        expect(onFailed).toHaveBeenCalled()
        expect(result.current.isPolling).toBe(false)
      })
    })
  })

  describe('类型安全', () => {
    it('应该支持自定义任务数据类型', async () => {
      interface VideoJobData {
        userId: string
        prompt: string
        settings: {
          model: string
          duration: number
        }
      }

      const fetchStatus = jest.fn<Promise<PollingStatusResponse>, [string, AbortSignal]>()
        .mockResolvedValue({ status: 'processing' })

      const { result } = renderHook(() =>
        useUnifiedPolling<VideoJobData>({
          config: VIDEO_POLLING_CONFIG,
          fetchStatus
        })
      )

      act(() => {
        result.current.startPolling('test-1', 'local-1', {
          userId: 'user-123',
          prompt: 'A beautiful sunset',
          settings: {
            model: 'runway-gen3',
            duration: 10
          }
        })
      })

      expect(result.current.activeJobs[0].data).toEqual({
        userId: 'user-123',
        prompt: 'A beautiful sunset',
        settings: {
          model: 'runway-gen3',
          duration: 10
        }
      })
    })
  })
})

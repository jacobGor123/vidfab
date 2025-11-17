/**
 * 轮询配置系统单元测试
 */

import {
  PollingConfig,
  VIDEO_POLLING_CONFIG,
  IMAGE_POLLING_CONFIG,
  POLLING_PRESETS,
  validatePollingConfig,
  createPollingConfig,
  getRecommendedConfig
} from '../polling-config'

describe('PollingConfig', () => {
  describe('预设配置', () => {
    it('应该提供视频轮询配置', () => {
      expect(VIDEO_POLLING_CONFIG).toBeDefined()
      expect(VIDEO_POLLING_CONFIG.interval).toBe(3000)
      expect(VIDEO_POLLING_CONFIG.maxDuration).toBe(30 * 60 * 1000)
      expect(VIDEO_POLLING_CONFIG.statusApiPath).toBe('/api/video/status')
    })

    it('应该提供图片轮询配置', () => {
      expect(IMAGE_POLLING_CONFIG).toBeDefined()
      expect(IMAGE_POLLING_CONFIG.interval).toBe(2000)
      expect(IMAGE_POLLING_CONFIG.maxDuration).toBe(5 * 60 * 1000)
      expect(IMAGE_POLLING_CONFIG.statusApiPath).toBe('/api/image/status')
    })

    it('图片轮询应该包含新增的并发控制和健康检查', () => {
      expect(IMAGE_POLLING_CONFIG.maxConcurrentPolls).toBe(3)
      expect(IMAGE_POLLING_CONFIG.healthCheckInterval).toBe(30000)
      expect(IMAGE_POLLING_CONFIG.maxTaskAge).toBeDefined()
      expect(IMAGE_POLLING_CONFIG.maxGeneratingDuration).toBeDefined()
    })
  })

  describe('配置验证', () => {
    it('应该验证有效的配置', () => {
      const result = validatePollingConfig(VIDEO_POLLING_CONFIG)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('应该拒绝过小的间隔', () => {
      const invalidConfig = { ...VIDEO_POLLING_CONFIG, interval: 50 }
      const result = validatePollingConfig(invalidConfig)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('interval 不能小于 100ms')
    })

    it('应该拒绝maxDuration小于interval', () => {
      const invalidConfig = {
        ...VIDEO_POLLING_CONFIG,
        interval: 10000,
        maxDuration: 5000
      }
      const result = validatePollingConfig(invalidConfig)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('maxDuration 必须大于 interval')
    })

    it('应该要求delayed策略提供storageDelay', () => {
      const invalidConfig = {
        ...VIDEO_POLLING_CONFIG,
        storageStrategy: 'delayed' as const,
        storageDelay: undefined
      }
      const result = validatePollingConfig(invalidConfig)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('storageStrategy 为 delayed 时必须提供 storageDelay')
    })
  })

  describe('自定义配置', () => {
    it('应该能基于预设创建自定义配置', () => {
      const customConfig = createPollingConfig(VIDEO_POLLING_CONFIG, {
        interval: 5000,
        maxConsecutiveErrors: 10
      })

      expect(customConfig.interval).toBe(5000)
      expect(customConfig.maxConsecutiveErrors).toBe(10)
      expect(customConfig.statusApiPath).toBe(VIDEO_POLLING_CONFIG.statusApiPath)
    })

    it('应该在无效配置时输出警告', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

      createPollingConfig(VIDEO_POLLING_CONFIG, {
        interval: 50 // 无效值
      })

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  describe('推荐配置', () => {
    it('应该返回视频推荐配置', () => {
      const config = getRecommendedConfig('video')
      expect(config).toEqual(VIDEO_POLLING_CONFIG)
    })

    it('应该返回图片推荐配置', () => {
      const config = getRecommendedConfig('image')
      expect(config).toEqual(IMAGE_POLLING_CONFIG)
    })
  })

  describe('配置一致性', () => {
    it('所有预设配置应该通过验证', () => {
      Object.values(POLLING_PRESETS).forEach(config => {
        const result = validatePollingConfig(config)
        expect(result.valid).toBe(true)
      })
    })

    it('视频和图片配置应该有合理的差异', () => {
      // 图片生成更快,所以间隔更短、超时更短
      expect(IMAGE_POLLING_CONFIG.interval).toBeLessThan(VIDEO_POLLING_CONFIG.interval)
      expect(IMAGE_POLLING_CONFIG.maxDuration).toBeLessThan(VIDEO_POLLING_CONFIG.maxDuration)

      // 但并发控制应该一致
      expect(IMAGE_POLLING_CONFIG.maxConcurrentPolls).toBe(VIDEO_POLLING_CONFIG.maxConcurrentPolls)
    })
  })
})

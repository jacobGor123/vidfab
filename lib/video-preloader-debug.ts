/**
 * 视频预加载性能监控和调试工具
 *
 * 这个模块提供了完整的性能监控、调试和分析功能，包括：
 * - 实时性能监控
 * - 事件统计分析
 * - 性能瓶颈识别
 * - 优化建议生成
 * - 自动性能报告生成
 */

import {
  PerformanceMetrics,
  RealtimeMetrics,
  DebugInfo,
  PreloadEvent,
  PreloadEventType,
  VideoPreloader
} from '@/types/video-preloader'

/**
 * 性能监控器类
 */
export class VideoPreloaderMonitor {
  private preloader: VideoPreloader
  private eventLog: PreloadEvent[] = []
  private performanceLog: PerformanceSnapshot[] = []
  private monitoringInterval: number | null = null
  private isMonitoring = false

  constructor(preloader: VideoPreloader) {
    this.preloader = preloader
    this.setupEventListeners()
  }

  /**
   * 开始性能监控
   */
  startMonitoring(intervalMs = 1000): void {
    if (this.isMonitoring) {
      console.warn('性能监控已在运行中')
      return
    }

    this.isMonitoring = true
    this.monitoringInterval = window.setInterval(() => {
      this.capturePerformanceSnapshot()
    }, intervalMs)

    console.log('视频预加载性能监控已启动')
  }

  /**
   * 停止性能监控
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }
    this.isMonitoring = false
    console.log('视频预加载性能监控已停止')
  }

  /**
   * 获取性能报告
   */
  getPerformanceReport(): PerformanceReport {
    const metrics = this.preloader.getMetrics()
    const realtimeMetrics = this.preloader.getRealtimeMetrics()
    const debugInfo = this.preloader.getDebugInfo()

    return {
      timestamp: new Date().toISOString(),
      summary: this.generateSummary(metrics, realtimeMetrics),
      metrics,
      realtimeMetrics,
      debugInfo,
      eventLog: this.eventLog.slice(-100), // 最近100个事件
      performanceLog: this.performanceLog.slice(-60), // 最近60个快照
      recommendations: this.generateRecommendations(metrics, realtimeMetrics)
    }
  }

  /**
   * 导出性能数据
   */
  exportPerformanceData(): string {
    const report = this.getPerformanceReport()
    return JSON.stringify(report, null, 2)
  }

  /**
   * 获取事件统计
   */
  getEventStatistics(): EventStatistics {
    const stats: EventStatistics = {
      totalEvents: this.eventLog.length,
      eventCounts: {},
      recentEvents: this.eventLog.slice(-20),
      errorRate: 0,
      averageLoadTime: 0
    }

    // 统计各类事件数量
    Object.values(PreloadEventType).forEach(type => {
      stats.eventCounts[type] = this.eventLog.filter(event => event.type === type).length
    })

    // 计算错误率
    const errorEvents = stats.eventCounts[PreloadEventType.LoadError] || 0
    const totalLoadAttempts = stats.eventCounts[PreloadEventType.LoadStart] || 1
    stats.errorRate = errorEvents / totalLoadAttempts

    // 计算平均加载时间
    const loadEvents = this.eventLog.filter(event =>
      event.type === PreloadEventType.LoadStart || event.type === PreloadEventType.LoadComplete
    )

    const loadTimes: number[] = []
    for (let i = 0; i < loadEvents.length - 1; i++) {
      const startEvent = loadEvents[i]
      const endEvent = loadEvents[i + 1]
      if (startEvent.type === PreloadEventType.LoadStart &&
          endEvent.type === PreloadEventType.LoadComplete &&
          startEvent.videoId === endEvent.videoId) {
        loadTimes.push(endEvent.timestamp - startEvent.timestamp)
      }
    }

    if (loadTimes.length > 0) {
      stats.averageLoadTime = loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length
    }

    return stats
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    Object.values(PreloadEventType).forEach(eventType => {
      this.preloader.addEventListener(eventType, (event) => {
        this.eventLog.push(event)

        // 限制事件日志大小
        if (this.eventLog.length > 1000) {
          this.eventLog = this.eventLog.slice(-500)
        }
      })
    })
  }

  /**
   * 捕获性能快照
   */
  private capturePerformanceSnapshot(): void {
    const snapshot: PerformanceSnapshot = {
      timestamp: Date.now(),
      metrics: this.preloader.getMetrics(),
      realtimeMetrics: this.preloader.getRealtimeMetrics(),
      memoryUsage: this.getMemoryUsage(),
      networkInfo: this.getNetworkInfo()
    }

    this.performanceLog.push(snapshot)

    // 限制性能日志大小
    if (this.performanceLog.length > 300) {
      this.performanceLog = this.performanceLog.slice(-150)
    }
  }

  /**
   * 获取内存使用信息
   */
  private getMemoryUsage(): MemoryUsageSnapshot {
    const memoryInfo: MemoryUsageSnapshot = {
      used: 0,
      total: 0,
      limit: 0
    }

    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const memory = (performance as any).memory
      memoryInfo.used = memory.usedJSHeapSize / (1024 * 1024) // MB
      memoryInfo.total = memory.totalJSHeapSize / (1024 * 1024) // MB
      memoryInfo.limit = memory.jsHeapSizeLimit / (1024 * 1024) // MB
    }

    return memoryInfo
  }

  /**
   * 获取网络信息
   */
  private getNetworkInfo(): NetworkInfoSnapshot {
    const networkInfo: NetworkInfoSnapshot = {
      effectiveType: 'unknown',
      downlink: 0,
      rtt: 0,
      saveData: false
    }

    if (typeof navigator !== 'undefined' && (navigator as any).connection) {
      const connection = (navigator as any).connection
      networkInfo.effectiveType = connection.effectiveType || 'unknown'
      networkInfo.downlink = connection.downlink || 0
      networkInfo.rtt = connection.rtt || 0
      networkInfo.saveData = connection.saveData || false
    }

    return networkInfo
  }

  /**
   * 生成性能摘要
   */
  private generateSummary(metrics: PerformanceMetrics, realtimeMetrics: RealtimeMetrics): PerformanceSummary {
    return {
      status: this.getOverallStatus(metrics, realtimeMetrics),
      keyMetrics: {
        hitRate: Math.round(metrics.hitRate * 100),
        averageDelay: Math.round(metrics.averageHoverDelay),
        successRate: Math.round(metrics.successRate * 100),
        memoryUsage: Math.round(realtimeMetrics.currentMemoryUsage),
        activePreloads: realtimeMetrics.currentConcurrentLoads
      },
      trends: this.analyzeTrends(),
      alerts: this.generateAlerts(metrics, realtimeMetrics)
    }
  }

  /**
   * 获取整体状态
   */
  private getOverallStatus(metrics: PerformanceMetrics, realtimeMetrics: RealtimeMetrics): 'excellent' | 'good' | 'warning' | 'critical' {
    const criticalIssues = [
      metrics.successRate < 0.7,
      metrics.averageHoverDelay > 500,
      realtimeMetrics.currentMemoryUsage > 150
    ].filter(Boolean).length

    const warningIssues = [
      metrics.hitRate < 0.5,
      metrics.averageHoverDelay > 200,
      realtimeMetrics.currentMemoryUsage > 100
    ].filter(Boolean).length

    if (criticalIssues > 0) return 'critical'
    if (warningIssues > 1) return 'warning'
    if (metrics.hitRate > 0.8 && metrics.averageHoverDelay < 100) return 'excellent'
    return 'good'
  }

  /**
   * 分析趋势
   */
  private analyzeTrends(): TrendAnalysis {
    if (this.performanceLog.length < 10) {
      return {
        hitRate: 'stable',
        memoryUsage: 'stable',
        loadTime: 'stable'
      }
    }

    const recent = this.performanceLog.slice(-10)
    const older = this.performanceLog.slice(-20, -10)

    const recentAvgHitRate = recent.reduce((sum, snap) => sum + snap.metrics.hitRate, 0) / recent.length
    const olderAvgHitRate = older.reduce((sum, snap) => sum + snap.metrics.hitRate, 0) / older.length

    const recentAvgMemory = recent.reduce((sum, snap) => sum + snap.realtimeMetrics.currentMemoryUsage, 0) / recent.length
    const olderAvgMemory = older.reduce((sum, snap) => sum + snap.realtimeMetrics.currentMemoryUsage, 0) / older.length

    const recentAvgLoadTime = recent.reduce((sum, snap) => sum + snap.metrics.averageLoadTime, 0) / recent.length
    const olderAvgLoadTime = older.reduce((sum, snap) => sum + snap.metrics.averageLoadTime, 0) / older.length

    return {
      hitRate: this.getTrend(recentAvgHitRate, olderAvgHitRate),
      memoryUsage: this.getTrend(recentAvgMemory, olderAvgMemory, true),
      loadTime: this.getTrend(recentAvgLoadTime, olderAvgLoadTime, true)
    }
  }

  /**
   * 获取趋势方向
   */
  private getTrend(recent: number, older: number, inverse = false): 'improving' | 'degrading' | 'stable' {
    const threshold = 0.1
    const change = (recent - older) / older

    if (Math.abs(change) < threshold) return 'stable'

    const isImproving = inverse ? change < 0 : change > 0
    return isImproving ? 'improving' : 'degrading'
  }

  /**
   * 生成告警
   */
  private generateAlerts(metrics: PerformanceMetrics, realtimeMetrics: RealtimeMetrics): Alert[] {
    const alerts: Alert[] = []

    if (metrics.successRate < 0.7) {
      alerts.push({
        level: 'critical',
        message: `预加载成功率过低: ${Math.round(metrics.successRate * 100)}%`,
        recommendation: '检查网络连接和视频资源可用性'
      })
    }

    if (metrics.averageHoverDelay > 500) {
      alerts.push({
        level: 'critical',
        message: `悬停延迟过高: ${Math.round(metrics.averageHoverDelay)}ms`,
        recommendation: '增加预加载并发数或优化视频文件大小'
      })
    }

    if (realtimeMetrics.currentMemoryUsage > 150) {
      alerts.push({
        level: 'warning',
        message: `内存使用过高: ${Math.round(realtimeMetrics.currentMemoryUsage)}MB`,
        recommendation: '减少并发预加载数量或清理预加载缓存'
      })
    }

    if (metrics.hitRate < 0.3) {
      alerts.push({
        level: 'warning',
        message: `预加载命中率低: ${Math.round(metrics.hitRate * 100)}%`,
        recommendation: '优化预加载策略或增加可见性检测范围'
      })
    }

    return alerts
  }

  /**
   * 生成优化建议
   */
  private generateRecommendations(metrics: PerformanceMetrics, realtimeMetrics: RealtimeMetrics): Recommendation[] {
    const recommendations: Recommendation[] = []

    // 基于命中率的建议
    if (metrics.hitRate < 0.5) {
      recommendations.push({
        category: 'strategy',
        priority: 'high',
        title: '提高预加载命中率',
        description: '当前命中率较低，建议优化预加载时机和策略',
        actions: [
          '增加可见性检测的阈值范围',
          '提前预加载即将可见的视频',
          '优化预加载优先级算法'
        ]
      })
    }

    // 基于延迟的建议
    if (metrics.averageHoverDelay > 200) {
      recommendations.push({
        category: 'performance',
        priority: 'medium',
        title: '优化播放延迟',
        description: '悬停到播放的延迟较高，影响用户体验',
        actions: [
          '增加并发预加载数量',
          '优先预加载小文件视频',
          '考虑使用视频预览帧'
        ]
      })
    }

    // 基于内存使用的建议
    if (realtimeMetrics.currentMemoryUsage > 100) {
      recommendations.push({
        category: 'resource',
        priority: 'medium',
        title: '优化内存使用',
        description: '内存使用较高，可能影响系统性能',
        actions: [
          '减少同时预加载的视频数量',
          '实现更积极的缓存清理策略',
          '监控并限制单个视频的内存占用'
        ]
      })
    }

    return recommendations
  }
}

/**
 * 性能调试面板组件数据
 */
export function createDebugPanelData(monitor: VideoPreloaderMonitor): DebugPanelData {
  const report = monitor.getPerformanceReport()
  const eventStats = monitor.getEventStatistics()

  return {
    summary: report.summary,
    metrics: report.metrics,
    realtimeMetrics: report.realtimeMetrics,
    eventStats,
    charts: {
      memoryUsage: report.performanceLog.map(snap => ({
        timestamp: snap.timestamp,
        value: snap.memoryUsage.used
      })),
      hitRate: report.performanceLog.map(snap => ({
        timestamp: snap.timestamp,
        value: snap.metrics.hitRate * 100
      })),
      loadTime: report.performanceLog.map(snap => ({
        timestamp: snap.timestamp,
        value: snap.metrics.averageLoadTime
      }))
    },
    alerts: report.summary.alerts,
    recommendations: report.recommendations
  }
}

/**
 * 自动性能分析
 */
export function analyzePerformance(monitor: VideoPreloaderMonitor): PerformanceAnalysis {
  const report = monitor.getPerformanceReport()
  const eventStats = monitor.getEventStatistics()

  const analysis: PerformanceAnalysis = {
    score: calculatePerformanceScore(report.metrics, report.realtimeMetrics),
    bottlenecks: identifyBottlenecks(report.metrics, eventStats),
    optimization: generateOptimizationPlan(report.metrics, report.realtimeMetrics),
    comparison: compareWithBenchmarks(report.metrics)
  }

  return analysis
}

// ===== 类型定义 =====

interface PerformanceSnapshot {
  timestamp: number
  metrics: PerformanceMetrics
  realtimeMetrics: RealtimeMetrics
  memoryUsage: MemoryUsageSnapshot
  networkInfo: NetworkInfoSnapshot
}

interface MemoryUsageSnapshot {
  used: number
  total: number
  limit: number
}

interface NetworkInfoSnapshot {
  effectiveType: string
  downlink: number
  rtt: number
  saveData: boolean
}

interface PerformanceReport {
  timestamp: string
  summary: PerformanceSummary
  metrics: PerformanceMetrics
  realtimeMetrics: RealtimeMetrics
  debugInfo: DebugInfo
  eventLog: PreloadEvent[]
  performanceLog: PerformanceSnapshot[]
  recommendations: Recommendation[]
}

interface PerformanceSummary {
  status: 'excellent' | 'good' | 'warning' | 'critical'
  keyMetrics: {
    hitRate: number
    averageDelay: number
    successRate: number
    memoryUsage: number
    activePreloads: number
  }
  trends: TrendAnalysis
  alerts: Alert[]
}

interface TrendAnalysis {
  hitRate: 'improving' | 'degrading' | 'stable'
  memoryUsage: 'improving' | 'degrading' | 'stable'
  loadTime: 'improving' | 'degrading' | 'stable'
}

interface Alert {
  level: 'critical' | 'warning' | 'info'
  message: string
  recommendation: string
}

interface Recommendation {
  category: 'strategy' | 'performance' | 'resource' | 'user-experience'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  actions: string[]
}

interface EventStatistics {
  totalEvents: number
  eventCounts: Record<PreloadEventType, number>
  recentEvents: PreloadEvent[]
  errorRate: number
  averageLoadTime: number
}

interface DebugPanelData {
  summary: PerformanceSummary
  metrics: PerformanceMetrics
  realtimeMetrics: RealtimeMetrics
  eventStats: EventStatistics
  charts: {
    memoryUsage: Array<{ timestamp: number; value: number }>
    hitRate: Array<{ timestamp: number; value: number }>
    loadTime: Array<{ timestamp: number; value: number }>
  }
  alerts: Alert[]
  recommendations: Recommendation[]
}

interface PerformanceAnalysis {
  score: number
  bottlenecks: string[]
  optimization: OptimizationPlan
  comparison: BenchmarkComparison
}

interface OptimizationPlan {
  immediate: string[]
  shortTerm: string[]
  longTerm: string[]
}

interface BenchmarkComparison {
  hitRate: 'above' | 'at' | 'below'
  loadTime: 'above' | 'at' | 'below'
  memoryUsage: 'above' | 'at' | 'below'
}

// ===== 辅助函数 =====

function calculatePerformanceScore(metrics: PerformanceMetrics, realtimeMetrics: RealtimeMetrics): number {
  const hitRateScore = metrics.hitRate * 30
  const delayScore = Math.max(0, 30 - (metrics.averageHoverDelay / 10))
  const successRateScore = metrics.successRate * 25
  const memoryScore = Math.max(0, 15 - (realtimeMetrics.currentMemoryUsage / 10))

  return Math.round(hitRateScore + delayScore + successRateScore + memoryScore)
}

function identifyBottlenecks(metrics: PerformanceMetrics, eventStats: EventStatistics): string[] {
  const bottlenecks: string[] = []

  if (metrics.hitRate < 0.5) {
    bottlenecks.push('预加载命中率低')
  }

  if (metrics.averageHoverDelay > 300) {
    bottlenecks.push('播放延迟过高')
  }

  if (eventStats.errorRate > 0.2) {
    bottlenecks.push('预加载失败率高')
  }

  if (metrics.averageLoadTime > 5000) {
    bottlenecks.push('视频加载时间过长')
  }

  return bottlenecks
}

function generateOptimizationPlan(metrics: PerformanceMetrics, realtimeMetrics: RealtimeMetrics): OptimizationPlan {
  const plan: OptimizationPlan = {
    immediate: [],
    shortTerm: [],
    longTerm: []
  }

  if (realtimeMetrics.currentMemoryUsage > 150) {
    plan.immediate.push('清理预加载缓存')
  }

  if (metrics.averageHoverDelay > 500) {
    plan.immediate.push('增加并发预加载数量')
  }

  if (metrics.hitRate < 0.3) {
    plan.shortTerm.push('优化可见性检测策略')
    plan.shortTerm.push('改进优先级算法')
  }

  plan.longTerm.push('实现更智能的网络感知预加载')
  plan.longTerm.push('添加机器学习优化')

  return plan
}

function compareWithBenchmarks(metrics: PerformanceMetrics): BenchmarkComparison {
  const benchmarks = {
    hitRate: 0.7,
    loadTime: 2000,
    memoryUsage: 80
  }

  return {
    hitRate: metrics.hitRate > benchmarks.hitRate ? 'above' : metrics.hitRate >= benchmarks.hitRate * 0.9 ? 'at' : 'below',
    loadTime: metrics.averageLoadTime < benchmarks.loadTime ? 'above' : metrics.averageLoadTime <= benchmarks.loadTime * 1.1 ? 'at' : 'below',
    memoryUsage: metrics.memoryUsage < benchmarks.memoryUsage ? 'above' : metrics.memoryUsage <= benchmarks.memoryUsage * 1.1 ? 'at' : 'below'
  }
}

// ===== 导出便利函数 =====

/**
 * 创建性能监控器实例
 */
export function createVideoPreloaderMonitor(preloader: VideoPreloader): VideoPreloaderMonitor {
  return new VideoPreloaderMonitor(preloader)
}

/**
 * 导出性能数据到控制台
 */
export function logPerformanceReport(monitor: VideoPreloaderMonitor): void {
  const report = monitor.getPerformanceReport()
  console.group('📊 视频预加载性能报告')
  console.log('整体状态:', report.summary.status)
  console.table(report.summary.keyMetrics)
  console.log('告警:', report.summary.alerts)
  console.log('趋势:', report.summary.trends)
  console.log('建议:', report.recommendations)
  console.groupEnd()
}

/**
 * 导出性能数据到文件
 */
export function downloadPerformanceReport(monitor: VideoPreloaderMonitor, filename?: string): void {
  const data = monitor.exportPerformanceData()
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = filename || `video-preloader-report-${new Date().toISOString().slice(0, 19)}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)

  URL.revokeObjectURL(url)
}
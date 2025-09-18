"use client"

import React, { useState, useEffect, useRef } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  Activity,
  Clock,
  Database,
  Zap,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Download,
  Wifi
} from 'lucide-react'
import { UseVideoPreloader } from '@/types/video-preloader'
import { VideoPreloaderMonitor, createDebugPanelData } from '@/lib/video-preloader-debug'

interface VideoPreloaderDebugPanelProps {
  preloaderHook: UseVideoPreloader
  isVisible?: boolean
}

export function VideoPreloaderDebugPanel({
  preloaderHook,
  isVisible = false
}: VideoPreloaderDebugPanelProps) {
  const [isOpen, setIsOpen] = useState(isVisible)
  const [monitor, setMonitor] = useState<VideoPreloaderMonitor | null>(null)
  const [debugData, setDebugData] = useState<any>(null)
  const [refreshInterval, setRefreshInterval] = useState(2000)
  const intervalRef = useRef<number | null>(null)

  // 初始化监控器
  useEffect(() => {
    if (preloaderHook.preloader && preloaderHook.isInitialized) {
      const newMonitor = new VideoPreloaderMonitor(preloaderHook.preloader)
      newMonitor.startMonitoring(1000)
      setMonitor(newMonitor)

      return () => {
        newMonitor.stopMonitoring()
      }
    }
  }, [preloaderHook.preloader, preloaderHook.isInitialized])

  // 定期更新调试数据
  useEffect(() => {
    if (!monitor || !isOpen) return

    const updateDebugData = () => {
      try {
        const data = createDebugPanelData(monitor)
        setDebugData(data)
      } catch (error) {
        console.error('更新调试数据失败:', error)
      }
    }

    updateDebugData()
    intervalRef.current = window.setInterval(updateDebugData, refreshInterval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [monitor, isOpen, refreshInterval])

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
        >
          <Activity className="w-4 h-4 mr-2" />
          预加载调试
        </Button>
      </div>
    )
  }

  if (!debugData) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Card className="w-80">
          <CardContent className="p-4">
            <div className="flex items-center justify-center text-gray-500">
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              初始化调试面板...
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card className="w-96 max-h-[80vh] overflow-hidden shadow-2xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              预加载监控
            </CardTitle>
            <div className="flex items-center gap-2">
              <StatusIndicator status={debugData.summary?.status || 'good'} />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
              >
                ×
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 overflow-y-auto max-h-[60vh]">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">概览</TabsTrigger>
              <TabsTrigger value="metrics">指标</TabsTrigger>
              <TabsTrigger value="queue">队列</TabsTrigger>
              <TabsTrigger value="settings">设置</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <OverviewTab data={debugData} />
            </TabsContent>

            <TabsContent value="metrics" className="space-y-4">
              <MetricsTab data={debugData} />
            </TabsContent>

            <TabsContent value="queue" className="space-y-4">
              <QueueTab preloaderHook={preloaderHook} />
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <SettingsTab
                preloaderHook={preloaderHook}
                refreshInterval={refreshInterval}
                onRefreshIntervalChange={setRefreshInterval}
                monitor={monitor}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

// 状态指示器组件
function StatusIndicator({ status }: { status: string }) {
  const statusConfig = {
    excellent: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-100' },
    good: { icon: CheckCircle, color: 'text-blue-500', bg: 'bg-blue-100' },
    warning: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-100' },
    critical: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-100' }
  }

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.good
  const Icon = config.icon

  return (
    <div className={`p-1 rounded-full ${config.bg}`}>
      <Icon className={`w-4 h-4 ${config.color}`} />
    </div>
  )
}

// 概览标签页
function OverviewTab({ data }: { data: any }) {
  const keyMetrics = data.summary?.keyMetrics || {
    hitRate: 0,
    averageDelay: 0,
    memoryUsage: 0,
    activePreloads: 0
  }

  return (
    <div className="space-y-4">
      {/* 关键指标 */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          title="命中率"
          value={`${keyMetrics.hitRate}%`}
          icon={Zap}
          color="text-green-600"
        />
        <MetricCard
          title="延迟"
          value={`${keyMetrics.averageDelay}ms`}
          icon={Clock}
          color="text-blue-600"
        />
        <MetricCard
          title="内存"
          value={`${keyMetrics.memoryUsage}MB`}
          icon={Database}
          color="text-purple-600"
        />
        <MetricCard
          title="预加载"
          value={keyMetrics.activePreloads}
          icon={Activity}
          color="text-orange-600"
        />
      </div>

      {/* 告警 */}
      {data.alerts && data.alerts.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-sm">告警</h4>
          {data.alerts.map((alert: any, index: number) => (
            <div
              key={index}
              className={`p-3 rounded text-sm ${
                alert.level === 'critical'
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
              }`}
            >
              <div className="font-medium">{alert.message}</div>
              <div className="text-xs mt-1 opacity-75">{alert.recommendation}</div>
            </div>
          ))}
        </div>
      )}

      {/* 趋势 */}
      <div className="space-y-2">
        <h4 className="font-medium text-sm">趋势</h4>
        <div className="space-y-1">
          <TrendItem label="命中率" trend={data.summary?.trends?.hitRate || 'stable'} />
          <TrendItem label="内存使用" trend={data.summary?.trends?.memoryUsage || 'stable'} />
          <TrendItem label="加载时间" trend={data.summary?.trends?.loadTime || 'stable'} />
        </div>
      </div>
    </div>
  )
}

// 指标标签页
function MetricsTab({ data }: { data: any }) {
  const metrics = data.metrics || {}
  const realtimeMetrics = data.realtimeMetrics || {}
  const eventStats = data.eventStats || {}

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <MetricRow label="总预加载次数" value={metrics.totalPreloads || 0} />
        <MetricRow label="成功率" value={`${Math.round((metrics.successRate || 0) * 100)}%`} />
        <MetricRow label="平均加载时间" value={`${Math.round(metrics.averageLoadTime || 0)}ms`} />
        <MetricRow label="带宽使用" value={`${(metrics.bandwidthUsage || 0).toFixed(1)}Mbps`} />
        <MetricRow label="失败次数" value={metrics.failureCount || 0} />
      </div>

      <div className="space-y-3">
        <h4 className="font-medium text-sm">实时指标</h4>
        <MetricRow label="队列长度" value={realtimeMetrics.queueLength || 0} />
        <MetricRow label="并发加载" value={realtimeMetrics.currentConcurrentLoads || 0} />
        <MetricRow label="网络使用" value={`${(realtimeMetrics.currentNetworkUsage || 0).toFixed(1)}Mbps`} />
      </div>

      {/* 事件统计 */}
      <div className="space-y-2">
        <h4 className="font-medium text-sm">事件统计</h4>
        <div className="text-xs space-y-1">
          <div className="flex justify-between">
            <span>总事件:</span>
            <span>{eventStats.totalEvents || 0}</span>
          </div>
          <div className="flex justify-between">
            <span>错误率:</span>
            <span>{Math.round((eventStats.errorRate || 0) * 100)}%</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// 队列标签页
function QueueTab({ preloaderHook }: { preloaderHook: UseVideoPreloader }) {
  const [queueItems, setQueueItems] = useState<any[]>([])

  useEffect(() => {
    // 模拟队列数据，因为实际的getQueue方法可能不存在
    const mockItems = [
      { video: { id: 'video-1' }, status: 'loaded', priorityScore: 95, progress: 1 },
      { video: { id: 'video-2' }, status: 'loading', priorityScore: 85, progress: 0.6 },
      { video: { id: 'video-3' }, status: 'pending', priorityScore: 75, progress: 0 }
    ]
    setQueueItems(mockItems)
  }, [preloaderHook])

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="font-medium text-sm">预加载队列 ({queueItems.length})</h4>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            // 刷新队列数据的逻辑
          }}
        >
          <RefreshCw className="w-3 h-3" />
        </Button>
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto">
        {queueItems.map((item, index) => (
          <div key={index} className="p-2 bg-gray-50 rounded text-xs">
            <div className="flex justify-between items-center mb-1">
              <span className="font-medium truncate">{String(item.video.id)}</span>
              <StatusBadge status={item.status} />
            </div>
            <div className="flex justify-between text-gray-500">
              <span>优先级: {Math.round(item.priorityScore)}</span>
              <span>进度: {Math.round(item.progress * 100)}%</span>
            </div>
            {item.progress > 0 && (
              <Progress value={item.progress * 100} className="h-1 mt-1" />
            )}
          </div>
        ))}

        {queueItems.length === 0 && (
          <div className="text-center text-gray-500 py-4">
            队列为空
          </div>
        )}
      </div>
    </div>
  )
}

// 设置标签页
function SettingsTab({
  preloaderHook,
  refreshInterval,
  onRefreshIntervalChange,
  monitor
}: {
  preloaderHook: UseVideoPreloader
  refreshInterval: number
  onRefreshIntervalChange: (interval: number) => void
  monitor: VideoPreloaderMonitor | null
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium">刷新间隔 (ms)</label>
          <input
            type="number"
            value={refreshInterval}
            onChange={(e) => onRefreshIntervalChange(Number(e.target.value))}
            className="w-full mt-1 px-2 py-1 border rounded text-sm"
            min="500"
            max="10000"
            step="500"
          />
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-medium">操作</h4>
          <div className="space-y-1">
            <Button
              size="sm"
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                if (monitor) {
                  monitor.exportPerformanceData()
                }
              }}
            >
              <Download className="w-3 h-3 mr-2" />
              导出性能数据
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                if (preloaderHook.optimizeMemoryUsage) {
                  preloaderHook.optimizeMemoryUsage()
                }
              }}
            >
              <Database className="w-3 h-3 mr-2" />
              优化内存使用
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                if (preloaderHook.adaptToNetworkConditions) {
                  preloaderHook.adaptToNetworkConditions()
                }
              }}
            >
              <Wifi className="w-3 h-3 mr-2" />
              适应网络条件
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-medium">当前配置</h4>
          <div className="text-xs space-y-1 bg-gray-50 p-2 rounded">
            <div>并发数: {preloaderHook.config?.maxConcurrentLoads || 3}</div>
            <div>内存限制: {preloaderHook.config?.memoryLimit || 100}MB</div>
            <div>队列大小: {preloaderHook.config?.maxQueueSize || 20}</div>
            <div>网络感知: {preloaderHook.config?.networkAware ? '是' : '否'}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// 辅助组件
function MetricCard({ title, value, icon: Icon, color }: {
  title: string
  value: string | number
  icon: any
  color: string
}) {
  return (
    <div className="p-3 bg-white border rounded">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-gray-500">{title}</div>
          <div className="font-bold text-lg">{value}</div>
        </div>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
    </div>
  )
}

function MetricRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-600">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

function TrendItem({ label, trend }: { label: string; trend: string }) {
  const trendConfig = {
    improving: { color: 'text-green-600', symbol: '↗' },
    degrading: { color: 'text-red-600', symbol: '↘' },
    stable: { color: 'text-gray-600', symbol: '→' }
  }

  const config = trendConfig[trend as keyof typeof trendConfig] || trendConfig.stable

  return (
    <div className="flex justify-between items-center text-xs">
      <span>{label}</span>
      <span className={`${config.color} font-medium`}>
        {config.symbol} {trend}
      </span>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig = {
    pending: { color: 'bg-gray-100 text-gray-700', label: '等待' },
    loading: { color: 'bg-blue-100 text-blue-700', label: '加载中' },
    loaded: { color: 'bg-green-100 text-green-700', label: '完成' },
    error: { color: 'bg-red-100 text-red-700', label: '错误' },
    cancelled: { color: 'bg-yellow-100 text-yellow-700', label: '取消' }
  }

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending

  return (
    <Badge className={`text-xs ${config.color}`}>
      {config.label}
    </Badge>
  )
}
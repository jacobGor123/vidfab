"use client"

import { useState, useEffect } from "react"
import { FileText, ChevronLeft, ChevronRight, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import type { SubscriptionOrder } from "@/lib/subscription/types"

interface OrdersHistoryListProps {
  onError?: (error: string) => void
  onSuccess?: (message: string) => void
}

export function OrdersHistoryList({ onError, onSuccess }: OrdersHistoryListProps) {
  const [orders, setOrders] = useState<SubscriptionOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null)

  useEffect(() => {
    fetchOrders()
  }, [page])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      })

      const response = await fetch(`/api/subscription/orders?${params}`)
      const data = await response.json()

      if (data.success) {
        setOrders(data.orders || [])
        setTotalPages(data.pagination.totalPages)
      } else {
        onError?.(data.error || 'Failed to fetch orders')
      }
    } catch (error: any) {
      onError?.(error.message || 'Network error')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { label: 'Completed', className: 'bg-green-500/20 text-green-500 border-green-500/30' },
      pending: { label: 'Pending', className: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30' },
      processing: { label: 'Processing', className: 'bg-blue-500/20 text-blue-500 border-blue-500/30' },
      failed: { label: 'Failed', className: 'bg-red-500/20 text-red-500 border-red-500/30' },
      cancelled: { label: 'Cancelled', className: 'bg-gray-500/20 text-gray-500 border-gray-500/30' }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    return <Badge className={`${config.className} border`}>{config.label}</Badge>
  }

  const formatAmount = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`
  }

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to cancel this order?')) {
      return
    }

    try {
      setCancellingOrderId(orderId)
      const response = await fetch(`/api/subscription/orders/${orderId}/cancel`, {
        method: 'POST',
      })

      const data = await response.json()

      if (data.success) {
        onSuccess?.('Order cancelled successfully')
        // 刷新订单列表
        await fetchOrders()
      } else {
        onError?.(data.error || 'Failed to cancel order')
      }
    } catch (error: any) {
      onError?.(error.message || 'Network error')
    } finally {
      setCancellingOrderId(null)
    }
  }

  return (
    <Card className="bg-gray-900/50 border-gray-800 h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-500" />
          Order History
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900 min-h-0">
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse bg-gray-800 rounded-lg p-4 h-24"></div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-400">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No orders found</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto pr-2 space-y-3">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">
                        {order.plan_id.charAt(0).toUpperCase() + order.plan_id.slice(1)} Plan
                      </span>
                      {getStatusBadge(order.status)}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-white">
                        {formatAmount(order.amount_cents)}
                      </span>
                      {order.status === 'pending' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancelOrder(order.id)}
                          disabled={cancellingOrderId === order.id}
                          className="h-8 px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          title="Cancel order"
                        >
                          {cancellingOrderId === order.id ? (
                            <span className="text-xs">Cancelling...</span>
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-400">
                    <span>{order.billing_cycle === 'annual' ? 'Annual' : 'Monthly'} Subscription</span>
                    <span>{format(new Date(order.created_at), 'MMM dd, yyyy')}</span>
                  </div>
                  {order.credits_included > 0 && (
                    <div className="mt-2 text-xs text-cyan-400">
                      {order.credits_included} credits included
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* 分页 - 固定在底部 */}
            {totalPages > 1 && (
              <div className="flex-shrink-0 flex items-center justify-between mt-4 pt-4 border-t border-gray-800">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="bg-gray-800 border-gray-700 hover:bg-gray-700"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <span className="text-sm text-gray-400">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="bg-gray-800 border-gray-700 hover:bg-gray-700"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
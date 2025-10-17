"use client"

import { useState, useEffect } from "react"
import { Receipt, ChevronLeft, ChevronRight, Filter, TrendingUp, TrendingDown, RefreshCw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { format } from "date-fns"
import type { CreditsTransaction } from "@/lib/subscription/types"

interface CreditsTransactionsListProps {
  onError?: (error: string) => void
}

export function CreditsTransactionsList({ onError }: CreditsTransactionsListProps) {
  const [transactions, setTransactions] = useState<CreditsTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [typeFilter, setTypeFilter] = useState<string>('all')

  useEffect(() => {
    fetchTransactions()
  }, [page, typeFilter])

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(typeFilter !== 'all' && { type: typeFilter })
      })

      const response = await fetch(`/api/subscription/transactions?${params}`)
      const data = await response.json()

      if (data.success) {
        setTransactions(data.transactions || [])
        setTotalPages(data.pagination.totalPages)
      } else {
        onError?.(data.error || 'Failed to fetch transactions')
      }
    } catch (error: any) {
      onError?.(error.message || 'Network error')
    } finally {
      setLoading(false)
    }
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'earned':
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'spent':
        return <TrendingDown className="h-4 w-4 text-red-500" />
      case 'refunded':
        return <RefreshCw className="h-4 w-4 text-blue-500" />
      default:
        return <Receipt className="h-4 w-4 text-gray-500" />
    }
  }

  const getTransactionBadge = (type: string) => {
    const typeConfig = {
      earned: { label: 'Earned', className: 'bg-green-500/20 text-green-500 border-green-500/30' },
      spent: { label: 'Spent', className: 'bg-red-500/20 text-red-500 border-red-500/30' },
      refunded: { label: 'Refunded', className: 'bg-blue-500/20 text-blue-500 border-blue-500/30' },
      expired: { label: 'Expired', className: 'bg-gray-500/20 text-gray-500 border-gray-500/30' },
      bonus: { label: 'Bonus', className: 'bg-purple-500/20 text-purple-500 border-purple-500/30' }
    }

    const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.spent
    return <Badge className={`${config.className} border text-xs`}>{config.label}</Badge>
  }

  const formatCredits = (amount: number, type: string) => {
    const prefix = type === 'earned' || type === 'refunded' || type === 'bonus' ? '+' : '-'
    const color = type === 'earned' || type === 'refunded' || type === 'bonus' ? 'text-green-500' : 'text-red-500'
    return (
      <span className={`font-semibold ${color}`}>
        {prefix}{Math.abs(amount)}
      </span>
    )
  }

  return (
    <Card className="bg-gray-900/50 border-gray-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Receipt className="h-5 w-5 text-purple-500" />
            Credits History
          </CardTitle>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <Select value={typeFilter} onValueChange={(value) => {
              setTypeFilter(value)
              setPage(1)
            }}>
              <SelectTrigger className="w-[140px] bg-gray-800 border-gray-700">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="earned">Earned</SelectItem>
                <SelectItem value="spent">Spent</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
                <SelectItem value="bonus">Bonus</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse bg-gray-800 rounded-lg p-3 h-16"></div>
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No transactions found</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 hover:border-gray-600 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      {getTransactionIcon(transaction.transaction_type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-white truncate">
                            {transaction.description || transaction.transaction_type}
                          </span>
                          {getTransactionBadge(transaction.transaction_type)}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>{format(new Date(transaction.created_at), 'MMM dd, yyyy HH:mm')}</span>
                          {transaction.model_used && (
                            <span className="text-cyan-400">• {transaction.model_used}</span>
                          )}
                          {transaction.resolution && transaction.duration && (
                            <span>• {transaction.resolution} {transaction.duration}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-lg font-bold">
                        {formatCredits(transaction.credits_amount, transaction.transaction_type)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Balance: {transaction.balance_after}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-800">
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
          </>
        )}
      </CardContent>
    </Card>
  )
}
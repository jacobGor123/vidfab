/**
 * Video Agent Beta - 错误边界组件
 * 捕获 React 组件级别的错误，防止整个应用崩溃
 */

'use client'

import React, { Component, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: (error: Error, reset: () => void) => ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null
    }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    })
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null
    })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      // 如果提供了自定义 fallback，使用它
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset)
      }

      // 默认错误 UI
      return (
        <div className="flex items-center justify-center min-h-[400px] p-6">
          <div className="max-w-md w-full bg-slate-950/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-red-500/10 rounded-full">
                <AlertTriangle className="w-10 h-10 text-red-400" />
              </div>
            </div>

            <h3 className="text-xl font-bold text-white mb-3">
              Something went wrong
            </h3>

            <p className="text-slate-400 mb-2">
              An unexpected error occurred while rendering this component.
            </p>

            <details className="mt-4 mb-6 text-left">
              <summary className="cursor-pointer text-sm text-slate-500 hover:text-slate-400 transition-colors">
                Error details
              </summary>
              <pre className="mt-2 p-3 bg-slate-900/50 rounded-lg text-xs text-red-400 overflow-auto max-h-32">
                {this.state.error.message}
              </pre>
            </details>

            <Button
              onClick={this.handleReset}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Enhanced Error Boundary with Recovery Mechanisms
 * VidFab AI Video Platform
 */

"use client"

import React, { Component, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Bug, ChevronDown, ChevronUp } from 'lucide-react'
import { ErrorReporter, classifyError } from '@/lib/utils/error-handling'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  resetOnPropsChange?: boolean
  context?: string
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
  errorId: string | null
  retryCount: number
  showDetails: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: number | null = null
  private errorReporter = ErrorReporter.getInstance()

  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
      showDetails: false
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const errorContext = this.props.context || 'React Component'

    this.setState({
      errorInfo,
      retryCount: this.state.retryCount + 1
    })

    // Report error
    this.errorReporter.reportError({
      ...error,
      componentStack: errorInfo.componentStack,
      retryCount: this.state.retryCount
    }, errorContext)

    // Call custom error handler
    this.props.onError?.(error, errorInfo)

    // Auto-retry for certain types of errors (max 3 times)
    if (this.shouldAutoRetry(error) && this.state.retryCount < 3) {
      this.resetTimeoutId = window.setTimeout(() => {
        this.handleRetry()
      }, 1000 * Math.pow(2, this.state.retryCount)) // Exponential backoff
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetOnPropsChange } = this.props
    const { hasError } = this.state

    // Reset error boundary when props change (if enabled)
    if (hasError && resetOnPropsChange && prevProps.children !== this.props.children) {
      this.handleRetry()
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId)
    }
  }

  private shouldAutoRetry(error: Error): boolean {
    const errorInfo = classifyError(error)

    // Auto-retry for network and temporary errors
    return errorInfo.type === 'network' ||
           errorInfo.type === 'server' ||
           error.message.includes('Loading chunk') ||
           error.message.includes('dynamically imported module')
  }

  private handleRetry = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId)
      this.resetTimeoutId = null
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      showDetails: false
    })
  }

  private handleReload = () => {
    window.location.reload()
  }

  private toggleDetails = () => {
    this.setState(prev => ({
      showDetails: !prev.showDetails
    }))
  }

  private getErrorMessage(error: Error): string {
    const errorInfo = classifyError(error)
    return errorInfo.userMessage
  }

  private getErrorType(error: Error): string {
    const errorInfo = classifyError(error)
    return errorInfo.type
  }

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      const error = this.state.error
      const errorMessage = this.getErrorMessage(error)
      const errorType = this.getErrorType(error)
      const isRetryable = classifyError(error).isRetryable

      return (
        <div className="flex items-center justify-center min-h-[400px] p-6">
          <Card className="w-full max-w-lg bg-gray-950 border-gray-800">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <CardTitle className="text-xl text-white">Something went wrong</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="text-center">
                <p className="text-gray-400 mb-4">{errorMessage}</p>

                <div className="flex flex-wrap justify-center gap-2 mb-4">
                  <span className="px-2 py-1 bg-gray-800 text-gray-300 rounded text-xs">
                    Type: {errorType}
                  </span>
                  <span className="px-2 py-1 bg-gray-800 text-gray-300 rounded text-xs">
                    ID: {this.state.errorId}
                  </span>
                  {this.state.retryCount > 0 && (
                    <span className="px-2 py-1 bg-orange-600/20 text-orange-400 rounded text-xs">
                      Retry: {this.state.retryCount}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                {isRetryable && (
                  <Button
                    onClick={this.handleRetry}
                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={this.handleReload}
                  className="flex-1 border-gray-600 text-gray-300"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reload Page
                </Button>
              </div>

              {/* Error details toggle */}
              <div className="pt-2 border-t border-gray-800">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={this.toggleDetails}
                  className="w-full text-gray-400 hover:text-gray-300"
                >
                  <Bug className="w-4 h-4 mr-2" />
                  {this.state.showDetails ? 'Hide' : 'Show'} Technical Details
                  {this.state.showDetails ?
                    <ChevronUp className="w-4 h-4 ml-2" /> :
                    <ChevronDown className="w-4 h-4 ml-2" />
                  }
                </Button>

                {this.state.showDetails && (
                  <div className="mt-3 p-3 bg-gray-900 rounded text-xs">
                    <div className="space-y-2">
                      <div>
                        <span className="text-red-400 font-mono">Error:</span>
                        <pre className="text-gray-300 mt-1 whitespace-pre-wrap break-words">
                          {error.stack || error.message}
                        </pre>
                      </div>

                      {this.state.errorInfo && (
                        <div>
                          <span className="text-blue-400 font-mono">Component Stack:</span>
                          <pre className="text-gray-300 mt-1 whitespace-pre-wrap break-words">
                            {this.state.errorInfo.componentStack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="text-center text-xs text-gray-500">
                If this problem persists, please contact support with error ID: {this.state.errorId}
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// HOC for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  return WrappedComponent
}

// Hook for error recovery in functional components
export function useErrorRecovery() {
  const [error, setError] = React.useState<Error | null>(null)
  const errorReporter = React.useMemo(() => ErrorReporter.getInstance(), [])

  const reportError = React.useCallback((error: Error, context: string = 'Component') => {
    setError(error)
    errorReporter.reportError(error, context)
  }, [errorReporter])

  const clearError = React.useCallback(() => {
    setError(null)
  }, [])

  const retry = React.useCallback((operation: () => void | Promise<void>) => {
    clearError()
    try {
      const result = operation()
      if (result instanceof Promise) {
        result.catch(error => reportError(error, 'Retry operation'))
      }
    } catch (error) {
      reportError(error as Error, 'Retry operation')
    }
  }, [clearError, reportError])

  return {
    error,
    reportError,
    clearError,
    retry,
    hasError: error !== null
  }
}
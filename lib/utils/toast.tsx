/**
 * Toast 和 Confirm 对话框工具函数
 * 使用 Sonner 提供美观的 toast 通知和确认对话框
 */

import { toast as sonnerToast } from 'sonner'

/**
 * 显示成功提示
 */
export function showSuccess(message: string, duration: number = 3000) {
  sonnerToast.success(message, { duration })
}

/**
 * 显示错误提示
 */
export function showError(message: string, duration: number = 5000) {
  sonnerToast.error(message, { duration })
}

/**
 * 显示信息提示
 */
export function showInfo(message: string, duration: number = 3000) {
  sonnerToast.info(message, { duration })
}

/**
 * 显示警告提示
 */
export function showWarning(message: string, duration: number = 4000) {
  sonnerToast.warning(message, { duration })
}

/**
 * 显示确认对话框（Promise 版本）
 * 返回 Promise<boolean>，用户确认返回 true，取消返回 false
 */
export function showConfirm(
  message: string,
  options?: {
    title?: string
    confirmText?: string
    cancelText?: string
  }
): Promise<boolean> {
  return new Promise((resolve) => {
    const title = options?.title || 'Confirm'
    const confirmText = options?.confirmText || 'Confirm'
    const cancelText = options?.cancelText || 'Cancel'

    let resolved = false

    const handleConfirm = (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (!resolved) {
        resolved = true
        sonnerToast.dismiss(toastId)
        resolve(true)
      }
    }

    const handleCancel = (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (!resolved) {
        resolved = true
        sonnerToast.dismiss(toastId)
        resolve(false)
      }
    }

    const toastId = sonnerToast.custom(
      (t) => (
        <div
          style={{
            width: '100%',
            maxWidth: '400px',
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
            padding: '16px',
            pointerEvents: 'auto'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <h3 style={{
                fontWeight: '600',
                color: '#ffffff',
                margin: 0,
                fontSize: '14px'
              }}>{title}</h3>
              <p style={{
                fontSize: '13px',
                color: '#cbd5e1',
                margin: 0
              }}>{message}</p>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={handleCancel}
                style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: '500',
                  color: '#cbd5e1',
                  backgroundColor: '#334155',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  pointerEvents: 'auto'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#475569'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#334155'}
              >
                {cancelText}
              </button>
              <button
                onClick={handleConfirm}
                style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: '500',
                  color: '#ffffff',
                  backgroundColor: '#2563eb',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  pointerEvents: 'auto'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
              >
                {confirmText}
              </button>
            </div>
          </div>
        </div>
      ),
      {
        duration: Infinity,
        position: 'top-center',
        unstyled: true
      }
    )

    // 超时自动取消
    setTimeout(() => {
      if (!resolved) {
        resolved = true
        sonnerToast.dismiss(toastId)
        resolve(false)
      }
    }, 30000)
  })
}

/**
 * 显示加载中提示
 * 返回一个函数，调用后关闭加载提示
 */
export function showLoading(message: string = 'Loading...') {
  const toastId = sonnerToast.loading(message)
  return () => sonnerToast.dismiss(toastId)
}

/**
 * 显示 Promise toast（自动处理 loading/success/error 状态）
 */
export function showPromise<T>(
  promise: Promise<T>,
  messages: {
    loading: string
    success: string | ((data: T) => string)
    error: string | ((error: any) => string)
  }
) {
  return sonnerToast.promise(promise, messages)
}

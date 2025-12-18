/**
 * Toast 和 Confirm 对话框工具函数
 * 使用 Sonner 提供美观的 toast 通知和确认对话框
 */

import { toast as sonnerToast } from 'sonner'

/**
 * 显示成功提示
 */
export function showSuccess(message: string) {
  sonnerToast.success(message)
}

/**
 * 显示错误提示
 */
export function showError(message: string) {
  sonnerToast.error(message)
}

/**
 * 显示信息提示
 */
export function showInfo(message: string) {
  sonnerToast.info(message)
}

/**
 * 显示警告提示
 */
export function showWarning(message: string) {
  sonnerToast.warning(message)
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
    sonnerToast(options?.title || 'Confirm', {
      description: message,
      action: {
        label: options?.confirmText || 'Confirm',
        onClick: () => resolve(true)
      },
      cancel: {
        label: options?.cancelText || 'Cancel',
        onClick: () => resolve(false)
      },
      duration: Infinity,  // 不自动关闭
    })

    // 如果用户没有点击任何按钮（如点击外部关闭），5 秒后自动取消
    setTimeout(() => {
      resolve(false)
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

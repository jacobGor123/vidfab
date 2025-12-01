/**
 * 全局积分事件系统
 * 用于在积分变化时通知所有监听者
 */

export const CREDITS_UPDATED_EVENT = 'vidfab:credits-updated';

/**
 * 触发积分更新事件
 * @param reason 更新原因 (例如: 'video-generated', 'image-generated', 'refund')
 */
export function emitCreditsUpdated(reason?: string) {
  if (typeof window === 'undefined') return;

  const event = new CustomEvent(CREDITS_UPDATED_EVENT, {
    detail: {
      reason,
      timestamp: Date.now(),
    },
  });

  window.dispatchEvent(event);

  // 输出调试信息
  if (process.env.NODE_ENV === 'development') {
    console.log('[Credits Event] Credits updated:', reason);
  }
}

/**
 * 监听积分更新事件
 * @param callback 回调函数
 * @returns 取消监听的函数
 */
export function onCreditsUpdated(callback: (detail?: any) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handler = (event: Event) => {
    const customEvent = event as CustomEvent;
    callback(customEvent.detail);
  };

  window.addEventListener(CREDITS_UPDATED_EVENT, handler);

  // 返回清理函数
  return () => {
    window.removeEventListener(CREDITS_UPDATED_EVENT, handler);
  };
}

/**
 * 延迟触发积分更新 (用于批量操作)
 * @param reason 更新原因
 * @param delayMs 延迟毫秒数 (默认 300ms)
 */
let updateTimeout: NodeJS.Timeout | null = null;

export function emitCreditsUpdatedDebounced(reason?: string, delayMs = 300) {
  if (updateTimeout) {
    clearTimeout(updateTimeout);
  }

  updateTimeout = setTimeout(() => {
    emitCreditsUpdated(reason);
    updateTimeout = null;
  }, delayMs);
}

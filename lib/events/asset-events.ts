/**
 * 全局资产事件系统
 * 用于在新视频/图片入库后通知 MyAssets 刷新
 */

export const ASSET_STORED_EVENT = 'vidfab:asset-stored'

export function emitAssetStored(type: 'video' | 'image') {
  if (typeof window === 'undefined') return

  window.dispatchEvent(new CustomEvent(ASSET_STORED_EVENT, {
    detail: { type, timestamp: Date.now() }
  }))
}

export function onAssetStored(callback: (detail?: any) => void): () => void {
  if (typeof window === 'undefined') return () => {}

  const handler = (event: Event) => {
    callback((event as CustomEvent).detail)
  }

  window.addEventListener(ASSET_STORED_EVENT, handler)
  return () => window.removeEventListener(ASSET_STORED_EVENT, handler)
}

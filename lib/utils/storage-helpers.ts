/**
 * Storage Utility Functions
 * 存储相关的工具函数，确保精确的大小计算和转换
 */

export class StorageUtils {
  // 精确的字节转换常量
  static readonly BYTES_PER_KB = 1024
  static readonly BYTES_PER_MB = 1024 * 1024
  static readonly BYTES_PER_GB = 1024 * 1024 * 1024

  // 免费用户和订阅用户的存储限制
  static readonly FREE_USER_LIMIT_MB = 100
  static readonly SUBSCRIBED_USER_LIMIT_MB = 1024 // 1GB

  /**
   * 将字节转换为MB，保留指定小数位
   */
  static bytesToMB(bytes: number, decimals: number = 2): number {
    if (bytes === 0) return 0
    return Math.round((bytes / this.BYTES_PER_MB) * Math.pow(10, decimals)) / Math.pow(10, decimals)
  }

  /**
   * 将字节转换为GB，保留指定小数位
   */
  static bytesToGB(bytes: number, decimals: number = 2): number {
    if (bytes === 0) return 0
    return Math.round((bytes / this.BYTES_PER_GB) * Math.pow(10, decimals)) / Math.pow(10, decimals)
  }

  /**
   * 将MB转换为字节
   */
  static mbToBytes(mb: number): number {
    return Math.round(mb * this.BYTES_PER_MB)
  }

  /**
   * 将GB转换为字节
   */
  static gbToBytes(gb: number): number {
    return Math.round(gb * this.BYTES_PER_GB)
  }

  /**
   * 获取用户的存储限制（字节）
   */
  static getUserStorageLimit(isSubscribed: boolean): number {
    return isSubscribed
      ? this.mbToBytes(this.SUBSCRIBED_USER_LIMIT_MB)
      : this.mbToBytes(this.FREE_USER_LIMIT_MB)
  }

  /**
   * 获取用户的存储限制（MB）
   */
  static getUserStorageLimitMB(isSubscribed: boolean): number {
    return isSubscribed ? this.SUBSCRIBED_USER_LIMIT_MB : this.FREE_USER_LIMIT_MB
  }

  /**
   * 计算存储使用百分比
   */
  static calculateStoragePercentage(usedBytes: number, limitBytes: number): number {
    if (limitBytes === 0) return 0
    return Math.round((usedBytes / limitBytes) * 100 * 10) / 10 // 保留1位小数
  }

  /**
   * 检查存储是否超限
   */
  static isStorageExceeded(usedBytes: number, limitBytes: number): boolean {
    return usedBytes > limitBytes
  }

  /**
   * 检查存储是否接近限制（默认80%以上）
   */
  static isStorageNearLimit(usedBytes: number, limitBytes: number, threshold: number = 80): boolean {
    const percentage = this.calculateStoragePercentage(usedBytes, limitBytes)
    return percentage >= threshold
  }

  /**
   * 格式化存储大小显示
   */
  static formatStorageSize(bytes: number, unit: 'auto' | 'B' | 'KB' | 'MB' | 'GB' = 'auto'): string {
    if (bytes === 0) return '0 B'

    switch (unit) {
      case 'B':
        return `${bytes} B`
      case 'KB':
        return `${this.bytesToMB(bytes * 1024, 0)} KB`
      case 'MB':
        return `${this.bytesToMB(bytes, 1)} MB`
      case 'GB':
        return `${this.bytesToGB(bytes, 2)} GB`
      case 'auto':
      default:
        if (bytes >= this.BYTES_PER_GB) {
          return `${this.bytesToGB(bytes, 2)} GB`
        } else if (bytes >= this.BYTES_PER_MB) {
          return `${this.bytesToMB(bytes, 1)} MB`
        } else if (bytes >= this.BYTES_PER_KB) {
          return `${Math.round(bytes / this.BYTES_PER_KB)} KB`
        } else {
          return `${bytes} B`
        }
    }
  }

  /**
   * 验证文件大小是否符合上传限制
   */
  static validateUploadSize(
    fileSize: number,
    currentUsage: number,
    storageLimit: number
  ): {
    canUpload: boolean
    reason?: string
    recommendedAction?: string
  } {
    if (fileSize <= 0) {
      return {
        canUpload: false,
        reason: '文件大小无效',
        recommendedAction: '请选择有效的文件'
      }
    }

    if (currentUsage + fileSize > storageLimit) {
      const exceededBy = (currentUsage + fileSize) - storageLimit
      return {
        canUpload: false,
        reason: `存储空间不足，超出 ${this.formatStorageSize(exceededBy)}`,
        recommendedAction: '请删除一些旧视频或升级到Pro账户'
      }
    }

    // 检查是否会接近限制
    const afterUploadPercentage = this.calculateStoragePercentage(
      currentUsage + fileSize,
      storageLimit
    )

    if (afterUploadPercentage > 90) {
      return {
        canUpload: true,
        reason: `上传后将使用 ${afterUploadPercentage.toFixed(1)}% 存储空间`,
        recommendedAction: '建议考虑清理旧视频或升级账户'
      }
    }

    return { canUpload: true }
  }

  /**
   * 计算需要删除多少数据才能容纳新文件
   */
  static calculateRequiredCleanup(
    fileSize: number,
    currentUsage: number,
    storageLimit: number,
    bufferPercentage: number = 10
  ): number {
    const targetUsage = storageLimit * (1 - bufferPercentage / 100)
    const requiredSpace = (currentUsage + fileSize) - targetUsage
    return Math.max(0, requiredSpace)
  }

  /**
   * 生成存储状态报告
   */
  static generateStorageReport(
    currentUsage: number,
    storageLimit: number,
    isSubscribed: boolean
  ): {
    usedMB: number
    limitMB: number
    usedGB: number
    limitGB: number
    percentage: number
    status: 'normal' | 'warning' | 'critical'
    message: string
    recommendations: string[]
  } {
    const usedMB = this.bytesToMB(currentUsage)
    const limitMB = this.bytesToMB(storageLimit)
    const usedGB = this.bytesToGB(currentUsage)
    const limitGB = this.bytesToGB(storageLimit)
    const percentage = this.calculateStoragePercentage(currentUsage, storageLimit)

    let status: 'normal' | 'warning' | 'critical'
    let message: string
    const recommendations: string[] = []

    if (percentage >= 95) {
      status = 'critical'
      message = '存储空间即将用尽'
      recommendations.push('立即删除不需要的视频')
      if (!isSubscribed) {
        recommendations.push('考虑升级到Pro账户获得更多存储空间')
      }
    } else if (percentage >= 80) {
      status = 'warning'
      message = '存储空间使用量较高'
      recommendations.push('考虑删除一些旧视频')
      if (!isSubscribed) {
        recommendations.push('升级到Pro账户可获得10倍存储空间')
      }
    } else {
      status = 'normal'
      message = '存储空间充足'
      if (!isSubscribed && percentage > 50) {
        recommendations.push('升级到Pro账户可获得更多功能和存储空间')
      }
    }

    return {
      usedMB,
      limitMB,
      usedGB,
      limitGB,
      percentage,
      status,
      message,
      recommendations
    }
  }
}

/**
 * React Hook for storage utilities
 */
export function useStorageUtils() {
  return {
    bytesToMB: StorageUtils.bytesToMB,
    bytesToGB: StorageUtils.bytesToGB,
    mbToBytes: StorageUtils.mbToBytes,
    gbToBytes: StorageUtils.gbToBytes,
    formatStorageSize: StorageUtils.formatStorageSize,
    calculateStoragePercentage: StorageUtils.calculateStoragePercentage,
    isStorageExceeded: StorageUtils.isStorageExceeded,
    isStorageNearLimit: StorageUtils.isStorageNearLimit,
    validateUploadSize: StorageUtils.validateUploadSize,
    generateStorageReport: StorageUtils.generateStorageReport,
    getUserStorageLimit: StorageUtils.getUserStorageLimit,
    getUserStorageLimitMB: StorageUtils.getUserStorageLimitMB
  }
}
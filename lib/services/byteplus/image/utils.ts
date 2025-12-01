/**
 * BytePlus Image API 工具函数
 */

/**
 * 将 AspectRatio 转换为 BytePlus Size 格式
 * 根据 BytePlus 文档的推荐尺寸表
 */
export function convertAspectRatioToSize(aspectRatio: string): string {
  const sizeMap: Record<string, string> = {
    "1:1": "2048x2048",
    "16:9": "2560x1440",
    "9:16": "1440x2560",
    "3:2": "2496x1664",
    "2:3": "1664x2496",
    "3:4": "1728x2304",
    "4:3": "2304x1728",
    "4:5": "1728x2160",
    "5:4": "2160x1728",
    "21:9": "3024x1296"
  }
  return sizeMap[aspectRatio] || "2048x2048"
}

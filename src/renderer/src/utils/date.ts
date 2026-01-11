/**
 * 日期时间工具函数
 * 提供日期格式化和时间转换功能
 */

/**
 * 将时间戳转换为可读日期时间字符串
 * @param timestamp 时间戳（秒）
 * @returns 格式化的日期时间字符串
 */
export function formatTimestamp(timestamp: number | undefined | null): string {
  if (!timestamp) return '--';

  try {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('格式化时间戳失败:', error);
    return '--';
  }
}

/**
 * 格式化恢复时间
 * @param timestamp 目标时间戳（秒）
 * @returns 格式化的剩余时间字符串
 */
export function formatRecoveryTime(timestamp: number | undefined | null): string {
  if (!timestamp) return '--';

  try {
    const now = Math.floor(Date.now() / 1000);
    const target = timestamp;
    const diff = target - now;

    if (diff <= 0) return '已回满';

    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;

    if (hours > 0) {
      return `${hours}时${minutes}分`;
    } else if (minutes > 0) {
      return `${minutes}分${seconds}秒`;
    } else {
      return `${seconds}秒`;
    }
  } catch (error) {
    console.error('格式化恢复时间失败:', error);
    return '--';
  }
}

/**
 * 从秒数格式化时间
 * @param seconds 秒数
 * @returns 格式化的时间字符串
 */
export function formatSeconds(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

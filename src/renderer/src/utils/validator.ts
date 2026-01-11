/**
 * 数据验证工具函数
 * 提供各种数据验证功能
 */

/**
 * 验证是否为有效的 URL
 * @param url 要验证的 URL
 * @returns 是否有效
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * 验证是否为有效的邮箱地址
 * @param email 要验证的邮箱
 * @returns 是否有效
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 验证是否为有效的手机号（中国）
 * @param phone 要验证的手机号
 * @returns 是否有效
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
}

/**
 * 验证字符串是否为空或只包含空白字符
 * @param str 要验证的字符串
 * @returns 是否为空
 */
export function isEmptyString(str: string | null | undefined): boolean {
  return !str || str.trim().length === 0;
}

/**
 * 验证数字是否在指定范围内
 * @param num 要验证的数字
 * @param min 最小值
 * @param max 最大值
 * @returns 是否在范围内
 */
export function isNumberInRange(num: number, min: number, max: number): boolean {
  return typeof num === 'number' && num >= min && num <= max;
}

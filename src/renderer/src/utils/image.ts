/**
 * 图片 URL 处理工具函数
 */

const AVATAR_BASE_URL = 'https://raw.githubusercontent.com/yuanyan3060/ArknightsGameResource/main/avatar';
const PORTRAIT_BASE_URL = 'https://raw.githubusercontent.com/yuanyan3060/ArknightsGameResource/main/portrait';

/**
 * 处理图片 URL，处理协议前缀和相对路径
 * @param url 原始 URL
 * @returns 处理后的 URL
 */
export function processImageUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('//')) return `https:${url}`;
  if (url.startsWith('/')) return `https://web.hycdn.cn${url}`;
  return url.trim();
}

/**
 * 获取干员头像 URL
 * @param charId 干员ID (如 char_001)
 * @returns 头像 URL
 */
export function getOperatorAvatarUrl(charId: string): string {
  if (!charId) return '';
  return `${AVATAR_BASE_URL}/${charId}.png`;
}

/**
 * 获取干员半身像 URL
 * @param charId 干员ID
 * @param evolvePhase 精英化阶段 (0=未精英, 1=精一, 2=精二)
 * @returns 半身像 URL
 */
export function getOperatorPortraitUrl(charId: string, evolvePhase: number = 0): string {
  if (!charId) return '';
  return `${PORTRAIT_BASE_URL}/${charId}_${evolvePhase}.png`;
}

/**
 * 获取皮肤头像 URL
 * @param skin 皮肤标识 (如 char_1001_amiya2_1)
 * @returns 头像 URL
 */
export function getSkinAvatarUrl(skin: string): string {
  if (!skin) return '';
  return `${AVATAR_BASE_URL}/${skin}.png`;
}

/**
 * 处理图片加载错误
 */
export function handleImageError(charId: string | undefined, imageType: string, event: Event): void {
  const target = event.target as HTMLImageElement;
  console.log(`${imageType} load error:`, charId, target.src);
  target.style.display = 'none';
}

/**
 * 处理图片加载成功
 */
export function handleImageLoad(charId: string | undefined, imageType: string): void {
  console.log(`${imageType} loaded:`, charId);
}

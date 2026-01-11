/**
 * 图片处理相关的 Vue Composable
 * 提供图片加载、错误处理等功能
 */

/**
 * 使用图片功能的 composable
 * @returns 图片相关方法
 */
export function useImage() {
  /**
   * 处理图片加载错误
   * @param charId 干员ID（用于日志）
   * @param imageType 图片类型（用于日志）
   * @param event 错误事件
   */
  const handleImageError = (
    charId: string | undefined,
    imageType: string,
    event: Event
  ) => {
    const target = event.target as HTMLImageElement;
    console.log(`${imageType} load error:`, charId, target.src);
    target.style.display = 'none';
  };

  /**
   * 处理图片加载成功
   * @param charId 干员ID（用于日志）
   * @param imageType 图片类型（用于日志）
   */
  const handleImageLoad = (
    charId: string | undefined,
    imageType: string
  ) => {
    console.log(`${imageType} loaded:`, charId);
  };

  /**
   * 处理图片 URL，处理可能的问题
   * @param url 原始 URL
   * @returns 处理后的 URL
   */
  const processImageUrl = (url: string | undefined | null): string => {
    if (!url) return '';

    try {
      // 处理空格等特殊字符
      return url.trim();
    } catch (error) {
      console.error('处理图片 URL 失败:', error);
      return '';
    }
  };

  return {
    handleImageError,
    handleImageLoad,
    processImageUrl
  };
}

/**
 * 复制功能的 Vue Composable
 * 基于纯工具函数封装，提供带 toast 提示的便捷方法
 */
import { copyToClipboard } from '@utils/copy';
import { showSuccess, showError } from '@services/toastService';

/**
 * 使用复制功能的 composable
 * @returns 复制函数
 */
export function useCopy() {
  /**
   * 复制文本并显示提示
   * @param text 要复制的文本
   * @param itemName 复制项的名称（用于提示）
   * @returns 是否复制成功
   */
  const copyWithToast = async (
    text: string,
    itemName: string = '内容'
  ): Promise<boolean> => {
    if (!text || text.trim() === '') {
      showError(`${itemName}为空，无法复制`);
      return false;
    }

    try {
      const success = await copyToClipboard(text, itemName);
      if (success) {
        showSuccess(`已复制${itemName}`);
        return true;
      } else {
        showError(`复制失败，请手动复制${itemName}`);
        return false;
      }
    } catch (error) {
      console.error('复制过程中发生异常:', error);
      showError(`复制失败: ${error instanceof Error ? error.message : '未知错误'}`);
      return false;
    }
  };

  /**
   * 复制文本但不显示提示
   * @param text 要复制的文本
   * @param itemName 复制项的名称（用于日志）
   * @returns 是否复制成功
   */
  const copySilent = async (
    text: string,
    itemName: string = '内容'
  ): Promise<boolean> => {
    if (!text || text.trim() === '') {
      return false;
    }

    try {
      return await copyToClipboard(text, itemName);
    } catch (error) {
      console.error('复制失败:', error);
      return false;
    }
  };

  return {
    copyWithToast,
    copySilent
  };
}

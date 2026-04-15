/**
 * 复制功能的 Vue Composable
 */
import { copyToClipboard as copyToClipboardUtil } from '@utils/copy';
import { showSuccess, showError } from '@services/toastService';

export function useCopy() {
  const copyWithToast = async (text: string, itemName: string = '内容'): Promise<boolean> => {
    if (!text?.trim()) {
      showError(`${itemName}为空，无法复制`);
      return false;
    }
    try {
      const success = await copyToClipboardUtil(text, itemName);
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

  const copySilent = async (text: string, itemName: string = '内容'): Promise<boolean> => {
    if (!text?.trim()) return false;
    try {
      return await copyToClipboardUtil(text, itemName);
    } catch (error) {
      console.error('复制失败:', error);
      return false;
    }
  };

  const copyToClipboard = async (text: string): Promise<boolean> => {
    return await copyToClipboardUtil(text);
  };

  return {
    copyWithToast,
    copySilent,
    copyToClipboard
  };
}

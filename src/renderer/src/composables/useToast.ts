/**
 * Toast 提示功能的 Vue Composable
 * 封装 toast 服务，提供更便捷的调用方式
 */
import { showSuccess, showError, showWarning, showInfo } from '@services/toastService';

/**
 * 使用 toast 提示的 composable
 * @returns toast 方法
 */
export function useToast() {
  return {
    /**
     * 显示成功提示
     */
    success: showSuccess,

    /**
     * 显示错误提示
     */
    error: showError,

    /**
     * 显示警告提示
     */
    warning: showWarning,

    /**
     * 显示信息提示
     */
    info: showInfo
  };
}

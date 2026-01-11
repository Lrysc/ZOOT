/**
 * 组件通用类型定义
 */

/**
 * 卡片数据项
 */
export interface DataItem {
  label: string;
  value: string | number;
}

/**
 * 菜单项
 */
export interface MenuItem {
  label: string;
  action: string;
  icon?: string;
  disabled?: boolean;
  divider?: boolean;
}

/**
 * 分页信息
 */
export interface PaginationInfo {
  current: number;
  total: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * 加载状态
 */
export interface LoadingState {
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
}

/**
 * 表单验证结果
 */
export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

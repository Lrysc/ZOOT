/**
 * 通用类型定义
 */

// ============================================================================
// 组件通用类型
// ============================================================================

export interface DataItem {
  label: string
  value: string | number
}

export interface MenuItem {
  label: string
  action: string
  icon?: string
  disabled?: boolean
  divider?: boolean
}

export interface PaginationInfo {
  current: number
  total: number
  pageSize: number
  hasMore: boolean
}

export interface LoadingState {
  isLoading: boolean
  isRefreshing: boolean
  error: string | null
}

export interface ValidationResult {
  isValid: boolean
  errors: Record<string, string>
}

// ============================================================================
// Toast 通知
// ============================================================================

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastOptions {
  /** 提示类型 */
  type?: ToastType
  /** 显示时长（毫秒） */
  duration?: number
  /** 位置（保留参数，为未来扩展准备） */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
}

export interface ToastState {
  /** 是否可见 */
  visible: boolean
  /** 消息内容 */
  message: string
  /** 提示类型 */
  type: ToastType
  /** 是否正在退出动画 */
  leaving: boolean
}

// ============================================================================
// 日志
// ============================================================================

export type LogLevelString = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'

export interface LogEntry {
  timestamp: string
  level: LogLevelString
  message: string
  context?: unknown
  stack?: string
}

export interface LogExportMeta {
  app: string
  version: string
  exportTime: string
  userAgent: string
  platform: string
  logCount: number
}

export interface LogExportData {
  meta: LogExportMeta
  logs: LogEntry[]
}

// ============================================================================
// 更新
// ============================================================================

export interface UpdateInfo {
  hasUpdate: boolean
  currentVersion: string
  latestVersion: string
  releaseInfo?: {
    tag_name: string
    name: string
    body: string
    published_at: string
    html_url: string
    assets: Array<{
      name: string
      browser_download_url: string
      size: number
    }>
  }
}

// ============================================================================
// 时间格式化
// ============================================================================

export interface FormatTimestampOptions {
  emptyValue?: string
  enableValidation?: boolean
}

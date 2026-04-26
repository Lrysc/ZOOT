/**
 * 日志管理工具
 */
import { ref, computed } from 'vue'
import { logger, type LogEntry } from '@services/logger'
import { showSuccess, showError } from '@utils/toast'
import { downloadFile } from '@utils/copy'

// ============ 响应式状态 ============

const logs = ref<LogEntry[]>([])
const showManualCopyModal = ref(false)
const manualCopyContent = ref('')
const manualCopyTextarea = ref<HTMLTextAreaElement>()
const showClearConfirmModal = ref(false)
const modalState = ref<'opening' | 'closing' | 'idle'>('idle')

// ============ 计算属性 ============

const logCount = computed(() => logs.value.length)

// 兼容旧模板
const isOpening = computed(() => modalState.value === 'opening')
const isClosing = computed(() => modalState.value === 'closing')

const lastLogTime = computed(() => {
  if (logs.value.length === 0) return '无日志记录'
  const lastTimestamp = logs.value[logs.value.length - 1].timestamp
  return new Date(lastTimestamp).toLocaleString('zh-CN')
})

// ============ 日志操作 ============

export const loadLogs = () => {
  logs.value = logger.getLogs()
}

export const copyLogsToClipboard = async () => {
  try {
    const logText = logger.exportLogs()
    if (!logText?.trim()) {
      showError('没有可复制的日志内容')
      return
    }
    if (logText.length > 100000 && !confirm('日志内容较大，是否继续复制？')) return

    await navigator.clipboard.writeText(logText)
    showSuccess('日志已复制到剪贴板')
    logger.info('用户复制了日志到剪贴板', { logCount: logCount.value })
  } catch (error) {
    console.error('复制日志失败:', error)
    showError('复制日志失败，请尝试导出日志文件')
  }
}

export const exportLogs = (type: 'txt' | 'json' = 'txt') => {
  try {
    const content = type === 'json' ? logger.exportAsJson() : logger.exportLogs()
    const ext = type === 'json' ? 'json' : 'txt'
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    downloadFile(content, `ZOOT-System-logs-${timestamp}.${ext}`, `text/${ext}`)
    showSuccess(`${type === 'json' ? 'JSON' : ''}日志导出成功`)
    logger.info(`用户导出了${type === 'json' ? 'JSON' : ''}日志文件`, { logCount: logCount.value })
  } catch (error) {
    console.error('导出日志失败:', error)
    showError('导出日志失败')
  }
}

export const exportLogsAsJson = () => exportLogs('json')

// ============ 模态框操作 ============

export const selectAllText = () => {
  manualCopyTextarea.value?.select()
  manualCopyTextarea.value?.focus()
}

export const closeManualCopyModal = () => {
  showManualCopyModal.value = false
  manualCopyContent.value = ''
}

// ============ 清除确认 ============

export const showClearConfirm = () => {
  showClearConfirmModal.value = true
  modalState.value = 'opening'
  setTimeout(() => { modalState.value = 'idle' }, 600)
}

export const confirmClear = () => {
  modalState.value = 'closing'
  setTimeout(() => {
    logger.clearLogs()
    loadLogs()
    showClearConfirmModal.value = false
    modalState.value = 'idle'
    showSuccess('日志已清除')
    logger.info('用户清除了所有日志', { clearedCount: logCount.value })
  }, 500)
}

export const cancelClear = () => {
  modalState.value = 'closing'
  setTimeout(() => {
    showClearConfirmModal.value = false
    modalState.value = 'idle'
  }, 500)
}

// ============ 导出 ============

export const logUtils = {
  logs,
  logCount,
  lastLogTime,
  showManualCopyModal,
  manualCopyContent,
  manualCopyTextarea,
  showClearConfirmModal,
  modalState,
  isOpening,
  isClosing,
  loadLogs,
  copyLogsToClipboard,
  exportLogs,
  exportLogsAsJson,
  selectAllText,
  closeManualCopyModal,
  showClearConfirm,
  confirmClear,
  cancelClear
}

export type LogUtils = typeof logUtils

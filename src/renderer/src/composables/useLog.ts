import { ref, computed } from 'vue'
import { logger, type LogEntry } from '@services/logger'
import { showSuccess, showError } from '@services/toastService'
import { downloadFile } from '@utils/copy'

export function useLog() {
  // 日志数据
  const logs = ref<LogEntry[]>([])
  const showManualCopyModal = ref(false)
  const manualCopyContent = ref('')
  const manualCopyTextarea = ref<HTMLTextAreaElement>()
  const showClearConfirmModal = ref(false)
  const isOpening = ref(false)
  const isClosing = ref(false)

  const logCount = computed(() => logs.value.length)

  const lastLogTime = computed(() => {
    if (logs.value.length === 0) return '无日志记录'
    const lastTimestamp = logs.value[logs.value.length - 1].timestamp
    return new Date(lastTimestamp).toLocaleString('zh-CN')
  })

  // 加载日志
  const loadLogs = () => {
    logs.value = logger.getLogs()
  }

  // 复制日志到剪贴板
  const copyLogsToClipboard = async () => {
    try {
      const logText = logger.exportLogs()
      if (!logText?.trim()) {
        showError('没有可复制的日志内容')
        return
      }

      if (logText.length > 100000) {
        if (!confirm('日志内容较大，是否继续复制？')) return
      }

      const success = await navigator.clipboard.writeText(logText)
      if (success) {
        showSuccess('日志已复制到剪贴板')
        logger.info('用户复制了日志到剪贴板', { logCount: logCount.value })
      }
    } catch (error) {
      console.error('复制日志失败:', error)
      showError('复制日志失败，请尝试导出日志文件')
    }
  }

  // 导出日志为文本
  const exportLogs = () => {
    try {
      const logText = logger.exportLogs()
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      downloadFile(logText, `ZOOT-System-logs-${timestamp}.txt`, 'text/plain')
      showSuccess('日志导出成功')
      logger.info('用户导出了日志文件', { logCount: logCount.value })
    } catch (error) {
      console.error('导出日志失败:', error)
      showError('导出日志失败')
    }
  }

  // 导出日志为JSON
  const exportLogsAsJson = () => {
    try {
      const jsonData = logger.exportAsJson()
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      downloadFile(jsonData, `ZOOT-System-logs-${timestamp}.json`, 'application/json')
      showSuccess('JSON日志导出成功')
      logger.info('用户导出了JSON格式日志', { logCount: logCount.value })
    } catch (error) {
      console.error('导出JSON日志失败:', error)
      showError('导出JSON日志失败')
    }
  }

  // 选择所有文本
  const selectAllText = () => {
    manualCopyTextarea.value?.select()
    manualCopyTextarea.value?.focus()
  }

  // 关闭手动复制模态框
  const closeManualCopyModal = () => {
    showManualCopyModal.value = false
    manualCopyContent.value = ''
  }

  // 显示清除确认
  const showClearConfirm = () => {
    showClearConfirmModal.value = true
    isOpening.value = true
    isClosing.value = false
    setTimeout(() => { isOpening.value = false }, 600)
  }

  // 确认清除
  const confirmClear = () => {
    isClosing.value = true
    isOpening.value = false
    setTimeout(() => {
      const clearedCount = logCount.value
      logger.clearLogs()
      loadLogs()
      showClearConfirmModal.value = false
      isClosing.value = false
      showSuccess('日志已清除')
      logger.info('用户清除了所有日志', { clearedCount })
    }, 500)
  }

  // 取消清除
  const cancelClear = () => {
    isClosing.value = true
    isOpening.value = false
    setTimeout(() => {
      showClearConfirmModal.value = false
      isClosing.value = false
    }, 500)
  }

  return {
    logs,
    logCount,
    lastLogTime,
    showManualCopyModal,
    manualCopyContent,
    manualCopyTextarea,
    showClearConfirmModal,
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
}

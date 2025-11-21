<template>
  <div class="setting-container">
    <h2>系统设置</h2>

    <div class="setting-content">
      <!-- 用户信息展示 -->
      <div class="user-info-section" v-if="authStore.isLogin">
        <h3>当前账号</h3>
        <div class="user-card">
          <div class="user-avatar">
            <img
              v-if="gameDataStore.userAvatar && !gameDataStore.avatarLoadError"
              :src="gameDataStore.userAvatar"
              alt="用户头像"
              class="avatar-img"
              @error="gameDataStore.handleAvatarError"
              @load="gameDataStore.handleAvatarLoad"
            />
            <img
              v-else
              src="@assets/avatar/Avatar_def_01.png"
              alt="默认头像"
              class="avatar-img default-avatar"
            />
          </div>
          <div class="user-details">
            <p class="user-name">{{ authStore.userName }}</p>
            <p class="user-level">Lv: {{ gameDataStore.userLevel }}</p>
            <p class="user-uid">
              UID:
              <span
                class="uid-value copyable"
                @click="handleCopyUid"
                :title="`点击复制 UID: ${gameDataStore.gameUid}`"
              >
                {{ gameDataStore.gameUid }}
              </span>
            </p>
            <p class="login-status">状态: <span class="status-online">已登录</span></p>
          </div>
        </div>
      </div>

      <!-- 未登录状态提示 -->
      <div class="not-login-section" v-else>
        <div class="not-login-card">
          <p class="not-login-text">未登录</p>
          <p class="not-login-tip">登录后可使用更多功能</p>
        </div>
      </div>

      <!-- 日志管理功能 -->
      <div class="log-management-section" v-if="authStore.isLogin">
        <h3>日志管理</h3>
        <div class="log-info-card">
          <div class="log-stats">
            <div class="stat-item">
              <span class="stat-label">日志条数:</span>
              <span class="stat-value">{{ logCount }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">最后更新:</span>
              <span class="stat-value">{{ lastLogTime }}</span>
            </div>
          </div>

          <div class="log-actions">
            <button
              @click="exportLogs"
              :disabled="logCount === 0"
              class="log-btn export-btn"
              title="导出日志文件用于问题反馈"
            >
              <span class="btn-text">导出日志文件</span>
            </button>

            <button
              @click="exportLogsAsJson"
              :disabled="logCount === 0"
              class="log-btn json-btn"
              title="导出为JSON格式，便于数据分析"
            >
              <span class="btn-text">导出JSON</span>
            </button>

            <button
              @click="copyLogsToClipboard"
              :disabled="logCount === 0"
              class="log-btn copy-btn"
              title="复制日志内容到剪贴板"
            >
              <span class="btn-text">复制日志</span>
            </button>

            <button
              @click="clearLogs"
              :disabled="logCount === 0"
              class="log-btn clear-btn"
              title="清除所有日志记录"
            >
              <span class="btn-text">清除日志</span>
            </button>
          </div>

          <div class="log-tips">
            <p class="tip-title">日志说明：</p>
            <ul class="tip-list">
              <li>记录应用操作、数据加载状态和错误信息</li>
              <li>遇到问题时导出日志便于开发者排查</li>
              <li>日志仅存储在本地，不会上传到服务器</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- 设置提示 -->
      <div class="setting-tips">
        <p>更多设置功能开发中...</p>
      </div>
    </div>

    <!-- 手动复制模态框 -->
    <div v-if="showManualCopyModal" class="modal-overlay" @click="closeManualCopyModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>手动复制日志</h3>
          <button class="modal-close" @click="closeManualCopyModal">×</button>
        </div>
        <div class="modal-body">
          <p class="modal-tip">请按 Ctrl+A (全选) 然后 Ctrl+C (复制) 以下内容：</p>
          <textarea
            ref="manualCopyTextarea"
            class="manual-copy-textarea"
            readonly
            :value="manualCopyContent"
          ></textarea>
          <div class="modal-actions">
            <button @click="selectAllText" class="modal-btn select-btn">全选文本</button>
            <button @click="closeManualCopyModal" class="modal-btn close-btn">关闭</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch, ref, computed, nextTick } from 'vue'
import { useAuthStore } from '@stores/auth'
import { useGameDataStore } from '@stores/gameData'
import { logger, type LogEntry } from '@services/logger'
import { showSuccess, showError, showWarning } from '@services/toastService'

// ==================== Store实例 ====================
const authStore = useAuthStore()
const gameDataStore = useGameDataStore()

// ==================== 响应式数据 ====================
const logs = ref<LogEntry[]>([])
const showManualCopyModal = ref(false)
const manualCopyContent = ref('')
const manualCopyTextarea = ref<HTMLTextAreaElement>()

// ==================== 计算属性 ====================

/**
 * 日志条数统计
 */
const logCount = computed(() => logs.value.length)

/**
 * 最后日志时间
 */
const lastLogTime = computed(() => {
  if (logs.value.length === 0) return '无日志记录'
  const lastTimestamp = logs.value[logs.value.length - 1].timestamp
  return new Date(lastTimestamp).toLocaleString('zh-CN')
})

// ==================== 功能方法 ====================

/**
 * 处理UID复制
 */
const handleCopyUid = async () => {
  await copyToClipboard(gameDataStore.gameUid, 'UID')
}

/**
 * 加载日志数据
 */
const loadLogs = () => {
  logs.value = logger.getLogs()
}

/**
 * 导出日志为文本文件
 * 生成包含时间戳的日志文件，便于用户反馈问题
 */
const exportLogs = () => {
  try {
    const logText = logger.exportLogs()
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    downloadFile(logText, `PRTS-System-logs-${timestamp}.txt`, 'text/plain')
    showSuccess('日志导出成功')

    // 记录导出操作
    logger.info('用户导出了日志文件', { logCount: logCount.value })
  } catch (error) {
    console.error('导出日志失败:', error)
    showError('导出日志失败')
    logger.error('导出日志文件失败', error)
  }
}

/**
 * 导出日志为JSON格式
 * 提供结构化的数据格式，便于程序分析
 */
const exportLogsAsJson = () => {
  try {
    const jsonData = logger.exportAsJson()
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    downloadFile(jsonData, `PRTS-System-logs-${timestamp}.json`, 'application/json')
    showSuccess('JSON日志导出成功')

    // 记录导出操作
    logger.info('用户导出了JSON格式日志', { logCount: logCount.value })
  } catch (error) {
    console.error('导出JSON日志失败:', error)
    showError('导出JSON日志失败')
    logger.error('导出JSON日志文件失败', error)
  }
}

/**
 * 通用的复制到剪贴板函数
 */
const copyToClipboard = async (text: string, itemName: string = '内容'): Promise<boolean> => {
  try {
    // 方法1: 使用现代 Clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      showSuccess(`${itemName}已复制到剪贴板`)
      return true
    } else {
      // 在不安全的上下文中，提示用户手动复制
      showWarning(`请手动复制${itemName}: ${text}`)
      return false
    }
  } catch (error) {
    console.error(`复制${itemName}失败:`, error)
    showWarning(`复制失败，请手动复制${itemName}`)
    return false
  }
}

/**
 * 复制日志到剪贴板 - 使用现代 Clipboard API
 */
const copyLogsToClipboard = async () => {
  try {
    const logText = logger.exportLogs()

    // 检查日志内容是否过长
    if (logText.length > 100000) { // 100KB限制
      if (!confirm('日志内容较大，复制可能需要较长时间，是否继续？')) {
        return
      }
    }

    const success = await copyToClipboard(logText, '日志')

    if (success) {
      logger.info('用户复制了日志到剪贴板', { logCount: logCount.value })
    } else {
      // 如果自动复制失败，显示手动复制模态框
      manualCopyContent.value = logText
      showManualCopyModal.value = true
      await nextTick()
      selectAllText()
    }

  } catch (error) {
    console.error('复制日志失败:', error)
    showError('复制日志失败，请尝试导出日志文件')
    logger.error('复制日志到剪贴板失败', error)
  }
}

/**
 * 选择所有文本（用于手动复制模态框）
 */
const selectAllText = () => {
  if (manualCopyTextarea.value) {
    manualCopyTextarea.value.select()
    manualCopyTextarea.value.focus()
  }
}

/**
 * 关闭手动复制模态框
 */
const closeManualCopyModal = () => {
  showManualCopyModal.value = false
  manualCopyContent.value = ''
}

/**
 * 清除所有日志
 * 提供确认对话框防止误操作
 */
const clearLogs = () => {
  if (confirm('确定要清除所有日志吗？此操作不可恢复。')) {
    const clearedCount = logCount.value
    logger.clearLogs()
    loadLogs()
    showSuccess('日志已清除')

    // 记录清除操作（在清除前记录）
    logger.info('用户清除了所有日志', { clearedCount })
  }
}

/**
 * 下载文件工具函数
 * @param content - 文件内容
 * @param filename - 文件名
 * @param mimeType - MIME类型
 */
const downloadFile = (content: string, filename: string, mimeType: string) => {
  try {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.style.display = 'none'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // 清理URL对象
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('文件下载失败:', error)
    throw error
  }
}

// ==================== 生命周期和监听器 ====================

/**
 * 监听 playerData 变化，更新头像
 */
watch(
  () => gameDataStore.playerData,
  () => {
    gameDataStore.fetchUserAvatar()
  },
  { deep: true, immediate: true }
)

/**
 * 监听登录状态变化
 */
watch(
  () => authStore.isLogin,
  (newVal) => {
    if (newVal) {
      gameDataStore.fetchUserAvatar()
      // 登录时记录日志
      logger.info('用户登录系统', {
        userName: authStore.userName,
        gameUid: gameDataStore.gameUid
      })
    } else {
      // 登出时重置头像状态
      gameDataStore.userAvatar = ''
      gameDataStore.avatarLoadError = true
      // 登出时记录日志
      logger.info('用户退出登录')
    }
    // 更新日志显示
    loadLogs()
  }
)

/**
 * 组件挂载时初始化
 */
onMounted(() => {
  // 获取用户头像
  if (authStore.isLogin) {
    gameDataStore.fetchUserAvatar()
  }

  // 加载日志数据
  loadLogs()

  // 记录页面访问
  logger.info('用户访问设置页面')
})
</script>

<style scoped>
.setting-container {
  color: white;
  max-width: 100%;
  padding: 20px;
  position: relative;
}

.setting-container h2 {
  margin-bottom: 30px;
  color: #ffffff;
  text-align: center;
}

.setting-content {
  max-width: 500px;
  margin: 0 auto;
}

/* 用户信息区域 */
.user-info-section {
  background: #2d2d2d;
  border-radius: 8px;
  border: 1px solid #404040;
  padding: 20px;
  margin-bottom: 20px;
}

.user-info-section h3 {
  margin-bottom: 15px;
  color: #9feaf9;
  font-size: 16px;
}

.user-card {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  background: #3a3a3a;
  border-radius: 6px;
  border: 1px solid #4a4a4a;
}

.user-avatar {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #646cff, #af47ff);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
  border: 2px solid #4a4a4a;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.default-avatar {
  background: #3a3a3a;
}

.user-details {
  flex: 1;
}

.user-name {
  font-weight: 600;
  color: #fff;
  margin-bottom: 4px;
  font-size: 16px;
}

.user-level, .user-uid, .login-status {
  color: #ccc;
  font-size: 12px;
  margin-bottom: 2px;
}

/* UID复制样式 */
.uid-value.copyable {
  color: #9feaf9;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: all 0.2s ease;
  border: 1px solid transparent;
  user-select: none;
}

.uid-value.copyable:hover {
  background: rgba(159, 234, 249, 0.1);
  border-color: #9feaf9;
}

.uid-value.copyable:active {
  background: rgba(159, 234, 249, 0.2);
  transform: scale(0.98);
}

.status-online {
  color: #4caf50;
  font-weight: 500;
}

/* 未登录状态 */
.not-login-section {
  background: #2d2d2d;
  border-radius: 8px;
  border: 1px solid #404040;
  padding: 30px 20px;
  margin-bottom: 20px;
  text-align: center;
}

.not-login-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.not-login-text {
  color: #ccc;
  font-size: 16px;
  margin: 0;
}

.not-login-tip {
  color: #888;
  font-size: 12px;
  margin: 0;
}

/* 日志管理区域 */
.log-management-section {
  background: #2d2d2d;
  border-radius: 8px;
  border: 1px solid #404040;
  padding: 20px;
  margin-bottom: 20px;
}

.log-management-section h3 {
  margin-bottom: 15px;
  color: #9feaf9;
  font-size: 16px;
}

.log-info-card {
  background: #3a3a3a;
  border-radius: 6px;
  border: 1px solid #4a4a4a;
  padding: 15px;
}

.log-stats {
  display: flex;
  justify-content: space-between;
  margin-bottom: 15px;
  padding-bottom: 15px;
  border-bottom: 1px solid #4a4a4a;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-label {
  color: #ccc;
  font-size: 12px;
}

.stat-value {
  color: #9feaf9;
  font-size: 14px;
  font-weight: 600;
}

.log-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 15px;
}

.log-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 12px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.3s ease;
  color: white;
  font-weight: 500;
}

.log-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
}

.log-btn:not(:disabled):hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.export-btn {
  background: linear-gradient(135deg, #007bff, #0056b3);
}

.json-btn {
  background: linear-gradient(135deg, #6c757d, #545b62);
}

.copy-btn {
  background: linear-gradient(135deg, #17a2b8, #138496);
}

.clear-btn {
  background: linear-gradient(135deg, #dc3545, #c82333);
}

.btn-text {
  white-space: nowrap;
}

.log-tips {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  padding: 12px;
  border-left: 3px solid #9feaf9;
}

.tip-title {
  color: #9feaf9;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 8px;
}

.tip-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.tip-list li {
  color: #ccc;
  font-size: 11px;
  margin-bottom: 4px;
  line-height: 1.4;
}

/* 设置提示 */
.setting-tips {
  text-align: center;
  padding: 20px;
  color: #ccc;
  font-size: 14px;
  background: #2d2d2d;
  border-radius: 8px;
  border: 1px solid #404040;
}

/* 手动复制模态框样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  animation: fadeIn 0.3s ease;
}

.modal-content {
  background: #2d2d2d;
  border-radius: 12px;
  border: 1px solid #404040;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  animation: slideIn 0.3s ease;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #404040;
}

.modal-header h3 {
  color: #9feaf9;
  margin: 0;
  font-size: 18px;
}

.modal-close {
  background: none;
  border: none;
  color: #ccc;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.modal-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.modal-body {
  padding: 20px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.modal-tip {
  color: #ccc;
  margin: 0;
  font-size: 14px;
  text-align: center;
}

.manual-copy-textarea {
  flex: 1;
  min-height: 300px;
  background: #1a1a1a;
  border: 1px solid #404040;
  border-radius: 6px;
  color: #e0e0e0;
  padding: 12px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.4;
  resize: vertical;
  outline: none;
}

.manual-copy-textarea:focus {
  border-color: #9feaf9;
  box-shadow: 0 0 0 2px rgba(159, 234, 249, 0.2);
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.modal-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.select-btn {
  background: linear-gradient(135deg, #17a2b8, #138496);
  color: white;
}

.select-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.close-btn {
  background: #6c757d;
  color: white;
}

.close-btn:hover {
  background: #5a6268;
  transform: translateY(-1px);
}

/* 动画 */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* 响应式设计 */
@media (max-width: 480px) {
  .setting-container {
    padding: 15px;
  }

  .log-actions {
    grid-template-columns: 1fr;
  }

  .user-card {
    flex-direction: column;
    text-align: center;
  }

  .user-details {
    width: 100%;
  }

  .modal-content {
    width: 95%;
    margin: 10px;
  }

  .modal-actions {
    flex-direction: column;
  }
}
</style>

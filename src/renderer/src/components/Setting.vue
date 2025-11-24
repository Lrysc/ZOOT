<template>
  <div class="setting-container">
    <div class="setting-content">
      <!-- 用户信息展示 -->
      <div class="user-info-section" v-if="authStore.isLogin">
        <h3>账号信息</h3>
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
            <p class="user-name" @click="copyNickname" title="点击复制昵称">{{ authStore.userName }}</p>
            <p class="user-level">Lv: {{ gameDataStore.userLevel }}</p>
            <p class="user-uid">
              UID:
              <span
                class="uid-value copyable"
                @click="handleCopyUid"
                :title="`点击复制UID`"
              >
                {{ gameDataStore.gameUid }}
              </span>
            </p>
            <p class="login-status">状态: <span class="status-online">已登录</span></p>
            <span class="registerTs">
              <span class="label">入职日期:
              <span class="value">{{ gameDataStore.formatTimestamp(gameDataStore.playerData?.status?.registerTs) || '--' }}</span>
              </span>
            </span>
          </div>
        </div>

        <!-- 基本信息卡片 -->
        <div class="basic-info-card">
          <ul class="data-grid">
            <li class="data-item">
              <span class="label">作战进度</span>
              <span class="value">{{ gameDataStore.getMainStageProgress || '--' }}</span>
            </li>
            <li class="data-item">
              <span class="label">家具保有数</span>
              <span class="value">{{ gameDataStore.playerData?.building?.furniture?.total || '--' }}</span>
            </li>
            <li class="data-item">
              <span class="label">雇佣干员数</span>
              <span class="value">{{ gameDataStore.getCharCount || '--' }}</span>
            </li>
            <li class="data-item">
              <span class="label">时装数量</span>
              <span class="value">{{ gameDataStore.playerData?.skins?.length || '--' }}</span>
            </li>
          </ul>
        </div>

        <!-- 助战干员板块 - 居中横向排列 -->
        <div class="assist-chars-section" v-if="authStore.isLogin">
          <h3>助战干员</h3>
          <div class="assist-chars-card">
            <!-- 居中横向排列 -->
            <div class="assist-chars-container">
              <div
                v-for="(char, index) in gameDataStore.getAssistCharArrayStatus"
                :key="index"
                class="assist-char-wrapper"
              >
                <!-- 单个干员容器，包含半身像和详细信息 -->
                <div class="assist-char-item">
                  <!-- 半身像容器 -->
                  <div class="char-portrait-container">
                    <img
                      :src="char.portraitUrl"
                      :alt="char.name"
                      class="char-portrait"
                      @error="(event) => gameDataStore.handleOperatorImageError(char.charId, 'portrait', event)"
                      @load="() => gameDataStore.handleOperatorImageLoad(char.charId, 'portrait')"
                    />

                    <!-- 交叉淡化遮罩 -->
                    <div class="portrait-fade-mask"></div>
                  </div>

                  <!-- 干员信息 - 显示在半身像下方，带淡入效果 -->
                  <div class="char-details">
                    <div class="char-name">{{ char.name }}</div>

                    <div class="char-level-line">
                      <span v-if="char.evolvePhase > 0" class="char-elite">精{{ char.evolvePhase === 1 ? '一' : '二' }}</span>
                      <span class="char-level">Lv.{{ char.level }}</span>
                      <span class="char-potential">{{ char.potentialRank === 5 ? '满' : char.potentialRank }}潜能</span>
                    </div>

                    <div class="char-skill-line">
                      <span class="char-skill">{{ char.mainSkillLvl }}级{{ char.skillNumber}}技能</span>
                      <span v-if="char.specializeLevel > 0" class="char-skill-level">专{{ char.specializeLevel }}</span>
                      <span v-else class="char-skill-level">无专精</span>
                    </div>

                    <div class="char-module">
                      {{ char.specializeLevel > 0 ? `模组${char.specializeLevel}级` : '未开启模组' }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- 无助战干员状态 -->
              <div v-if="!gameDataStore.getAssistCharArrayStatus || gameDataStore.getAssistCharArrayStatus.length === 0" class="no-assist-wrapper">
                <div class="no-assist-char">
                  <div class="no-char-portrait">
                    <img src="@assets/avatar/Avatar_def_01.png" alt="无助战干员" class="empty-portrait" />
                  </div>
                  <div class="no-char-text">无助战干员</div>
                </div>
              </div>
            </div>

            <!-- 助战干员统计 -->
            <div class="assist-stats">
              <span class="assist-count">共 {{ gameDataStore.getAssistCharCount || 0 }} 名助战干员</span>
            </div>
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
              @click="showClearConfirm"
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

    <!-- 清除日志确认弹窗 -->
    <div v-if="showClearConfirmModal" class="custom-modal-overlay" @click="cancelClear">
      <div
        class="custom-modal-content"
        :class="{
          'opening': isOpening,
          'closing': isClosing
        }"
        @click.stop
      >
        <div class="custom-modal-body">
          <div class="custom-modal-icon">⚠️</div>
          <h3 class="custom-modal-title">清除日志确认</h3>
          <p class="custom-modal-message">
            确定要清除所有日志吗？<br>
            此操作将删除 {{ logCount }} 条日志记录，且不可恢复。
          </p>
          <div class="custom-modal-actions">
            <button @click="confirmClear" class="custom-modal-btn confirm-btn">
              确认清除
            </button>
            <button @click="cancelClear" class="custom-modal-btn cancel-btn">
              取消
            </button>
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
const showClearConfirmModal = ref(false)
const isOpening = ref(false)
const isClosing = ref(false)

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

// ==================== 修复的复制功能 ====================

/**
 * 高可靠性的复制到剪贴板函数
 * 结合多种方法确保复制成功
 */
const copyToClipboard = async (text: string, itemName: string = '内容'): Promise<boolean> => {
  if (!text || text.trim() === '') {
    console.warn('复制内容为空')
    return false
  }

  // 方法1: 使用现代 Clipboard API（首选）
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text)
      console.log(`✅ 使用Clipboard API复制${itemName}成功`)
      return true
    } catch (error) {
      console.warn(`Clipboard API失败:`, error)
      // 继续尝试其他方法
    }
  }

  // 方法2: 使用textarea元素和execCommand（兼容方案）
  try {
    const textArea = document.createElement('textarea')
    textArea.value = text

    // 确保元素在视口外但可聚焦
    textArea.style.position = 'fixed'
    textArea.style.top = '0'
    textArea.style.left = '0'
    textArea.style.width = '2em'
    textArea.style.height = '2em'
    textArea.style.padding = '0'
    textArea.style.border = 'none'
    textArea.style.outline = 'none'
    textArea.style.boxShadow = 'none'
    textArea.style.background = 'transparent'
    textArea.style.opacity = '0'
    textArea.style.zIndex = '-1'

    document.body.appendChild(textArea)

    // 选择文本 - 使用更兼容的方式
    textArea.focus()
    textArea.select()

    // 尝试使用setSelectionRange作为备选
    try {
      textArea.setSelectionRange(0, textArea.value.length)
    } catch (e) {
      console.warn('setSelectionRange失败:', e)
    }

    // 执行复制命令
    const successful = document.execCommand('copy')
    document.body.removeChild(textArea)

    if (successful) {
      console.log(`✅ 使用execCommand复制${itemName}成功`)
      return true
    } else {
      console.warn(`❌ 使用execCommand复制${itemName}失败`)
      return false
    }
  } catch (error) {
    console.error(`execCommand复制失败:`, error)
    // 继续尝试最后的方法
  }

  // 方法3: 使用contenteditable div作为最后手段
  try {
    const div = document.createElement('div')
    div.contentEditable = 'true'
    div.textContent = text
    div.style.position = 'fixed'
    div.style.top = '0'
    div.style.left = '0'
    div.style.opacity = '0'
    div.style.zIndex = '-1'

    document.body.appendChild(div)

    // 选择div内容
    const range = document.createRange()
    range.selectNodeContents(div)
    const selection = window.getSelection()
    if (selection) {
      selection.removeAllRanges()
      selection.addRange(range)
    }

    // 尝试复制
    const successful = document.execCommand('copy')
    if (selection) {
      selection.removeAllRanges()
    }
    document.body.removeChild(div)

    if (successful) {
      console.log(`✅ 使用contenteditable复制${itemName}成功`)
      return true
    }
  } catch (error) {
    console.error(`contenteditable复制失败:`, error)
  }

  console.error(`❌ 所有复制方法都失败了`)
  return false
}

/**
 * 强制复制功能 - 确保用户总能复制到内容
 */
const forceCopyToClipboard = async (text: string, itemName: string = '内容'): Promise<boolean> => {
  // 首先尝试常规复制
  const success = await copyToClipboard(text, itemName)

  if (success) {
    return true
  }

  // 如果常规复制失败，提供手动复制选项
  console.log(`常规复制失败，提供手动复制选项`)

  // 对于短文本，直接显示在提示中让用户手动复制
  if (text.length < 100) {
    showWarning(`请手动复制${itemName}: ${text}`)
    return false
  }

  // 对于长文本，显示模态框让用户手动复制
  manualCopyContent.value = text
  showManualCopyModal.value = true
  await nextTick()

  // 自动选择文本
  if (manualCopyTextarea.value) {
    manualCopyTextarea.value.select()
    manualCopyTextarea.value.focus()
  }

  return false
}


/**
 * 处理UID复制 - 使用强制复制
 */
const handleCopyUid = async () => {
  const uid = gameDataStore.gameUid
  if (!uid || uid === '未获取') {
    showError('UID不可用，无法复制')
    return
  }

  try {
    const success = await forceCopyToClipboard(uid, 'UID')
    if (success) {
      showSuccess(`已复制 UID: ${uid}`)
      logger.info('用户复制了UID', { uid })
    } else {
      // 已经在forceCopyToClipboard中处理了手动复制的情况
      logger.info('UID复制需要手动操作', { uid })
    }
  } catch (error) {
    console.error('复制UID过程中发生异常:', error)
    showError(`复制失败，请手动复制UID: ${uid}`)
    logger.error('复制UID过程中发生异常', error)
  }
}

/**
 * 复制昵称 - 使用强制复制
 */
const copyNickname = async () => {
  const nickname = authStore.userName
  if (!nickname || nickname === '未获取' || nickname === '未知用户') {
    showError('昵称不可用，无法复制')
    return
  }

  try {
    const success = await forceCopyToClipboard(nickname, '昵称')
    if (success) {
      showSuccess(`已复制昵称: ${nickname}`)
      logger.info('用户复制了昵称', { nickname })
    } else {
      logger.info('昵称复制需要手动操作', { nickname })
    }
  } catch (error) {
    console.error('复制昵称过程中发生异常:', error)
    showError(`复制失败，请手动复制昵称: ${nickname}`)
    logger.error('复制昵称过程中发生异常', error)
  }
}

/**
 * 复制日志到剪贴板 - 使用强制复制
 */
const copyLogsToClipboard = async () => {
  try {
    const logText = logger.exportLogs()

    if (!logText || logText.trim() === '') {
      showError('没有可复制的日志内容')
      return
    }

    // 检查日志内容是否过长
    if (logText.length > 100000) { // 100KB限制
      if (!confirm('日志内容较大，复制可能需要较长时间，是否继续？')) {
        return
      }
    }

    const success = await forceCopyToClipboard(logText, '日志')

    if (success) {
      showSuccess('日志已复制到剪贴板')
      logger.info('用户复制了日志到剪贴板', { logCount: logCount.value })
    } else {
      // 已经在forceCopyToClipboard中显示了手动复制模态框
      logger.info('日志复制需要手动操作', { logCount: logCount.value })
    }

  } catch (error) {
    console.error('复制日志失败:', error)
    showError('复制日志失败，请尝试导出日志文件')
    logger.error('复制日志到剪贴板失败', error)
  }
}

// ==================== 其他方法 ====================

/**
 * 加载日志数据
 */
const loadLogs = () => {
  logs.value = logger.getLogs()
}

/**
 * 导出日志为文本文件
 */
const exportLogs = () => {
  try {
    const logText = logger.exportLogs()
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    downloadFile(logText, `PRTS-System-logs-${timestamp}.txt`, 'text/plain')
    showSuccess('日志导出成功')
    logger.info('用户导出了日志文件', { logCount: logCount.value })
  } catch (error) {
    console.error('导出日志失败:', error)
    showError('导出日志失败')
    logger.error('导出日志文件失败', error)
  }
}

/**
 * 导出日志为JSON格式
 */
const exportLogsAsJson = () => {
  try {
    const jsonData = logger.exportAsJson()
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    downloadFile(jsonData, `PRTS-System-logs-${timestamp}.json`, 'application/json')
    showSuccess('JSON日志导出成功')
    logger.info('用户导出了JSON格式日志', { logCount: logCount.value })
  } catch (error) {
    console.error('导出JSON日志失败:', error)
    showError('导出JSON日志失败')
    logger.error('导出JSON日志文件失败', error)
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
 * 显示清除日志确认弹窗
 */
const showClearConfirm = () => {
  showClearConfirmModal.value = true
  isOpening.value = true
  isClosing.value = false

  setTimeout(() => {
    isOpening.value = false
  }, 600)
}

/**
 * 确认清除日志
 */
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

/**
 * 取消清除日志
 */
const cancelClear = () => {
  isClosing.value = true
  isOpening.value = false

  setTimeout(() => {
    showClearConfirmModal.value = false
    isClosing.value = false
  }, 500)
}

/**
 * 下载文件工具函数
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
      logger.info('用户登录系统', {
        userName: authStore.userName,
        gameUid: gameDataStore.gameUid
      })
    } else {
      gameDataStore.userAvatar = ''
      gameDataStore.avatarLoadError = true
      logger.info('用户退出登录')
    }
    loadLogs()
  }
)

/**
 * 组件挂载时初始化
 */
onMounted(() => {
  if (authStore.isLogin) {
    gameDataStore.fetchUserAvatar()
  }

  loadLogs()
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
  max-width: 1000px;
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
  font-size: 20px;
}

.user-card {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px;
  background: #3a3a3a;
  border-radius: 6px;
  border: 1px solid #4a4a4a;
  margin-bottom: 15px;
}

.user-avatar {
  width: 100px;
  height: 100px;
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
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.user-name {
  font-weight: 600;
  color: #fff;
  font-size: 16px;
  cursor: pointer;
  transition: color 0.2s ease;
  margin-bottom: 4px;
  width: fit-content;
  user-select: none;
}

.user-name:hover {
  color: #9feaf9;
}

.user-level, .user-uid, .login-status {
  color: #ccc;
  font-size: 14px;
  line-height: 1.4;
}

/* UID复制样式 */
.uid-value.copyable {
  color: #ffffff;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: all 0.2s ease;
  border: 1px solid transparent;
  user-select: none;
  margin-left: 4px;
}

.uid-value.copyable:hover {
  color: #4a90e2;
}

.status-online {
  color: #4caf50;
  font-weight: 500;
}

/* 基本信息卡片 */
.basic-info-card {
  background: #3a3a3a;
  border-radius: 6px;
  border: 1px solid #4a4a4a;
  padding: 15px;
  margin-bottom: 15px;
}

.data-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
  list-style: none;
  margin: 0;
  padding: 0;
}

.data-item {
  display: flex;
  flex-direction: column;
  padding: 12px;
  background: #333333;
  border-radius: 6px;
  transition: all 0.3s ease;
  border: 1px solid #404040;
}

.data-item:hover {
  background: #3a3a3a;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.label {
  font-size: 12px;
  color: #999;
  margin-bottom: 6px;
  font-weight: 500;
}

.value {
  font-size: 14px;
  color: #ccc;
  font-weight: 600;
}

/* 助战干员板块样式 - 居中横向排列 */
.assist-chars-section {
  margin-bottom: 15px;
}

.assist-chars-section h3 {
  margin-bottom: 15px;
  color: #9feaf9;
  font-size: 20px;
}

.assist-chars-card {
  background: #3a3a3a;
  border-radius: 6px;
  border: 1px solid #4a4a4a;
  padding: 15px;
}

/* 助战干员容器 - 居中横向排列 */
.assist-chars-container {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 12px;
  width: 100%;
}

/* 单个干员包装器 */
.assist-char-wrapper {
  display: flex;
  flex-direction: column;
}

/* 助战干员卡片 - 作为一个整体容器 */
.assist-char-item {
  background: #333333;
  border: 1px solid #404040;
  border-radius: 8px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  width: 180px;
  min-height: 180px;
  overflow: hidden;
  cursor: pointer;
}

.assist-char-item:hover {
  background: #2d2d2d;
  min-height: 300px;
  z-index: 10;
  box-shadow:
    0 12px 30px rgba(0, 0, 0, 0.4),
    0 6px 15px rgba(0, 0, 0, 0.3),
    0 0 0 1px rgba(159, 234, 249, 0.3);
  transform: scale(1.02);
}

/* 半身像容器 - 带交叉淡化效果 */
.char-portrait-container {
  position: relative;
  width: 100px;
  height: 120px;
  display: flex;
  justify-content: center;
  overflow: hidden;
  border-radius: 4px;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 交叉淡化遮罩 */
.portrait-fade-mask {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 40px;
  background: linear-gradient(
    to bottom,
    transparent 0%,
    rgba(51, 51, 51, 0.8) 50%,
    rgba(51, 51, 51, 1) 100%
  );
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
  opacity: 1;
}

.assist-char-item:hover .portrait-fade-mask {
  opacity: 0;
  height: 0;
}

.assist-char-item:hover .char-portrait-container {
  height: 200px;
  transform: scale(1.05);
}

.char-portrait {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.assist-char-item:hover .char-portrait {
  object-position: center center;
  transform: scale(1.1);
}

/* 干员信息详情 - 带交叉淡化效果 */
.char-details {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: center;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: 1;
  transform: translateY(0);
}

.assist-char-item:hover .char-details {
  opacity: 0.9;
  transform: translateY(8px);
}

.char-name {
  font-size: 20px;
  font-weight: 600;
  color: #9feaf9;
  line-height: 1.2;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: all 0.3s ease;
}

.assist-char-item:hover .char-name {
  color: #ffffff;
  text-shadow: 0 0 8px rgba(159, 234, 249, 0.5);
}

/* 基础信息行 */
.char-level-line {
  display: flex;
  justify-content: center;
  gap: 4px;
  font-size: 18px;
  line-height: 1.2;
  flex-wrap: wrap;
  transition: all 0.3s ease;
}

.char-level {
  color: #fad000;
  font-weight: 500;
}

.char-elite {
  color: #ffa726;
  font-weight: 500;
}

.char-potential {
  color: #ff6b6b;
  font-weight: 500;
}

/* 技能信息行 */
.char-skill-line {
  display: flex;
  justify-content: center;
  gap: 4px;
  font-size: 16px;
  line-height: 1.2;
  flex-wrap: wrap;
  transition: all 0.3s ease;
}

.char-skill {
  color: #6cc24a;
}

.char-skill-level {
  color: #ffa726;
}

/* 模组信息 */
.char-module {
  font-size: 14px;
  color: #ba68c8;
  background: rgba(186, 104, 200, 0.1);
  padding: 1px 4px;
  border-radius: 3px;
  font-weight: 500;
  line-height: 1.2;
  transition: all 0.3s ease;
}

.assist-char-item:hover .char-module {
  background: rgba(186, 104, 200, 0.3);
  transform: scale(1.05);
}

/* 无助战干员状态 */
.no-assist-wrapper {
  display: flex;
  justify-content: center;
}

.no-assist-char {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px;
  background: #333333;
  border: 1px solid #404040;
  border-radius: 8px;
  width: 120px;
}

.no-char-portrait {
  width: 60px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #2d2d2d;
  border-radius: 6px;
  border: 2px solid #404040;
  overflow: hidden;
}

.empty-portrait {
  width: 30px;
  height: 30px;
  opacity: 0.5;
}

.no-char-text {
  color: #999;
  font-size: 12px;
}

/* 助战统计 */
.assist-stats {
  display: flex;
  justify-content: center;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid #404040;
  font-size: 12px;
}

.assist-count {
  color: #ccc;
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
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  animation: fadeIn 0.3s ease;
  padding: 20px;
  box-sizing: border-box;
}

.modal-content {
  background: #2d2d2d;
  border-radius: 12px;
  border: 1px solid #404040;
  width: 100%;
  max-width: min(800px, 90vw);
  max-height: min(700px, 80vh);
  display: flex;
  flex-direction: column;
  animation: slideIn 0.3s ease;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 24px;
  border-bottom: 1px solid #404040;
  background: #333333;
  flex-shrink: 0;
}

.modal-header h3 {
  color: #9feaf9;
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.modal-close {
  background: none;
  border: none;
  color: #ccc;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.modal-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  transform: scale(1.1);
}

.modal-body {
  padding: 16px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-height: 0;
  overflow: hidden;
}

.modal-tip {
  color: #ccc;
  margin: 0;
  font-size: 14px;
  text-align: center;
  line-height: 1.5;
  flex-shrink: 0;
}

.manual-copy-textarea {
  flex: 1;
  min-height: 200px;
  max-height: 400px;
  background: #1a1a1a;
  border: 1px solid #404040;
  border-radius: 8px;
  color: #e0e0e0;
  padding: 16px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
  resize: none;
  outline: none;
  overflow: auto;
  box-sizing: border-box;
}

.manual-copy-textarea:focus {
  border-color: #9feaf9;
  box-shadow: 0 0 0 2px rgba(159, 234, 249, 0.2);
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  flex-shrink: 0;
  padding-top: 8px;
  border-top: 1px solid #404040;
}

.modal-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  min-width: 100px;
}

.select-btn {
  background: linear-gradient(135deg, #17a2b8, #138496);
  color: white;
}

.select-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(23, 162, 184, 0.4);
}

.close-btn {
  background: #6c757d;
  color: white;
}

.close-btn:hover {
  background: #5a6268;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(108, 117, 125, 0.4);
}

/* 关键帧动画 */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-30px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* 自定义清除日志确认弹窗 */
.custom-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10001;
  animation: fadeIn 0.3s ease;
}

.custom-modal-content {
  background: #2d2d2d;
  border-radius: 8px;
  border: 2px solid #404040;
  width: 90%;
  max-width: 400px;
  overflow: hidden;
  position: relative;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
}

.custom-modal-content.opening {
  animation: mechanicalExpand 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

.custom-modal-content.closing {
  animation: mechanicalCollapse 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

.custom-modal-body {
  padding: 30px 25px;
  text-align: center;
  opacity: 0;
  animation: fadeInContent 0.2s ease 0.3s forwards;
}

.custom-modal-icon {
  font-size: 48px;
  margin-bottom: 20px;
}

.custom-modal-title {
  color: #ff6b6b;
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 15px;
}

.custom-modal-message {
  color: #e0e0e0;
  font-size: 14px;
  line-height: 1.5;
  margin-bottom: 25px;
}

.custom-modal-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.custom-modal-btn {
  padding: 10px 24px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s ease;
  min-width: 100px;
}

.confirm-btn {
  background: linear-gradient(135deg, #dc3545, #c82333);
  color: white;
}

.confirm-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(220, 53, 69, 0.3);
}

.cancel-btn {
  background: #6c757d;
  color: white;
}

.cancel-btn:hover {
  background: #5a6268;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(108, 117, 125, 0.3);
}

/* 机械式水平扩展动画 */
@keyframes mechanicalExpand {
  0% {
    opacity: 0;
    transform: scaleX(0) scaleY(0.1);
    width: 0;
    height: 4px;
    border-radius: 2px;
  }
  50% {
    opacity: 1;
    transform: scaleX(1) scaleY(0.1);
    width: 90%;
    max-width: 400px;
    height: 4px;
    border-radius: 2px;
  }
  100% {
    transform: scaleX(1) scaleY(1);
    width: 90%;
    max-width: 400px;
    height: auto;
    border-radius: 8px;
  }
}

/* 机械式水平收缩动画 */
@keyframes mechanicalCollapse {
  0% {
    transform: scaleX(1) scaleY(1);
    width: 90%;
    max-width: 400px;
    height: auto;
    border-radius: 8px;
    opacity: 1;
  }
  50% {
    transform: scaleX(1) scaleY(0.1);
    width: 90%;
    max-width: 400px;
    height: 4px;
    border-radius: 2px;
    opacity: 0.7;
  }
  100% {
    opacity: 0;
    transform: scaleX(0) scaleY(0.1);
    width: 0;
    height: 4px;
    border-radius: 2px;
  }
}

/* 内容淡入动画 */
@keyframes fadeInContent {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .setting-container {
    padding: 15px;
  }

  .log-actions {
    grid-template-columns: 1fr;
  }

  .user-card {
    flex-direction: column;
    text-align: center;
    gap: 15px;
  }

  .user-details {
    width: 100%;
    gap: 6px;
  }

  .data-grid {
    grid-template-columns: 1fr;
  }

  /* 移动端助战干员布局调整 */
  .assist-chars-container {
    gap: 15px;
    justify-content: center;
  }

  .assist-char-item {
    width: 110px;
    min-height: 170px;
  }

  .assist-char-item:hover {
    min-height: 280px;
  }

  .char-portrait-container {
    width: 90px;
    height: 108px;
  }

  .assist-char-item:hover .char-portrait-container {
    height: 180px;
  }

  .no-assist-char {
    width: 110px;
  }
}

@media (max-width: 480px) {
  .assist-chars-container {
    gap: 10px;
  }

  .assist-char-item {
    width: 100px;
    min-height: 160px;
    padding: 6px;
  }

  .assist-char-item:hover {
    min-height: 260px;
    transform: scale(1.02);
  }

  .char-portrait-container {
    width: 80px;
    height: 96px;
  }

  .assist-char-item:hover .char-portrait-container {
    height: 160px;
  }

  .char-name {
    font-size: 12px;
  }

  .char-level-line,
  .char-skill-line {
    font-size: 9px;
  }

  .char-module {
    font-size: 8px;
  }

  .no-assist-char {
    width: 100px;
    padding: 15px;
  }

  .no-char-portrait {
    width: 50px;
    height: 60px;
  }
}
</style>

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
          <div class="basic-info-grid">
            <div class="data-item">
              <span class="label">作战进度</span>
              <span class="value">{{ gameDataStore.getMainStageProgress || '--' }}</span>
            </div>
            <div class="data-item">
              <span class="label">家具保有数</span>
              <span class="value">{{ gameDataStore.playerData?.building?.furniture?.total || '--' }}</span>
            </div>
            <div class="data-item">
              <span class="label">雇佣干员数</span>
              <span class="value">{{ gameDataStore.getCharCount || '--' }}</span>
            </div>
            <div class="data-item">
              <span class="label">时装数量</span>
              <span class="value">{{ gameDataStore.playerData?.skins?.length || '--' }}</span>
            </div>
          </div>
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
                    <!-- 等级标签 - 左上角白色圆圈 -->
                    <div class="char-level-badge">
                      {{ char.level }}
                    </div>

                    <!-- 技能图标 - 左下角，展开时显示 -->
                    <div class="skill-icon-container" v-if="char.skillIconUrl">
                      <img
                        :src="char.skillIconUrl"
                        :alt="char.skillNumber"
                        class="skill-icon"
                        @error="(event) => { const target = event.target as HTMLImageElement; console.log('Skill icon load error:', char.skillId, target.src); target.style.display = 'none'; }"
                        @load="() => console.log('Skill icon loaded:', char.skillId)"
                      />
                      <!-- 专精图标 - 三个白点组成三角形 -->
                      <div class="specialize-dots" v-if="char.specializeLevel > 0">
                        <div class="dots-background">
                          <div class="dot dot-top" :class="{ 'dot-active': char.specializeLevel >= 1 }"></div>
                          <div class="dot dot-bottom-left" :class="{ 'dot-active': char.specializeLevel >= 2 }"></div>
                          <div class="dot dot-bottom-right" :class="{ 'dot-active': char.specializeLevel >= 3 }"></div>
                        </div>
                      </div>
                      <!-- 普通技能等级标签 -->
                      <div class="skill-level-badge" v-else>
                        <span class="skill-level">Lv{{ char.mainSkillLvl }}</span>
                      </div>
                    </div>

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
                    <div class="char-name">
                      <img
                        v-if="char.profession"
                        :src="getProfessionIconUrl(char.profession)"
                        :alt="char.profession"
                        class="char-profession-icon"
                        @error="(event) => { const target = event.target as HTMLImageElement; console.log('Icon load error:', char.profession, target.src); target.style.display = 'none'; }"
                        @load="() => console.log('Icon loaded:', char.profession)"
                      />
                      {{ char.name }}
                    </div>

                    <div class="char-level-line">
                      <span v-if="char.evolvePhase > 0" class="char-elite">精{{ char.evolvePhase === 1 ? '一' : '二' }}</span>
                      <span class="char-potential">{{ char.potentialRank === 5 ? '满' : char.potentialRank }}潜能</span>
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

      <!-- 系统功能 -->
      <div class="system-functions-section">
        <h3>系统功能</h3>
        <div class="system-functions-card">
          <div class="function-buttons">
            <button
              @click="checkForUpdates"
              :disabled="isCheckingUpdate"
              class="function-btn update-btn"
              title="检查是否有新版本可用"
            >
              <span class="btn-text">
                {{ isCheckingUpdate ? '检查中...' : '检查更新' }}
              </span>
            </button>

            <button
              @click="openDownloadPage"
              class="function-btn download-btn"
              title="前往 GitHub 下载最新版本"
            >
              <span class="btn-text">下载页面</span>
            </button>

            <button
              @click="openGitHubRepo"
              class="function-btn github-btn"
              title="访问项目 GitHub 仓库"
            >
              <span class="btn-text">GitHub 仓库</span>
            </button>

            <button
              @click="showAboutDialogFunc"
              class="function-btn about-btn"
              title="查看关于信息"
            >
              <span class="btn-text">关于软件</span>
            </button>
          </div>
        </div>
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
          <div class="custom-modal-icon">!</div>
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

    <!-- 自定义更新对话框 -->
    <div v-if="showUpdateDialog && updateInfo" class="update-modal-overlay" @click="closeUpdateDialog">
      <div class="update-modal-content" @click.stop>
        <div class="update-modal-header">
          <h3 class="update-title">发现新版本</h3>
          <button class="update-close-btn" @click="closeUpdateDialog">×</button>
        </div>

        <div class="update-modal-body">
          <div class="version-info">
            <div class="current-version">
              <span class="version-label">当前版本：</span>
              <span class="version-number">{{ updateInfo.currentVersion }}</span>
            </div>
            <div class="latest-version">
              <span class="version-label">最新版本：</span>
              <span class="version-number">{{ updateInfo.latestVersion }}</span>
            </div>
          </div>

          <div class="release-info" v-if="updateInfo.releaseInfo">
            <div class="release-date">
              发布时间：{{ new Date(updateInfo.releaseInfo.published_at).toLocaleDateString('zh-CN') }}
            </div>

            <div class="release-notes">
              <h4>更新内容：</h4>
              <div class="notes-content" v-html="renderMarkdown(updateInfo.releaseInfo.body)"></div>
            </div>
          </div>
        </div>

        <div class="update-modal-actions">
          <button @click="closeUpdateDialog" class="update-btn cancel-btn">
            稍后更新
          </button>
          <button @click="downloadAndInstall" class="update-btn confirm-btn">
            下载并安装
          </button>
        </div>
      </div>
    </div>

    <!-- 关于软件对话框 -->
    <div v-if="showAboutDialog" class="about-modal-overlay" @click="closeAboutDialog">
      <div class="about-modal-content" @click.stop>
        <div class="about-modal-header">
          <div class="about-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" fill="currentColor"/>
            </svg>
          </div>
          <h3 class="about-title">关于软件</h3>
          <button class="about-close-btn" @click="closeAboutDialog">×</button>
        </div>

        <div class="about-modal-body">
          <div class="about-content" v-html="formatAboutContent(aboutContent)"></div>
        </div>

        <div class="about-modal-actions">
          <button @click="closeAboutDialog" class="about-btn close-btn">
            关闭
          </button>
        </div>
      </div>
    </div>

    <!-- 版本号显示 - 居中下方 -->
    <div class="version-container">
      <div class="version-info">
        Version {{ version }}
      </div>
      <div class="version-info">
        本软件为开源软件，请勿用于商业用途。请遵守协议内容要求，禁止跳脸官方。
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch, ref, computed, nextTick } from 'vue'
import { useAuthStore } from '@stores/auth'
import { useGameDataStore } from '@stores/gameData'
import { logger, type LogEntry } from '@services/logger'
import { showSuccess, showError, showWarning, showInfo } from '@services/toastService'
import { updaterService, type UpdateInfo } from '@services/updater'
import packageJson from '../../../../package.json'

// 版本号
const version = ref(packageJson.version)

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

// 更新相关状态
const isCheckingUpdate = ref(false)

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

// ==================== 职业图标方法 ====================

/**
 * 获取职业图标URL
 * @param profession 职业名称
 * @returns 图标URL
 */
const getProfessionIconUrl = (profession: string): string => {
  if (!profession) return ''

  // 职业名称映射到文件名
  const professionMap: { [key: string]: string } = {
    'CASTER': 'caster',
    'MEDIC': 'medic',
    'PIONEER': 'pioneer',
    'SNIPER': 'sniper',
    'SPECIAL': 'special',
    'SUPPORT': 'support',
    'TANK': 'tank',
    'WARRIOR': 'warrior'
  }

  const fileName = professionMap[profession] || profession.toLowerCase()
  return new URL(`../assets/subProfession/${fileName}.svg`, import.meta.url).href
}

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
      console.log(`使用Clipboard API复制${itemName}成功`)
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
      console.log(`使用execCommand复制${itemName}成功`)
      return true
    } else {
      console.warn(`使用execCommand复制${itemName}失败`)
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
    downloadFile(logText, `ZOOT-System-logs-${timestamp}.txt`, 'text/plain')
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
    downloadFile(jsonData, `ZOOT-System-logs-${timestamp}.json`, 'application/json')
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

// ==================== 更新功能方法 ====================

// 更新相关状态
const updateInfo = ref<UpdateInfo | null>(null)
const showUpdateDialog = ref(false)

/**
 * 检查更新
 */
const checkForUpdates = async () => {
  console.log('检查更新按钮被点击')
  if (isCheckingUpdate.value) return

  isCheckingUpdate.value = true

  try {
    console.log('开始检查更新...')
    logger.info('用户手动检查更新')
    const result: UpdateInfo = await updaterService.checkForUpdates(true) // 改为true，显示无更新提示
    console.log('更新检查结果:', result)

    updateInfo.value = result

    if (result.hasUpdate && result.releaseInfo) {
      // 显示自定义更新对话框
      setTimeout(() => {
        showUpdateDialog.value = true
      }, 500)
    }

  } catch (error) {
    console.error('检查更新异常:', error)
    logger.error('检查更新失败', error)
  } finally {
    isCheckingUpdate.value = false
  }
}

/**
 * 打开下载页面
 */
const openDownloadPage = () => {
  updaterService.openDownloadPage()
}

/**
 * 打开 GitHub 仓库
 */
const openGitHubRepo = () => {
  try {
    window.open('https://github.com/Lrysc/prts', '_blank')
    logger.info('用户访问 GitHub 仓库')
    showSuccess('已打开 GitHub 仓库')
  } catch (error) {
    logger.error('打开 GitHub 仓库失败', error)
    showError('打开 GitHub 仓库失败')
  }
}

// 关于软件相关状态
const showAboutDialog = ref(false)
const aboutContent = ref('')

/**
 * 显示关于对话框
 */
const showAboutDialogFunc = async () => {
  console.log('关于软件按钮被点击')
  const versionInfo = await updaterService.getCurrentVersionInfo()

  aboutContent.value = `
# ZOOT备用系统

## 版本信息
- **当前版本**：${versionInfo.version}
- **更新时间**：${versionInfo.buildTime || '未知'}

## 问题反馈

如有遇到问题需要反馈，请添加QQ群1063973541，或将本软件的日志及对应软件图片和游戏对应错误数据图片上传至邮箱255958053@qq.com

## 软件声明

### 使用限制
- **禁止商业用途**：本软件仅供个人学习和研究使用，严禁用于任何商业目的。
- **遵守协议要求**：使用本软件时，请严格遵守相关协议条款。
- **禁止跳脸官方**：严禁使用本软件对游戏官方进行任何形式的挑衅或不当行为。

### 免责声明
本软件仅供学习和交流使用，使用者应自行承担使用风险。开发者不对因使用本软件而产生的任何后果承担责任。

## 项目信息
- **  开源地址  **：https://github.com/Lrysc/prts
- **  问题反馈  **：请在GitHub Issues中提交问题和建议
- **  技术支持  **：欢迎提交Pull Request参与项目开发

  `.trim()

  showAboutDialog.value = true
  logger.info('用户查看关于信息')
}

/**
 * 关闭关于对话框
 */
const closeAboutDialog = () => {
  showAboutDialog.value = false
}

/**
 * 简单的 Markdown 渲染器
 */
const renderMarkdown = (text: string): string => {
  if (!text) return ''

  // 限制显示长度
  const maxLength = 300
  const truncatedText = text.length > maxLength ? text.substring(0, maxLength) + '...' : text

  let html = truncatedText

  // 处理标题 (# ## ### ####)
  html = html.replace(/^#### (.*$)/gim, '<h4 class="md-h4">$1</h4>')
  html = html.replace(/^### (.*$)/gim, '<h3 class="md-h3">$1</h3>')
  html = html.replace(/^## (.*$)/gim, '<h2 class="md-h2">$1</h2>')
  html = html.replace(/^# (.*$)/gim, '<h1 class="md-h1">$1</h1>')

  // 处理粗体 (**text**)
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="md-strong">$1</strong>')

  // 处理斜体 (*text*)
  html = html.replace(/\*(.+?)\*/g, '<em class="md-em">$1</em>')

  // 处理代码块 (```code```)
  html = html.replace(/```(.*?)```/gs, '<pre class="md-code-block"><code>$1</code></pre>')

  // 处理行内代码 (`code`)
  html = html.replace(/`(.+?)`/g, '<code class="md-inline-code">$1</code>')

  // 处理链接 [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="md-link">$1</a>')

  // 处理无序列表 (- item 或 * item)
  html = html.replace(/^[\-\*] (.+)$/gim, '<li class="md-li">$1</li>')
  html = html.replace(/(<li class="md-li">.*<\/li>)/s, '<ul class="md-ul">$1</ul>')

  // 处理有序列表 (1. item)
  html = html.replace(/^\d+\. (.+)$/gim, '<li class="md-li-ol">$1</li>')
  html = html.replace(/(<li class="md-li-ol">.*<\/li>)/s, '<ol class="md-ol">$1</ol>')

  // 处理换行
  html = html.replace(/\n\n/g, '</p><p class="md-p">')
  html = '<p class="md-p">' + html + '</p>'

  // 清理空的段落标签
  html = html.replace(/<p class="md-p"><\/p>/g, '')
  html = html.replace(/<p class="md-p">(.*?)<\/p>/g, (_, p1) => {
    if (p1.trim() === '') return ''
    if (p1.includes('<h') || p1.includes('<ul') || p1.includes('<ol') || p1.includes('<pre')) {
      return p1
    }
    return '<p class="md-p">' + p1 + '</p>'
  })

  return html
}



/**
 * 关闭更新对话框
 */
const closeUpdateDialog = () => {
  showUpdateDialog.value = false
  updateInfo.value = null
}

/**
 * 格式化关于内容
 */
const formatAboutContent = (content: string) => {
  return content
    .replace(/^# (.+)$/gm, '<h1 class="about-h1">$1</h1>')
    .replace(/^## (.+)$/gm, '<h2 class="about-h2">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 class="about-h3">$1</h3>')
    .replace(/^\*\*(.+?)\*\*:/gm, '<strong class="about-strong">$1</strong>:')
    .replace(/^\* (.+)$/gm, '<li class="about-li">$1</li>')
    .replace(/^- (.+)$/gm, '<li class="about-li">$1</li>')
    .replace(/\n\n/g, '</p><p class="about-p">')
    .replace(/^/, '<p class="about-p">')
    .replace(/$/, '</p>')
    .replace(/<li class="about-li">/g, '<ul class="about-ul"><li class="about-li">')
    .replace(/<\/li>/g, '</li></ul>')
    .replace(/<\/ul><ul class="about-ul">/g, '')
    .replace(/https:\/\/github\.com\/Lrysc\/prts/g, '<a href="https://github.com/Lrysc/prts" target="_blank" class="about-link">https://github.com/Lrysc/prts</a>')
}

/**
 * 下载并安装更新
 */
const downloadAndInstall = async () => {
  if (!updateInfo.value?.releaseInfo) return

  try {
    console.log('开始下载并安装更新...')
    showInfo('正在准备下载更新...')

    // 打开下载页面
    updaterService.openDownloadPage()

    // 关闭对话框
    closeUpdateDialog()

    // 显示提示
    showSuccess('已打开下载页面，请下载最新版本进行安装')

    logger.info('用户选择下载并安装更新', {
      fromVersion: updateInfo.value.currentVersion,
      toVersion: updateInfo.value.latestVersion
    })

  } catch (error) {
    console.error('下载安装失败:', error)
    showError('下载安装失败，请手动前往下载页面')
    logger.error('下载安装更新失败', error)
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
  border: 4px solid #d0d0d0;
  box-sizing: border-box;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
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

.basic-info-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
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

/* 等级标签 - 左上角白色圆环 */
.char-level-badge {
  position: absolute;
  top: 4px;
  left: 4px;
  width: 26px;
  height: 26px;
  background: rgba(0, 0, 0, 0.7);
  color: #ffffff;
  border: 3px solid rgba(255, 255, 255, 1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 900;
  font-family: "Microsoft YaHei", "微软雅黑", "SimHei", "黑体", Arial, sans-serif;
  z-index: 10;
  box-shadow:
    0 0 20px rgba(255, 255, 255, 0.9),
    0 0 12px rgba(255, 200, 100, 0.6),
    0 3px 8px rgba(0, 0, 0, 0.6),
    inset 0 0 6px rgba(255, 255, 255, 0.4);
  text-shadow:
    0 0 8px rgba(255, 255, 255, 1),
    0 0 4px rgba(255, 200, 100, 0.8),
    0 2px 3px rgba(0, 0, 0, 1);
  backdrop-filter: blur(3px);
  animation: levelGlow 2s ease-in-out infinite alternate;
}

/* 等级标签呼吸动画 */
@keyframes levelGlow {
  0% {
    box-shadow:
      0 0 20px rgba(255, 255, 255, 0.9),
      0 0 12px rgba(255, 200, 100, 0.6),
      0 3px 8px rgba(0, 0, 0, 0.6),
      inset 0 0 6px rgba(255, 255, 255, 0.4);
  }
  100% {
    box-shadow:
      0 0 25px rgba(255, 255, 255, 1),
      0 0 18px rgba(255, 200, 100, 0.8),
      0 3px 8px rgba(0, 0, 0, 0.6),
      inset 0 0 8px rgba(255, 255, 255, 0.6);
  }
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
  display: flex;
  align-items: center;
  gap: 6px;
  justify-content: center;
}

.char-profession-icon {
  width: 20px;
  height: 20px;
  filter: brightness(0) saturate(100%) invert(100%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(100%) contrast(100%);
  flex-shrink: 0;
  min-width: 20px;
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

/* 技能图标容器 - 定位在半身像下方居中位置，默认隐藏 */
.char-portrait-container .skill-icon-container {
  position: absolute;
  bottom: -5px;
  left: 50%;
  transform: translateX(-50%) scale(0.8);
  z-index: 5;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: 0;
  pointer-events: none;
}

/* 展开时显示技能图标 */
.assist-char-item:hover .char-portrait-container .skill-icon-container {
  opacity: 1;
  transform: translateX(-50%) scale(1);
  pointer-events: auto;
}

.char-portrait-container .skill-icon {
  width: 48px;
  height: 48px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.4);
  transition: all 0.3s ease;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.5);
}

.char-portrait-container .skill-icon:hover {
  transform: scale(1.1);
  border-color: rgba(255, 255, 255, 0.6);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.7);
}

/* 普通技能等级标签 */
.char-portrait-container .skill-level-badge {
  position: absolute;
  top: 0px;
  left: 0px;
  background: linear-gradient(135deg, #2196f3, #42a5f5);
  color: white;
  border-radius: 8px;
  padding: 2px 4px;
  font-size: 9px;
  font-weight: 600;
  line-height: 1;
  min-width: 18px;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

/* 专精三个白点图标 */
.char-portrait-container .specialize-dots {
  position: absolute;
  top: 0px;
  left: 0px;
  width: 20px;
  height: 20px;
  z-index: 11;
}

.dots-background {
  width: 100%;
  height: 100%;
  background-color: #808080;
  border-radius: 4px;
  position: relative;
}

.char-portrait-container .dot {
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #666;
  transition: all 0.3s ease;
}

/* 等边三角形布局 */
.dot-top {
  top: 4px;
  left: 50%;
  transform: translateX(-50%);
}

.dot-bottom-left {
  top: 10px;
  left: 4px;
}

.dot-bottom-right {
  top: 10px;
  right: 4px;
}

.char-portrait-container .dot-active {
  background-color: white;
  box-shadow: 0 0 4px rgba(255, 255, 255, 0.8);
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

/* ==================== 自定义更新对话框样式 ==================== */
.update-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10002;
  animation: fadeIn 0.3s ease;
  padding: 20px;
  box-sizing: border-box;
}

.update-modal-content {
  background: linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 100%);
  border-radius: 16px;
  border: 2px solid #404040;
  width: 100%;
  max-width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  animation: slideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
  overflow: hidden;
}

.update-modal-header {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px 24px;
  background: rgba(63, 81, 181, 0.1);
  border-bottom: 1px solid #404040;
  position: relative;
}

.update-title {
  color: #ffffff;
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  text-align: center;
}

.update-close-btn {
  background: none;
  border: none;
  color: #999;
  font-size: 24px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.2s ease;
  position: absolute;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
}

.update-close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.update-modal-body {
  padding: 24px;
  flex: 1;
  overflow-y: auto;
  /* 隐藏滚动条 */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

.update-modal-body::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Opera */
}

.version-info {
  background: rgba(63, 81, 181, 0.05);
  border-radius: 12px;
  padding: 20px;
  margin: 16px;
  border: 1px solid rgba(63, 81, 181, 0.2);
}

.current-version,
.latest-version {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.current-version:last-child,
.latest-version:last-child {
  margin-bottom: 0;
}

.version-label {
  color: #ccc;
  font-size: 14px;
}

.version-number {
  color: #3f51b5;
  font-size: 16px;
  font-weight: 600;
  background: rgba(63, 81, 181, 0.1);
  padding: 4px 8px;
  border-radius: 6px;
}

.current-version .version-number {
  color: #f44336;
  background: rgba(244, 67, 54, 0.1);
}

.latest-version .version-number {
  color: #4caf50;
  background: rgba(76, 175, 80, 0.1);
}

.release-info {
  color: #e0e0e0;
}

.release-date {
  color: #999;
  font-size: 12px;
  margin-bottom: 16px;
}

.release-notes h4 {
  color: #9feaf9;
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
}

.notes-content {
  background: #1a1a1a;
  border-radius: 8px;
  padding: 16px;
  font-size: 14px;
  line-height: 1.6;
  color: #ccc;
  border: 1px solid #333;
}

/* Markdown 样式 */
.notes-content .md-p {
  margin: 8px 0;
  color: #ccc;
}

.notes-content .md-h1 {
  font-size: 20px;
  font-weight: bold;
  color: #fff;
  margin: 16px 0 8px 0;
  border-bottom: 2px solid #444;
  padding-bottom: 4px;
}

.notes-content .md-h2 {
  font-size: 18px;
  font-weight: bold;
  color: #fff;
  margin: 14px 0 6px 0;
  border-bottom: 1px solid #444;
  padding-bottom: 2px;
}

.notes-content .md-h3 {
  font-size: 16px;
  font-weight: bold;
  color: #f0f0f0;
  margin: 12px 0 4px 0;
}

.notes-content .md-h4 {
  font-size: 14px;
  font-weight: bold;
  color: #e0e0e0;
  margin: 10px 0 4px 0;
}

.notes-content .md-strong {
  color: #fff;
  font-weight: bold;
}

.notes-content .md-em {
  color: #ddd;
  font-style: italic;
}

.notes-content .md-code-block {
  background: #2d2d2d;
  border: 1px solid #444;
  border-radius: 4px;
  padding: 12px;
  margin: 8px 0;
  overflow-x: auto;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  color: #f8f8f2;
}

.notes-content .md-inline-code {
  background: #2d2d2d;
  border: 1px solid #444;
  border-radius: 3px;
  padding: 2px 4px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  color: #f8f8f2;
}

.notes-content .md-link {
  color: #9e9e9e;
  text-decoration: none;
}

.notes-content .md-link:hover {
  color: #757575;
  text-decoration: underline;
}

.notes-content .md-ul, .notes-content .md-ol {
  margin: 8px 0;
  padding-left: 20px;
}

.notes-content .md-li {
  margin: 4px 0;
  color: #ccc;
  list-style-type: disc;
}

.notes-content .md-li-ol {
  margin: 4px 0;
  color: #ccc;
  list-style-type: decimal;
}

.update-modal-actions {
  display: flex;
  gap: 12px;
  padding: 20px 24px;
  background: rgba(0, 0, 0, 0.2);
  border-top: 1px solid #404040;
}

.update-btn {
  flex: 1;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.update-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s ease;
}

.update-btn:hover::before {
  left: 100%;
}

.cancel-btn {
  background: #6c757d;
  color: white;
}

.cancel-btn:hover {
  background: #5a6268;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(108, 117, 125, 0.4);
}

.confirm-btn {
  background: linear-gradient(135deg, #4caf50, #45a049);
  color: white;
}

.confirm-btn:hover {
  background: linear-gradient(135deg, #45a049, #3d8b40);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
}



/* ==================== 关于软件对话框样式 ==================== */
.about-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10003;
  animation: fadeIn 0.3s ease;
  padding: 20px;
  box-sizing: border-box;
}

.about-modal-content {
  background: linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 100%);
  border-radius: 16px;
  border: 2px solid #404040;
  width: 100%;
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  animation: slideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
  overflow: hidden;
}

.about-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  background: rgba(33, 150, 243, 0.1);
  border-bottom: 1px solid #404040;
  position: relative;
}

.about-icon {
  color: #2196f3;
}

.about-title {
  color: #ffffff;
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  flex: 1;
  text-align: center;
}

.about-close-btn {
  background: none;
  border: none;
  color: #999;
  font-size: 24px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.2s ease;
  position: absolute;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
}

.about-close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.about-modal-body {
  padding: 24px;
  flex: 1;
  overflow-y: auto;
  /* 隐藏滚动条 */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

.about-modal-body::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Opera */
}

.about-content {
  color: #e0e0e0;
  font-size: 14px;
  line-height: 1.6;
}

.about-h1 {
  color: #2196f3;
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 16px 0;
  text-align: center;
}

.about-h2 {
  color: #9feaf9;
  font-size: 18px;
  font-weight: 600;
  margin: 20px 0 12px 0;
}

.about-h3 {
  color: #ffffff;
  font-size: 16px;
  font-weight: 600;
  margin: 16px 0 8px 0;
}

.about-p {
  margin: 0 0 12px 0;
  color: #ccc;
}

.about-strong {
  color: #ffffff;
  font-weight: 600;
}

.about-ul {
  margin: 8px 0;
  padding-left: 20px;
}

.about-li {
  margin: 4px 0;
  color: #ccc;
}

.about-link {
  color: #2196f3;
  text-decoration: none;
  transition: color 0.2s ease;
}

.about-link:hover {
  color: #64b5f6;
  text-decoration: underline;
}

.about-modal-actions {
  display: flex;
  justify-content: flex-end;
  padding: 20px 24px;
  background: rgba(0, 0, 0, 0.2);
  border-top: 1px solid #404040;
}

.about-btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.3s ease;
  min-width: 100px;
}

.about-btn.close-btn {
  background: #6c757d;
  color: white;
}

.about-btn.close-btn:hover {
  background: #5a6268;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(108, 117, 125, 0.4);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .update-modal-content {
    margin: 10px;
    max-width: none;
  }

  .update-modal-header {
    padding: 16px 20px;
  }

  .update-modal-body {
    padding: 20px;
  }

  .update-modal-actions {
    padding: 16px 20px;
    flex-direction: column;
  }

  .update-btn {
    width: 100%;
  }
}



/* 系统功能区域 */
.system-functions-section {
  background: #2d2d2d;
  border-radius: 8px;
  border: 1px solid #404040;
  padding: 20px;
  margin-bottom: 20px;
}

.system-functions-section h3 {
  margin-bottom: 15px;
  color: #9feaf9;
  font-size: 16px;
}

.system-functions-card {
  background: #3a3a3a;
  border-radius: 6px;
  border: 1px solid #4a4a4a;
  padding: 15px;
}

.function-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin-bottom: 15px;
}

.function-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s ease;
  color: white;
  position: relative;
  overflow: hidden;
}

.function-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
}

.function-btn:not(:disabled):hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.function-btn:not(:disabled):active {
  transform: translateY(0);
}

/* 不同按钮的样式 */
.update-btn {
  background: linear-gradient(135deg, #007bff, #0056b3);
}

.update-btn:not(:disabled):hover {
  box-shadow: 0 4px 12px rgba(0, 123, 255, 0.4);
}

.download-btn {
  background: linear-gradient(135deg, #28a745, #1e7e34);
}

.download-btn:not(:disabled):hover {
  box-shadow: 0 4px 12px rgba(40, 167, 69, 0.4);
}

.github-btn {
  background: linear-gradient(135deg, #6c757d, #545b62);
}

.github-btn:not(:disabled):hover {
  box-shadow: 0 4px 12px rgba(108, 117, 125, 0.4);
}

.about-btn {
  background: linear-gradient(135deg, #17a2b8, #138496);
}

.about-btn:not(:disabled):hover {
  box-shadow: 0 4px 12px rgba(23, 162, 184, 0.4);
}

.btn-text {
  white-space: nowrap;
  font-size: 14px;
}

/* 版本号容器样式 */
.version-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin-top: 30px;
  padding: 0 20px;
}

/* 版本号样式 - 统一容器样式 */
.version-info {
  background: #2d2d2d;
  border-radius: 8px;
  border: 1px solid #404040;
  color: #999;
  font-size: 12px;
  text-align: center;
  padding: 15px 20px;
  max-width: 600px;
  width: 100%;
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
  
  .basic-info-grid {
    grid-template-columns: repeat(2, 1fr);
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

  /* 移动端系统功能按钮调整 */
  .function-buttons {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .function-btn {
    padding: 14px 16px;
  }
}

/* 关于对话框样式 */
.about-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10002;
  animation: fadeIn 0.3s ease;
  padding: 20px;
  box-sizing: border-box;
}

.about-modal-content {
  background: linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 100%);
  border-radius: 16px;
  border: 2px solid #404040;
  width: 100%;
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  animation: slideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
  overflow: hidden;
}

.about-modal-header {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px 24px;
  background: rgba(63, 81, 181, 0.1);
  border-bottom: 1px solid #404040;
  position: relative;
}

.about-icon {
  color: #9feaf9;
  margin-right: 12px;
}

.about-title {
  color: #ffffff;
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  text-align: center;
}

.about-close-btn {
  background: none;
  border: none;
  color: #999;
  font-size: 24px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.2s ease;
  position: absolute;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
}

.about-close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.about-modal-body {
  padding: 24px;
  flex: 1;
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.about-modal-body::-webkit-scrollbar {
  display: none;
}

.about-content {
  color: #ccc;
  line-height: 1.6;
  font-size: 14px;
}

.about-content .about-h1 {
  color: #9feaf9;
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 16px 0;
  text-align: center;
}

.about-content .about-h2 {
  color: #ffffff;
  font-size: 18px;
  font-weight: 600;
  margin: 20px 0 12px 0;
  border-bottom: 1px solid #404040;
  padding-bottom: 8px;
}

.about-content .about-h3 {
  color: #e0e0e0;
  font-size: 16px;
  font-weight: 600;
  margin: 16px 0 8px 0;
}

.about-content .about-strong {
  color: #ffffff;
  font-weight: 600;
}

.about-content .about-p {
  margin: 8px 0;
  line-height: 1.6;
}

.about-content .about-ul {
  margin: 8px 0;
  padding-left: 20px;
}

.about-content .about-li {
  margin: 4px 0;
  color: #ccc;
  list-style-type: disc;
}

.about-content .about-link {
  color: #9e9e9e;
  text-decoration: none;
  transition: color 0.2s ease;
}

.about-content .about-link:hover {
  color: #757575;
  text-decoration: underline;
}

.about-modal-actions {
  display: flex;
  justify-content: center;
  padding: 20px 24px;
  background: rgba(0, 0, 0, 0.2);
  border-top: 1px solid #404040;
}

.about-btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.3s ease;
  min-width: 120px;
}

.about-btn.close-btn {
  background: #6c757d;
  color: white;
}

.about-btn.close-btn:hover {
  background: #5a6268;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(108, 117, 125, 0.4);
}
</style>

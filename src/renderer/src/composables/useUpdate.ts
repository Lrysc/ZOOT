import { ref } from 'vue'
import { updaterService, type UpdateInfo } from '@services/updater'
import { logger } from '@services/logger'
import { showSuccess, showError, showInfo } from '@services/toastService'

export function useUpdate() {
  const updateInfo = ref<UpdateInfo | null>(null)
  const showUpdateDialog = ref(false)
  const isCheckingUpdate = ref(false)
  const showAboutDialog = ref(false)
  const aboutContent = ref('')

  // 检查更新
  const checkForUpdates = async () => {
    if (isCheckingUpdate.value) return
    isCheckingUpdate.value = true

    try {
      logger.info('用户手动检查更新')
      const result: UpdateInfo = await updaterService.checkForUpdates(true)
      updateInfo.value = result

      if (result.hasUpdate && result.releaseInfo) {
        setTimeout(() => { showUpdateDialog.value = true }, 500)
      }
    } catch (error) {
      console.error('检查更新异常:', error)
      logger.error('检查更新失败', error)
    } finally {
      isCheckingUpdate.value = false
    }
  }

  // 打开下载页面
  const openDownloadPage = () => {
    updaterService.openDownloadPage()
  }

  // 打开 GitHub 仓库
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

  // 显示关于对话框
  const showAboutDialogFunc = async () => {
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

  // 关闭关于对话框
  const closeAboutDialog = () => {
    showAboutDialog.value = false
  }

  // 关闭更新对话框
  const closeUpdateDialog = () => {
    showUpdateDialog.value = false
    updateInfo.value = null
  }

  // 下载并安装
  const downloadAndInstall = async () => {
    if (!updateInfo.value?.releaseInfo) return

    try {
      updaterService.openDownloadPage()
      closeUpdateDialog()
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

  return {
    updateInfo,
    showUpdateDialog,
    isCheckingUpdate,
    showAboutDialog,
    aboutContent,
    checkForUpdates,
    openDownloadPage,
    openGitHubRepo,
    showAboutDialogFunc,
    closeAboutDialog,
    closeUpdateDialog,
    downloadAndInstall
  }
}

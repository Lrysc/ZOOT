import { logger } from './logger'
import { showSuccess, showError, showInfo } from '@utils/toast'
import packageJson from '../../../../package.json'

interface GitHubRelease {
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

interface UpdateInfo {
  hasUpdate: boolean
  currentVersion: string
  latestVersion: string
  releaseInfo?: GitHubRelease
}

class UpdaterService {
  private readonly GITHUB_API_URL = 'https://api.github.com/repos/Lrysc/prts/releases/latest'
  private readonly GITHUB_RELEASES_URL = 'https://github.com/Lrysc/prts/releases'
  private currentVersion: string = ''

  constructor() {
    this.getCurrentVersion()
  }

  /**
   * 获取当前版本号
   */
  private getCurrentVersion(): void {
    try {
      // 从 package.json 获取版本号
      this.currentVersion = packageJson.version
    } catch (error) {
      logger.error('获取当前版本失败', error)
      this.currentVersion = '0.0.0'
    }
  }

  /**
   * 比较版本号
   * @param v1 版本1
   * @param v2 版本2
   * @returns 1: v1 > v2, -1: v1 < v2, 0: v1 === v2
   */
  private compareVersions(v1: string, v2: string): number {
    const normalize = (v: string) => v.replace(/^v/, '').split('.').map(Number)
    const parts1 = normalize(v1)
    const parts2 = normalize(v2)
    
    const maxLength = Math.max(parts1.length, parts2.length)
    
    for (let i = 0; i < maxLength; i++) {
      const num1 = parts1[i] || 0
      const num2 = parts2[i] || 0
      
      if (num1 > num2) return 1
      if (num1 < num2) return -1
    }
    
    return 0
  }

  /**
   * 检查更新
   * @param showNoUpdateMessage 是否显示无更新提示
   */
  async checkForUpdates(showNoUpdateMessage: boolean = true): Promise<UpdateInfo> {
    try {
      console.log('开始检查更新...', { currentVersion: this.currentVersion })
      logger.info('开始检查更新...', { currentVersion: this.currentVersion })
      
      const response = await fetch(this.GITHUB_API_URL, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'ZOOT-System-Updater'
        },
        
      })

      if (!response.ok) {
        throw new Error(`GitHub API 请求失败: ${response.status} ${response.statusText}`)
      }

      const release: GitHubRelease = await response.json()
      const latestVersion = release.tag_name

      const comparison = this.compareVersions(latestVersion, this.currentVersion)
      const hasUpdate = comparison > 0

      const updateInfo: UpdateInfo = {
        hasUpdate,
        currentVersion: this.currentVersion,
        latestVersion,
        releaseInfo: hasUpdate ? release : undefined
      }

      if (hasUpdate) {
        logger.info('发现新版本', {
          current: this.currentVersion,
          latest: latestVersion,
          releaseName: release.name,
          publishDate: release.published_at
        })
        
        showInfo(`发现新版本 ${latestVersion}！当前版本：${this.currentVersion}`)
      } else if (showNoUpdateMessage) {
        console.log('已是最新版本', { currentVersion: this.currentVersion })
        logger.info('已是最新版本', { currentVersion: this.currentVersion })
        showSuccess('已是最新版本！')
      }

      return updateInfo

    } catch (error) {
      console.error('检查更新失败:', error)
      logger.error('检查更新失败', error)
      showError('检查更新失败，请检查网络连接')
      
      return {
        hasUpdate: false,
        currentVersion: this.currentVersion,
        latestVersion: this.currentVersion
      }
    }
  }

  /**
   * 获取下载链接
   * @param platform 平台类型
   */
  getDownloadUrl(_platform: 'win32' | 'darwin' | 'linux' = 'win32'): string | null {
    // 这里可以根据实际的发布文件名模式进行调整
    // const filePatterns = {
    //   win32: ['.exe', '.zip'],
    //   darwin: ['.dmg', '.zip'],
    //   linux: ['.AppImage', '.deb', '.rpm', '.tar.gz']
    // }
    
    // 返回 GitHub Releases 页面，让用户手动选择下载
    return this.GITHUB_RELEASES_URL
  }

  /**
   * 打开下载页面
   */
  openDownloadPage(): void {
    try {
      const url = this.GITHUB_RELEASES_URL
      window.open(url, '_blank')
      logger.info('打开下载页面', { url })
      showSuccess('已打开下载页面')
    } catch (error) {
      logger.error('打开下载页面失败', error)
      showError('打开下载页面失败')
    }
  }

  /**
   * 获取当前版本信息
   */
  async getCurrentVersionInfo(): Promise<{ version: string; buildTime?: string }> {
    let buildTime = import.meta.env.VITE_BUILD_TIME || undefined
    
    // 尝试从 GitHub 获取当前版本的发布时间
    try {
      // 先获取所有 releases
      const response = await fetch('https://api.github.com/repos/Lrysc/prts/releases')
      if (response.ok) {
        const releases = await response.json()
        
        // 查找匹配当前版本的 release
        const currentRelease = releases.find((release: any) => {
          // 移除 v 前缀进行比较
          const releaseVersion = release.tag_name.replace(/^v/, '')
          const currentVersion = this.currentVersion.replace(/^v/, '')
          return releaseVersion === currentVersion
        })
        
        if (currentRelease) {
          buildTime = new Date(currentRelease.published_at).toLocaleString('zh-CN')
        } else {
          console.warn(`未找到版本 ${this.currentVersion} 对应的 GitHub release`)
        }
      }
    } catch (error) {
      console.warn('获取 GitHub 发布时间失败:', error)
    }
    
    return {
      version: this.currentVersion,
      buildTime
    }
  }

  /**
   * 格式化更新日志
   */
  formatReleaseNotes(body: string): string {
    if (!body) return '暂无更新说明'
    
    // 简单的 Markdown 转换
    return body
      .replace(/^##\s+(.+)$/gm, '<h3>$1</h3>')
      .replace(/^###\s+(.+)$/gm, '<h4>$1</h4>')
      .replace(/^\*\s+(.+)$/gm, '<li>$1</li>')
      .replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>')
      .replace(/<li>/g, '<ul><li>')
      .replace(/<\/li>/g, '</li></ul>')
  }
}

// 创建单例实例
export const updaterService = new UpdaterService()

// 导出类型
export type { UpdateInfo, GitHubRelease }
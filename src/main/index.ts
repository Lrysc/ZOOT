import { app, shell, BrowserWindow, ipcMain, session, net } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
// import icon from '../../resources/icon.png?asset'

// 将mainWindow声明为全局变量
let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  // 创建主浏览器窗口
  mainWindow = new BrowserWindow({
    width: 940,
    height: 580,
    minWidth: 940,
    minHeight: 580,
    show: false,
    autoHideMenuBar: true,
    frame: false, // 去掉原生标题栏
    titleBarStyle: 'hidden', // 隐藏标题栏
    ...(process.platform === 'linux' ? { icon: join(__dirname, '../../resources/icon.png') } : {}),
    icon: join(__dirname, '../../build/icon.ico'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true, // 启用webSecurity，通过其他方式解决CORS
      allowRunningInsecureContent: false
    }
  })

  // 创建内置浏览器窗口用于调试API
  let debugWindow: BrowserWindow | undefined

  const createDebugWindow = (): BrowserWindow => {
    if (debugWindow && !debugWindow.isDestroyed()) {
      debugWindow.focus()
      return debugWindow
    }

    debugWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      show: false,
      autoHideMenuBar: true,
      parent: undefined, // 独立窗口
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: false, // 调试窗口允许跨域
        allowRunningInsecureContent: true
      }
    })

    debugWindow.on('closed', () => {
      debugWindow = undefined
    })

    debugWindow.on('ready-to-show', () => {
      debugWindow?.show()
    })

    return debugWindow
  }

  // IPC处理器：打开调试窗口
  ipcMain.handle('open-debug-window', async (_event, url?: string) => {
    try {
      const win = createDebugWindow()

      if (url) {
        await win.loadURL(url)
      } else {
        // 默认加载明日方舟官网
        await win.loadURL('https://ak.hypergryph.com/user/headhunting')
      }

      return { success: true }
    } catch (error) {
      console.error('打开调试窗口失败:', error)
      return { success: false, error: '打开调试窗口失败' }
    }
  })

  // IPC处理器：在调试窗口中执行API请求
  ipcMain.handle('debug-api-request', async (_event, { url, options = {} }) => {
    try {
      const win = createDebugWindow()

      // 创建一个包含API请求的HTML页面
      const apiDebugHtml = `
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>
        <meta charset="UTF-8">
        <title>API调试 - ${url}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .request-info { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 5px; }
          .response-info { background: #e8f5e8; padding: 15px; margin: 10px 0; border-radius: 5px; }
          .error-info { background: #ffe8e8; padding: 15px; margin: 10px 0; border-radius: 5px; }
          pre { white-space: pre-wrap; word-wrap: break-word; }
          button { padding: 10px 20px; margin: 5px; cursor: pointer; }
        </style>
      </head>
      <body>
        <h2>API请求调试</h2>

        <div class="request-info">
          <h3>请求信息</h3>
          <p><strong>URL:</strong> ${url}</p>
          <p><strong>方法:</strong> ${options.method || 'GET'}</p>
          <p><strong>请求头:</strong></p>
          <pre>${JSON.stringify(options.headers || {}, null, 2)}</pre>
          ${options.body ? `<p><strong>请求体:</strong></p><pre>${options.body}</pre>` : ''}
        </div>

        <button onclick="executeRequest()">执行请求</button>
        <button onclick="window.location.reload()">重新加载</button>
        <button onclick="window.close()">关闭窗口</button>

        <div id="response-container"></div>

        <script>
          async function executeRequest() {
            const container = document.getElementById('response-container');
            container.innerHTML = '<p>正在执行请求...</p>';

            try {
              const response = await fetch('${url}', ${JSON.stringify(options)});

              let responseHtml = '<div class="response-info"><h3>响应信息</h3>';
              responseHtml += '<p><strong>状态码:</strong> ' + response.status + ' ' + response.statusText + '</p>';
              responseHtml += '<p><strong>响应头:</strong></p>';
              responseHtml += '<pre>' + JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2) + '</pre>';

              const contentType = response.headers.get('content-type');
              if (contentType && contentType.includes('application/json')) {
                const data = await response.json();
                responseHtml += '<p><strong>响应数据:</strong></p>';
                responseHtml += '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
              } else {
                const text = await response.text();
                responseHtml += '<p><strong>响应内容:</strong></p>';
                responseHtml += '<pre>' + text + '</pre>';
              }

              responseHtml += '</div>';
              container.innerHTML = responseHtml;

            } catch (error) {
              container.innerHTML = '<div class="error-info"><h3>请求失败</h3><pre>' + error.message + '</pre></div>';
            }
          }

          // 自动执行请求
          setTimeout(executeRequest, 1000);
        </script>
      </body>
      </html>
      `

      await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(apiDebugHtml)}`)
      return { success: true }
    } catch (error) {
      console.error('调试API请求失败:', error)
      return { success: false, error: '调试API请求失败' }
    }
  })

  // 设置 Windows 应用详情，解决任务栏显示问题
  if (process.platform === 'win32') {
    mainWindow.setAppDetails({
      appId: 'com.zoot.app',
      appIconPath: join(__dirname, '../../build/icon.ico'),
      appIconIndex: 0,
      relaunchCommand: process.execPath,
      relaunchDisplayName: 'ZOOT备用系统'
    })
  }

  // 完全禁用webSecurity来解决CORS问题
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Access-Control-Allow-Origin': ['*'],
        'Access-Control-Allow-Methods': ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        'Access-Control-Allow-Headers': ['*'],
        'Access-Control-Allow-Credentials': ['false']
      }
    })
  })

  // 设置用户代理
  mainWindow.webContents.session.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36')

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  // 处理外部链接打开
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url).catch((err) => {
      console.error('打开外部链接失败:', err)
    })
    return { action: 'deny' }
  })

  // 设置 CSP 策略 - 移除不安全的HTTP连接
  mainWindow.webContents.session.webRequest.onHeadersReceived(
    { urls: ['*://*/*'] },
    (details, callback) => {
      const responseHeaders = { ...details.responseHeaders }

      if (is.dev) {
        // 开发环境：只允许HTTPS和本地连接
        responseHeaders['Content-Security-Policy'] = [
          "default-src 'self' 'unsafe-inline' data: https:; " +
          "script-src 'self' 'unsafe-inline'; " +
          "style-src 'self' 'unsafe-inline'; " +
          "img-src 'self' data: https:; " +
          "font-src 'self' data:; " +
          "connect-src 'self' https: ws: " +
          "https://as.hypergryph.com https://zonai.skland.com https://www.skland.com; " +
          "object-src 'none'; " +
          "frame-ancestors 'none';"
        ]
      } else {
        // 生产环境：严格的安全策略
        responseHeaders['Content-Security-Policy'] = [
          "default-src 'self'; " +
          "script-src 'self' 'unsafe-inline'; " +
          "style-src 'self' 'unsafe-inline'; " +
          "img-src 'self' data: https:; " +
          "font-src 'self' data:; " +
          "connect-src 'self' https://as.hypergryph.com https://zonai.skland.com https://www.skland.com; " +
          "object-src 'none'; " +
          "frame-ancestors 'none'; " +
          "base-uri 'self'; " +
          "form-action 'self';"
        ]
      }

      callback({ responseHeaders })
    }
  )

  // 加载页面
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow?.loadURL(process.env['ELECTRON_RENDERER_URL'])
      .catch((err) => console.error('加载开发环境URL失败:', err))
  } else {
    mainWindow?.loadFile(join(__dirname, '../renderer/index.html'))
      .catch((err) => console.error('加载生产环境文件失败:', err))
  }
}

// 应用初始化
app.whenReady().then(() => {
  // 设置应用ID - 修复任务栏显示问题
  app.setAppUserModelId('com.zoot.app')
  electronApp.setAppUserModelId('com.zoot.app')

  // 权限请求处理
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    const allowedPermissions = ['clipboard-read', 'notifications']
    callback(allowedPermissions.includes(permission))
  })

  // 窗口控制处理器
  ipcMain.handle('window-minimize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.minimize()
    }
  })

  ipcMain.handle('window-maximize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.maximize()
    }
  })

  ipcMain.handle('window-unmaximize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.unmaximize()
    }
  })

  ipcMain.handle('window-close', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.close()
    }
  })

  ipcMain.handle('window-is-maximized', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      return mainWindow.isMaximized()
    }
    return false
  })

  // API请求代理处理器 - 解决CORS问题的主要方案
  ipcMain.handle('api-request', async (_event, { url, options = {} }) => {
    try {
      console.log('API代理请求:', url)

      const requestOptions: any = {
        method: options.method || 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0',
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...options.headers
        }
      }

      // 如果有请求体，添加body
      if (options.body) {
        requestOptions.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body)
      }

      console.log('最终请求选项:', requestOptions)

      const response = await net.fetch(url, requestOptions)

      console.log('代理响应状态:', response.status)
      console.log('代理响应头:', Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        const errorText = await response.text()
        console.log('代理错误响应:', errorText)
        return {
          success: false,
          status: response.status,
          statusText: response.statusText,
          error: `HTTP ${response.status}: ${errorText}`
        }
      }

      const data = await response.json()
      console.log('代理成功响应:', data)

      // 特殊处理角色登录接口，提取Set-Cookie中的ak-user-center
      const headers = Object.fromEntries(response.headers.entries())
      if (url.includes('/user/api/role/login') && headers['set-cookie']) {
        const cookies = Array.isArray(headers['set-cookie']) ? headers['set-cookie'] : [headers['set-cookie']]
        const akUserCenterCookie = cookies.find((cookie: string) => cookie.includes('ak-user-center='))
        
        if (akUserCenterCookie) {
          const cookieValue = akUserCenterCookie.match(/ak-user-center=([^;]+)/)?.[1]
          if (cookieValue) {
            console.log('提取到ak-user-center cookie值:', cookieValue)
            // 将cookie添加到响应数据中
            data.data = data.data || {}
            data.data.cookie = cookieValue
          }
        }
      }

      return { 
        success: true, 
        data,
        headers
      }
    } catch (error) {
      console.error('API代理请求失败:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      return { success: false, error: errorMessage }
    }
  })

  // HTTP请求代理处理器 - 作为备用方案
  ipcMain.handle('proxy-request', async (_event, { url, options = {} }) => {
    try {
      console.log('代理请求:', url, options)

      const requestOptions: RequestInit = {
        method: options.method || 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
          ...options.headers
        }
      }

      // 只有POST/PUT等请求才需要Content-Type
      if (options.method && ['POST', 'PUT', 'PATCH'].includes(options.method.toUpperCase())) {
        requestOptions.headers = {
          ...requestOptions.headers,
          'Content-Type': 'application/json'
        }
      }

      // 如果有请求体，添加body
      if (options.body) {
        requestOptions.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body)
      }

      console.log('最终请求选项:', requestOptions)

      const response = await net.fetch(url, requestOptions)

      console.log('代理响应状态:', response.status)
      console.log('代理响应头:', Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        const errorText = await response.text()
        console.log('代理错误响应:', errorText)
        return {
          success: false,
          error: `HTTP error! status: ${response.status}, response: ${errorText}`
        }
      }

      const data = await response.json()
      console.log('代理成功响应:', data)
      return { success: true, data }
    } catch (error) {
      console.error('Proxy request failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      return { success: false, error: errorMessage }
    }
  })

  // 额外的安全设置
  app.on('web-contents-created', (_event, contents) => {
    // 阻止导航到外部URL
    contents.on('will-navigate', (navigationEvent, navigationUrl) => {
      // 只允许本地开发服务器和生产环境文件，禁止HTTP链接
      const allowedOrigins = [
        'https://localhost:5173',
        'file://'
      ]

      if (!allowedOrigins.some(origin => navigationUrl.startsWith(origin))) {
        navigationEvent.preventDefault()
        console.warn('阻止导航到不安全的URL:', navigationUrl)
      }
    })

    // 阻止新窗口创建
    contents.setWindowOpenHandler(({ url }) => {
      // 只允许HTTPS链接
      if (url.startsWith('https://')) {
        shell.openExternal(url).catch((err) => {
          console.error('打开外部链接失败:', err)
        })
      } else if (url.startsWith('http://')) {
        console.warn('阻止打开不安全的HTTP链接:', url)
      }
      return { action: 'deny' }
    })
  })

  // 窗口快捷键优化
  app.on('browser-window-created', (_event, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC测试
  ipcMain.on('ping', () => console.log('pong'))

  // 创建主窗口
  createWindow()

  // macOS激活处理
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// 窗口关闭处理
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

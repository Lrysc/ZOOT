import { app, shell, BrowserWindow, ipcMain, session } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

function createWindow(): void {
  // 创建浏览器窗口
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 500,
    minWidth: 900,
    minHeight: 500,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    icon: join(__dirname, '../../build/icon.ico'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  })

  // 允许跨域请求的域名列表
  const allowedOrigins = [
    'https://as.hypergryph.com',
    'https://zonai.skland.com',
    'https://www.skland.com'
  ];

  // 处理请求头，强制修改 User-Agent 和其他必要的头
  mainWindow.webContents.session.webRequest.onBeforeSendHeaders(
    { urls: allowedOrigins.map(origin => `${origin}/*`) },
    (details, callback) => {
      const requestHeaders = {
        ...details.requestHeaders,
        'Origin': 'https://www.skland.com',
        'Referer': 'https://www.skland.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0', // 强制修改 UA
        'sec-ch-ua': '"Chromium";v="142", "Microsoft Edge";v="142", "Not_A Brand";v="99"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-site' // 关键：改为 same-site
      };

      // 移除 Electron 相关的头
      delete requestHeaders['x-electron'];

      callback({ requestHeaders });
    }
  )

  // 处理响应头
  mainWindow.webContents.session.webRequest.onHeadersReceived(
    { urls: allowedOrigins.map(origin => `${origin}/*`) },
    (details, callback) => {
      let responseHeaders = { ...details.responseHeaders }

      if (responseHeaders['Access-Control-Allow-Origin'] &&
        Array.isArray(responseHeaders['Access-Control-Allow-Origin'])) {
        responseHeaders['Access-Control-Allow-Origin'] = [responseHeaders['Access-Control-Allow-Origin'][0]]
      }

      callback({ responseHeaders })
    }
  )

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // 处理外部链接打开
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url).catch(err =>
      console.error('打开外部链接失败:', err)
    );
    return { action: 'deny' }
  })

  // 设置 CSP 策略
  mainWindow.webContents.session.webRequest.onHeadersReceived(
    { urls: ['*://*/*'] },
    (details, callback) => {
      const responseHeaders = { ...details.responseHeaders }
      
      if (is.dev) {
        // 开发环境：允许热重载，但尽量减少不安全配置
        responseHeaders['Content-Security-Policy'] = [
          "default-src 'self' 'unsafe-inline' data: http://localhost:5173 https:; " +
          "script-src 'self' 'unsafe-inline' http://localhost:5173; " +
          "style-src 'self' 'unsafe-inline' http://localhost:5173; " +
          "img-src 'self' data: https: http://localhost:5173; " +
          "font-src 'self' data: http://localhost:5173; " +
          "connect-src 'self' https: http://localhost:5173 ws://localhost:5173;"
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
          "frame-src 'none';"
        ]
      }
      
      callback({ responseHeaders })
    }
  )

  // 加载页面
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
      .catch(err => console.error('加载开发环境URL失败:', err));
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
      .catch(err => console.error('加载生产环境文件失败:', err));
  }
}

// 应用初始化
app.whenReady().then(() => {
  // 设置应用ID
  electronApp.setAppUserModelId('com.prts')

  // 权限请求处理
  session.defaultSession.setPermissionRequestHandler((_, permission, callback) => {
    const allowedPermissions = ['clipboard-read', 'notifications'];
    callback(allowedPermissions.includes(permission));
  })

  // 窗口快捷键优化
  app.on('browser-window-created', (_, window) => {
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

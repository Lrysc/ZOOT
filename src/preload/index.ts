import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  // API请求代理，专门用于解决CORS问题
  apiRequest: async (url: string, options?: any) => {
    return ipcRenderer.invoke('api-request', { url, options })
  },
  
  // 代理HTTP请求，用于绕过浏览器安全限制
  proxyRequest: async (url: string, options?: any) => {
    return ipcRenderer.invoke('proxy-request', { url, options })
  },
  
  // 打开调试窗口
  openDebugWindow: async (url?: string) => {
    return ipcRenderer.invoke('open-debug-window', url)
  },
  
  // 在调试窗口中执行API请求
  debugApiRequest: async (url: string, options?: any) => {
    return ipcRenderer.invoke('debug-api-request', { url, options })
  },
  
  // 窗口控制
  windowControl: {
    minimize: () => ipcRenderer.invoke('window-minimize'),
    maximize: () => ipcRenderer.invoke('window-maximize'),
    unmaximize: () => ipcRenderer.invoke('window-unmaximize'),
    close: () => ipcRenderer.invoke('window-close'),
    isMaximized: () => ipcRenderer.invoke('window-is-maximized')
  },

  // 森空岛签到
  sklandAttendance: () => ipcRenderer.invoke('skland-attendance'),

  // 发送系统通知
  showNotification: (title: string, body: string) => ipcRenderer.invoke('show-notification', { title, body })
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}

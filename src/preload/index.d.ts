import { ElectronAPI } from '@electron-toolkit/preload'

interface WindowAPI {
  apiRequest: (url: string, options?: any) => Promise<{ success: boolean; data?: any; headers?: any; error?: string; status?: number }>
  proxyRequest: (url: string, options?: any) => Promise<{ success: boolean; data?: any; error?: string }>
  openDebugWindow: (url?: string) => Promise<{ success: boolean }>
  debugApiRequest: (url: string, options?: any) => Promise<{ success: boolean }>
  windowControl: {
    minimize: () => Promise<void>
    maximize: () => Promise<void>
    unmaximize: () => Promise<void>
    close: () => Promise<void>
    isMaximized: () => Promise<boolean>
  }
  sklandAttendance: () => Promise<{ success: boolean; message?: string; awards?: string[] }>
  showNotification: (title: string, body: string) => Promise<{ success: boolean }>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: WindowAPI
  }
}

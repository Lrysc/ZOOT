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
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: WindowAPI
  }
}

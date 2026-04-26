/**
 * 认证相关类型定义
 */

import type { PlayerData } from './api'

// ============================================================================
// 认证状态类型
// ============================================================================

export interface AuthState {
  isLogin: boolean
  hgToken: string
  userId: string
  playerData: PlayerData | null
  bindingRoles: BindingCharacter[]
  sklandCred: string
  sklandSignToken: string
  lastUpdated: number
  cacheValid: boolean
  restoreAttempts: number
  isFetchingCred: boolean
  credPromise: Promise<{ cred: string; token: string }> | null
  isCredReady: boolean
  credRetryCount: number
  authError: string | null
  isInitializing: boolean
  isRestoring: boolean
  restorePromise: Promise<boolean> | null
}

export interface BindingCharacter {
  uid: string
  isOfficial: boolean
  isDefault: boolean
  channelMasterId: string
  channelName: string
  nickName: string
  isDelete: boolean
  roleToken?: string
}

// ============================================================================
// 存储相关类型
// ============================================================================

export interface StoredAuthState {
  isLogin: boolean
  hgToken: string
  userId: string
  playerData: unknown
  bindingRoles: BindingCharacter[]
  timestamp: number
  lastUpdated: number
  restoreAttempts: number
  version?: string
}

// ============================================================================
// 错误相关类型
// ============================================================================

export interface ApiError extends Error {
  response?: {
    status?: number
  }
  message: string
}

// ============================================================================
// 缓存配置
// ============================================================================

export interface CacheConfig {
  LOCAL_STORAGE_EXPIRY: number
  PLAYER_DATA_CACHE: number
  ROLES_CACHE: number
  CRED_CACHE: number
  MAX_RESTORE_ATTEMPTS: number
  MAX_CRED_RETRY: number
  CRED_RETRY_DELAY: number
}

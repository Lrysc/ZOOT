/**
 * API 请求/响应类型定义
 */

import type {
  PlayerStatus,
  BuildingData,
  RoutineData,
  CampaignData,
  TowerData,
  RogueData
} from './game'

// ============================================================================
// 签名相关类型
// ============================================================================

export interface SignHeaders {
  platform: string
  timestamp: string
  dId: string
  vName: string
}

// ============================================================================
// 通用响应类型
// ============================================================================

export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

// ============================================================================
// 认证相关类型
// ============================================================================

export interface LoginResult {
  success: boolean
  error?: string
  token?: string
  cred?: string
  userId?: string
  grantCode?: string
}

export interface HypergryphAccountResponse {
  code: number
  data: {
    content: string
  }
  msg: string
}

export interface SmsCodeResponse {
  status: number
  msg: string
}

export interface GrantCodeResponse {
  code: string
}

export interface SklandCredResponse {
  cred: string
  token: string
  userId: string
}

export interface LoginForm {
  phone: string
  password: string
  verificationCode?: string
}

// ============================================================================
// 绑定角色相关类型
// ============================================================================

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

export interface BindingList {
  appCode: string
  appName: string
  bindingList: BindingCharacter[]
  defaultUid: string
}

export interface BindingResponse {
  list: BindingList[]
}

// ============================================================================
// 玩家数据相关类型（API 原始响应）
// ============================================================================

export interface PlayerData {
  status?: PlayerStatus
  chars?: unknown[]
  assistChars?: AssistChar[]
  skins?: unknown[]
  building?: BuildingData
  routine?: RoutineData
  campaign?: CampaignData
  tower?: TowerData
  rogue?: RogueData
  recruit?: RecruitSlot[]
  rogueInfoMap?: Record<string, RogueInfo>
  charInfoMap?: Record<string, CharInfo>
  manufactureFormulaInfoMap?: Record<string, ManufactureFormulaInfo>
}

export interface AssistChar {
  charId: string
  level: number
  evolvePhase: number
  skillId?: string
  mainSkillLvl?: number
  potentialRank?: number
  specializeLevel?: number
  skinId?: string
}

export interface RecruitSlot {
  state: number
  startTs: number
  finishTs: number
  tags?: unknown[]
}

export interface RogueInfo {
  id: string
  name: string
  picUrl: string
  sort: number
}

export interface CharInfo {
  name: string
  profession?: string
  subProfessionId?: string
}

export interface ManufactureFormulaInfo {
  weight?: number
}

// ============================================================================
// 签到相关类型
// ============================================================================

export interface AttendanceResponse {
  awards: Array<{
    resource: {
      id: string
      name: string
      type: string
    }
    count: number
    type: string
  }>
  totalCount: number
}

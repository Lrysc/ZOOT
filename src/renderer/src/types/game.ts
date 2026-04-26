/**
 * 游戏数据类型定义
 */

import type { PlayerStatus } from './api'

export type { PlayerStatus }

// ============================================================================
// 理智信息
// ============================================================================

export interface ApInfo {
  current: number
  max: number
  remainSecs: number
  recoverTime: number
}

// ============================================================================
// 日常/周常任务
// ============================================================================

export interface RoutineData {
  daily?: {
    completed?: number
    total?: number
  }
  weekly?: {
    completed?: number
    total?: number
  }
}

// ============================================================================
// 剿灭作战
// ============================================================================

export interface CampaignData {
  reward: {
    current: number
    total: number
  }
}

// ============================================================================
// 集成战略
// ============================================================================

export interface RogueData {
  relicCnt: number
  records?: unknown[]
}

// ============================================================================
// 数据之塔
// ============================================================================

export interface TowerData {
  reward: {
    current: number
    total: number
    lowerItem: {
      current: number
      total: number
    }
    higherItem: {
      current: number
      total: number
    }
  }
}

// ============================================================================
// 公开招募
// ============================================================================

export interface RecruitInfo {
  isNull: boolean
  max: number
  complete: number
  remainSecs: number
  completeTime: number
}

export interface RecruitSlotDetail {
  slotIndex: number
  state: number
  status: string
  startTime: string
  finishTime: string
  startTs: number
  finishTs: number
}

// ============================================================================
// 公招刷新
// ============================================================================

export interface HireInfo {
  isNull: boolean
  count: number
  max: number
  remainSecs: number
  completeTime: number
}

// ============================================================================
// 训练室
// ============================================================================

export interface TrainingInfo {
  isNull: boolean
  traineeIsNull: boolean
  trainerIsNull: boolean
  status: number
  remainSecs: number
  completeTime: number
  trainee: string
  trainer: string
  profession: string
  targetSkill: number
  totalPoint: number
  remainPoint: number
  changeRemainSecsIrene: number
  changeTimeIrene: number
  changeRemainSecsLogos: number
  changeTimeLogos: number
}

export interface TrainingDetail {
  trainee: string
  trainer: string
  traineeCharId: string
  trainerCharId: string
  profession: string
  targetSkill: number
  status: number
  remainSecs: number
  completeTime: number
  totalPoint: number
  remainPoint: number
  changeRemainSecsIrene: number
  changeTimeIrene: number
  changeRemainSecsLogos: number
  changeTimeLogos: number
}

// ============================================================================
// 助战干员
// ============================================================================

export interface AssistCharDetail {
  charId: string
  name: string
  level: number
  evolvePhase: number
  evolvePhaseText: string
  skillId: string
  skillNumber: string
  skillText: string
  mainSkillLvl: number
  potentialRank: number
  potentialText: string
  specializeLevel: number
  moduleText: string
  skinId: string
  subProfessionId: string
  profession: string
  portraitUrl: string
  avatarUrl: string
  originalData: unknown
}

export interface AssistCharStatus {
  name: string
  level: number
  skill: string
  skillNumber: string
  skillIconUrl: string
  fullInfo: string
  portraitUrl: string
  avatarUrl: string
  charId: string
  evolvePhase: number
  subProfessionId: string
  profession: string
  rawData: AssistCharDetail
  potentialRank: number
  specializeLevel: number
  skinId: string
  mainSkillLvl: number
}

// ============================================================================
// 数据缓存
// ============================================================================

export interface DataCache {
  data: PlayerData
  timestamp: number
}

// ============================================================================
// 导入 PlayerData 用于定义
// ============================================================================
import type { PlayerData as ApiPlayerData } from './api'
export interface PlayerData extends ApiPlayerData {}

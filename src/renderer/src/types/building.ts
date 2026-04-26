/**
 * 基建相关类型定义
 */

// ============================================================================
// 基建数据
// ============================================================================

export interface BuildingData {
  furniture: {
    total: number
  }
  hire: {
    slots: unknown[]
    refreshCount: number
    completeWorkTime?: number
    lastUpdateTime?: number
    chars?: unknown[]
  }
  manufactures: ManufactureNode[]
  tradings: TradingNode[]
  dormitories: DormitoryNode[]
  meeting: {
    clue: {
      board: unknown[]
    }
    ownClues: unknown[]
    own?: number
    chars?: unknown[]
  }
  training: {
    trainee: {
      charId: string
      targetSkill?: number
    }
    trainer: {
      charId: string
    }
    remainSecs?: number
    lastUpdateTime?: number
    speed?: number
  }
  labor: {
    value?: number
    count?: number
    current?: number
    maxValue?: number
    max?: number
    remainSecs?: number
    lastUpdateTime?: number
  }
  tiredChars: unknown[]
  control?: {
    chars?: unknown[]
  }
  powers?: Array<{
    chars?: unknown[]
  }>
}

// ============================================================================
// 贸易站
// ============================================================================

export interface TradingNode {
  strategy: string
  stockLimit: number
  stock?: unknown[]
  completeWorkTime: number
  lastUpdateTime: number
  chars?: unknown[]
}

export interface TradingStation {
  strategy: string
  max: number
  current: number
  completeTime: number
  remainSecs: number
}

export interface TradingsInfo {
  isNull: boolean
  current: number
  max: number
  remainSecs: number
  completeTime: number
  tradings: TradingStation[]
}

export interface TradingDetail {
  stationIndex: number
  strategy: string
  strategyName: string
  current: number
  max: number
  progress: number
  remainSecs: number
  remainingTime: string
  completeTime: string
}

// ============================================================================
// 制造站
// ============================================================================

export interface ManufactureNode {
  formulaId: string
  capacity: number
  complete: number
  completeWorkTime: number
  lastUpdateTime: number
  chars?: unknown[]
  speed?: number
  weight?: number
  level?: number
  remain?: number
  slotId?: string
}

export interface ManufactureStation {
  formula: string
  max: number
  current: number
  completeTime: number
  remainSecs: number
}

export interface ManufacturesInfo {
  isNull: boolean
  current: number
  max: number
  remainSecs: number
  completeTime: number
  manufactures: ManufactureStation[]
}

export interface ManufactureDetail {
  stationIndex: number
  formula: string
  current: number
  max: number
  progress: number
  remainSecs: number
  remainingTime: string
  completeTime: string
}

// ============================================================================
// 宿舍
// ============================================================================

export interface DormitoryNode {
  level?: number
  comfort?: number
  chars: Array<{
    charId: string
    ap?: number
    lastApAddTime?: number
  }>
}

export interface DormitoriesInfo {
  isNull: boolean
  current: number
  max: number
}

// ============================================================================
// 无人机
// ============================================================================

export interface LaborInfo {
  current: number
  max: number
  remainSecs: number
  recoverTime: number
}

// ============================================================================
// 疲劳干员
// ============================================================================

export interface TiredInfo {
  current: number
  remainSecs: number
}

// ============================================================================
// 基建效率
// ============================================================================

export interface BuildingEfficiency {
  totalSpeedBuff: number
  totalLimitBuff: number
}

export interface OperatorBuff {
  buffType: string
  buffValue: number
}

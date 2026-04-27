// ============================================================================
// 基建相关类型（供 gameData store 使用）
// ============================================================================

export interface TradingStation {
  strategy: string;
  max: number;
  current: number;
  completeTime: number;
  remainSecs: number;
}

export interface TradingsInfo {
  isNull: boolean;
  current: number;
  max: number;
  remainSecs: number;
  completeTime: number;
  tradings: TradingStation[];
}

export interface ManufactureStation {
  formula: string;
  max: number;
  current: number;
  completeTime: number;
  remainSecs: number;
}

export interface ManufacturesInfo {
  isNull: boolean;
  current: number;
  max: number;
  remainSecs: number;
  completeTime: number;
  manufactures: ManufactureStation[];
}

export interface LaborInfo {
  current: number;
  max: number;
  remainSecs: number;
  recoverTime: number;
}

export interface DormitoriesInfo {
  isNull: boolean;
  current: number;
  max: number;
}

export interface TiredInfo {
  current: number;
  remainSecs: number;
}

export interface BuildingEfficiency {
  totalSpeedBuff: number;
  totalLimitBuff: number;
}

// ============================================================================
// 游戏数据相关类型（供 gameData store 使用）
// ============================================================================

export interface ApInfo {
  current: number;
  max: number;
  remainSecs: number;
  recoverTime: number;
}

export interface TrainingInfo {
  isNull: boolean;
  traineeIsNull: boolean;
  trainerIsNull: boolean;
  status: number;
  remainSecs: number;
  completeTime: number;
  trainee: string;
  trainer: string;
  profession: string;
  targetSkill: number;
  totalPoint: number;
  remainPoint: number;
  changeRemainSecsIrene: number;
  changeTimeIrene: number;
  changeRemainSecsLogos: number;
  changeTimeLogos: number;
}

export interface RecruitInfo {
  isNull: boolean;
  max: number;
  complete: number;
  remainSecs: number;
  completeTime: number;
}

export interface HireInfo {
  isNull: boolean;
  count: number;
  max: number;
  remainSecs: number;
  completeTime: number;
}

export interface RecruitSlotDetail {
  slotIndex: number;
  state: number;
  status: string;
  startTime: string;
  finishTime: string;
  startTs: number;
  finishTs: number;
}

export interface TradingDetail {
  stationIndex: number;
  strategy: string;
  strategyName: string;
  current: number;
  max: number;
  progress: number;
  remainSecs: number;
  remainingTime: string;
  completeTime: string;
}

export interface ManufactureDetail {
  stationIndex: number;
  formula: string;
  current: number;
  max: number;
  progress: number;
  remainSecs: number;
  remainingTime: string;
  completeTime: string;
}

export interface AssistCharDetail {
  charId: string;
  name: string;
  level: number;
  evolvePhase: number;
  evolvePhaseText: string;
  skillId: string;
  skillNumber: string;
  skillText: string;
  mainSkillLvl: number;
  potentialRank: number;
  potentialText: string;
  specializeLevel: number;
  moduleText: string;
  skinId: string;
  subProfessionId: string;
  profession: string;
  portraitUrl: string;
  avatarUrl: string;
  originalData: any;
}

export interface AssistCharStatus {
  name: string;
  level: number | string;
  skill: string;
  skillNumber?: string;
  skillIconUrl?: string;
  fullInfo: string;
  portraitUrl: string;
  avatarUrl: string;
  charId: string;
  evolvePhase: number;
  subProfessionId: string;
  profession: string;
  rawData: any;
  potentialRank: number;
  specializeLevel: number;
  skinId: string;
  mainSkillLvl: number;
}

export interface DataCache {
  data: any;
  timestamp: number;
}

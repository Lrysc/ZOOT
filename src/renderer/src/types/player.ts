// ============================================================================
// 玩家数据相关类型
// ============================================================================

export interface PlayerStatus {
  name: string;
  level: number;
  registerTs: number;
  mainStageProgress: string;
  ap: {
    current: number;
    max: number;
    completeRecoveryTime: number;
  };
  avatar?: {
    url: string;
  };
}

export interface BuildingData {
  furniture: {
    total: number;
  };
  hire: {
    slots: any[];
    refreshCount: number;
  };
  manufactures: any[];
  tradings: any[];
  dormitories: any[];
  meeting: {
    clue: {
      board: any[];
    };
    ownClues: any[];
  };
  training: {
    trainee: any[];
  };
  labor: {
    value?: number;
    count?: number;
    current?: number;
    maxValue?: number;
    max?: number;
  };
  tiredChars: any[];
}

export interface RoutineData {
  daily?: {
    completed?: number;
    total?: number;
  };
  weekly?: {
    completed?: number;
    total?: number;
  };
}

export interface CampaignData {
  reward: {
    current: number;
    total: number;
  };
}

export interface TowerData {
  reward: {
    current: number;
    total: number;
    lowerItem: {
      current: number;
      total: number;
    };
    higherItem: {
      current: number;
      total: number;
    };
  };
}

export interface RogueData {
  relicCnt: number;
}

export interface PlayerData {
  status: PlayerStatus;
  chars: any[];
  assistChars: any[];
  skins: any[];
  building: BuildingData;
  routine: RoutineData;
  campaign: CampaignData;
  tower: TowerData;
  rogue: RogueData;
}

export interface AttendanceResponse {
  awards: Array<{
    resource: {
      id: string;
      name: string;
      type: string;
    };
    count: number;
    type: string;
  }>;
  totalCount: number;
}

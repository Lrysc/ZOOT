// API 响应基础类型
export interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
}

// 登录相关类型
export interface LoginResult {
  success: boolean
  error?: string
  token?: string
  cred?: string
  userId?: string
  grantCode?: string; // 添加这个属性
}

// 绑定角色类型
export interface BindingCharacter {
  uid: string
  isOfficial: boolean
  isDefault: boolean
  channelMasterId: string
  channelName: string
  nickName: string
  isDelete: boolean
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

// 登录表单类型
export interface LoginForm {
  phone: string
  password: string
  verificationCode?: string
}

// 游戏数据相关类型定义
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

// 计算属性返回类型
export interface ApInfo {
  current: number;
  max: number;
  remainSecs: number;
  recoverTime: number;
}

// 寻访记录相关类型

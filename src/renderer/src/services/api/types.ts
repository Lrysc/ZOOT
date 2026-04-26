import CryptoJS from 'crypto-js';

// ============================================================================
// 签名相关类型与函数
// ============================================================================

export interface SignHeaders {
  platform: string;
  timestamp: string;
  dId: string;
  vName: string;
}

/**
 * 生成模拟设备 ID
 */
function generateMockDId(): string {
  const randomBytes = CryptoJS.lib.WordArray.random(32);
  return 'BL' + CryptoJS.enc.Base64.stringify(randomBytes);
}

export const getDId = async (): Promise<string> => {
  return generateMockDId();
};

/**
 * 严格按照文档的签名算法
 * sign = MD5(HMAC-SHA256(token, api + params + timestamp + jsonArgs))
 */
export function generateSignature(
  token: string,
  path: string,
  bodyOrQuery: string,
  timestamp: string,
  headers: SignHeaders
): string {
  const jsonArgs = JSON.stringify({
    platform: headers.platform,
    timestamp: headers.timestamp,
    dId: headers.dId,
    vName: headers.vName
  });

  const api = path;
  const params = bodyOrQuery.startsWith('?') ? bodyOrQuery.substring(1) : bodyOrQuery;
  const signString = api + params + timestamp + jsonArgs;

  console.log('=== 签名调试信息 ===');
  console.log('Token:', token.substring(0, 10) + '...');
  console.log('API:', api);
  console.log('Params:', params);
  console.log('Timestamp:', timestamp);
  console.log('JsonArgs:', jsonArgs);
  console.log('完整签名字符串:', signString);

  // HMAC-SHA256 -> MD5
  const hmac = CryptoJS.HmacSHA256(signString, token);
  const hmacHex = hmac.toString(CryptoJS.enc.Hex);
  const md5 = CryptoJS.MD5(hmacHex).toString();

  console.log('HMAC-SHA256:', hmacHex);
  console.log('最终签名:', md5);
  console.log('==================');

  return md5;
}

/**
 * 生成带签名的请求头
 */
export function getSignedHeaders(
  url: string,
  method: string,
  body: any,
  cred: string,
  token: string
): Record<string, string> {
  let fullUrl = url;
  if (url.startsWith('/api/')) {
    if (url.startsWith('/api/hg')) {
      fullUrl = 'https://as.hypergryph.com' + url.replace('/api/hg', '');
    } else if (url.startsWith('/api/skland')) {
      fullUrl = 'https://zonai.skland.com' + url.replace('/api/skland', '');
    } else if (url.startsWith('/api/user')) {
      fullUrl = 'https://zonai.skland.com' + url.replace('/api', '');
    }
  }

  const urlObj = new URL(fullUrl);
  const path = urlObj.pathname;

  let bodyOrQuery = '';
  if (method.toLowerCase() === 'get') {
    bodyOrQuery = urlObj.search || '';
  } else {
    bodyOrQuery = JSON.stringify(body || {});
  }

  const timestamp = String(Math.floor(Date.now() / 1000));
  const dId = generateMockDId();

  const signHeaders: SignHeaders = {
    platform: '3',
    timestamp: timestamp,
    dId: dId,
    vName: '1.0.0'
  };

  const sign = generateSignature(token, path, bodyOrQuery, timestamp, signHeaders);

  return {
    'cred': cred,
    'sign': sign,
    'platform': signHeaders.platform,
    'timestamp': signHeaders.timestamp,
    'dId': signHeaders.dId,
    'vName': signHeaders.vName,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Connection': 'close',
    'Content-Type': 'application/json',
    'Origin': 'https://www.skland.com',
    'Referer': 'https://www.skland.com/'
  };
}

// ============================================================================
// 通用响应类型
// ============================================================================

export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
}

// ============================================================================
// 认证相关类型
// ============================================================================

export interface LoginResult {
  success: boolean;
  error?: string;
  token?: string;
  cred?: string;
  userId?: string;
  grantCode?: string;
}

export interface HypergryphAccountResponse {
  code: number;
  data: {
    content: string;
  };
  msg: string;
}

export interface SmsCodeResponse {
  status: number;
  msg: string;
}

export interface GrantCodeResponse {
  code: string;
}

export interface SklandCredResponse {
  cred: string;
  token: string;
  userId: string;
}

export interface LoginForm {
  phone: string;
  password: string;
  verificationCode?: string;
}

// ============================================================================
// 绑定角色相关类型
// ============================================================================

export interface BindingCharacter {
  uid: string;
  isOfficial: boolean;
  isDefault: boolean;
  channelMasterId: string;
  channelName: string;
  nickName: string;
  isDelete: boolean;
  roleToken?: string;
}

export interface BindingList {
  appCode: string;
  appName: string;
  bindingList: BindingCharacter[];
  defaultUid: string;
}

export interface BindingResponse {
  list: BindingList[];
}

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

export interface ApInfo {
  current: number;
  max: number;
  remainSecs: number;
  recoverTime: number;
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

// ============================================================================
// 抽卡记录相关类型
// ============================================================================

export interface GachaCategory {
  id: string;
  name: string;
}

export interface GachaRecord {
  poolId: string;
  poolName: string;
  charId: string;
  charName: string;
  rarity: number;
  isNew: boolean;
  gachaTs: string;
  pos: number;
}

export interface GachaHistoryResponse {
  list: GachaRecord[];
  hasMore: boolean;
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 计算理智信息
 */
export const calculateApInfo = (playerData: PlayerData): ApInfo => {
  const { current, max, completeRecoveryTime } = playerData.status.ap;
  const currentTime = Math.floor(Date.now() / 1000);
  const remainSecs = Math.max(0, completeRecoveryTime - currentTime);
  const recoverTime = completeRecoveryTime * 1000;

  return {
    current,
    max,
    remainSecs,
    recoverTime
  };
};

/**
 * 获取日常周常任务进度
 */
export const getRoutineProgress = (routine: RoutineData) => {
  const dailyCompleted = routine.daily?.completed || 0;
  const dailyTotal = routine.daily?.total || 0;
  const weeklyCompleted = routine.weekly?.completed || 0;
  const weeklyTotal = routine.weekly?.total || 0;

  return {
    daily: {
      completed: dailyCompleted,
      total: dailyTotal,
      progress: dailyTotal > 0 ? (dailyCompleted / dailyTotal) * 100 : 0
    },
    weekly: {
      completed: weeklyCompleted,
      total: weeklyTotal,
      progress: weeklyTotal > 0 ? (weeklyCompleted / weeklyTotal) * 100 : 0
    }
  };
};

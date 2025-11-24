import { getDId, getSignedHeaders } from '../utils/api/security';

// ============================================================================
// 类型定义区
// ============================================================================

/**
 * API 响应基础类型
 */
export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
}

/**
 * 鹰角网络登录响应数据类型
 */
export interface HypergryphTokenResponse {
  token: string;
}

/**
 * 验证码发送响应类型
 */
export interface SmsCodeResponse {
  status: number;
  msg: string;
}

/**
 * OAuth2 授权码响应类型
 */
export interface GrantCodeResponse {
  code: string;
}

/**
 * 森空岛认证凭证响应类型
 */
export interface SklandCredResponse {
  cred: string;
  token: string;
  userId: string;
}

/**
 * 绑定角色信息类型
 */
export interface BindingCharacter {
  uid: string;
  isOfficial: boolean;
  isDefault: boolean;
  channelMasterId: string;
  channelName: string;
  nickName: string;
  isDelete: boolean;
}

/**
 * 绑定列表类型
 */
export interface BindingList {
  appCode: string;
  appName: string;
  bindingList: BindingCharacter[];
  defaultUid: string;
}

/**
 * 绑定角色响应类型
 */
export interface BindingResponse {
  list: BindingList[];
}

/**
 * 玩家状态信息类型
 */
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
}

/**
 * 基建数据信息类型
 */
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

/**
 * 日常周常任务数据
 */
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

/**
 * 活动数据
 */
export interface CampaignData {
  reward: {
    current: number;
    total: number;
  };
}

/**
 * 危机合约数据
 */
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

/**
 * 肉鸽数据
 */
export interface RogueData {
  relicCnt: number;
}

/**
 * 完整玩家数据类型
 */
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

/**
 * 理智信息计算类型
 */
export interface ApInfo {
  current: number;
  max: number;
  remainSecs: number;
  recoverTime: number;
}

/**
 * 卡池分类信息类型
 */
export interface GachaCategory {
  id: string;
  name: string;
  startTime: number;
  endTime: number;
}

/**
 * 抽卡记录项类型
 */
export interface GachaRecord {
  ts: number;
  pool: string;
  chars: {
    name: string;
    rarity: number;
    isNew: boolean;
  }[];
}

/**
 * 抽卡记录响应类型
 */
export interface GachaRecordsResponse {
  list: GachaRecord[];
  hasMore: boolean;
  nextPos: number;
  nextGachaTs: number;
}

/**
 * 签到响应类型
 */
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
// 基础配置和工具函数
// ============================================================================

/**
 * API 基础配置
 */
const isDev = import.meta.env.DEV;
const API_BASE = {
  hgAuth: isDev ? '/api/hg' : 'https://as.hypergryph.com',
  skland: isDev ? '/api/skland' : 'https://zonai.skland.com'
};

/**
 * 获取通用请求头
 * @returns 通用请求头对象
 */
const getCommonHeaders = () => {
  return {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Connection': 'close',
    'Content-Type': 'application/json',
    'Origin': isDev ? 'http://localhost:5173' : 'https://www.skland.com',
    'Referer': isDev ? 'http://localhost:5173/' : 'https://www.skland.com/'
  };
};

/**
 * 处理 API 响应，包含错误处理
 * @param response - fetch 响应对象
 * @param apiName - API 名称，用于错误信息
 * @returns 解析后的 JSON 数据
 * @throws 当 HTTP 状态码非 200 或 API 返回错误码时抛出错误
 */
const handleApiResponse = async (response: Response, apiName: string): Promise<any> => {
  if (!response.ok) {
    console.error(`${apiName} HTTP 错误: ${response.status} ${response.statusText}`);
    throw new Error(`${apiName} 请求失败: HTTP ${response.status}`);
  }

  const data = await response.json();
  console.log(`${apiName} 响应:`, data);

  // 检查业务逻辑错误码
  if (data.status !== 0 && data.code !== 0) {
    const errorMsg = data.msg || data.message || `${apiName} 业务逻辑错误`;
    console.error(`${apiName} 业务错误:`, data);
    throw new Error(errorMsg);
  }

  return data;
};

// ============================================================================
// 认证相关 API
// ============================================================================

/**
 * 认证相关 API 接口
 */
export const AuthAPI = {
  /**
   * 通过手机号和密码登录获取鹰角 token
   * @param phone - 手机号码
   * @param password - 密码
   * @returns 鹰角网络 token
   * @throws 当登录失败时抛出错误
   */
  loginByPassword: async (phone: string, password: string): Promise<string> => {
    const dId = await getDId();
    const url = `${API_BASE.hgAuth}/user/auth/v1/token_by_phone_password`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...getCommonHeaders(),
        'dId': dId,
        'platform': '3',
        'vName': '1.0.0'
      },
      body: JSON.stringify({ phone, password })
    });

    const data = await handleApiResponse(response, '密码登录');
    return data.data.token;
  },

  /**
   * 发送短信验证码
   * @param phone - 手机号码
   * @returns 发送是否成功
   * @throws 当发送失败时抛出错误
   */
  sendSmsCode: async (phone: string): Promise<boolean> => {
    const dId = await getDId();
    const url = `${API_BASE.hgAuth}/general/v1/send_phone_code`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...getCommonHeaders(),
        'dId': dId,
        'platform': '3',
        'vName': '1.0.0'
      },
      body: JSON.stringify({ phone, type: 2 })
    });

    await handleApiResponse(response, '发送验证码');
    return true;
  },

  /**
   * 通过短信验证码登录获取鹰角 token
   * @param phone - 手机号码
   * @param code - 短信验证码
   * @returns 鹰角网络 token
   * @throws 当登录失败时抛出错误
   */
  loginBySmsCode: async (phone: string, code: string): Promise<string> => {
    const dId = await getDId();
    const url = `${API_BASE.hgAuth}/user/auth/v2/token_by_phone_code`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...getCommonHeaders(),
        'dId': dId,
        'platform': '3',
        'vName': '1.0.0'
      },
      body: JSON.stringify({ phone, code })
    });

    const data = await handleApiResponse(response, '验证码登录');
    return data.data.token;
  },

  /**
   * 获取 OAuth2 授权码
   * @param hgToken - 鹰角网络 token
   * @returns OAuth2 授权码
   * @throws 当获取授权码失败时抛出错误
   */
  getGrantCode: async (hgToken: string): Promise<string> => {
    const dId = await getDId();
    const url = `${API_BASE.hgAuth}/user/oauth2/v2/grant`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...getCommonHeaders(),
        'dId': dId,
        'platform': '3',
        'vName': '1.0.0'
      },
      body: JSON.stringify({
        token: hgToken,
        appCode: '4ca99fa6b56cc2ba', // 森空岛 App Code
        type: 0
      })
    });

    const data = await handleApiResponse(response, '获取授权码');
    return data.data.code;
  },

  /**
   * 获取森空岛认证凭证 (Cred)
   * @param grantCode - OAuth2 授权码
   * @returns 森空岛认证凭证信息
   * @throws 当获取凭证失败时抛出错误
   */
  getSklandCred: async (grantCode: string): Promise<SklandCredResponse> => {
    const dId = await getDId();
    const url = `${API_BASE.skland}/api/v1/user/auth/generate_cred_by_code`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...getCommonHeaders(),
        'dId': dId,
        'platform': '3',
        'vName': '1.0.0'
      },
      body: JSON.stringify({ kind: 1, code: grantCode })
    });

    const data = await handleApiResponse(response, '获取 Cred');
    return data.data;
  },

  /**
   * 获取绑定角色列表
   * @param cred - 森空岛认证凭证
   * @param signToken - 签名 token
   * @returns 绑定角色列表
   * @throws 当获取角色列表失败时抛出错误
   */
  getBindingRoles: async (cred: string, signToken: string): Promise<BindingCharacter[]> => {
    const url = `${API_BASE.skland}/api/v1/game/player/binding`;
    const headers = getSignedHeaders(url, 'GET', null, cred, signToken);

    console.log('获取绑定角色请求头:', headers);

    const response = await fetch(url, {
      method: 'GET',
      headers
    });

    const data = await handleApiResponse(response, '获取绑定角色');

    // 查找明日方舟游戏的角色绑定列表
    const arknightsBinding = data.data.list.find((item: BindingList) => item.appCode === 'arknights');
    return arknightsBinding?.bindingList || [];
  },

  /**
   * 获取玩家数据
   * @param cred - 森空岛认证凭证
   * @param signToken - 签名 token
   * @param uid - 玩家 UID
   * @returns 玩家数据
   * @throws 当获取玩家数据失败时抛出错误
   */
  getPlayerData: async (cred: string, signToken: string, uid: string): Promise<PlayerData> => {
    const url = `${API_BASE.skland}/api/v1/game/player/info?uid=${uid}`;
    const headers = getSignedHeaders(url, 'GET', null, cred, signToken);

    console.log('获取玩家数据请求头:', headers);

    const response = await fetch(url, {
      method: 'GET',
      headers
    });

    const data = await handleApiResponse(response, '获取玩家数据');
    return data.data;
  },

  /**
   * 校验 Cred 有效性
   * @param cred - 森空岛认证凭证
   * @returns 校验是否通过
   */
  checkCred: async (cred: string): Promise<boolean> => {
    const url = `${API_BASE.skland}/api/v1/user/check`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...getCommonHeaders(),
        'Cred': cred
      }
    });

    try {
      const data = await handleApiResponse(response, '校验 Cred');
      return data.code === 0;
    } catch (error) {
      console.error('Cred 校验失败:', error);
      return false;
    }
  },

  /**
   * 执行签到操作
   * @param cred - 森空岛认证凭证
   * @param signToken - 签名 token
   * @param uid - 玩家 UID
   * @param gameId - 游戏 ID
   * @returns 签到结果
   * @throws 当签到失败时抛出错误
   */
  attendance: async (
    cred: string,
    signToken: string,
    uid: string,
    gameId: string
  ): Promise<AttendanceResponse & { alreadyAttended?: boolean; message?: string }> => {
    const url = `${API_BASE.skland}/api/v1/game/attendance`;

    // 确保 gameId 是数字类型
    const gameIdNum = parseInt(gameId);
    const requestBody = { uid, gameId: gameIdNum };

    // 使用正确的请求体进行签名
    const headers = getSignedHeaders(url, 'POST', requestBody, cred, signToken);

    console.log('签到请求头:', headers);
    console.log('签到请求体:', requestBody);

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    console.log('签到响应:', data);

    // 特殊处理重复签到的情况
    if (data.code === 10001) {
      return {
        message: '今日已签到',
        alreadyAttended: true,
        awards: [],
        totalCount: 0
      };
    }

    if (!response.ok) {
      console.error(`HTTP ${response.status} - 签到失败`);
      console.error('错误详情:', data);

      if (response.status === 401) {
        throw new Error('认证失败，请检查登录凭证是否有效');
      }
      if (response.status === 400 && data.message) {
        throw new Error(`请求参数错误: ${data.message}`);
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (data.code !== 0) {
      console.error('API错误:', data);
      throw new Error(data.message || '签到失败');
    }

    return data.data;
  }
};

// ============================================================================
// 抽卡记录相关 API
// ============================================================================

/**
 * 抽卡记录相关 API 接口
 */
export const GachaAPI = {
  /**
   * 获取卡池分类列表
   * @param cred - 森空岛认证凭证
   * @param signToken - 签名 token
   * @param uid - 玩家 UID
   * @returns 卡池分类列表
   * @throws 当获取卡池分类失败时抛出错误
   */
  getGachaCategories: async (
    cred: string,
    signToken: string,
    uid: string
  ): Promise<GachaCategory[]> => {
    // 尝试多个可能的API路径
    const possibleUrls = [
      isDev ? `/api/user/api/inquiry/gacha/cate?uid=${uid}` : `${API_BASE.skland}/user/api/inquiry/gacha/cate?uid=${uid}`,
      `${API_BASE.skland}/api/v1/gacha/cate?uid=${uid}`,
      `${API_BASE.skland}/api/v2/gacha/cate?uid=${uid}`,
      `${API_BASE.skland}/gacha/api/v1/cate?uid=${uid}`,
      `${API_BASE.skland}/user/api/v1/gacha/cate?uid=${uid}`,
      `${API_BASE.skland}/api/v1/user/gacha/cate?uid=${uid}`
    ];

    let lastError: Error | null = null;

    for (const url of possibleUrls) {
      try {
        console.log(`尝试获取卡池分类，URL: ${url}`);
        const headers = getSignedHeaders(url, 'GET', null, cred, signToken);
        console.log('获取卡池分类请求头:', headers);

        const response = await fetch(url, {
          method: 'GET',
          headers
        });

        const data = await handleApiResponse(response, '获取卡池分类');
        console.log(`成功获取卡池分类，使用URL: ${url}`);
        return data.data || data;
      } catch (error) {
        console.log(`URL ${url} 失败:`, error);
        lastError = error as Error;
        continue;
      }
    }

    // 所有URL都失败了
    console.error('所有可能的抽卡API路径都失败了');
    throw lastError || new Error('获取卡池分类失败');
  },

  /**
   * 获取抽卡记录
   * @param cred - 森空岛认证凭证
   * @param signToken - 签名 token
   * @param uid - 玩家 UID
   * @param category - 卡池分类
   * @param size - 获取记录数量，默认 20
   * @returns 抽卡记录响应
   * @throws 当获取抽卡记录失败时抛出错误
   */
  getGachaRecords: async (
    cred: string,
    signToken: string,
    uid: string,
    category: string,
    size: number = 20
  ): Promise<GachaRecordsResponse> => {
    // 尝试多个可能的API路径
    const possibleUrls = [
      isDev ? `/api/user/api/inquiry/gacha/history?uid=${uid}&category=${category}&size=${size}` : `${API_BASE.skland}/user/api/inquiry/gacha/history?uid=${uid}&category=${category}&size=${size}`,
      `${API_BASE.skland}/api/v1/gacha/history?uid=${uid}&category=${category}&size=${size}`,
      `${API_BASE.skland}/api/v2/gacha/history?uid=${uid}&category=${category}&size=${size}`,
      `${API_BASE.skland}/gacha/api/v1/history?uid=${uid}&category=${category}&size=${size}`,
      `${API_BASE.skland}/user/api/v1/gacha/history?uid=${uid}&category=${category}&size=${size}`,
      `${API_BASE.skland}/api/v1/user/gacha/history?uid=${uid}&category=${category}&size=${size}`
    ];

    let lastError: Error | null = null;

    for (const url of possibleUrls) {
      try {
        console.log(`尝试获取抽卡记录，URL: ${url}`);
        const headers = getSignedHeaders(url, 'GET', null, cred, signToken);
        console.log('获取抽卡记录请求头:', headers);

        const response = await fetch(url, {
          method: 'GET',
          headers
        });

        const data = await handleApiResponse(response, '获取抽卡记录');
        console.log(`成功获取抽卡记录，使用URL: ${url}`);
        return data.data || data;
      } catch (error) {
        console.log(`URL ${url} 失败:`, error);
        lastError = error as Error;
        continue;
      }
    }

    // 所有URL都失败了
    console.error('所有可能的抽卡记录API路径都失败了');
    throw lastError || new Error('获取抽卡记录失败');
  },

  /**
   * 获取更多抽卡记录（分页）
   * @param cred - 森空岛认证凭证
   * @param signToken - 签名 token
   * @param uid - 玩家 UID
   * @param category - 卡池分类
   * @param gachaTs - 时间戳，用于分页
   * @param pos - 位置，默认 1
   * @param size - 获取记录数量，默认 20
   * @returns 抽卡记录响应
   * @throws 当获取更多抽卡记录失败时抛出错误
   */
  getMoreGachaRecords: async (
    cred: string,
    signToken: string,
    uid: string,
    category: string,
    gachaTs: number,
    pos: number = 1,
    size: number = 20
  ): Promise<GachaRecordsResponse> => {
    // 尝试多个可能的API路径
    const possibleUrls = [
      isDev ? `/api/user/api/inquiry/gacha/history?uid=${uid}&category=${category}&pos=${pos}&gachaTs=${gachaTs}&size=${size}` : `${API_BASE.skland}/user/api/inquiry/gacha/history?uid=${uid}&category=${category}&pos=${pos}&gachaTs=${gachaTs}&size=${size}`,
      `${API_BASE.skland}/api/v1/gacha/history?uid=${uid}&category=${category}&pos=${pos}&gachaTs=${gachaTs}&size=${size}`,
      `${API_BASE.skland}/api/v2/gacha/history?uid=${uid}&category=${category}&pos=${pos}&gachaTs=${gachaTs}&size=${size}`,
      `${API_BASE.skland}/gacha/api/v1/history?uid=${uid}&category=${category}&pos=${pos}&gachaTs=${gachaTs}&size=${size}`,
      `${API_BASE.skland}/user/api/v1/gacha/history?uid=${uid}&category=${category}&pos=${pos}&gachaTs=${gachaTs}&size=${size}`,
      `${API_BASE.skland}/api/v1/user/gacha/history?uid=${uid}&category=${category}&pos=${pos}&gachaTs=${gachaTs}&size=${size}`
    ];

    let lastError: Error | null = null;

    for (const url of possibleUrls) {
      try {
        console.log(`尝试获取更多抽卡记录，URL: ${url}`);
        const headers = getSignedHeaders(url, 'GET', null, cred, signToken);
        console.log('获取更多抽卡记录请求头:', headers);

        const response = await fetch(url, {
          method: 'GET',
          headers
        });

        const data = await handleApiResponse(response, '获取更多抽卡记录');
        console.log(`成功获取更多抽卡记录，使用URL: ${url}`);
        return data.data || data;
      } catch (error) {
        console.log(`URL ${url} 失败:`, error);
        lastError = error as Error;
        continue;
      }
    }

    // 所有URL都失败了
    console.error('所有可能的更多抽卡记录API路径都失败了');
    throw lastError || new Error('获取更多抽卡记录失败');
  }
};

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 计算理智信息
 * @param playerData - 玩家数据
 * @returns 理智信息
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
 * @param routine - 日常周常数据
 * @returns 任务进度信息
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

export default {
  AuthAPI,
  GachaAPI,
  calculateApInfo,
  getRoutineProgress
};

import { getDId, getSignedHeaders } from './types';

// ============================================================================
// 基础配置
// ============================================================================

const isDev = import.meta.env.DEV;
const API_BASE = {
  hgAuth: isDev ? '/api/hg' : 'https://as.hypergryph.com',
  skland: isDev ? '/api/skland' : 'https://zonai.skland.com'
};

// ============================================================================
// 通用工具函数
// ============================================================================

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
 */
const handleApiResponse = async (response: Response, apiName: string): Promise<any> => {
  if (!response.ok) {
    console.error(`${apiName} HTTP 错误: ${response.status} ${response.statusText}`);
    throw new Error(`${apiName} 请求失败: HTTP ${response.status}`);
  }

  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text();
    console.error(`${apiName} 响应不是 JSON:`, text.substring(0, 200));
    throw new Error(`${apiName} 响应格式错误，请检查代理配置`);
  }

  const data = await response.json();
  console.log(`${apiName} 响应:`, data);

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

export const AuthAPI = {
  /**
   * 通过手机号和密码登录获取鹰角 token
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
        appCode: '4ca99fa6b56cc2ba',
        type: 0
      })
    });

    const data = await handleApiResponse(response, '获取授权码');
    return data.data.code;
  },

  /**
   * 获取森空岛认证凭证 (Cred)
   */
  getSklandCred: async (grantCode: string) => {
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
   */
  getBindingRoles: async (cred: string, signToken: string) => {
    const url = `${API_BASE.skland}/api/v1/game/player/binding`;
    const headers = getSignedHeaders(url, 'GET', null, cred, signToken);

    console.log('获取绑定角色请求头:', headers);

    const response = await fetch(url, {
      method: 'GET',
      headers
    });

    const data = await handleApiResponse(response, '获取绑定角色');

    console.log('绑定角色API完整响应:', JSON.stringify(data, null, 2));

    const arknightsBinding = data.data.list.find((item: any) => item.appCode === 'arknights');
    const bindingList = arknightsBinding?.bindingList || [];

    console.log('明日方舟绑定列表:', JSON.stringify(bindingList, null, 2));

    return bindingList;
  },

  /**
   * 获取玩家数据
   */
  getPlayerData: async (cred: string, signToken: string, uid: string) => {
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
   */
  attendance: async (cred: string, signToken: string, uid: string, gameId: string) => {
    const url = `${API_BASE.skland}/api/v1/game/attendance`;

    const gameIdNum = parseInt(gameId);
    const requestBody = { uid, gameId: gameIdNum };

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

export default AuthAPI;

import { getDId, getSignedHeaders } from '../utils/api/security';

// 基础配置
const isDev = import.meta.env.DEV;
const API_BASE = {
  hgAuth: isDev ? '/api/hg' : 'https://as.hypergryph.com',
  skland: isDev ? '/api/skland' : 'https://zonai.skland.com'
};

// 通用请求头（基于网页观察）
const getCommonHeaders = () => {
  const isDev = import.meta.env.DEV;
  return {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Connection': 'close',
    'Content-Type': 'application/json',
    'Origin': isDev ? 'http://localhost:5173' : 'https://www.skland.com',
    'Referer': isDev ? 'http://localhost:5173/' : 'https://www.skland.com/'
  };
};

// 登录相关接口
export const AuthAPI = {
  // 密码登录获取鹰角token
  loginByPassword: async (phone: string, password: string) => {
    const dId = await getDId();
    const response = await fetch(`${API_BASE.hgAuth}/user/auth/v1/token_by_phone_password`, {
      method: 'POST',
      headers: {
        ...getCommonHeaders(),
        'dId': dId,
        'platform': '3',
        'vName': '1.0.0'
      },
      body: JSON.stringify({ phone, password })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('登录响应:', data);

    if (data.status !== 0) throw new Error(data.msg || '登录失败');
    return data.data.token;
  },

  // 发送验证码
  sendSmsCode: async (phone: string) => {
    const dId = await getDId();
    const response = await fetch(`${API_BASE.hgAuth}/general/v1/send_phone_code`, {
      method: 'POST',
      headers: {
        ...getCommonHeaders(),
        'dId': dId,
        'platform': '3',
        'vName': '1.0.0'
      },
      body: JSON.stringify({ phone, type: 2 })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('验证码发送响应:', data);

    if (data.status !== 0) throw new Error(data.msg || '验证码发送失败');
    return true;
  },

  // 验证码登录获取鹰角token
  loginBySmsCode: async (phone: string, code: string) => {
    const dId = await getDId();
    const response = await fetch(`${API_BASE.hgAuth}/user/auth/v2/token_by_phone_code`, {
      method: 'POST',
      headers: {
        ...getCommonHeaders(),
        'dId': dId,
        'platform': '3',
        'vName': '1.0.0'
      },
      body: JSON.stringify({ phone, code })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('验证码登录响应:', data);

    if (data.status !== 0) throw new Error(data.msg || '验证码登录失败');
    return data.data.token;
  },

  // 获取OAuth2授权码
  getGrantCode: async (hgToken: string) => {
    const dId = await getDId();
    const response = await fetch(`${API_BASE.hgAuth}/user/oauth2/v2/grant`, {
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

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('OAuth2授权码响应:', data);

    if (data.status !== 0) throw new Error(data.msg || '获取授权码失败');
    return data.data.code;
  },

  // 获取森空岛Cred
  getSklandCred: async (grantCode: string) => {
    const dId = await getDId();
    const response = await fetch(`${API_BASE.skland}/api/v1/user/auth/generate_cred_by_code`, {
      method: 'POST',
      headers: {
        ...getCommonHeaders(),
        'dId': dId,
        'platform': '3',
        'vName': '1.0.0'
      },
      body: JSON.stringify({ kind: 1, code: grantCode })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Cred响应:', data);

    if (data.code !== 0) throw new Error(data.message || '获取Cred失败');
    return data.data; // { cred: string, token: string, userId: string }
  },

  // 获取绑定角色列表
  getBindingRoles: async (cred: string, signToken: string) => {
    const url = `${API_BASE.skland}/api/v1/game/player/binding`;
    const headers = getSignedHeaders(url, 'GET', null, cred, signToken);

    console.log('获取绑定角色请求头:', headers);

    const response = await fetch(url, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      console.error(`HTTP ${response.status} - 获取绑定角色失败`);
      if (response.status === 401) {
        throw new Error('认证失败，请检查登录凭证是否有效');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('绑定角色响应:', data);

    if (data.code !== 0) {
      console.error('API错误:', data);
      throw new Error(data.message || '获取角色列表失败');
    }
    return data.data.list.find((item: any) => item.appCode === 'arknights')?.bindingList || [];
  },

  // 获取玩家数据（用于用户卡片展示）
  getPlayerData: async (cred: string, signToken: string, uid: string) => {
    const url = `${API_BASE.skland}/api/v1/game/player/info?uid=${uid}`;
    const headers = getSignedHeaders(url, 'GET', null, cred, signToken);

    console.log('获取玩家数据请求头:', headers);

    const response = await fetch(url, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      console.error(`HTTP ${response.status} - 获取玩家数据失败`);
      if (response.status === 401) {
        throw new Error('认证失败，请检查登录凭证是否有效');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('玩家数据响应:', data);

    if (data.code !== 0) {
      console.error('API错误:', data);
      throw new Error(data.message || '获取玩家数据失败');
    }
    return data.data;
  },

  // 校验Cred有效性
  checkCred: async (cred: string) => {
    const response = await fetch(`${API_BASE.skland}/api/v1/user/check`, {
      method: 'GET',
      headers: {
        ...getCommonHeaders(),
        'Cred': cred
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Cred校验响应:', data);

    return data.code === 0;
  },

  // 签到功能
  attendance: async (cred: string, signToken: string, uid: string, gameId: string) => {
    const url = `${API_BASE.skland}/api/v1/game/attendance`;

    // 确保gameId是数字类型，并创建正确的请求体
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

    if (!response.ok) {
      console.error(`HTTP ${response.status} - 签到失败`);
      console.error('错误详情:', data);
      if (response.status === 401) {
        throw new Error('认证失败，请检查登录凭证是否有效');
      }
      if (response.status === 400 && data.message) {
        throw new Error(`请求参数错误: ${data.message}`);
      }
      if (response.status === 403 && data.code === 10001) {
        // 特殊处理重复签到的情况
        return { message: '今日已签到', alreadyAttended: true };
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (data.code !== 0) {
      console.error('API错误:', data);
      if (data.code === 10001) {
        // 处理重复签到的情况
        return { message: '今日已签到', alreadyAttended: true };
      }
      throw new Error(data.message || '签到失败');
    }
    return data.data;
  }
};

// 抽卡记录相关接口
export const GachaAPI = {
  // 获取卡池分类
  getGachaCategories: async (cred: string, signToken: string, uid: string) => {
    const url = `${API_BASE.skland}/user/api/inquiry/gacha/cate?uid=${uid}`;
    const headers = getSignedHeaders(url, 'GET', null, cred, signToken);

    console.log('获取卡池分类请求头:', headers);

    const response = await fetch(url, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      console.error(`HTTP ${response.status} - 获取卡池分类失败`);
      if (response.status === 401) {
        throw new Error('认证失败，请检查登录凭证是否有效');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('卡池分类响应:', data);

    if (data.code !== 0) {
      console.error('API错误:', data);
      throw new Error(data.message || '获取卡池分类失败');
    }
    return data.data;
  },

  // 获取抽卡记录
  getGachaRecords: async (cred: string, signToken: string, uid: string, category: string, size: number = 20) => {
    const url = `${API_BASE.skland}/user/api/inquiry/gacha/history?uid=${uid}&category=${category}&size=${size}`;
    const headers = getSignedHeaders(url, 'GET', null, cred, signToken);

    console.log('获取抽卡记录请求头:', headers);

    const response = await fetch(url, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      console.error(`HTTP ${response.status} - 获取抽卡记录失败`);
      if (response.status === 401) {
        throw new Error('认证失败，请检查登录凭证是否有效');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('抽卡记录响应:', data);

    if (data.code !== 0) {
      console.error('API错误:', data);
      throw new Error(data.message || '获取抽卡记录失败');
    }
    return data.data;
  },

  // 获取更多抽卡记录
  getMoreGachaRecords: async (cred: string, signToken: string, uid: string, category: string, gachaTs: number, pos: number = 1, size: number = 20) => {
    const url = `${API_BASE.skland}/user/api/inquiry/gacha/history?uid=${uid}&category=${category}&pos=${pos}&gachaTs=${gachaTs}&size=${size}`;
    const headers = getSignedHeaders(url, 'GET', null, cred, signToken);

    console.log('获取更多抽卡记录请求头:', headers);

    const response = await fetch(url, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      console.error(`HTTP ${response.status} - 获取更多抽卡记录失败`);
      if (response.status === 401) {
        throw new Error('认证失败，请检查登录凭证是否有效');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('更多抽卡记录响应:', data);

    if (data.code !== 0) {
      console.error('API错误:', data);
      throw new Error(data.message || '获取更多抽卡记录失败');
    }
    return data.data;
  }
};

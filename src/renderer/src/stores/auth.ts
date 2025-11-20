import { defineStore } from 'pinia';
import { AuthAPI } from '@services/api';

/**
 * 认证状态接口定义
 */
interface AuthState {
  isLogin: boolean;
  hgToken: string;
  sklandCred: string;
  sklandSignToken: string;
  userId: string;
  playerData: any;
  bindingRoles: any[];
  // 新增缓存相关状态
  lastUpdated: number; // 最后更新时间戳
  cacheValid: boolean; // 缓存是否有效
}

/**
 * API错误接口扩展
 */
interface ApiError extends Error {
  response?: {
    status?: number;
  };
  message: string;
}

/**
 * 缓存配置
 */
const CACHE_CONFIG = {
  // 本地存储过期时间：7天
  LOCAL_STORAGE_EXPIRY: 7 * 24 * 60 * 60 * 1000,
  // 玩家数据缓存时间：5分钟
  PLAYER_DATA_CACHE: 5 * 60 * 1000,
  // 角色列表缓存时间：10分钟
  ROLES_CACHE: 10 * 60 * 1000,
  // 凭证检查缓存时间：1分钟
  CRED_CHECK_CACHE: 60 * 1000
};

/**
 * 优化后的认证状态管理Store
 */
export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    isLogin: false,
    hgToken: '',
    sklandCred: '',
    sklandSignToken: '',
    userId: '',
    playerData: null,
    bindingRoles: [],
    lastUpdated: 0,
    cacheValid: false
  }),

  getters: {
    userName: (state) => state.playerData?.status?.name || '未知用户',
    userLevel: (state) => state.playerData?.status?.level || 0,
    mainUid: (state) => state.bindingRoles.find(role => role.isDefault)?.uid || state.bindingRoles[0]?.uid || '',
    hasBindingRoles: (state) => state.bindingRoles.length > 0,

    /**
     * 检查玩家数据是否需要刷新
     */
    shouldRefreshPlayerData: (state) => {
      if (!state.playerData) return true;
      return Date.now() - state.lastUpdated > CACHE_CONFIG.PLAYER_DATA_CACHE;
    },

    /**
     * 检查角色列表是否需要刷新
     */
    shouldRefreshRoles: (state) => {
      if (state.bindingRoles.length === 0) return true;
      return Date.now() - state.lastUpdated > CACHE_CONFIG.ROLES_CACHE;
    }
  },

  actions: {
    /**
     * 优化后的通用登录流程 - 并行处理提升速度
     */
    async handleLogin(hgToken: string) {
      try {
        console.time('登录流程总耗时');

        // 1. 获取授权码
        const grantCode = await AuthAPI.getGrantCode(hgToken);

        // 2. 获取森空岛凭证
        const credResult = await AuthAPI.getSklandCred(grantCode);
        const { cred, token: signToken, userId } = credResult;

        // 3. 更新本地状态
        this.hgToken = hgToken;
        this.sklandCred = cred;
        this.sklandSignToken = signToken;
        this.userId = userId;
        this.isLogin = true;
        this.lastUpdated = Date.now();

        // 4. 获取绑定角色
        await this.fetchBindingRoles();

        // 5. 如果有绑定角色，获取玩家数据
        if (this.bindingRoles.length > 0) {
          await this.fetchPlayerData();
        }

        // 6. 保存到本地存储
        await this.saveToLocalStorage();

        console.timeEnd('登录流程总耗时');
        console.log('登录成功');

      } catch (error) {
        console.error('登录失败:', error);
        this.logout();
        throw this.normalizeError(error);
      }
    },

    /**
     * 密码登录
     */
    async loginWithPassword(phone: string, password: string) {
      try {
        const hgToken = await AuthAPI.loginByPassword(phone, password);
        await this.handleLogin(hgToken);
      } catch (error) {
        throw this.normalizeError(error);
      }
    },

    /**
     * 验证码登录
     */
    async loginWithSmsCode(phone: string, code: string) {
      try {
        const hgToken = await AuthAPI.loginBySmsCode(phone, code);
        await this.handleLogin(hgToken);
      } catch (error) {
        throw this.normalizeError(error);
      }
    },

    /**
     * 优化保存到本地存储 - 使用防抖
     */
    async saveToLocalStorage() {
      return new Promise<void>((resolve) => {
        // 清除之前的定时器
        if ((this as any).saveTimeout) {
          clearTimeout((this as any).saveTimeout);
        }

        (this as any).saveTimeout = setTimeout(() => {
          try {
            const authState = {
              isLogin: this.isLogin,
              hgToken: this.hgToken,
              sklandCred: this.sklandCred,
              sklandSignToken: this.sklandSignToken,
              userId: this.userId,
              playerData: this.compressPlayerData(this.playerData),
              bindingRoles: this.bindingRoles,
              timestamp: Date.now(),
              lastUpdated: this.lastUpdated
            };

            localStorage.setItem('authState', JSON.stringify(authState));
            this.cacheValid = true;
            resolve();
          } catch (error) {
            console.warn('保存到本地存储失败:', error);
            resolve();
          }
        }, 500);
      });
    },

    /**
     * 压缩玩家数据，减少存储空间
     */
    compressPlayerData(playerData: any): any {
      if (!playerData) return null;

      // 直接返回压缩后的对象，移除冗余变量
      return {
        status: playerData.status,
        // 根据需要保留其他重要字段
        // 移除大型或不必要的字段
      };
    },

    /**
     * 退出登录 - 优化清理流程
     */
    logout() {
      // 清理状态
      this.isLogin = false;
      this.hgToken = '';
      this.sklandCred = '';
      this.sklandSignToken = '';
      this.userId = '';
      this.playerData = null;
      this.bindingRoles = [];
      this.lastUpdated = 0;
      this.cacheValid = false;

      // 清理定时器
      if ((this as any).saveTimeout) {
        clearTimeout((this as any).saveTimeout);
        (this as any).saveTimeout = null;
      }

      // 清理本地存储
      try {
        localStorage.removeItem('authState');
        // 清理凭证检查缓存
        const cacheKeys = Object.keys(localStorage).filter(key => key.startsWith('cred_check_'));
        cacheKeys.forEach(key => localStorage.removeItem(key));
      } catch (error) {
        console.warn('清理本地存储失败:', error);
      }

      console.log('退出登录成功');
    },

    /**
     * 优化恢复登录状态 - 添加缓存验证和快速恢复
     */
    async restoreAuthState(): Promise<boolean> {
      try {
        console.time('恢复登录状态耗时');

        const authStr = localStorage.getItem('authState');
        if (!authStr) {
          console.log('本地存储中没有登录状态');
          return false;
        }

        const authState = JSON.parse(authStr);

        // 快速检查数据完整性
        if (!this.validateAuthState(authState)) {
          console.warn('本地存储的登录状态不完整或格式错误');
          this.logout();
          return false;
        }

        // 检查过期时间
        if (this.isAuthStateExpired(authState)) {
          console.warn('登录状态已过期');
          this.logout();
          return false;
        }

        // 恢复状态
        this.isLogin = authState.isLogin || false;
        this.hgToken = authState.hgToken;
        this.sklandCred = authState.sklandCred;
        this.sklandSignToken = authState.sklandSignToken;
        this.userId = authState.userId || '';
        this.playerData = authState.playerData || null;
        this.bindingRoles = authState.bindingRoles || [];
        this.lastUpdated = authState.lastUpdated || 0;
        this.cacheValid = true;

        console.log('从本地存储恢复登录状态成功');

        // 异步验证凭证有效性（不阻塞恢复）
        this.validateCredInBackground().catch(error => {
          console.warn('后台验证凭证失败:', error);
        });

        console.timeEnd('恢复登录状态耗时');
        return true;

      } catch (error) {
        console.error('恢复登录状态失败:', error);
        this.logout();
        return false;
      }
    },

    /**
     * 后台验证凭证有效性
     */
    async validateCredInBackground() {
      if (!this.sklandCred || !this.sklandSignToken) return;

      try {
        const cacheKey = `cred_check_${this.userId}`;
        const cachedCheck = localStorage.getItem(cacheKey);

        if (cachedCheck) {
          const { timestamp, isValid } = JSON.parse(cachedCheck);
          if (Date.now() - timestamp < CACHE_CONFIG.CRED_CHECK_CACHE) {
            if (!isValid) {
              console.warn('缓存显示凭证已失效');
              this.logout();
            }
            return;
          }
        }

        // 实际验证 - 通过获取绑定角色来验证凭证有效性
        await AuthAPI.getBindingRoles(this.sklandCred, this.sklandSignToken);

        // 缓存验证结果
        localStorage.setItem(cacheKey, JSON.stringify({
          timestamp: Date.now(),
          isValid: true
        }));

      } catch (error) {
        // 验证失败，更新缓存并登出
        const cacheKey = `cred_check_${this.userId}`;
        localStorage.setItem(cacheKey, JSON.stringify({
          timestamp: Date.now(),
          isValid: false
        }));

        console.warn('凭证验证失败');
        this.logout();
      }
    },

    /**
     * 验证认证状态数据的完整性
     */
    validateAuthState(authState: any): boolean {
      const requiredFields = ['hgToken', 'sklandCred', 'sklandSignToken'];
      return requiredFields.every(field =>
        authState[field] && typeof authState[field] === 'string' && authState[field].length > 0
      );
    },

    /**
     * 检查认证状态是否过期
     */
    isAuthStateExpired(authState: any): boolean {
      if (!authState.timestamp) return true;

      const expiryTime = authState.timestamp + CACHE_CONFIG.LOCAL_STORAGE_EXPIRY;
      return Date.now() > expiryTime;
    },

    /**
     * 优化获取绑定角色列表 - 添加缓存策略
     */
    async fetchBindingRoles(forceRefresh = false): Promise<any[]> {
      if (!this.sklandCred || !this.sklandSignToken) {
        throw new Error('未登录或登录凭证无效');
      }

      // 使用缓存避免重复请求
      if (!forceRefresh && !this.shouldRefreshRoles && this.bindingRoles.length > 0) {
        console.log('使用缓存的角色列表');
        return this.bindingRoles;
      }

      console.log('正在获取绑定角色列表...');

      try {
        const roles = await AuthAPI.getBindingRoles(this.sklandCred, this.sklandSignToken);

        // 更新状态
        this.bindingRoles = roles;
        this.lastUpdated = Date.now();
        this.cacheValid = true;

        // 异步保存到本地存储
        this.saveToLocalStorage().catch(error => {
          console.warn('保存角色列表失败:', error);
        });

        console.log(`获取到 ${roles.length} 个绑定角色`);
        return roles;

      } catch (error) {
        const normalizedError = this.normalizeError(error);
        console.error('获取绑定角色失败:', normalizedError.message);

        if (this.isAuthError(normalizedError)) {
          this.logout();
          throw new Error('登录已过期，请重新登录');
        }

        // 如果是网络错误，尝试使用缓存
        if (this.isNetworkError(normalizedError) && this.bindingRoles.length > 0) {
          console.warn('网络错误，使用缓存的角色列表');
          return this.bindingRoles;
        }

        throw normalizedError;
      }
    },

    /**
     * 优化获取玩家数据 - 添加缓存和降级策略
     */
    async fetchPlayerData(forceRefresh = false): Promise<any> {
      if (!this.sklandCred || !this.sklandSignToken) {
        throw new Error('未登录或登录凭证无效');
      }

      if (!this.bindingRoles.length) {
        throw new Error('没有绑定角色');
      }

      // 使用缓存避免重复请求
      if (!forceRefresh && !this.shouldRefreshPlayerData && this.playerData) {
        console.log('使用缓存的玩家数据');
        return this.playerData;
      }

      const defaultUid = this.bindingRoles.find(role => role.isDefault)?.uid || this.bindingRoles[0].uid;
      console.log(`正在获取玩家数据，UID: ${defaultUid}`);

      try {
        const playerData = await AuthAPI.getPlayerData(this.sklandCred, this.sklandSignToken, defaultUid);

        // 更新状态
        this.playerData = playerData;
        this.lastUpdated = Date.now();
        this.cacheValid = true;

        // 异步保存到本地存储
        this.saveToLocalStorage().catch(error => {
          console.warn('保存玩家数据失败:', error);
        });

        console.log('玩家数据获取成功');
        return playerData;

      } catch (error) {
        const normalizedError = this.normalizeError(error);
        console.error('获取玩家数据失败:', normalizedError.message);

        if (this.isAuthError(normalizedError)) {
          this.logout();
          throw new Error('登录已过期，请重新登录');
        }

        // 如果是网络错误，尝试使用缓存
        if (this.isNetworkError(normalizedError) && this.playerData) {
          console.warn('网络错误，使用缓存的玩家数据');
          return this.playerData;
        }

        throw normalizedError;
      }
    },

    /**
     * 判断是否为认证错误
     */
    isAuthError(error: ApiError): boolean {
      const authErrorKeywords = ['认证失败', '401', '登录已过期', 'token', 'cred'];
      return authErrorKeywords.some(keyword =>
        error.message.includes(keyword) ||
        (error.response && error.response.status === 401)
      );
    },

    /**
     * 判断是否为网络错误
     */
    isNetworkError(error: ApiError): boolean {
      const networkErrorKeywords = ['Network', '网络', 'timeout', '超时', 'fetch'];
      return networkErrorKeywords.some(keyword =>
        error.message.includes(keyword)
      );
    },

    /**
     * 标准化错误对象
     */
    normalizeError(error: unknown): ApiError {
      if (error instanceof Error) {
        return error as ApiError;
      }

      if (typeof error === 'string') {
        return new Error(error);
      }

      if (error && typeof error === 'object' && 'message' in error) {
        return new Error(String((error as any).message));
      }

      return new Error('未知错误');
    }

    // 移除了未使用的 preloadUserData 和 forceRefreshAllData 函数
  }
});

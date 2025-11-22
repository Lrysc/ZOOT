import { defineStore } from 'pinia';
import { AuthAPI } from '@services/api';
import { logger } from '@services/logger';

/**
 * 认证状态接口定义
 */
interface AuthState {
  isLogin: boolean;
  hgToken: string;
  userId: string;
  playerData: any;
  bindingRoles: any[];
  sklandCred: string;
  sklandSignToken: string;
  lastUpdated: number;
  cacheValid: boolean;
  restoreAttempts: number;
  isFetchingCred: boolean;
  credPromise: Promise<{ cred: string; token: string }> | null;
  isCredReady: boolean;
  credRetryCount: number;
  authError: string | null;
  isInitializing: boolean;
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
 * 存储的认证状态接口
 */
interface StoredAuthState {
  isLogin: boolean;
  hgToken: string;
  userId: string;
  playerData: any;
  bindingRoles: any[];
  timestamp: number;
  lastUpdated: number;
  restoreAttempts: number;
  version?: string;
}

/**
 * 缓存配置
 */
const CACHE_CONFIG = {
  LOCAL_STORAGE_EXPIRY: 30 * 24 * 60 * 60 * 1000, // 30天
  PLAYER_DATA_CACHE: 5 * 60 * 1000, // 5分钟
  ROLES_CACHE: 10 * 60 * 1000, // 10分钟
  CRED_CACHE: 10 * 60 * 1000, // 10分钟
  MAX_RESTORE_ATTEMPTS: 3,
  MAX_CRED_RETRY: 2,
  CRED_RETRY_DELAY: 1000
};

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    isLogin: false,
    hgToken: '',
    userId: '',
    playerData: null,
    bindingRoles: [],
    sklandCred: '',
    sklandSignToken: '',
    lastUpdated: 0,
    cacheValid: false,
    restoreAttempts: 0,
    isFetchingCred: false,
    credPromise: null,
    isCredReady: false,
    credRetryCount: 0,
    authError: null,
    isInitializing: false
  }),

  getters: {
    /**
     * 用户名
     */
    userName: (state) => state.playerData?.status?.name || '未知用户',

    /**
     * 用户等级
     */
    userLevel: (state) => state.playerData?.status?.level || 0,

    /**
     * 主角色UID
     */
    mainUid: (state) => state.bindingRoles.find(role => role.isDefault)?.uid || state.bindingRoles[0]?.uid || '',

    /**
     * 是否有绑定角色
     */
    hasBindingRoles: (state) => state.bindingRoles.length > 0,

    /**
     * 是否需要刷新玩家数据 - 修改：现在总是返回true，强制刷新
     */
    shouldRefreshPlayerData: (): boolean => {
      // 修改点1: 移除未使用的state参数，现在总是返回true强制刷新
      return true;
    },

    /**
     * 是否需要刷新角色列表 - 修改：现在总是返回true，强制刷新
     */
    shouldRefreshRoles: (): boolean => {
      // 修改点2: 移除未使用的state参数，现在总是返回true强制刷新
      return true;
    },

    /**
     * 是否可以尝试恢复
     */
    canAttemptRestore: (state): boolean => {
      return state.restoreAttempts < CACHE_CONFIG.MAX_RESTORE_ATTEMPTS;
    },

    /**
     * 是否有有效的hgToken
     */
    hasValidHgToken(): boolean {
      return !!this.hgToken && this.hgToken.length > 0;
    },

    /**
     * 凭证是否准备就绪
     */
    isCredentialsReady: (state): boolean => {
      return state.isCredReady && !!state.sklandCred && !!state.sklandSignToken;
    },

    /**
     * 是否应该显示认证错误
     */
    shouldShowAuthError: (state): boolean => {
      return !!state.authError;
    },

    /**
     * 是否已完成初始化
     */
    isInitialized: (state): boolean => {
      return !state.isInitializing && (state.isLogin || !state.hgToken);
    }
  },

  actions: {
    /**
     * 核心方法：动态获取森空岛凭证
     */
    async ensureSklandCred(): Promise<{ cred: string; token: string }> {
      // 修改点3: 移除内存缓存检查，总是重新获取凭证
      // 不再检查内存中的凭证是否有效，强制重新获取

      if (this.isFetchingCred && this.credPromise) {
        logger.debug('已有凭证获取请求在进行中，等待结果');
        return this.credPromise;
      }

      this.isFetchingCred = true;
      this.isCredReady = false;
      this.credPromise = this.fetchSklandCredWithRetry();

      try {
        const result = await this.credPromise;
        this.isCredReady = true;
        this.credRetryCount = 0;
        this.authError = null;
        return result;
      } catch (error) {
        this.isCredReady = false;
        throw error;
      } finally {
        this.isFetchingCred = false;
        this.credPromise = null;
      }
    },

    /**
     * 带重试机制的凭证获取
     */
    async fetchSklandCredWithRetry(): Promise<{ cred: string; token: string }> {
      const maxRetries = CACHE_CONFIG.MAX_CRED_RETRY;

      for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
        try {
          logger.debug(`第 ${attempt} 次尝试获取森空岛凭证`);
          return await this.fetchSklandCred();
        } catch (error) {
          const normalizedError = this.normalizeError(error);

          if (this.isAuthError(normalizedError)) {
            logger.warn('认证错误，不再重试', normalizedError);
            this.authError = '登录已过期，请重新登录';
            throw normalizedError;
          }

          if (this.isNetworkError(normalizedError) && attempt <= maxRetries) {
            logger.warn(`网络错误，${CACHE_CONFIG.CRED_RETRY_DELAY}ms后重试 (${attempt}/${maxRetries})`, normalizedError);
            await this.delay(CACHE_CONFIG.CRED_RETRY_DELAY);
            continue;
          }

          logger.error(`获取森空岛凭证失败 (${attempt}/${maxRetries + 1})`, normalizedError);
          this.authError = '网络连接失败，请检查网络后重试';
          throw normalizedError;
        }
      }

      throw new Error('获取森空岛凭证失败');
    },

    /**
     * 实际获取森空岛凭证的流程
     */
    async fetchSklandCred(): Promise<{ cred: string; token: string }> {
      if (!this.hgToken) {
        throw new Error('hgToken不存在，请重新登录');
      }

      logger.debug('开始获取森空岛临时凭证');

      try {
        const grantCode = await AuthAPI.getGrantCode(this.hgToken);
        logger.debug('获取授权码成功');

        const credResult = await AuthAPI.getSklandCred(grantCode);
        const { cred, token: signToken, userId } = credResult;
        logger.debug('获取森空岛凭证成功', { userId });

        this.sklandCred = cred;
        this.sklandSignToken = signToken;
        this.userId = userId;
        this.lastUpdated = Date.now();
        this.isCredReady = true;
        this.authError = null;

        return { cred, token: signToken };
      } catch (error) {
        const normalizedError = this.normalizeError(error);
        logger.error('获取森空岛凭证失败', normalizedError);

        if (this.isAuthError(normalizedError)) {
          logger.warn('hgToken可能已失效');
          this.authError = '登录已过期，请重新登录';
          throw normalizedError;
        }

        throw normalizedError;
      }
    },

    /**
     * 优化恢复登录状态 - 修改：现在总是执行完整数据获取流程
     */
    async restoreAuthState(): Promise<boolean> {
      if (!this.canAttemptRestore) {
        logger.warn('已达到最大恢复尝试次数，不再尝试恢复');
        return false;
      }

      this.restoreAttempts++;
      this.isInitializing = true;
      logger.info(`尝试恢复登录状态 (第 ${this.restoreAttempts} 次)`);

      let authState: StoredAuthState | null = null;

      try {
        console.time('恢复登录状态耗时');

        const authStr = localStorage.getItem('authState');
        if (!authStr) {
          logger.info('本地存储中没有登录状态');
          this.isInitializing = false;
          return false;
        }

        try {
          authState = JSON.parse(authStr);
        } catch (parseError) {
          logger.error('解析本地存储数据失败', parseError);
          this.clearCorruptedStorage();
          this.isInitializing = false;
          return false;
        }

        // 修改点4: 简化验证，只检查最基本的hgToken存在性
        if (!authState || !authState.hgToken) {
          logger.warn('本地存储中没有有效的hgToken');
          this.clearCorruptedStorage();
          this.isInitializing = false;
          return false;
        }

        if (this.isAuthStateExpired(authState)) {
          logger.warn('登录状态已过期');
          this.clearExpiredStorage();
          this.isInitializing = false;
          return false;
        }

        // 修改点5: 只恢复最基础的hgToken，不恢复其他缓存数据
        this.isLogin = true; // 标记为已登录状态
        this.hgToken = authState.hgToken;
        this.userId = authState.userId || ''; // 恢复userId但不依赖它
        // 注意：不恢复playerData和bindingRoles，强制重新获取
        this.playerData = null;
        this.bindingRoles = [];
        this.lastUpdated = 0; // 重置最后更新时间
        this.cacheValid = false; // 标记缓存无效
        this.isCredReady = false; // 凭证需要重新获取
        this.authError = null;

        logger.info('从本地存储恢复hgToken成功，开始重新获取所有数据', {
          userId: this.userId,
          hasHgToken: !!this.hgToken
        });

        // 修改点6: 总是执行完整数据获取流程，强制重新获取所有数据
        logger.info('开始执行完整数据获取流程...');
        await this.executeFullDataRefresh();

        console.timeEnd('恢复登录状态耗时');
        this.isInitializing = false;
        return true;

      } catch (error) {
        logger.error('恢复登录状态失败', error);
        this.isInitializing = false;
        return false;
      }
    },

    /**
     * 执行完整数据刷新流程
     * 按照登录后的标准流程获取所有必要数据
     */
    async executeFullDataRefresh(): Promise<void> {
      try {
        console.time('完整数据刷新耗时');

        // 第一步：获取森空岛凭证
        logger.info('步骤1: 获取森空岛临时凭证...');
        await this.ensureSklandCred();
        logger.info('✓ 临时凭证获取成功');

        // 第二步：获取绑定角色列表
        logger.info('步骤2: 获取绑定角色列表...');
        await this.fetchBindingRoles(); // 修改点7: 移除未使用的forceRefresh参数
        logger.info(`✓ 角色列表获取成功，共 ${this.bindingRoles.length} 个角色`);

        // 第三步：获取玩家数据（如果有角色）
        if (this.bindingRoles.length > 0) {
          logger.info('步骤3: 获取玩家详细数据...');
          await this.fetchPlayerData(); // 修改点8: 移除未使用的forceRefresh参数
          logger.info('✓ 玩家数据获取成功');
        }

        // 第四步：保存更新后的状态
        await this.saveToLocalStorage();

        console.timeEnd('完整数据刷新耗时');
        logger.info('完整数据刷新流程完成', {
          isCredReady: this.isCredReady,
          hasPlayerData: !!this.playerData,
          roleCount: this.bindingRoles.length
        });

      } catch (error) {
        const normalizedError = this.normalizeError(error);
        logger.warn('完整数据刷新过程中出现错误', normalizedError);

        this.isInitializing = false;

        // 修改点9: 不再使用缓存数据，直接抛出错误
        if (this.isAuthError(normalizedError)) {
          this.authError = '登录已过期，请重新登录';
          throw normalizedError;
        }

        if (this.isNetworkError(normalizedError)) {
          this.authError = '网络连接失败，请检查网络后重试';
          throw normalizedError;
        }

        this.authError = '数据获取失败，请重试';
        throw normalizedError;
      }
    },

    /**
     * 优化获取玩家数据 - 修改：移除缓存逻辑和未使用参数
     */
    async fetchPlayerData(): Promise<any> { // 修改点10: 移除未使用的forceRefresh参数
      try {
        const { cred, token } = await this.ensureSklandCred();

        if (!this.bindingRoles.length) {
          const error = new Error('没有绑定角色');
          logger.warn('获取玩家数据失败', error);
          return Promise.reject(error);
        }

        // 修改点11: 不再检查缓存，总是重新获取数据
        logger.info('正在获取玩家数据');

        const defaultUid = this.bindingRoles.find(role => role.isDefault)?.uid || this.bindingRoles[0].uid;
        logger.info(`正在获取玩家数据`, { uid: defaultUid });

        const playerData = await AuthAPI.getPlayerData(cred, token, defaultUid);

        this.playerData = playerData;
        this.lastUpdated = Date.now();
        this.cacheValid = true;
        this.authError = null;

        this.saveToLocalStorage().catch(error => {
          logger.warn('保存玩家数据失败', error);
        });

        logger.info('玩家数据获取成功', {
          level: playerData?.status?.level,
          name: playerData?.status?.name
        });
        return playerData;

      } catch (error) {
        const normalizedError = this.normalizeError(error);
        logger.error('获取玩家数据失败', normalizedError);

        // 修改点12: 不再使用缓存数据，直接抛出错误
        if (this.isAuthError(normalizedError)) {
          this.authError = '登录已过期，请重新登录';
          throw normalizedError;
        }

        if (this.isNetworkError(normalizedError)) {
          this.authError = '网络连接失败，请检查网络后重试';
          throw normalizedError;
        }

        throw normalizedError;
      }
    },

    /**
     * 优化获取绑定角色列表 - 修改：移除缓存逻辑和未使用参数
     */
    async fetchBindingRoles(): Promise<any[]> { // 修改点13: 移除未使用的forceRefresh参数
      try {
        const { cred, token } = await this.ensureSklandCred();

        // 修改点14: 不再检查缓存，总是重新获取数据
        logger.info('正在获取绑定角色列表');

        const roles = await AuthAPI.getBindingRoles(cred, token);

        this.bindingRoles = roles;
        this.lastUpdated = Date.now();
        this.cacheValid = true;
        this.authError = null;

        this.saveToLocalStorage().catch(error => {
          logger.warn('保存角色列表失败', error);
        });

        logger.info(`获取到 ${roles.length} 个绑定角色`);
        return roles;

      } catch (error) {
        const normalizedError = this.normalizeError(error);
        logger.error('获取绑定角色失败', normalizedError);

        // 修改点15: 不再使用缓存数据，直接抛出错误
        if (this.isAuthError(normalizedError)) {
          this.authError = '登录已过期，请重新登录';
          throw normalizedError;
        }

        if (this.isNetworkError(normalizedError)) {
          this.authError = '网络连接失败，请检查网络后重试';
          throw normalizedError;
        }

        return Promise.reject(normalizedError);
      }
    },

    /**
     * 延迟函数
     */
    delay(ms: number): Promise<void> {
      return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * 优化后的通用登录流程
     */
    async handleLogin(hgToken: string): Promise<void> {
      try {
        logger.info('开始登录流程', { hasToken: !!hgToken });
        console.time('登录流程总耗时');

        this.hgToken = hgToken;
        this.isLogin = true;
        this.restoreAttempts = 0;
        this.isCredReady = false;
        this.authError = null;
        this.isInitializing = true;

        // 使用完整数据获取流程
        await this.executeFullDataRefresh();

        console.timeEnd('登录流程总耗时');
        this.isInitializing = false;

        logger.info('登录流程完成', {
          userId: this.userId,
          roleCount: this.bindingRoles.length,
          hasPlayerData: !!this.playerData,
          isCredReady: this.isCredReady
        });

      } catch (error) {
        const normalizedError = this.normalizeError(error);
        logger.error('登录流程失败', normalizedError);
        this.authError = '登录失败，请检查凭证';
        this.isInitializing = false;
        return Promise.reject(normalizedError);
      }
    },

    /**
     * 密码登录
     */
    async loginWithPassword(phone: string, password: string): Promise<void> {
      try {
        logger.info('开始密码登录', { phone: phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') });
        const hgToken = await AuthAPI.loginByPassword(phone, password);
        await this.handleLogin(hgToken);
        logger.info('密码登录成功');
      } catch (error) {
        const normalizedError = this.normalizeError(error);
        logger.error('密码登录失败', normalizedError);
        return Promise.reject(normalizedError);
      }
    },

    /**
     * 验证码登录
     */
    async loginWithSmsCode(phone: string, code: string): Promise<void> {
      try {
        logger.info('开始验证码登录', { phone: phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') });
        const hgToken = await AuthAPI.loginBySmsCode(phone, code);
        await this.handleLogin(hgToken);
        logger.info('验证码登录成功');
      } catch (error) {
        const normalizedError = this.normalizeError(error);
        logger.error('验证码登录失败', normalizedError);
        return Promise.reject(normalizedError);
      }
    },

    /**
     * 保存到本地存储
     */
    async saveToLocalStorage(): Promise<void> {
      return new Promise((resolve, reject) => {
        if ((this as any).saveTimeout) {
          clearTimeout((this as any).saveTimeout);
        }

        (this as any).saveTimeout = setTimeout(() => {
          try {
            const authState: StoredAuthState = {
              isLogin: this.isLogin,
              hgToken: this.hgToken,
              userId: this.userId,
              playerData: this.compressPlayerData(this.playerData),
              bindingRoles: this.bindingRoles,
              timestamp: Date.now(),
              lastUpdated: this.lastUpdated,
              restoreAttempts: this.restoreAttempts,
              version: '2.2.0' // 更新版本号
            };

            if (!this.validateAuthStateForStorage(authState)) {
              logger.warn('保存前的数据验证失败');
              reject(new Error('数据验证失败'));
              return;
            }

            localStorage.setItem('authState', JSON.stringify(authState));

            const savedData = localStorage.getItem('authState');
            if (!savedData) {
              logger.error('保存到本地存储失败');
              reject(new Error('保存到本地存储失败'));
              return;
            }

            this.cacheValid = true;
            logger.debug('登录状态保存成功', {
              userId: this.userId,
              isCredReady: this.isCredReady
            });
            resolve();
          } catch (error) {
            logger.error('保存到本地存储失败', error);
            reject(error);
          }
        }, 300);
      });
    },

    /**
     * 压缩玩家数据
     */
    compressPlayerData(playerData: any): any {
      if (!playerData) return null;

      return {
        status: playerData.status ? {
          name: playerData.status.name,
          level: playerData.status.level,
          registerTs: playerData.status.registerTs,
          mainStageProgress: playerData.status.mainStageProgress
        } : null,
        chars: playerData.chars ? { length: playerData.chars.length } : null
      };
    },

    /**
     * 退出登录
     */
    logout(): void {
      logger.info('开始执行退出登录流程');

      this.isLogin = false;
      this.hgToken = '';
      this.sklandCred = '';
      this.sklandSignToken = '';
      this.userId = '';
      this.playerData = null;
      this.bindingRoles = [];
      this.lastUpdated = 0;
      this.cacheValid = false;
      this.restoreAttempts = 0;
      this.isFetchingCred = false;
      this.credPromise = null;
      this.isCredReady = false;
      this.credRetryCount = 0;
      this.authError = '请重新登录';
      this.isInitializing = false;

      if ((this as any).saveTimeout) {
        clearTimeout((this as any).saveTimeout);
        (this as any).saveTimeout = null;
      }

      try {
        localStorage.removeItem('authState');
        logger.debug('本地存储清理完成');
      } catch (error) {
        logger.warn('清理本地存储失败', error);
      }

      logger.info('退出登录成功');
    },

    /**
     * 清理损坏的存储数据
     */
    clearCorruptedStorage(): void {
      try {
        localStorage.removeItem('authState');
        logger.info('已清理损坏的存储数据');
      } catch (error) {
        logger.warn('清理损坏存储数据失败', error);
      }
    },

    /**
     * 清理过期的存储数据
     */
    clearExpiredStorage(): void {
      try {
        localStorage.removeItem('authState');
        logger.info('已清理过期的存储数据');
      } catch (error) {
        logger.warn('清理过期存储数据失败', error);
      }
    },

    /**
     * 验证认证状态数据的完整性 - 存储前验证
     */
    validateAuthStateForStorage(authState: StoredAuthState): boolean {
      const isValid = !!authState.hgToken && typeof authState.hgToken === 'string' && authState.hgToken.length > 0;

      if (!isValid) {
        logger.warn('存储前验证失败：hgToken无效');
      }

      return isValid;
    },

    /**
     * 检查认证状态是否过期
     */
    isAuthStateExpired(authState: StoredAuthState): boolean {
      if (!authState.timestamp) return true;

      const expiryTime = authState.timestamp + CACHE_CONFIG.LOCAL_STORAGE_EXPIRY;
      const isExpired = Date.now() > expiryTime;

      if (isExpired) {
        logger.debug(`存储数据已过期`, {
          savedTime: new Date(authState.timestamp).toLocaleString(),
          currentTime: new Date().toLocaleString()
        });
      }

      return isExpired;
    },

    /**
     * 判断是否为认证错误
     */
    isAuthError(error: ApiError): boolean {
      const authErrorKeywords = ['认证失败', '401', '登录已过期', 'token', 'cred', 'unauthorized'];
      return authErrorKeywords.some(keyword =>
        error.message.toLowerCase().includes(keyword.toLowerCase()) ||
        (error.response && error.response.status === 401)
      );
    },

    /**
     * 判断是否为网络错误
     */
    isNetworkError(error: ApiError): boolean {
      const networkErrorKeywords = ['Network', '网络', 'timeout', '超时', 'fetch', 'net::'];
      return networkErrorKeywords.some(keyword =>
        error.message.toLowerCase().includes(keyword.toLowerCase())
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
  }
});

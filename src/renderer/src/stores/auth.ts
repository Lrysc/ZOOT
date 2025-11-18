import { defineStore } from 'pinia';
import { AuthAPI } from '@services/api';

interface AuthState {
  isLogin: boolean;
  hgToken: string;
  sklandCred: string;
  sklandSignToken: string;
  userId: string;
  playerData: any; // 玩家详细数据
  bindingRoles: any[]; // 绑定角色列表
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    isLogin: false,
    hgToken: '',
    sklandCred: '',
    sklandSignToken: '',
    userId: '',
    playerData: null,
    bindingRoles: []
  }),

  getters: {
    // 获取用户昵称
    userName: (state) => state.playerData?.status?.name || '未知用户',
    // 获取用户等级
    userLevel: (state) => state.playerData?.status?.level || 0,
    // 获取主要角色UID
    mainUid: (state) => state.bindingRoles.find(role => role.isDefault)?.uid || state.bindingRoles[0]?.uid || '',
    // 检查是否有绑定角色
    hasBindingRoles: (state) => state.bindingRoles.length > 0
  },

  actions: {
    /**
     * 通用登录流程处理
     */
    async handleLogin(hgToken: string) {
      try {
        // 1. 获取授权码
        const grantCode = await AuthAPI.getGrantCode(hgToken);

        // 2. 获取森空岛Cred
        const { cred, token: signToken, userId } = await AuthAPI.getSklandCred(grantCode);

        // 3. 存储基础登录状态
        this.hgToken = hgToken;
        this.sklandCred = cred;
        this.sklandSignToken = signToken;
        this.userId = userId;
        this.isLogin = true;

        // 4. 获取绑定角色和玩家数据
        await this.fetchBindingRoles();

        // 如果有绑定角色，获取玩家数据
        if (this.bindingRoles.length > 0) {
          await this.fetchPlayerData();
        }

        // 5. 本地存储持久化
        this.saveToLocalStorage();

        console.log('登录成功');

      } catch (error) {
        // 登录失败时清除状态
        this.logout();
        throw error;
      }
    },

    /**
     * 密码登录完整流程
     */
    async loginWithPassword(phone: string, password: string) {
      const hgToken = await AuthAPI.loginByPassword(phone, password);
      await this.handleLogin(hgToken);
    },

    /**
     * 验证码登录完整流程
     */
    async loginWithSmsCode(phone: string, code: string) {
      const hgToken = await AuthAPI.loginBySmsCode(phone, code);
      await this.handleLogin(hgToken);
    },

    /**
     * 保存登录状态到本地存储
     */
    saveToLocalStorage() {
      const authState = {
        hgToken: this.hgToken,
        sklandCred: this.sklandCred,
        sklandSignToken: this.sklandSignToken,
        userId: this.userId,
        playerData: this.playerData,
        bindingRoles: this.bindingRoles
      };
      localStorage.setItem('authState', JSON.stringify(authState));
    },

    /**
     * 退出登录 - 完善版本
     */
    logout() {
      // 重置所有状态
      this.isLogin = false;
      this.hgToken = '';
      this.sklandCred = '';
      this.sklandSignToken = '';
      this.userId = '';
      this.playerData = null;
      this.bindingRoles = [];

      // 清除本地存储
      localStorage.removeItem('authState');

      console.log('退出登录成功');
    },

    /**
     * 从本地存储恢复登录状态
     */
    async restoreAuthState() {
      const authStr = localStorage.getItem('authState');
      if (!authStr) return false;

      try {
        const authState = JSON.parse(authStr);

        // 恢复基础状态
        this.hgToken = authState.hgToken;
        this.sklandCred = authState.sklandCred;
        this.sklandSignToken = authState.sklandSignToken;
        this.userId = authState.userId;
        this.playerData = authState.playerData || null;
        this.bindingRoles = authState.bindingRoles || [];
        this.isLogin = true;

        console.log('从本地存储恢复登录状态成功');

        // 验证状态有效性 - 尝试获取最新数据
        if (this.sklandCred && this.sklandSignToken) {
          try {
            await this.fetchBindingRoles();

            // 如果有角色，尝试获取最新玩家数据
            if (this.bindingRoles.length > 0) {
              await this.fetchPlayerData();
            }

            console.log('登录状态验证成功');
          } catch (error) {
            console.warn('恢复登录状态时获取最新数据失败，使用缓存数据:', error);
            // 使用缓存数据继续
          }
        }

        return true;
      } catch (error) {
        console.error('恢复登录状态失败:', error);
        this.logout();
        return false;
      }
    },

    /**
     * 获取绑定角色列表
     */
    async fetchBindingRoles() {
      if (!this.sklandCred || !this.sklandSignToken) {
        throw new Error('未登录或登录凭证无效');
      }

      console.log('正在获取绑定角色列表...');
      
      try {
        this.bindingRoles = await AuthAPI.getBindingRoles(this.sklandCred, this.sklandSignToken);
        console.log(`获取到 ${this.bindingRoles.length} 个绑定角色`);
        this.saveToLocalStorage(); // 更新本地存储
      } catch (error) {
        console.error('获取绑定角色失败:', error);
        // 如果是401错误，清除登录状态
        if (error.message.includes('认证失败') || error.message.includes('401')) {
          this.logout();
          throw new Error('登录已过期，请重新登录');
        }
        throw error;
      }
    },

    /**
     * 获取玩家数据
     */
    async fetchPlayerData() {
      if (!this.sklandCred || !this.sklandSignToken) {
        throw new Error('未登录或登录凭证无效');
      }

      if (!this.bindingRoles.length) {
        throw new Error('没有绑定角色');
      }

      const defaultUid = this.bindingRoles.find(role => role.isDefault)?.uid || this.bindingRoles[0].uid;
      console.log(`正在获取玩家数据，UID: ${defaultUid}`);

      try {
        this.playerData = await AuthAPI.getPlayerData(this.sklandCred, this.sklandSignToken, defaultUid);
        console.log('玩家数据获取成功');
        this.saveToLocalStorage(); // 更新本地存储
      } catch (error) {
        console.error('获取玩家数据失败:', error);
        // 如果是401错误，清除登录状态
        if (error.message.includes('认证失败') || error.message.includes('401')) {
          this.logout();
          throw new Error('登录已过期，请重新登录');
        }
        throw error;
      }
    }
  }
});

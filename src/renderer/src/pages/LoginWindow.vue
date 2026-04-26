<script setup lang="ts">
import { reactive, ref, computed, nextTick } from 'vue';
import { useAuthStore } from '@stores/auth';
import { AuthAPI } from '@services/api';

const emit = defineEmits<{
  close: []
  loginSuccess: []
}>()

const authStore = useAuthStore();

// 使用 computed 优化表单验证
const formData = reactive({
  phone: '',
  password: '',
  code: '',
  loginType: 'password' as 'password' | 'sms',
  saveInfo: false
});

// 表单验证状态
const validationState = reactive({
  phoneValid: false,
  passwordValid: false,
  codeValid: false
});

// 计算属性优化表单验证
const isFormValid = computed(() => {
  if (formData.loginType === 'password') {
    return validationState.phoneValid && validationState.passwordValid;
  } else {
    return validationState.phoneValid && validationState.codeValid;
  }
});

// 响应式状态
const loading = ref(false);
const errorMsg = ref('');
const smsBtnText = ref('发送验证码');
const smsBtnDisabled = ref(false);

// 多账号管理状态
const showDropdown = ref(false); // 控制下拉菜单显示
const showManualLogin = ref(false); // 控制是否显示手动登录表单
const savedAccounts = ref<Array<{phone: string, password: string, lastUsed: number}>>([]);
const selectedAccountIndex = ref(0); // 当前选中的账号索引

// 计算属性：是否显示账号选择界面
const shouldShowAccountSelector = computed(() => {
  return savedAccounts.value.length >= 2 && !showManualLogin.value;
});

// 计算属性：当前显示的主要账号
const selectedAccount = computed(() => {
  return savedAccounts.value.length > 0 ? savedAccounts.value[selectedAccountIndex.value] : null;
});

// 计算属性：其他账号列表（排除当前选中的账号）
const otherAccounts = computed(() => {
  return savedAccounts.value.filter((_, index) => index !== selectedAccountIndex.value);
});

// 防抖优化
let smsTimer: NodeJS.Timeout | null = null;

// 手机号验证
const validatePhone = (phone: string) => {
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
};

// 多账号管理功能
const loadSavedAccounts = () => {
  try {
    // 尝试从新的多账号存储加载
    let accounts = localStorage.getItem('hg_accounts');
    if (accounts) {
      savedAccounts.value = JSON.parse(accounts).sort((a: any, b: any) => b.lastUsed - a.lastUsed);
    } else {
      // 尝试从旧的单一账号存储迁移
      const oldPhone = localStorage.getItem('hg_phone');
      const oldPassword = localStorage.getItem('hg_password');
      if (oldPhone && oldPassword) {
        const migratedAccount = {
          phone: oldPhone,
          password: oldPassword,
          lastUsed: Date.now()
        };
        savedAccounts.value = [migratedAccount];

        // 保存到新的多账号格式
        localStorage.setItem('hg_accounts', JSON.stringify(savedAccounts.value));

        console.log('已迁移旧账号数据到新的多账号格式');
      }
    }
  } catch (error) {
    console.error('加载保存的账号失败:', error);
    savedAccounts.value = [];
  }
};

const saveAccount = (phone: string, password: string) => {
  try {
    const accounts = [...savedAccounts.value];
    const existingIndex = accounts.findIndex(acc => acc.phone === phone);

    if (existingIndex >= 0) {
      // 更新现有账号
      accounts[existingIndex] = {
        phone,
        password,
        lastUsed: Date.now()
      };
    } else {
      // 添加新账号
      accounts.push({
        phone,
        password,
        lastUsed: Date.now()
      });
    }

    // 限制最多保存5个账号
    if (accounts.length > 5) {
      accounts.sort((a, b) => b.lastUsed - a.lastUsed);
      accounts.splice(5);
    }

    savedAccounts.value = accounts;
    localStorage.setItem('hg_accounts', JSON.stringify(accounts));
  } catch (error) {
    console.error('保存账号失败:', error);
  }
};

const quickLogin = (account: {phone: string, password: string}) => {
  formData.phone = account.phone;
  formData.password = account.password;
  formData.saveInfo = true;

  // 更新最后使用时间
  saveAccount(account.phone, account.password);

  // 触发验证
  handlePhoneInput();
  handlePasswordInput();

  // 自动登录
  setTimeout(() => {
    handleSubmit();
  }, 100);
};

const toggleDropdown = (event: Event) => {
  event.stopPropagation();
  showDropdown.value = !showDropdown.value;
};

const selectAccountFromDropdown = (account: {phone: string, password: string}) => {
  // 找到选中账号的索引
  const accountIndex = savedAccounts.value.findIndex(acc => acc.phone === account.phone);
  if (accountIndex !== -1) {
    selectedAccountIndex.value = accountIndex;

    // 更新表单数据
    formData.phone = account.phone;
    formData.password = account.password;
    formData.saveInfo = true;

    // 更新最后使用时间
    saveAccount(account.phone, account.password);

    // 触发验证
    handlePhoneInput();
    handlePasswordInput();
  }

  // 关闭下拉菜单
  showDropdown.value = false;
};

const switchToManualLogin = () => {
  showManualLogin.value = true;
  showDropdown.value = false;
};

const backToAccountSelector = () => {
  showManualLogin.value = false;
  showDropdown.value = false;
};

const deleteAccount = (phone: string, event: Event) => {
  event.stopPropagation();

  if (confirm('确定要删除这个账号吗？')) {
    try {
      const deletedIndex = savedAccounts.value.findIndex(acc => acc.phone === phone);
      const accounts = savedAccounts.value.filter(acc => acc.phone !== phone);
      savedAccounts.value = accounts;
      localStorage.setItem('hg_accounts', JSON.stringify(accounts));

      // 如果删除的是当前选中的账号，切换到第一个账号
      if (deletedIndex === selectedAccountIndex.value && accounts.length > 0) {
        selectedAccountIndex.value = 0;
        formData.phone = accounts[0].phone;
        formData.password = accounts[0].password;
      }

      // 如果删除后账号少于2个，回到传统登录界面
      if (accounts.length < 2) {
        showManualLogin.value = true;
      }
    } catch (error) {
      console.error('删除账号失败:', error);
    }
  }
};

const formatLastUsed = (timestamp: number) => {
  const now = Date.now();
  const diff = now - timestamp;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor(diff / (1000 * 60));

  if (days > 0) {
    return `${days}天前`;
  } else if (hours > 0) {
    return `${hours}小时前`;
  } else if (minutes > 0) {
    return `${minutes}分钟前`;
  } else {
    return '刚刚';
  }
};

// 实时验证手机号
const handlePhoneInput = () => {
  validationState.phoneValid = validatePhone(formData.phone);
  if (errorMsg.value && validationState.phoneValid) {
    errorMsg.value = '';
  }
};

// 实时验证密码
const handlePasswordInput = () => {
  validationState.passwordValid = formData.password.length >= 6;
};

// 实时验证验证码
const handleCodeInput = () => {
  validationState.codeValid = formData.code.length === 6;
};

// 优化后的发送验证码函数
const sendSmsCode = async () => {
  if (!validatePhone(formData.phone)) {
    errorMsg.value = '请输入正确的手机号';
    return;
  }

  if (smsBtnDisabled.value) return;

  try {
    smsBtnDisabled.value = true;
    errorMsg.value = '';

    // 立即更新UI，提升响应速度
    let countdown = 60;
    smsBtnText.value = `重新发送(${countdown}s)`;

    // 并行执行：发送验证码和倒计时
    await Promise.all([
      AuthAPI.sendSmsCode(formData.phone),
      new Promise<void>((resolve) => {
        const timer = setInterval(() => {
          countdown--;
          smsBtnText.value = `重新发送(${countdown}s)`;

          if (countdown <= 0) {
            clearInterval(timer);
            smsBtnText.value = '发送验证码';
            smsBtnDisabled.value = false;
            resolve();
          }
        }, 1000);
      })
    ]);

  } catch (error: any) {
    errorMsg.value = error.message || '验证码发送失败';
    smsBtnText.value = '发送验证码';
    smsBtnDisabled.value = false;

    // 清除定时器
    if (smsTimer) {
      clearInterval(smsTimer);
      smsTimer = null;
    }
  }
};

// 优化登录提交 - 使用异步队列避免重复提交
let isSubmitting = false;
const handleSubmit = async () => {
  // 防止重复提交
  if (isSubmitting || loading.value) return;

  // 表单验证
  if (!isFormValid.value) {
    if (!validationState.phoneValid) {
      errorMsg.value = '请输入正确的手机号';
    } else if (formData.loginType === 'password' && !validationState.passwordValid) {
      errorMsg.value = '密码长度至少6位';
    } else if (formData.loginType === 'sms' && !validationState.codeValid) {
      errorMsg.value = '验证码为6位数字';
    }
    return;
  }

  isSubmitting = true;
  loading.value = true;
  errorMsg.value = '';

  try {
    // 使用 nextTick 确保UI更新
    await nextTick();

    if (formData.loginType === 'password') {
      await authStore.loginWithPassword(formData.phone, formData.password);
    } else {
      await authStore.loginWithSmsCode(formData.phone, formData.code);
    }

    // 登录成功后的处理
    // 如果选择保存，保存到多账号列表
    if (formData.saveInfo) {
      saveAccount(formData.phone, formData.password);

      // 保持向后兼容
      localStorage.setItem('hg_phone', formData.phone);
      localStorage.setItem('hg_password', formData.password);
    }

    // 优化：立即关闭登录窗口，不等待数据加载
    // 让用户立即看到主界面，数据在后台加载
    emit('close');
    emit('loginSuccess');

  } catch (error: any) {
    errorMsg.value = error.message || '登录失败，请重试';

    // 自动清除错误信息
    setTimeout(() => {
      if (errorMsg.value === error.message) {
        errorMsg.value = '';
      }
    }, 5000);
  } finally {
    // 优化：立即清除loading状态，避免界面卡顿
    loading.value = false;
    isSubmitting = false;
  }
};

// 优化关闭窗口函数
const handleClose = () => {
  // 清除所有定时器
  if (smsTimer) {
    clearInterval(smsTimer);
    smsTimer = null;
  }

  // 关闭下拉菜单
  showDropdown.value = false;

  emit('close');
};

// 键盘事件优化
const handleKeydown = (event: KeyboardEvent) => {
  switch (event.key) {
    case 'Escape':
      event.preventDefault();
      if (showDropdown.value) {
        showDropdown.value = false;
      } else {
        handleClose();
      }
      break;
    case 'Enter':
      if (!loading.value) {
        event.preventDefault();
        handleSubmit();
      }
      break;
    case 'ArrowDown':
      if (event.ctrlKey && savedAccounts.value.length > 0) {
        event.preventDefault();
        showDropdown.value = true;
      }
      break;
  }
};

// 生命周期优化
import { onMounted, onUnmounted } from 'vue';

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
  document.body.style.overflow = 'hidden';

  // 加载保存的账号列表
  loadSavedAccounts();

  // 自动聚焦到手机号输入框
  const phoneInput = document.getElementById('phone') as HTMLInputElement;
  if (phoneInput) {
    setTimeout(() => phoneInput.focus(), 100);
  }

  // 预填充保存的登录信息（向后兼容）
  const savedPhone = localStorage.getItem('hg_phone');
  const savedPassword = localStorage.getItem('hg_password');
  if (savedPhone && savedPassword) {
    formData.phone = savedPhone;
    formData.password = savedPassword;
    formData.saveInfo = true;

    // 触发验证
    handlePhoneInput();
    handlePasswordInput();
  }
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
  document.body.style.overflow = '';

  // 清理定时器
  if (smsTimer) {
    clearInterval(smsTimer);
  }
});
</script>

<template>
  <div class="login-modal-overlay">
    <div class="login-window">
      <!-- 窗口标题栏 -->
      <div class="window-header">
        <div class="header-left">
          <!-- 回退按钮（当从账号选择界面进入时显示） -->
          <img
            v-if="savedAccounts.length >= 2 && showManualLogin"
            src="@assets/exit.png"
            alt="返回"
            class="back-to-accounts"
            @click="backToAccountSelector"
            title="返回账号选择"
          />
        </div>
        <h3>鹰角通行证登录</h3>
        <div class="header-buttons">
          <button class="close-btn" @click="handleClose" :disabled="loading">×</button>
        </div>
      </div>

      <!-- 窗口内容 -->
      <div class="window-content">
        <!-- 账号选择界面（当有多个账号且没有选择手动登录时显示） -->
        <div v-if="shouldShowAccountSelector" class="account-selection-view">
          <!-- 主要账号卡片 -->
          <div class="primary-account-card">
            <!-- 左侧区域：点击登录 -->
            <div class="account-main-area" @click="quickLogin(selectedAccount!)">
              <div class="account-phone-display">{{ selectedAccount!.phone }}</div>
              <div class="account-time-display">{{ formatLastUsed(selectedAccount!.lastUsed) }}</div>
            </div>
            <!-- 右侧下拉图标区域：点击展开下拉菜单 -->
            <div
              class="dropdown-arrow"
              :class="{ expanded: showDropdown }"
              @click="toggleDropdown"
            >
              <div class="dropdown-icon-container">
                <img src="@assets/restore.svg" alt="展开" class="dropdown-icon" />
                <img src="@assets/restore.svg" alt="展开" class="dropdown-icon dropdown-icon-copy" />
              </div>
            </div>
          </div>

          <!-- 下拉菜单 -->
          <div v-if="showDropdown && otherAccounts.length > 0" class="account-dropdown">
            <div
              v-for="account in otherAccounts"
              :key="account.phone"
              class="dropdown-account-item"
              @click="selectAccountFromDropdown(account)"
            >
              <div class="dropdown-account-info">
                <div class="dropdown-account-phone">{{ account.phone }}</div>
                <div class="dropdown-account-time">{{ formatLastUsed(account.lastUsed) }}</div>
              </div>
              <button
                class="dropdown-delete-btn"
                @click="deleteAccount(account.phone, $event)"
                title="删除账号"
              >
                ×
              </button>
            </div>
          </div>

          <!-- 登录其他账号链接 -->
          <div class="login-other-link" @click="switchToManualLogin">
            登录其他账号
          </div>
        </div>

        <!-- 传统登录表单（当没有多个账号或选择手动输入时显示） -->
        <form v-else @submit.prevent="handleSubmit" novalidate>
          <!-- 登录类型切换标签 -->
          <div class="login-type-tabs">
            <button
              type="button"
              :class="{ active: formData.loginType === 'password' }"
              @click="formData.loginType = 'password'"
              :disabled="loading"
            >
              密码登录
            </button>
            <button
              type="button"
              :class="{ active: formData.loginType === 'sms' }"
              @click="formData.loginType = 'sms'"
              :disabled="loading"
            >
              验证码登录
            </button>
          </div>

          <div class="form-group">
            <label for="phone">手机号:</label>
            <input
              id="phone"
              type="tel"
              v-model="formData.phone"
              @input="handlePhoneInput"
              :class="{ error: !validationState.phoneValid && formData.phone }"
              placeholder="请输入手机号"
              :disabled="loading"
              maxlength="11"
              required
            />
          </div>

          <!-- 密码登录表单 -->
          <div class="form-group" v-if="formData.loginType === 'password'">
            <label for="password">密码:</label>
            <input
              id="password"
              type="password"
              v-model="formData.password"
              @input="handlePasswordInput"
              :class="{ error: !validationState.passwordValid && formData.password }"
              placeholder="请输入密码"
              :disabled="loading"
              minlength="6"
              required
            />
          </div>

          <!-- 记住登录信息 -->
          <div class="form-group" v-if="formData.loginType === 'password'">
            <label class="checkbox-label">
              <input
                type="checkbox"
                v-model="formData.saveInfo"
                :disabled="loading"
              />
              记住登录信息
            </label>
          </div>

          <!-- 验证码登录表单 -->
          <div class="form-group" v-if="formData.loginType === 'sms'">
            <div class="code-input-group">
              <input
                id="code"
                type="text"
                v-model="formData.code"
                @input="handleCodeInput"
                :class="{ error: !validationState.codeValid && formData.code }"
                placeholder="请输入6位验证码"
                :disabled="loading"
                maxlength="6"
                pattern="\d{6}"
                required
              />
              <button
                type="button"
                class="send-code-btn"
                @click="sendSmsCode"
                :disabled="smsBtnDisabled || loading || !validationState.phoneValid"
              >
                {{ smsBtnText }}
              </button>
            </div>
          </div>

          <!-- 错误提示 -->
          <p class="error-msg" v-if="errorMsg">{{ errorMsg }}</p>

          <div class="form-actions">
            <button
              type="submit"
              class="submit-btn"
              :disabled="loading || !isFormValid"
              :class="{ loading: loading }"
            >
              <span v-if="loading">登录中...</span>
              <span v-else>登录</span>
            </button>
            <button
              type="button"
              class="cancel-btn"
              @click="handleClose"
              :disabled="loading"
            >
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 优化动画性能 */
.login-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  /* 启用GPU加速 */
  transform: translateZ(0);
  will-change: opacity;
}

.login-window {
  background: #2d2d2d;

  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  width: 400px;
  max-width: 90vw;
  /* 优化动画性能 */
  animation: modalSlideIn 0.2s ease-out;
  transform: translateZ(0);
  will-change: transform, opacity;
  border: 1px solid #404040;
  position: relative;
  overflow: hidden;
}

/* 优化输入框样式 */
.form-group input {
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.form-group input.error {
  border-color: #ff6b6b;
  box-shadow: 0 0 0 2px rgba(255, 107, 107, 0.2);
}

.form-group input:focus {
  outline: none;
  border-color: #646cff;
  box-shadow: 0 0 0 2px rgba(100, 108, 255, 0.2);
}

/* 优化按钮状态 */
.submit-btn:disabled,
.cancel-btn:disabled,
.send-code-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
  transform: none !important;
}

.submit-btn.loading {
  position: relative;
  color: transparent;
}

.submit-btn.loading::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 16px;
  height: 16px;
  margin: -8px 0 0 -8px;
  border: 2px solid transparent;
  border-top: 2px solid #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 优化动画性能 */
@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-10px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* 账号选择界面样式 */
.account-selection-view {
  padding: 20px;
  animation: fadeIn 0.3s ease-out;
}

/* 主要账号卡片 */
.primary-account-card {
  background: #2a2a2a;
  border: 1px solid #404040;

  padding: 0;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  justify-content: space-between;
  align-items: stretch;
  margin-bottom: 8px;
  position: relative;
  overflow: hidden;
}

.primary-account-card:hover {
  background: #333;
  border-color: #646cff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(100, 108, 255, 0.2);
}

/* 左侧账号信息区域 */
.account-main-area {
  flex: 1;
  padding: 16px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.account-phone-display {
  color: #fff;
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 4px;
}

.account-time-display {
  color: #999;
  font-size: 12px;
}

/* 右侧倒三角区域 */
.dropdown-arrow {
  color: #999;
  padding: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 50px;
  border-left: 1px solid #404040;
  background: rgba(255, 255, 255, 0.05);
}

.dropdown-arrow:hover {
  background: rgba(255, 255, 255, 0.1);
}

/* 下拉图标容器 */
.dropdown-icon-container {
  position: relative;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 下拉图标 */
.dropdown-icon {
  width: 16px;
  height: 16px;
  position: absolute;
  transition: all 0.3s ease;
  color: #ccc;
}

/* 下拉图标副本（用于动画） */
.dropdown-icon-copy {
  opacity: 0;
  transform: translateY(0);
}

/* 收起状态：只显示一个菱形 */
.dropdown-arrow:not(.expanded) .dropdown-icon {
  opacity: 1;
  transform: translateY(0);
}

.dropdown-arrow:not(.expanded) .dropdown-icon-copy {
  opacity: 0;
  transform: translateY(0);
}

/* 展开状态：两个菱形分别向上下展开形成交叉 */
.dropdown-arrow.expanded .dropdown-icon {
  opacity: 1;
  transform: translateY(-4px);
}

.dropdown-arrow.expanded .dropdown-icon-copy {
  opacity: 1;
  transform: translateY(4px);
}

/* 下拉菜单 */
.account-dropdown {
  background: #2a2a2a;
  border: 1px solid #404040;

  margin-bottom: 16px;
  overflow: hidden;
  animation: slideDown 0.2s ease-out;
  z-index: 10;
  position: relative;
}

.dropdown-account-item {
  padding: 12px 16px;
  border-bottom: 1px solid #333;
  cursor: pointer;
  transition: background-color 0.2s ease;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dropdown-account-item:last-child {
  border-bottom: none;
}

.dropdown-account-item:hover {
  background: #333;
}

.dropdown-account-info {
  flex: 1;
}

.dropdown-account-phone {
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 2px;
}

.dropdown-account-time {
  color: #999;
  font-size: 11px;
}

.dropdown-delete-btn {
  background: none;
  border: none;
  color: #999;
  font-size: 16px;
  cursor: pointer;
  padding: 4px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;

  transition: all 0.2s ease;
  opacity: 0;
}

.dropdown-account-item:hover .dropdown-delete-btn {
  opacity: 1;
}

.dropdown-delete-btn:hover {
  background: #ff4444;
  color: #fff;
}

/* 登录其他账号链接 */
.login-other-link {
  text-align: center;
  color: #999;
  font-size: 14px;
  cursor: pointer;
  padding: 8px;

  transition: color 0.2s ease;
}

.login-other-link:hover {
  color: #fff;
}

/* 回退按钮样式 */
.back-to-accounts {
  width: 20px;
  height: 20px;
  cursor: pointer;
  filter: brightness(0) invert(1);
  transform: scaleX(-1);
  transition: filter 0.2s ease;
  flex-shrink: 0;
}

.back-to-accounts:hover {
  filter: brightness(0) invert(0.4) sepia(1) hue-rotate(180deg) saturate(3);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
    max-height: 0;
  }
  to {
    opacity: 1;
    transform: translateY(0);
    max-height: 300px;
  }
}

/* 移动端优化 */
@media (max-width: 480px) {
  .login-window {
    width: 95vw;
    margin: 10px;
    animation: mobileModalSlideIn 0.25s ease-out;
  }

  @keyframes mobileModalSlideIn {
    from {
      opacity: 0;
      transform: translateY(20px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
}

/* 保持原有样式，新增以上优化样式 */
.login-type-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  border-bottom: 1px solid #404040;
  padding-bottom: 8px;
}

.login-type-tabs button {
  background: transparent;
  border: none;
  color: #ccc;
  padding: 8px 16px;
  cursor: pointer;

  transition: all 0.3s ease;
}

.login-type-tabs button.active {
  color: #646cff;
  border-bottom: 2px solid #646cff;
}

.code-input-group {
  display: flex;
  gap: 12px;
}

.code-input-group input {
  flex: 1;
}

.send-code-btn {
  background: #555;
  color: white;
  border: none;
  padding: 12px 16px;

  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.send-code-btn:disabled {
  background: #444;
  cursor: not-allowed;
  opacity: 0.8;
}

.error-msg {
  color: #ff6b6b;
  font-size: 12px;
  margin: -12px 0 16px 0;
  height: 16px;
  transition: opacity 0.2s ease;
}

.window-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #404040;
  background: #3a3a3a;

}

.header-left {
  display: flex;
  align-items: center;
  width: 24px;
  height: 20px;
}

.window-header h3 {
  margin: 0;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  flex: 1;
  text-align: left;
  line-height: 20px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #999;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;

  transition: all 0.3s ease;
}

.close-btn:hover:not(:disabled) {
  background: #4a4a4a;
  color: #fff;
}

.window-content {
  padding: 24px;
  transition: opacity 0.3s ease;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #ccc;
  font-size: 14px;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 12px;
  border: 1px solid #555;

  font-size: 14px;
  box-sizing: border-box;
  background: #1a1a1a;
  color: #fff;
}

.form-group input::placeholder {
  color: #666;
}

.checkbox-label {
  display: flex !important;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-weight: normal !important;
  color: #ccc !important;
  margin-bottom: 0 !important;
}

.checkbox-label input[type="checkbox"] {
  width: auto !important;
  margin: 0;
  cursor: pointer;
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
}

.submit-btn {
  background: #646cff;
  color: white;
  border: none;
  padding: 12px 24px;

  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background 0.3s ease;
  min-width: 80px;
}

.submit-btn:hover:not(:disabled) {
  background: #747bff;
}

.cancel-btn {
  background: #555;
  color: white;
  border: none;
  padding: 12px 24px;

  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background 0.3s ease;
  min-width: 80px;
}

.cancel-btn:hover:not(:disabled) {
  background: #666;
}
</style>

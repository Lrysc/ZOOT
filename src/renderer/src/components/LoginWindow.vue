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
  loginType: 'password' as 'password' | 'sms'
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

// 防抖优化
let smsTimer: NodeJS.Timeout | null = null;

// 手机号验证
const validatePhone = (phone: string) => {
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
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
    emit('loginSuccess');

    // 延迟关闭窗口，确保成功反馈可见
    setTimeout(() => {
      emit('close');
    }, 300);

  } catch (error: any) {
    errorMsg.value = error.message || '登录失败，请重试';

    // 自动清除错误信息
    setTimeout(() => {
      if (errorMsg.value === error.message) {
        errorMsg.value = '';
      }
    }, 5000);
  } finally {
    loading.value = false;
    // 使用 setTimeout 避免阻塞UI
    setTimeout(() => {
      isSubmitting = false;
    }, 500);
  }
};

// 优化关闭窗口函数
const handleClose = () => {
  // 清除所有定时器
  if (smsTimer) {
    clearInterval(smsTimer);
    smsTimer = null;
  }
  emit('close');
};

// 键盘事件优化
const handleKeydown = (event: KeyboardEvent) => {
  switch (event.key) {
    case 'Escape':
      event.preventDefault();
      handleClose();
      break;
    case 'Enter':
      if (!loading.value) {
        event.preventDefault();
        handleSubmit();
      }
      break;
  }
};

// 生命周期优化
import { onMounted, onUnmounted } from 'vue';

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
  document.body.style.overflow = 'hidden';

  // 自动聚焦到手机号输入框
  const phoneInput = document.getElementById('phone') as HTMLInputElement;
  if (phoneInput) {
    setTimeout(() => phoneInput.focus(), 100);
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
  <div class="login-modal-overlay" @click.self="handleClose">
    <div class="login-window">
      <!-- 窗口标题栏 -->
      <div class="window-header">
        <h3>鹰角通行证登录</h3>
        <button class="close-btn" @click="handleClose" :disabled="loading">×</button>
      </div>

      <!-- 窗口内容 -->
      <div class="window-content">
        <!-- 登录类型切换标签 -->
        <div class="login-type-tabs">
          <button
            :class="{ active: formData.loginType === 'password' }"
            @click="formData.loginType = 'password'"
            :disabled="loading"
          >
            密码登录
          </button>
          <button
            :class="{ active: formData.loginType === 'sms' }"
            @click="formData.loginType = 'sms'"
            :disabled="loading"
          >
            验证码登录
          </button>
        </div>

        <form @submit.prevent="handleSubmit" novalidate>
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
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  width: 400px;
  max-width: 90vw;
  /* 优化动画性能 */
  animation: modalSlideIn 0.2s ease-out;
  transform: translateZ(0);
  will-change: transform, opacity;
  border: 1px solid #404040;
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
  border-radius: 4px 4px 0 0;
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
  border-radius: 6px;
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
  border-radius: 8px 8px 0 0;
}

.window-header h3 {
  margin: 0;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
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
  border-radius: 4px;
  transition: all 0.3s ease;
}

.close-btn:hover:not(:disabled) {
  background: #4a4a4a;
  color: #fff;
}

.window-content {
  padding: 24px;
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
  border-radius: 6px;
  font-size: 14px;
  box-sizing: border-box;
  background: #1a1a1a;
  color: #fff;
}

.form-group input::placeholder {
  color: #666;
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
  border-radius: 6px;
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
  border-radius: 6px;
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

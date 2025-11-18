<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useAuthStore } from '@stores/auth';
import { AuthAPI } from '@services/api';

const emit = defineEmits<{
  close: []
  loginSuccess: []
}>()

const authStore = useAuthStore();
const formData = reactive({
  phone: '',
  password: '',
  code: '',
  loginType: 'password' as 'password' | 'sms'
});
const loading = ref(false);
const errorMsg = ref('');
const smsBtnText = ref('发送验证码');
const smsBtnDisabled = ref(false);

// 切换登录方式
const toggleLoginType = () => {
  formData.loginType = formData.loginType === 'password' ? 'sms' : 'password';
  errorMsg.value = '';
};

// 发送验证码
const sendSmsCode = async () => {
  if (!formData.phone) {
    errorMsg.value = '请输入手机号';
    return;
  }
  try {
    smsBtnDisabled.value = true;
    let countdown = 60;
    smsBtnText.value = `重新发送(${countdown}s)`;
    await AuthAPI.sendSmsCode(formData.phone);
    // 倒计时
    const timer = setInterval(() => {
      countdown--;
      smsBtnText.value = `重新发送(${countdown}s)`;
      if (countdown <= 0) {
        clearInterval(timer);
        smsBtnText.value = '发送验证码';
        smsBtnDisabled.value = false;
      }
    }, 1000);
  } catch (error: any) {
    errorMsg.value = error.message;
    smsBtnText.value = '发送验证码';
    smsBtnDisabled.value = false;
  }
};

// 处理登录提交
const handleSubmit = async () => {
  errorMsg.value = '';
  loading.value = true;
  try {
    if (formData.loginType === 'password') {
      if (!formData.phone || !formData.password) {
        errorMsg.value = '手机号和密码不能为空';
        return;
      }
      await authStore.loginWithPassword(formData.phone, formData.password);
    } else {
      if (!formData.phone || !formData.code) {
        errorMsg.value = '手机号和验证码不能为空';
        return;
      }
      await authStore.loginWithSmsCode(formData.phone, formData.code);
    }
    emit('close'); // 登录成功关闭窗口
    emit('loginSuccess'); // 通知登录成功
  } catch (error: any) {
    errorMsg.value = error.message || '登录失败，请重试';
  } finally {
    loading.value = false;
  }
};

// 关闭窗口
const handleClose = () => emit('close');

// ESC关闭
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') handleClose();
};

// 生命周期
import { onMounted, onUnmounted } from 'vue';
onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
  document.body.style.overflow = 'hidden';
});
onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
  document.body.style.overflow = '';
});
</script>

<template>
  <div class="login-modal-overlay">
    <div class="login-window">
      <!-- 窗口标题栏 -->
      <div class="window-header">
        <h3>鹰角通行证登录</h3>
        <button class="close-btn" @click="handleClose">×</button>
      </div>

      <!-- 窗口内容 -->
      <div class="window-content">
        <!-- 登录类型切换标签 -->
        <div class="login-type-tabs">
          <button
            :class="{ active: formData.loginType === 'password' }"
            @click="formData.loginType = 'password'"
          >
            密码登录
          </button>
          <button
            :class="{ active: formData.loginType === 'sms' }"
            @click="formData.loginType = 'sms'"
          >
            验证码登录
          </button>
        </div>

        <form @submit.prevent="handleSubmit" novalidate>
          <div class="form-group">
            <label for="phone">手机号:</label>
            <input
              id="phone"
              type="text"
              v-model="formData.phone"
              placeholder="请输入手机号"
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
              placeholder="请输入密码"
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
                placeholder="请输入验证码"
                required
              />
              <button
                type="button"
                class="send-code-btn"
                @click="sendSmsCode"
                :disabled="smsBtnDisabled"
              >
                {{ smsBtnText }}
              </button>
            </div>
          </div>

          <!-- 错误提示 -->
          <p class="error-msg" v-if="errorMsg">{{ errorMsg }}</p>

          <div class="form-actions">
            <button type="submit" class="submit-btn" :disabled="loading">
              <span v-if="loading">登录中...</span>
              <span v-else>登录</span>
            </button>
            <button type="button" class="cancel-btn" @click="handleClose">取消</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 原有样式保留，新增以下样式 */
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
}

/* 原有样式保持不变 */
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
}

.login-window {
  background: #2d2d2d;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  width: 400px;
  max-width: 90vw;
  animation: modalSlideIn 0.3s ease-out;
  border: 1px solid #404040;
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

.close-btn:hover {
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
  transition: border-color 0.3s ease;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #646cff;
  box-shadow: 0 0 0 2px rgba(100, 108, 255, 0.2);
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

.submit-btn:hover {
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

.cancel-btn:hover {
  background: #666;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (max-width: 480px) {
  .login-window {
    width: 95vw;
    margin: 20px;
  }

  .form-actions {
    flex-direction: column;
  }

  .submit-btn,
  .cancel-btn {
    width: 100%;
  }
}
</style>

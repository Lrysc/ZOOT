<template>
  <div class="setting-container">
    <h2>系统设置</h2>

    <div class="setting-content">
      <!-- 用户信息展示 -->
      <div class="user-info-section" v-if="authStore.isLogin">
        <h3>当前账号</h3>
        <div class="user-card">
          <div class="user-avatar">👤</div>
          <div class="user-details">
            <p class="user-name">{{ authStore.userName }}</p>
            <p class="user-level">等级: {{ authStore.userLevel }}</p>
            <p class="user-uid">用户ID: {{ authStore.userId }}</p>
            <p class="user-role-count" v-if="authStore.bindingRoles.length > 0">
              绑定角色: {{ authStore.bindingRoles.length }} 个
            </p>
            <p class="login-status">状态: <span class="status-online">已登录</span></p>
          </div>
        </div>
      </div>

      <!-- 未登录状态提示 -->
      <div class="not-login-section" v-else>
        <div class="not-login-card">
          <p class="not-login-text">未登录</p>
          <p class="not-login-tip">登录后可使用更多功能</p>
        </div>
      </div>

      <div class="setting-section">
        <h3>账号管理</h3>
        <div class="setting-actions">
          <button
            class="logout-btn"
            @click="handleLogout"
            :disabled="!authStore.isLogin || loggingOut"
          >
            {{ loggingOut ? '退出中...' : '退出登录' }}
          </button>
        </div>
      </div>

      <div class="setting-tips">
        <p>更多设置功能开发中...</p>
      </div>
    </div>

    <!-- 退出登录确认对话框 -->
    <div class="logout-modal-overlay" v-if="showLogoutDialog" @click.self="showLogoutDialog = false">
      <div class="logout-dialog">
        <div class="dialog-header">
          <h3>退出登录</h3>
          <button class="close-btn" @click="showLogoutDialog = false">×</button>
        </div>

        <div class="dialog-content">
          <p>确定要退出登录吗？</p>
          <p class="dialog-tip">退出后需要重新登录才能使用相关功能</p>
        </div>

        <div class="dialog-actions">
          <button class="cancel-btn" @click="showLogoutDialog = false">取消</button>
          <button class="confirm-btn" @click="confirmLogout" :disabled="loggingOut">
            {{ loggingOut ? '退出中...' : '确定退出' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@stores/auth'

const authStore = useAuthStore()
const showLogoutDialog = ref(false)
const loggingOut = ref(false)

/**
 * 处理退出登录点击
 */
const handleLogout = () => {
  if (!authStore.isLogin) {
    return
  }
  showLogoutDialog.value = true
}

/**
 * 确认退出登录
 */
const confirmLogout = async () => {
  loggingOut.value = true
  try {
    // 执行退出登录操作
    authStore.logout()

    // 延迟关闭对话框，让用户看到退出成功
    setTimeout(() => {
      showLogoutDialog.value = false
      loggingOut.value = false

      // 可以在这里添加退出成功后的回调
      console.log('退出登录成功')

    }, 800)

  } catch (error) {
    console.error('退出登录失败:', error)
    loggingOut.value = false
    showLogoutDialog.value = false
  }
}
</script>

<style scoped>
.setting-container {
  color: white;
  max-width: 100%;
  padding: 20px;
}

.setting-container h2 {
  margin-bottom: 30px;
  color: #ffffff;
  text-align: center;
}

.setting-content {
  max-width: 500px;
  margin: 0 auto;
}

/* 用户信息区域 */
.user-info-section {
  background: #2d2d2d;
  border-radius: 8px;
  border: 1px solid #404040;
  padding: 20px;
  margin-bottom: 20px;
}

.user-info-section h3 {
  margin-bottom: 15px;
  color: #9feaf9;
  font-size: 16px;
}

.user-card {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  background: #3a3a3a;
  border-radius: 6px;
  border: 1px solid #4a4a4a;
}

.user-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: #646cff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.user-details {
  flex: 1;
}

.user-name {
  font-weight: 600;
  color: #fff;
  margin-bottom: 4px;
  font-size: 16px;
}

.user-level, .user-uid, .user-role-count, .login-status {
  color: #ccc;
  font-size: 12px;
  margin-bottom: 2px;
}

.status-online {
  color: #4caf50;
  font-weight: 500;
}

/* 未登录状态 */
.not-login-section {
  background: #2d2d2d;
  border-radius: 8px;
  border: 1px solid #404040;
  padding: 30px 20px;
  margin-bottom: 20px;
  text-align: center;
}

.not-login-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.not-login-text {
  color: #ccc;
  font-size: 16px;
  margin: 0;
}

.not-login-tip {
  color: #888;
  font-size: 12px;
  margin: 0;
}

/* 设置区域 */
.setting-section {
  background: #2d2d2d;
  border-radius: 8px;
  border: 1px solid #404040;
  padding: 20px;
  margin-bottom: 20px;
}

.setting-section h3 {
  margin-bottom: 20px;
  color: #9feaf9;
  font-size: 16px;
}

.setting-actions {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.logout-btn {
  display: flex;
  align-items: center;
  justify-content: center; /* 添加这一行使文字居中 */
  gap: 10px;
  padding: 12px 20px;
  background: #ff6b6b;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.3s ease;
}

.logout-btn:hover:not(:disabled) {
  background: #ff5252;
}

.logout-btn:disabled {
  background: #888;
  cursor: not-allowed;
  opacity: 0.7;
}

.setting-tips {
  text-align: center;
  padding: 20px;
  color: #ccc;
  font-size: 14px;
  background: #2d2d2d;
  border-radius: 8px;
  border: 1px solid #404040;
}

/* 退出登录对话框样式 */
.logout-modal-overlay {
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

.logout-dialog {
  background: #2d2d2d;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  width: 400px;
  max-width: 90vw;
  animation: modalSlideIn 0.3s ease-out;
  border: 1px solid #404040;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #404040;
  background: #3a3a3a;
  border-radius: 8px 8px 0 0;
}

.dialog-header h3 {
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

.dialog-content {
  padding: 24px;
  text-align: center;
}

.dialog-content p {
  margin: 0 0 12px 0;
  color: #ccc;
  font-size: 14px;
}

.dialog-tip {
  color: #fad000 !important;
  font-size: 12px !important;
}

.dialog-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  padding: 0 24px 24px;
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

.confirm-btn {
  background: #ff6b6b;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background 0.3s ease;
  min-width: 100px;
}

.confirm-btn:hover:not(:disabled) {
  background: #ff5252;
}

.confirm-btn:disabled {
  background: #888;
  cursor: not-allowed;
  opacity: 0.7;
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
</style>

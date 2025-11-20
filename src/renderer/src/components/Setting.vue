<template>
  <div class="setting-container">
    <h2>系统设置</h2>

    <div class="setting-content">
      <!-- 用户信息展示 -->
      <div class="user-info-section" v-if="authStore.isLogin">
        <h3>当前账号</h3>
        <div class="user-card">
          <div class="user-avatar">
            <img
              v-if="userAvatar && !avatarLoadError"
              :src="userAvatar"
              alt="用户头像"
              class="avatar-img"
              @error="handleAvatarError"
              @load="handleAvatarLoad"
            />
            <div v-else class="avatar-placeholder">
              {{ getAvatarPlaceholder() }}
            </div>
          </div>
          <div class="user-details">
            <p class="user-name">{{ authStore.userName }}</p>
            <p class="user-level">等级: {{ userLevel }}</p>
            <p class="user-uid">游戏ID: {{ gameUid }}</p>
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

      <div class="setting-tips">
        <p>更多设置功能开发中...</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import { useAuthStore } from '@stores/auth'

const authStore = useAuthStore()
const userAvatar = ref<string>('')
const avatarLoadError = ref<boolean>(false)

/**
 * 获取游戏内UID
 */
const gameUid = computed(() => {
  if (!authStore.isLogin || !authStore.bindingRoles.length) {
    return '未获取'
  }

  // 获取默认角色或第一个角色的UID
  const defaultRole = authStore.bindingRoles.find(role => role.isDefault) || authStore.bindingRoles[0]
  return defaultRole?.uid || '未获取'
})

/**
 * 获取用户等级
 */
const userLevel = computed(() => {
  if (!authStore.isLogin || !authStore.playerData?.status) {
    return '未获取'
  }
  return authStore.playerData.status.level || '未获取'
})

/**
 * 处理CDN图片URL
 */
const processImageUrl = (url: string): string => {
  if (!url) return ''

  // 如果已经是完整URL，直接返回
  if (url.startsWith('http')) {
    return url
  }

  // 如果是相对路径，添加CDN域名
  // 这里需要根据你的实际CDN域名进行调整
  if (url.startsWith('/')) {
    return `https://web.hycdn.cn${url}`
  }

  return url
}

/**
 * 获取头像占位符
 */
const getAvatarPlaceholder = (): string => {
  if (!authStore.userName) return '👤'

  // 从用户名中提取第一个字符作为占位符
  const firstChar = authStore.userName.charAt(0)
  return firstChar || '👤'
}

/**
 * 处理头像加载错误
 */
const handleAvatarError = () => {
  console.warn('头像加载失败，使用默认占位符')
  avatarLoadError.value = true
}

/**
 * 处理头像加载成功
 */
const handleAvatarLoad = () => {
  avatarLoadError.value = false
}

/**
 * 获取用户头像
 */
const fetchUserAvatar = () => {
  if (!authStore.isLogin || !authStore.playerData?.status?.avatar) {
    userAvatar.value = ''
    avatarLoadError.value = true
    return
  }

  try {
    // 直接从 playerData 中获取头像信息
    const avatarData = authStore.playerData.status.avatar
    if (avatarData && avatarData.url) {
      // 处理CDN URL
      userAvatar.value = processImageUrl(avatarData.url)
      avatarLoadError.value = false
      console.log('头像URL:', userAvatar.value) // 调试用
    } else {
      userAvatar.value = ''
      avatarLoadError.value = true
    }
  } catch (error) {
    console.error('获取用户头像失败:', error)
    userAvatar.value = ''
    avatarLoadError.value = true
  }
}

// 监听 playerData 变化，更新头像
watch(
  () => authStore.playerData,
  () => {
    fetchUserAvatar()
  },
  { deep: true, immediate: true }
)

// 监听登录状态变化
watch(
  () => authStore.isLogin,
  (newVal) => {
    if (newVal) {
      fetchUserAvatar()
    } else {
      userAvatar.value = ''
      avatarLoadError.value = true
    }
  }
)

// 组件挂载时获取头像
onMounted(() => {
  if (authStore.isLogin) {
    fetchUserAvatar()
  }
})
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
  background: linear-gradient(135deg, #646cff, #af47ff);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  overflow: hidden;
  flex-shrink: 0;
  color: white;
  font-weight: 600;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
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

.user-level, .user-uid, .login-status {
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

.setting-tips {
  text-align: center;
  padding: 20px;
  color: #ccc;
  font-size: 14px;
  background: #2d2d2d;
  border-radius: 8px;
  border: 1px solid #404040;
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

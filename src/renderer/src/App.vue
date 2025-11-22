<script setup lang="ts">
import GameData from '@components/GameData.vue'
import Recruit from '@components/Recruit.vue'
import Material from '@components/Material.vue'
import LoginWindow from '@components/LoginWindow.vue'
import Setting from '@components/Setting.vue'
import ToastNotification from '@components/ToastNotification.vue' // 导入浮窗组件
import { useAuthStore } from '@stores/auth'
import { ref } from 'vue'

const authStore = useAuthStore()
const showLogin = ref(false)
const activeComponent = ref('GameData') // 默认显示首页
const showUserMenu = ref(false) // 控制用户菜单显示

const closeLogin = () => {
  showLogin.value = false
}

// 处理用户图标点击
const handleUserIconClick = () => {
  if (authStore.isLogin) {
    // 已登录，显示设置页面
    showUserMenu.value = !showUserMenu.value
  } else {
    // 未登录，显示登录窗口
    showLogin.value = true
    showUserMenu.value = false
  }
}

// 切换主内容区组件
const switchComponent = (componentName: string) => {
  activeComponent.value = componentName
  showUserMenu.value = false // 切换组件时关闭菜单
}

// 处理登录成功
const handleLoginSuccess = () => {
  console.log('登录成功，切换到首页');
  activeComponent.value = 'GameData'
  showUserMenu.value = false
  // GameData组件会通过watch监听到登录状态变化并自动刷新数据
}

// 处理菜单项点击
const handleMenuClick = (action: string) => {
  switch (action) {
    case 'setting':
      activeComponent.value = 'Setting'
      break
    case 'logout':
      authStore.logout()
      activeComponent.value = 'GameData'
      break
  }
  showUserMenu.value = false
}

// 点击页面其他区域关闭菜单
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target.closest('.user-menu-container')) {
    showUserMenu.value = false
  }
}

// 动态组件映射
const componentMap: Record<string, any> = {
  'GameData': GameData,
  'Recruit': Recruit,
  'Material': Material,
  'Setting': Setting
}
</script>

<template>
  <div class="app-container" @click="handleClickOutside">
    <!-- 顶部 Header -->
    <header class="app-header">
      <div class="header-left">
        <img alt="logo" class="logo" src="@assets/logo_rhodes_island.svg" />
        <h1>PRTS Beta</h1>
      </div>

      <!-- 用户图标放在右侧 -->
      <div class="header-right user-menu-container">
        <button class="user-icon-btn" @click="handleUserIconClick" :title="authStore.isLogin ? '用户菜单' : '登录'">
          <img alt="user" class="user-icon" src="@assets/icon_user.svg" />
          <!-- 已登录状态指示器 -->
          <div v-if="authStore.isLogin" class="login-indicator"></div>
        </button>

        <!-- 用户下拉菜单 -->
        <div v-if="authStore.isLogin && showUserMenu" class="user-dropdown-menu">
          <div class="menu-item" @click="handleMenuClick('setting')">
            <span>设置</span>
          </div>
          <div class="menu-divider"></div>
          <div class="menu-item logout" @click="handleMenuClick('logout')">
            <span>退出登录</span>
          </div>
        </div>
      </div>
    </header>

    <!-- 主要内容区域 -->
    <div class="main-layout">
      <!-- 侧边栏 -->
      <aside class="sidebar">
        <!-- 导航菜单 -->
        <nav class="navigation">
          <div class="nav-section">
            <ul class="nav-menu">
              <li
                :class="['nav-item', { active: activeComponent === 'GameData' }]"
                @click="switchComponent('GameData')"
              >
                游戏数据
              </li>
              <li
                :class="['nav-item', { active: activeComponent === 'Recruit' }]"
                @click="switchComponent('Recruit')"
              >
                公招计算
              </li>
              <li
                :class="['nav-item', { active: activeComponent === 'Material' }]"
                @click="switchComponent('Material')"
              >
                材料计算
              </li>
              <li
                :class="['nav-item', { active: activeComponent === 'HeadhuntingRecord' }]"
                @click="switchComponent('HeadhuntingRecord')"
              >
                寻访记录
              </li>
            </ul>
          </div>
        </nav>
      </aside>

      <!-- 主内容区 -->
      <main class="main-content">
        <component :is="componentMap[activeComponent]" />
      </main>
    </div>

    <!-- 登录窗口 -->
    <LoginWindow
      v-if="showLogin"
      @close="closeLogin"
      @loginSuccess="handleLoginSuccess"
    />

    <!-- 全局浮窗通知组件 -->
    <ToastNotification />
  </div>
</template>

<style>
/* 重置默认样式 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* 全局隐藏滚动条 */
*::-webkit-scrollbar {
  display: none;
}

/* 移除这里的 body 字体设置，使用全局 CSS 的设置 */
body {
  background: #1a1a1a;
  color: white;
  overflow: hidden;
  /* 不设置 font-family，让全局 CSS 生效 */
  -ms-overflow-style: none; /* IE and Edge */
  scrollbar-width: none; /* Firefox */
}

.app-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
}

/* 顶部 Header */
.app-header {
  height: 50px;
  background: #2d2d2d;
  border-bottom: 1px solid #404040;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  position: relative;
  z-index: 1000;
}

.header-left {
  display: flex;
  align-items: center; /* 确保垂直居中对齐 */
  gap: 12px;
}

.logo {
  height: 30px;
  width: 30px;
  filter: brightness(0) invert(1); /* 将图标变为白色 */
  display: block; /* 确保图片正确显示 */
}

.app-header h1 {
  font-size: 18px;
  font-weight: 600;
  color: white;
  margin: 0;
  line-height: 1; /* 移除行高影响 */
  display: flex;
  align-items: center; /* 垂直居中 */
}

.header-right {
  display: flex;
  align-items: center;
  position: relative;
}

/* 用户图标按钮 */
.user-icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px;
  border-radius: 4px;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.user-icon-btn:hover {
  background: transparent; /* 移除背景色变化 */
}

.user-icon {
  height: 24px;
  width: 24px;
  filter: brightness(0) invert(0.6); /* 默认灰色 */
  transition: filter 0.3s ease;
}

.user-icon-btn:hover .user-icon {
  filter: brightness(0) saturate(100%) invert(42%) sepia(91%) saturate(1352%) hue-rotate(202deg) brightness(97%) contrast(89%); /* 悬停时变为与侧边栏相同的蓝色 */
}

/* 已登录状态指示器 */
.login-indicator {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 8px;
  height: 8px;
  background: #4caf50;
  border-radius: 50%;
  border: 1px solid #2d2d2d;
}

/* 用户下拉菜单 */
.user-dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  background: #2d2d2d;
  border: 1px solid #404040;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  min-width: 120px;
  z-index: 1001;
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.user-dropdown-menu::before {
  content: '';
  position: absolute;
  top: -6px;
  right: 12px;
  width: 12px;
  height: 12px;
  background: #2d2d2d;
  border-left: 1px solid #404040;
  border-top: 1px solid #404040;
  transform: rotate(45deg);
}

.menu-item {
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 14px;
  color: #ccc;
}

.menu-item:hover {
  background: #3a3a3a;
  color: #4a90e2; /* 悬停时文字变为蓝色 */
}

.menu-item.logout:hover {
  color: #ff6b6b;
}

.menu-divider {
  height: 1px;
  background: #404040;
  margin: 4px 0;
}

/* 主要内容布局 */
.main-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* 侧边栏 */
.sidebar {
  width: 150px;
  background: #2d2d2d;
  border-right: 1px solid #404040;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  overflow-y: auto;
  -ms-overflow-style: none; /* IE and Edge */
  scrollbar-width: none; /* Firefox */
}

.sidebar::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Opera */
}

/* 导航菜单 */
.navigation {
  flex: 1;
}

/* 移除 nav-title 相关的样式，因为已经删除了这个元素 */
.nav-menu {
  list-style: none;
  margin: 0;
  padding: 0;
}

.nav-item {
  padding: 8px 16px;
  margin: 4px 0;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 14px;
  color: #ccc;
}

.nav-item:hover {
  background: #3a3a3a;
  color: #4a90e2; /* 悬停时文字变为蓝色 */
}

.nav-item.active {
  background: #4a90e2; /* 侧边栏激活状态的蓝色 */
  color: white;
  font-weight: 500;
}

/* 主内容区 */
.main-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  background: #1a1a1a;
  background-image: url('@assets/6x6dotspace.png');
  background-repeat: repeat;
  background-size: auto;
  background-position: 0 0;
  background-attachment: local;
  -ms-overflow-style: none; /* IE and Edge */
  scrollbar-width: none; /* Firefox */
}

.main-content::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Opera */
}
</style>

<script setup lang="ts">
import GameData from '@components/GameData.vue'
import Recruit from '@components/Recruit.vue'
import Material from '@components/Material.vue'
import LoginWindow from '@components/LoginWindow.vue'
import Setting from '@components/Setting.vue'
import ToastNotification from '@components/ToastNotification.vue'
import HeadhuntingRecord from '@components/headhuntingrecord.vue'
import TitleBar from '@components/TitleBar.vue'
import { useAuthStore } from '@stores/auth'
import { useGameDataStore } from '@stores/gameData'
import { ref, onMounted, onUnmounted, provide, computed, inject } from 'vue'
import {
  showSuccess,
  showError,
  showInfo,
  showWarning
} from '@services/toastService'
import { AuthAPI } from '@services/api'

// ==================== Store实例初始化 ====================
/**
 * 认证状态管理store
 */
const authStore = useAuthStore();

/**
 * 游戏数据管理store
 */
const gameDataStore = useGameDataStore();

// ==================== 状态管理 ====================
/**
 * 登录窗口显示状态
 */
const showLogin = ref(false);

/**
 * 当前活动组件名称
 * 控制主内容区显示的组件
 */
const activeComponent = ref('GameData');

/**
 * 用户菜单显示状态
 * 控制用户下拉菜单的显示/隐藏
 */
const showUserMenu = ref(false);

/**
 * 右键菜单可见性状态
 * 控制全局右键菜单的显示和隐藏
 */
const contextMenuVisible = ref(false);

/**
 * 右键菜单位置状态
 * 存储右键菜单的坐标位置，支持边缘检测
 */
const contextMenuPosition = ref({ x: 0, y: 0 });

/**
 * 刷新操作状态
 * 控制全局刷新按钮的加载状态
 */
const isRefreshing = ref(false);

/**
 * 签到操作状态
 */
const isAttending = ref(false);

// ==================== 计算属性 ====================
/**
 * 当前组件刷新函数映射
 * 根据当前活动组件返回对应的刷新方法
 */
const currentRefreshMethod = computed(() => {
  const refreshMethods: Record<string, () => Promise<void>> = {
    'GameData': async () => {
      await gameDataStore.refreshData();
    },
    'Recruit': async () => {
      // Recruit组件的刷新逻辑
      console.log('刷新公招计算数据');
      // 这里可以调用Recruit组件的刷新方法
    },
    'Material': async () => {
      // Material组件的刷新逻辑
      console.log('刷新材料计算数据');
      // 这里可以调用Material组件的刷新方法
    },
    'HeadhuntingRecord': async () => {
      // HeadhuntingRecord组件的刷新逻辑
      console.log('刷新寻访记录数据');
      // 这里可以调用HeadhuntingRecord组件的刷新方法
    },
    'Setting': async () => {
      // Setting组件通常不需要刷新
      console.log('设置页面无需刷新');
    }
  };
  return refreshMethods[activeComponent.value];
});

/**
 * 当前组件刷新提示映射
 * 根据当前活动组件返回对应的刷新提示
 */
const currentRefreshMessage = computed(() => {
  const messages: Record<string, { loading: string, success: string }> = {
    'GameData': {
      loading: '神经连接中...',
      success: '神经连接同步完成！'
    },
    'Recruit': {
      loading: '更新公招数据中...',
      success: '公招数据更新完成！'
    },
    'Material': {
      loading: '更新材料数据中...',
      success: '材料数据更新完成！'
    },
    'HeadhuntingRecord': {
      loading: '更新寻访记录中...',
      success: '寻访记录更新完成！'
    },
    'Setting': {
      loading: '刷新设置中...',
      success: '设置刷新完成！'
    }
  };
  return messages[activeComponent.value] || { loading: '刷新中...', success: '刷新完成！' };
});

// ==================== 全局右键菜单功能 ====================

/**
 * 显示全局右键菜单（带边缘检测防止被遮挡）
 * @param event 鼠标事件对象
 */
const showContextMenu = (event: MouseEvent) => {
  // 阻止浏览器默认的右键菜单
  event.preventDefault();
  // 阻止事件冒泡到父元素
  event.stopPropagation();

  // 菜单尺寸定义
  const menuWidth = 150;
  const menuHeight = 120;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // 初始位置为鼠标点击位置
  let x = event.clientX;
  let y = event.clientY;

  // 边缘检测：如果靠近右侧边缘，向左偏移
  if (x + menuWidth > viewportWidth) {
    x = viewportWidth - menuWidth - 10;
  }

  // 边缘检测：如果靠近底部边缘，向上偏移
  if (y + menuHeight > viewportHeight) {
    y = viewportHeight - menuHeight - 10;
  }

  // 确保位置不会超出屏幕边界（最小10px边距）
  x = Math.max(10, Math.min(x, viewportWidth - menuWidth - 10));
  y = Math.max(10, Math.min(y, viewportHeight - menuHeight - 10));

  // 更新菜单位置并显示菜单
  contextMenuPosition.value = { x, y };
  contextMenuVisible.value = true;
};

/**
 * 隐藏全局右键菜单
 * 用于点击菜单外部区域时关闭菜单
 */
const hideContextMenu = () => {
  contextMenuVisible.value = false;
};

/**
 * 打开明日方舟官网
 */
const openOfficialWebsite = () => {
  hideContextMenu();
  window.open('https://ak.hypergryph.com/#index', '_blank');
};

/**
 * 打开官方充值中心
 */
const openPaymentCenter = () => {
  hideContextMenu();
  window.open('https://user.hypergryph.com/payment/arknights', '_blank');
};

// ==================== 全局刷新功能 ====================

/**
 * 全局刷新数据功能
 * 根据当前活动组件调用对应的刷新方法
 */
const handleGlobalRefresh = async () => {
  // 先隐藏右键菜单
  hideContextMenu();

  // 设置刷新状态
  isRefreshing.value = true;

  try {
    // 显示刷新中的浮窗通知
    const { loading, success } = currentRefreshMessage.value;
    showInfo(loading);

    // 调用当前组件的刷新方法
    const refreshMethod = currentRefreshMethod.value;
    if (refreshMethod) {
      await refreshMethod();
    }

    // 显示成功提示
    showSuccess(success);

  } catch (error: any) {
    // 安全的错误处理
    const errorMessage = error?.message || '未知错误';
    console.error('全局刷新失败:', error);
    showError(`刷新失败：${errorMessage}`);
  } finally {
    // 无论成功失败，都重置刷新状态
    isRefreshing.value = false;
  }
};

/**
 * 键盘快捷键刷新
 * 监听 F5 和 Ctrl+R 快捷键
 */
const handleKeyboardRefresh = (event: KeyboardEvent) => {
  // 检查是否按下了 F5 或 Ctrl+R
  if (event.key === 'F5' || (event.ctrlKey && event.key === 'r')) {
    event.preventDefault(); // 阻止浏览器默认刷新行为
    handleGlobalRefresh();
  }
};

// ==================== 组件通信 ====================

/**
 * 提供刷新方法给子组件
 * 子组件可以通过 inject('refreshData') 调用全局刷新
 */
provide('refreshData', handleGlobalRefresh);

/**
 * 提供当前组件名称给子组件
 */
provide('currentActiveComponent', activeComponent);

// ==================== 组件方法 ====================

/**
 * 关闭登录窗口
 */
const closeLogin = () => {
  showLogin.value = false;
};

/**
 * 处理用户图标点击事件
 * 根据登录状态显示不同内容
 */
const handleUserIconClick = () => {
  if (authStore.isLogin) {
    // 已登录，显示用户菜单
    showUserMenu.value = !showUserMenu.value;
  } else {
    // 未登录，显示登录窗口
    showLogin.value = true;
    showUserMenu.value = false;
  }
};

/**
 * 处理森空岛签到功能
 * 包含登录检查、凭证验证、角色选择、签到执行等完整流程
 */
const handleAttendance = async () => {
  // 前置检查：必须已登录且有绑定角色
  if (!authStore.isLogin || !authStore.bindingRoles?.length) {
    showWarning('请先登录并绑定游戏角色');
    return;
  }

  // 设置签到中状态，禁用按钮
  isAttending.value = true;

  try {
    // 第一步：验证cred有效性
    console.log('=== 开始验证cred有效性 ===');
    const isCredValid = await AuthAPI.checkCred(authStore.sklandCred);
    console.log('Cred有效性验证结果:', isCredValid);

    if (!isCredValid) {
      throw new Error('Cred已失效，请重新登录');
    }

    // 第二步：获取目标角色信息
    // 优先选择默认角色，否则选择第一个角色
    const targetRole = authStore.bindingRoles.find((role: any) => role.isDefault) || authStore.bindingRoles[0];
    if (!targetRole) {
      throw new Error('未找到绑定的游戏角色');
    }

    // 调试信息输出
    console.log('=== 绑定角色详细信息 ===');
    console.log('完整的绑定角色列表:', JSON.stringify(authStore.bindingRoles, null, 2));
    console.log('选中的角色信息:', JSON.stringify(targetRole, null, 2));
    console.log('角色UID:', targetRole.uid);
    console.log('channelMasterId:', targetRole.channelMasterId);
    console.log('========================');

    const gameId = targetRole.channelMasterId;
    console.log('用于签到的gameId:', gameId);

    // 第三步：执行签到请求
    const attendanceData = await AuthAPI.attendance(
      authStore.sklandCred,
      authStore.sklandSignToken,
      targetRole.uid,
      gameId
    );

    // 第四步：处理签到结果
    if (attendanceData.alreadyAttended) {
      showInfo('今日已签到');
    } else {
      // 解析签到奖励信息
      const awards = attendanceData.awards || [];
      const awardTexts = awards.map((award: any) => {
        const count = award.count || 0;
        const name = award.resource?.name || '未知奖励';
        return `${name} x${count}`;
      }).join(', ');

      showSuccess(`签到成功！获得：${awardTexts}`);

      // 签到成功后自动刷新数据
      await gameDataStore.refreshData();
    }

  } catch (error: any) {
    // 安全的错误处理，提供友好的错误信息
    const errorMsg = error?.message || '签到失败，请稍后重试';
    console.error('签到过程发生错误:', error);
    showError(errorMsg);
  } finally {
    // 无论成功失败，都重置签到状态
    isAttending.value = false;
  }
};

/**
 * 切换主内容区组件
 * @param componentName 组件名称
 */
const switchComponent = (componentName: string) => {
  activeComponent.value = componentName;
  showUserMenu.value = false; // 切换组件时关闭菜单
};

/**
 * 处理登录成功回调
 */
const handleLoginSuccess = () => {
  console.log('登录成功，切换到首页');
  activeComponent.value = 'GameData';
  showUserMenu.value = false;
};

/**
 * 处理菜单项点击
 * @param action 菜单动作类型
 */
const handleMenuClick = (action: string) => {
  switch (action) {
    case 'setting':
      activeComponent.value = 'Setting';
      break;
    case 'logout':
      authStore.logout();
      activeComponent.value = 'GameData';
      break;
  }
  showUserMenu.value = false;
};

/**
 * 点击页面其他区域关闭菜单
 * @param event 鼠标事件对象
 */
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  if (!target.closest('.user-menu-container')) {
    showUserMenu.value = false;
  }
};

// ==================== 生命周期管理 ====================

/**
 * 组件挂载时的初始化操作
 */
onMounted(() => {
  console.log('App组件挂载，注册全局监听器');

  // 启动游戏数据时间更新定时器
  gameDataStore.startTimeUpdate();

  // 注册全局右键事件监听器
  document.addEventListener('contextmenu', showContextMenu);

  // 注册全局点击事件监听器（用于隐藏右键菜单）
  document.addEventListener('click', hideContextMenu);

  // 注册键盘快捷键监听器
  document.addEventListener('keydown', handleKeyboardRefresh);

  // 初始化认证状态
  authStore.restoreAuthState().then((isRestored) => {
    if (isRestored) {
      console.log('神经连接成功');
      if (authStore.playerData) {
        // 数据已经完整，直接显示欢迎信息
        showSuccess('欢迎回来，博士！');
      } else {
        // 数据不完整，显示同步提示，数据加载完成后会显示连接成功通知
        showInfo('正在同步神经中枢...');
      }
    } else {
      console.log('未找到相关记忆');
    }
  }).catch((error) => {
    console.error('神经同步失败:', error);
    // 不显示错误提示，避免每次打开都提示
  });
});

/**
 * 组件卸载时的清理操作
 */
onUnmounted(() => {
  console.log('App组件卸载，移除全局监听器');

  // 停止游戏数据时间更新定时器
  gameDataStore.stopTimeUpdate();

  // 移除全局事件监听器
  document.removeEventListener('contextmenu', showContextMenu);
  document.removeEventListener('click', hideContextMenu);
  document.removeEventListener('keydown', handleKeyboardRefresh);
});

// ==================== 动态组件映射 ====================
/**
 * 组件名称到组件的映射
 * 用于动态渲染组件
 */
const componentMap: Record<string, any> = {
  'GameData': GameData,
  'Recruit': Recruit,
  'Material': Material,
  'HeadhuntingRecord': HeadhuntingRecord,
  'Setting': Setting
};
</script>

<template>
  <div class="app-container" @click="handleClickOutside" @contextmenu="showContextMenu">

    <!-- 自定义标题栏 -->
    <TitleBar />

    <!-- ==================== 全局右键菜单 ==================== -->
    <div
      v-if="contextMenuVisible"
      class="context-menu"
      :style="{
        left: `${contextMenuPosition.x}px`,
        top: `${contextMenuPosition.y}px`
      }"
      @click.stop
    >
      <button
        class="context-menu-item refresh-item"
        @click="handleGlobalRefresh"
        :disabled="isRefreshing"
        :class="{ refreshing: isRefreshing }"
      >
        <span class="context-menu-text">
          {{ isRefreshing ? '刷新中...' : '刷新当前页面' }}
        </span>
      </button>
      <div class="context-menu-divider"></div>
      <button
        class="context-menu-item"
        @click="openOfficialWebsite"
      >
        <span class="context-menu-text">明日方舟官网</span>
      </button>
      <button
        class="context-menu-item"
        @click="openPaymentCenter"
      >
        <span class="context-menu-text">官方充值中心</span>
      </button>
    </div>

    <!-- 顶部 Header -->
    <header class="app-header">
      <div class="header-left">
        <img alt="logo" class="logo" src="@assets/logo_rhodes_island.svg" />
        <h1>ZOOT备用系统</h1>
      </div>

      <!-- 用户图标和签到按钮放在右侧 -->
      <div class="header-right user-menu-container">
        <!-- 森空岛签到按钮 -->
        <button
          class="attendance-btn"
          @click="handleAttendance"
          :disabled="isAttending || !authStore.isLogin"
          :class="{ attending: isAttending }"
          :title="!authStore.isLogin ? '请先登录' : (isAttending ? '签到中...' : '每日签到')"
        >
          <img
            src="@assets/icon_skland.svg"
            alt="森空岛签到"
            class="skland-icon"
          />
        </button>

        <!-- 用户图标 -->
        <button
          class="user-icon-btn"
          @click="handleUserIconClick"
          :title="authStore.isLogin ? '用户菜单' : '登录'"
        >
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
        <!-- MENU 标识 -->
        <div class="menu-label">MENU</div>

        <!-- 导航菜单 -->
        <nav class="navigation">
          <div class="nav-section">
            <ul class="nav-menu">
              <li
                :class="['nav-item', { 'nav-item-active': activeComponent === 'GameData' }]"
                @click="switchComponent('GameData')"
              >
                游戏数据
              </li>
              <li
                :class="['nav-item', { 'nav-item-active': activeComponent === 'Recruit' }]"
                @click="switchComponent('Recruit')"
              >
                公招计算
              </li>
              <li
                :class="['nav-item', { 'nav-item-active': activeComponent === 'HeadhuntingRecord' }]"
                @click="switchComponent('HeadhuntingRecord')"
              >
                寻访记录
              </li>
              <li
                :class="['nav-item', { 'nav-item-active': activeComponent === 'Material' }]"
                @click="switchComponent('Material')"
              >
                材料计算
              </li>
            </ul>
          </div>
        </nav>
      </aside>

      <!-- 主内容区 -->
      <main class="main-content">
        <component
          :is="componentMap[activeComponent]"
          @showLogin="showLogin = true"
        />
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

<style scoped>
/* ==================== 全局样式重置 ==================== */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* 全局隐藏滚动条 */
*::-webkit-scrollbar {
  display: none;
}

body {
  background: #1a1a1a;
  color: white;
  overflow: hidden;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

/* ==================== 应用容器样式 ==================== */
.app-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  user-select: none;
}

/* ==================== 全局右键菜单样式 ==================== */
.context-menu {
  position: fixed;
  background: #2d2d2d;
  border: 1px solid #404040;

  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  z-index: 10000;
  min-width: 150px;
  padding: 8px;
  animation: contextMenuSlideIn 0.15s ease-out;
  backdrop-filter: blur(10px);
}

.context-menu-item {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 12px 16px;
  background: transparent;
  border: none;

  color: #ccc;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
  font-family: inherit;
}

.context-menu-item:hover:not(:disabled) {
  background: #646cff;
  color: white;
}

.context-menu-item:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.context-menu-item.refreshing {
  background: #ffa500;
  color: white;
}

.context-menu-text {
  text-align: center;
}

/* 右键菜单进入动画 */
@keyframes contextMenuSlideIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-5px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* 右键菜单分隔线 */
.context-menu-divider {
  height: 1px;
  background: #404040;
  margin: 4px 0;
}

/* ==================== 顶部 Header 样式 ==================== */
.app-header {
  height: 50px;
  background: #2d2d2d;
  border-bottom: 1px solid #404040;
  display: flex;
  align-items: center;
  margin-top: 32px; /* 为自定义标题栏留出空间 */
  justify-content: space-between;
  padding: 0 20px;
  position: relative;
  z-index: 1000;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo {
  height: 30px;
  width: 30px;
  filter: brightness(0) invert(1);
  display: block;
}

.app-header h1 {
  font-size: 18px;
  font-weight: 600;
  color: white;
  margin: 0;
  line-height: 1;
  display: flex;
  align-items: center;
}

.header-right {
  display: flex;
  align-items: center;
  position: relative;
}

/* ==================== 用户图标按钮样式 ==================== */
.user-icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px;

  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.user-icon-btn:hover {
  background: transparent;
}

.user-icon {
  height: 24px;
  width: 24px;
  filter: brightness(0) invert(0.6);
  transition: filter 0.3s ease;
}

.user-icon-btn:hover .user-icon {
  filter: brightness(0) saturate(100%) invert(42%) sepia(91%) saturate(1352%) hue-rotate(202deg) brightness(97%) contrast(89%);
}

/* ==================== 签到按钮样式 ==================== */
.attendance-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px;

  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  margin-right: 4px;
}

.attendance-btn:hover:not(:disabled) {
  background: transparent;
  transform: scale(1.15);
}

.attendance-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.attendance-btn.attending {
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.skland-icon {
  height: 28px;
  width: 28px;
  filter: brightness(0) invert(0.6);
  transition: filter 0.3s ease;
}

.attendance-btn:hover:not(:disabled) .skland-icon {
  filter: brightness(0) saturate(100%) invert(42%) sepia(91%) saturate(495%) hue-rotate(80deg) brightness(95%) contrast(89%);
}

/* 已登录状态指示器 */
.login-indicator {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 8px;
  height: 8px;
  background: #4caf50;

  border: 1px solid #2d2d2d;
}

/* ==================== 用户下拉菜单样式 ==================== */
.user-dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  background: #2d2d2d;
  border: 1px solid #404040;

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
  z-index: -1;
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
  color: #4a90e2;
}

.menu-item.logout:hover {
  color: #ff6b6b;
}

.menu-divider {
  height: 1px;
  background: #404040;
  margin: 4px 0;
}

/* ==================== 主要内容布局样式 ==================== */
.main-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* ==================== 侧边栏样式 ==================== */
.sidebar {
  width: 180px;
  background: #2d2d2d; /* 保持原有背景色不变 */
  border-right: 1px solid #404040;
  padding: 30px 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  -ms-overflow-style: none;
  scrollbar-width: none;
  position: relative;
}

/* MENU 标签样式（调整位置、大小和颜色） */
.menu-label {
  position: absolute;
  top: 60px; /* 上移位置 */
  left: 22px; /* 左移位置 */
  font-size: 50px; /* 增大字体 */
  font-weight: 900; /* 加粗 */
  font-family: 'HappyHeroes', 'Microsoft YaHei', sans-serif;
  color: #44485a; /* 灰色 */
  letter-spacing: 2px;
  text-transform: uppercase;
  pointer-events: none;
  opacity: 0.8;
  z-index: 1;
  line-height: 1;
}

.sidebar::-webkit-scrollbar {
  display: none;
}

/* ==================== 导航菜单样式 ==================== */
.navigation {
  flex: 1;
  position: relative;
  z-index: 2;
  margin-top: 60px; /* 调整与MENU标签的间距 */
  padding: 0 10px;
}

.nav-menu {
  list-style: none;
  margin: 0;
  padding: 0;
}

/* 未选中按钮样式 */
.nav-item {
  padding: 14px 20px;
  margin: 4px 0;

  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 15px;
  color: #ffffff;
  font-weight: 500;
  position: relative;
  overflow: hidden;
  background: transparent;
}

/* 未选中按钮hover效果 */
.nav-item:hover:not(.nav-item-active) {
  color: #ffffff;
  background: rgba(78, 116, 255, 0.08);
}

/* 选中按钮样式 - 带渐变蔓延动画 */
.nav-item-active {
  padding: 14px 20px;
  margin: 4px 0;
  color: #59b4ed;
  font-weight: 500;
  position: relative;
  overflow: hidden;
  background: transparent;
}

/* 渐变背景层 - 用于动画效果 */
.nav-item-active::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: 100%;
  background: linear-gradient(90deg,
  rgba(78, 116, 255, 0.2) 0%,
  rgba(78, 116, 255, 0.05) 100%);
  transform: scaleX(0);
  transform-origin: left center;
  transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: -1;
  animation: gradientSpread 0.5s forwards;
}

/* 左侧渐变条 */
.nav-item-active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: 4px;
  background: linear-gradient(180deg,
  #4ec1ff 0%,
  #96def8 50%,
  #0f9bf6 100%);
  z-index: 1;
}

/* 渐变蔓延动画 */
@keyframes gradientSpread {
  from {
    transform: scaleX(0);
  }
  to {
    transform: scaleX(1);
  }
}

/* ==================== 主内容区样式 ==================== */
.main-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  background: #1a1a1a url('@assets/6x6dotspace.png') repeat local 0 0 / auto;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.main-content::-webkit-scrollbar {
  display: none;
}
</style>

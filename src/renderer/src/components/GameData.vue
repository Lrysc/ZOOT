<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import { useAuthStore } from '@stores/auth';
import { useGameDataStore } from '@stores/gameData';
import { AuthAPI } from '@services/api';
import {
  showSuccess,
  showError,
  showWarning,
  showInfo
} from '@services/toastService';

// ==================== Store实例初始化 ====================
/**
 * 认证状态管理store
 * 负责用户登录状态、凭证信息的管理
 */
const authStore = useAuthStore();

/**
 * 游戏数据管理store
 * 负责游戏数据的获取、缓存、格式化等操作
 */
const gameDataStore = useGameDataStore();

// ==================== 计算属性定义 ====================
/**
 * 数据存在状态计算属性
 * 用于判断是否已经成功加载了游戏数据
 * 替代原本缺失的 gameDataStore.hasData 属性
 */
const hasGameData = computed(() => {
  return !!gameDataStore.playerData && Object.keys(gameDataStore.playerData).length > 0;
});

/**
 * 是否显示加载状态
 * 只在初始加载且没有数据时显示
 */
const showLoading = computed(() => {
  return gameDataStore.isLoading && !hasGameData.value;
});

// ==================== 组件状态管理 ====================

/**
 * 签到操作状态
 * 控制签到按钮的加载状态和禁用状态
 */
const isAttending = ref(false);

/**
 * 右键菜单可见性状态
 * 控制右键菜单的显示和隐藏
 */
const contextMenuVisible = ref(false);

/**
 * 右键菜单位置状态
 * 存储右键菜单的坐标位置，支持边缘检测
 */
const contextMenuPosition = ref({ x: 0, y: 0 });

// ==================== 右键菜单功能 ====================

/**
 * 显示右键菜单（带边缘检测防止被遮挡）
 * @param event 鼠标事件对象
 */
const showContextMenu = (event: MouseEvent) => {
  // 阻止浏览器默认的右键菜单
  event.preventDefault();
  // 阻止事件冒泡到父元素
  event.stopPropagation();

  // 菜单尺寸定义
  const menuWidth = 150; // 菜单宽度
  const menuHeight = 50; // 菜单高度
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
 * 隐藏右键菜单
 * 用于点击菜单外部区域时关闭菜单
 */
const hideContextMenu = () => {
  contextMenuVisible.value = false;
};

/**
 * 处理容器点击事件（阻止冒泡）
 * 防止点击容器内部时触发全局的菜单隐藏
 * @param event 鼠标事件对象
 */
const handleContainerClick = (event: MouseEvent) => {
  event.stopPropagation();
};

// ==================== 数据操作功能 ====================

/**
 * 处理刷新数据请求
 * 调用store的刷新方法并处理结果
 */
const handleRefresh = async () => {
  // 先隐藏右键菜单
  hideContextMenu();

  try {
    // 调用store的刷新数据方法
    await gameDataStore.refreshData();
    // 显示成功提示
    showSuccess('数据刷新成功！');
  } catch (error: any) {
    // 安全的错误处理，避免未处理的Promise拒绝
    const errorMessage = error?.message || '未知错误';
    console.error('刷新数据失败:', error);
    showError(`刷新失败：${errorMessage}`);
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

// ==================== 生命周期管理 ====================

/**
 * 组件挂载时的初始化操作
 * 包括启动定时器、事件监听、数据加载等
 */
onMounted(async () => {
  console.log('GameData组件挂载，开始初始化...');

  // 启动时间更新定时器（用于实时数据如理智恢复时间等）
  gameDataStore.startTimeUpdate();

  // 添加全局事件监听器
  // 点击任意位置隐藏右键菜单
  document.addEventListener('click', hideContextMenu);
  // 右键点击时检查是否需要隐藏菜单
  document.addEventListener('contextmenu', (event) => {
    // 只在菜单显示时处理右键事件
    if (!contextMenuVisible.value) return;
    const target = event.target as HTMLElement;
    // 如果点击的不是菜单本身，则隐藏菜单
    if (!target.closest('.context-menu')) {
      hideContextMenu();
    }
  });

  try {
    // 根据登录状态决定数据加载策略
    if (authStore.isLogin) {
      console.log('用户已登录，直接加载游戏数据');
      await gameDataStore.fetchGameData();
    } else {
      console.log('用户未登录，尝试恢复登录状态');
      const isRestored = await authStore.restoreAuthState();
      if (isRestored) {
        console.log('登录状态恢复成功，加载游戏数据');
        await gameDataStore.fetchGameData();
        showSuccess('欢迎回来，博士！');
      } else {
        console.log('登录状态恢复失败，显示未登录状态');
        // 不设置loading状态，让组件正常显示未登录状态
      }
    }
  } catch (error) {
    // 捕获错误但不阻止组件显示
    console.error('GameData组件初始化失败:', error);
    // 组件会显示错误状态或空数据，保证用户体验
  }
});

/**
 * 监听登录状态变化
 * 当用户登录状态发生变化时，重新加载数据
 */
watch(() => authStore.isLogin, async (newLoginState, oldLoginState) => {
  // 只有当从未登录变为已登录时才执行
  if (newLoginState && !oldLoginState) {
    console.log('检测到登录状态变化，清除缓存并重新加载数据');
    // 清除旧缓存数据
    gameDataStore.clearCache();
    try {
      // 重新获取最新数据
      await gameDataStore.fetchGameData();
    } catch (error) {
      console.error('登录状态变化后重新加载数据失败:', error);
      // 不显示错误提示，让组件正常显示
    }
  }
});

/**
 * 组件卸载时的清理操作
 * 释放资源，移除事件监听器
 */
onUnmounted(() => {
  // 停止时间更新定时器
  gameDataStore.stopTimeUpdate();
  // 移除全局事件监听器
  document.removeEventListener('click', hideContextMenu);
  document.removeEventListener('contextmenu', hideContextMenu);
});
</script>

<template>
  <div class="game-data-container" @contextmenu="showContextMenu" @click="handleContainerClick">

    <!-- ==================== 右键菜单组件 ==================== -->
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
        @click="handleRefresh"
        :disabled="gameDataStore.isRefreshing"
        :class="{ refreshing: gameDataStore.isRefreshing }"
      >
        <span class="context-menu-text">
          {{ gameDataStore.isRefreshing ? '刷新中...' : '刷新数据' }}
        </span>
      </button>
    </div>

    <!-- ==================== 主内容区域 ==================== -->

    <!-- 初始加载状态提示 - 在主要区域居中显示 -->
    <div class="main-loading-container" v-if="showLoading">
      <div class="loading-content">
        <div class="spinner"></div>
        <p class="loading-text">加载游戏数据中...</p>
      </div>
    </div>

    <!-- 数据卡片区域（永远显示，无论什么状态） -->
    <div class="cards-wrapper" v-else>

      <!-- 数据头部操作栏 -->
      <div class="data-header">
        <div class="left-section">
          <div class="update-info">
            <!-- 最后更新时间 - 只在有数据时显示 -->
            <span class="last-update" v-if="gameDataStore.lastUpdateTime && authStore.isLogin">
              最后更新：{{ gameDataStore.formatTimestamp(Math.floor(gameDataStore.lastUpdateTime / 1000)) }}
            </span>
          </div>
        </div>
        <div class="header-buttons">
          <!-- 森空岛签到图标按钮 -->
          <button
            class="attendance-icon-btn"
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
            <span class="attendance-tooltip" v-if="isAttending">签到中...</span>
            <span class="attendance-tooltip" v-else-if="!authStore.isLogin">请先登录</span>
            <span class="attendance-tooltip" v-else>每日签到</span>
          </button>
        </div>
      </div>

      <!-- 未登录时的提示信息 -->
      <div class="section-card" v-if="!authStore.isLogin">
        <h3 class="section-title">--- 登录提示 ---</h3>
        <div class="login-prompt">
          <p class="prompt-text">请登录森空岛账号以查看游戏数据</p>
          <p class="prompt-subtext">登录后即可查看详细的游戏信息和统计数据</p>
        </div>
      </div>

      <!-- 基本信息卡片 -->
      <div class="section-card" v-if="authStore.isLogin">
        <h3 class="section-title">--- 基本信息 ---</h3>
        <ul class="data-grid">
          <li class="data-item">
            <span class="label">入职日期</span>
            <span class="value">{{ gameDataStore.formatTimestamp(gameDataStore.playerData?.status?.registerTs) || '--' }}</span>
          </li>
          <li class="data-item">
            <span class="label">游戏昵称</span>
            <span class="value">Dr.{{ gameDataStore.playerData?.status?.name || '未知' }}</span>
          </li>
          <li class="data-item">
            <span class="label">作战进度</span>
            <span class="value">{{ gameDataStore.getMainStageProgress || '--' }}</span>
          </li>
          <li class="data-item">
            <span class="label">家具保有数</span>
            <span class="value">{{ gameDataStore.playerData?.building?.furniture?.total || '--' }}</span>
          </li>
          <li class="data-item">
            <span class="label">雇佣干员数</span>
            <span class="value">{{ gameDataStore.getCharCount || '--' }}</span>
          </li>
        </ul>
      </div>

      <!-- 助战干员卡片 -->
      <div class="section-card" v-if="authStore.isLogin">
        <h3 class="section-title">--- 助战干员 ---</h3>
        <div class="assist-chars-grid">
          <div
            v-for="(char, index) in gameDataStore.getAssistCharArrayStatus"
            :key="index"
            class="assist-char-item"
          >
            <!-- 左边：头像 -->
            <div class="char-avatar-container">
              <img
                :src="char.avatarUrl"
                :alt="char.name"
                class="char-avatar"
                @error="(event) => gameDataStore.handleOperatorAvatarError(char.charId, event)"
                @load="() => gameDataStore.handleOperatorAvatarLoad(char.charId)"
              />
            </div>

            <!-- 右边：干员信息 -->
            <div class="char-info-container">
              <div class="char-name">{{ char.name }}</div>
              <div class="char-level">{{ char.level }}</div>
              <div class="char-skill">{{ char.skill }}</div>
            </div>
          </div>
          <div v-if="!gameDataStore.getAssistCharArrayStatus || gameDataStore.getAssistCharArrayStatus.length === 0" class="no-assist-char">
            无助战干员
          </div>
        </div>
        <div class="assist-count">共 {{ gameDataStore.getAssistCharCount || 0 }} 名助战干员</div>
      </div>

      <!-- 实时数据卡片 -->
      <div class="section-card" v-if="authStore.isLogin">
        <h3 class="section-title">--- 实时数据 ---</h3>
        <ul class="data-grid">
          <li class="data-item">
            <span class="label">理智</span>
            <span class="value">{{ gameDataStore.getActualApInfo?.current || '--' }}/{{ gameDataStore.getActualApInfo?.max || '--' }}</span>
            <span class="sub-value" v-if="gameDataStore.getActualApInfo?.remainSecs > 0">
              {{ gameDataStore.formatRecoveryTime(gameDataStore.getActualApInfo?.recoverTime) }} 回满
            </span>
            <span class="sub-value" v-else-if="gameDataStore.getActualApInfo">已回满</span>
          </li>
          <li class="data-item">
            <span class="label">公开招募</span>
            <span class="value">{{ gameDataStore.getHireSlotCount || '--' }}</span>
          </li>
          <li class="data-item">
            <span class="label">公招刷新次数</span>
            <span class="value">{{ gameDataStore.getHireRefreshCount || '--' }}</span>
          </li>
          <li class="data-item training-item">
            <span class="label">训练室</span>
            <span class="value training-value">{{ gameDataStore.getTrainingSimpleStatus || '--' }}</span>
          </li>
          <li class="data-item">
            <span class="label">每日任务</span>
            <span class="value">{{ gameDataStore.getDailyTaskProgress || '--' }}</span>
          </li>
          <li class="data-item">
            <span class="label">每周任务</span>
            <span class="value">{{ gameDataStore.getWeeklyTaskProgress || '--' }}</span>
          </li>
          <li class="data-item">
            <span class="label">数据增补仪</span>
            <span class="value">{{ gameDataStore.getTowerLowerItem || '--' }}</span>
          </li>
          <li class="data-item">
            <span class="label">数据增补条</span>
            <span class="value">{{ gameDataStore.getTowerHigherItem || '--' }}</span>
          </li>
        </ul>
      </div>

      <!-- 我的干员卡片 -->
      <div class="section-card" v-if="authStore.isLogin">
        <h3 class="section-title">--- 我的干员 ---</h3>
        <ul class="data-grid">
          <li class="data-item">
            <span class="label">干员总数</span>
            <span class="value">{{ gameDataStore.getCharCount || '--' }}</span>
          </li>
          <li class="data-item">
            <span class="label">时装数量</span>
            <span class="value">{{ gameDataStore.playerData?.skins?.length || '--' }}</span>
          </li>
        </ul>
      </div>

      <!-- 基建数据卡片 -->
      <div class="section-card" v-if="authStore.isLogin">
        <h3 class="section-title">--- 基建数据 ---</h3>
        <ul class="data-grid">
          <li class="data-item">
            <span class="label">贸易站订单</span>
            <span class="value">{{ gameDataStore.getTradingOrderCount || '--' }}</span>
          </li>
          <li class="data-item">
            <span class="label">制造站</span>
            <span class="value">{{ gameDataStore.getManufactureStatus || '--' }}</span>
          </li>
          <li class="data-item">
            <span class="label">宿舍休息</span>
            <span class="value">{{ gameDataStore.getDormRestCount || '--' }} 人</span>
          </li>
          <li class="data-item">
            <span class="label">会客室线索</span>
            <span class="value">{{ gameDataStore.getClueCount || '--' }}</span>
            <span class="sub-value" v-if="gameDataStore.getClueCount && gameDataStore.getClueCount.startsWith('7/')">（已满）</span>
          </li>
          <li class="data-item">
            <span class="label">干员疲劳</span>
            <span class="value">{{ gameDataStore.getTiredCharsCount || '--' }} 人</span>
          </li>
          <li class="data-item">
            <span class="label">无人机</span>
            <span class="value">{{ gameDataStore.getLaborCount?.count || '--' }}</span>
            <span class="sub-value" v-if="gameDataStore.getLaborCount?.remainSecs > 0">
              {{ gameDataStore.getLaborCount?.recovery || '--' }} 回满
            </span>
            <span class="sub-value" v-else-if="gameDataStore.getLaborCount">已回满</span>
          </li>
        </ul>
      </div>

      <!-- 游戏战绩卡片 -->
      <div class="section-card" v-if="authStore.isLogin">
        <h3 class="section-title">--- 游戏战绩 ---</h3>
        <ul class="data-grid">
          <li class="data-item">
            <span class="label">剿灭作战</span>
            <span class="value">{{ gameDataStore.getCampaignReward || '--' }} 合成玉</span>
          </li>
          <li class="data-item">
            <span class="label">集成战略</span>
            <span class="value">{{ gameDataStore.getRelicCount || '--' }} 收藏品</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ==================== 容器布局样式 ==================== */
.game-data-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  min-height: 100vh;
  position: relative;
  user-select: none; /* 防止文本选中干扰右键菜单 */
}

/* ==================== 右键菜单样式 ==================== */
.context-menu {
  position: fixed;
  background: #2d2d2d;
  border: 1px solid #404040;
  border-radius: 8px;
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
  border-radius: 6px;
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

/* ==================== 主要区域加载状态样式 ==================== */
.main-loading-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh; /* 占据主要区域的高度 */
  padding: 40px 20px;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  text-align: center;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(100, 108, 255, 0.2);
  border-top: 4px solid #646cff;
  border-radius: 50%;
  animation: spin 1.2s linear infinite;
}

.loading-text {
  font-size: 18px;
  color: #ccc;
  font-weight: 500;
  margin: 0;
}

/* ==================== 主内容区域样式 ==================== */
.cards-wrapper {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.data-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #2d2d2d;
  border-radius: 8px;
  border: 1px solid #404040;
  margin-bottom: 10px;
}

.left-section {
  display: flex;
  align-items: center;
  gap: 20px;
  flex: 1;
}

.header-buttons {
  display: flex;
  gap: 10px;
  align-items: center;
}

/* 登录提示样式 */
.login-prompt {
  text-align: center;
  padding: 60px 20px;
}

.prompt-text {
  font-size: 20px;
  color: #9feaf9;
  margin-bottom: 16px;
  font-weight: 600;
}

.prompt-subtext {
  font-size: 16px;
  color: #999;
}

/* ==================== 签到按钮样式 ==================== */
.attendance-icon-btn {
  position: relative;
  width: 44px;
  height: 44px;
  padding: 8px;
  background: transparent;
  border: 2px solid #4caf50;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.attendance-icon-btn:hover:not(:disabled) {
  background: rgba(76, 175, 80, 0.1);
  border-color: #45a049;
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
}

.attendance-icon-btn:disabled {
  border-color: #666;
  cursor: not-allowed;
  opacity: 0.7;
}

.attendance-icon-btn.attending {
  border-color: #ffa500;
  animation: pulse 1.5s infinite;
}

.attendance-icon-btn.attending:hover {
  border-color: #ff8c00;
}

.skland-icon {
  width: 28px;
  height: 28px;
  filter: brightness(0) saturate(100%) invert(67%) sepia(51%) saturate(495%) hue-rotate(80deg) brightness(95%) contrast(89%);
  transition: all 0.3s ease;
}

.attendance-icon-btn:hover .skland-icon {
  filter: brightness(0) saturate(100%) invert(67%) sepia(51%) saturate(495%) hue-rotate(80deg) brightness(110%) contrast(89%);
  transform: scale(1.1);
}

.attendance-icon-btn.attending .skland-icon {
  filter: brightness(0) saturate(100%) invert(75%) sepia(90%) saturate(500%) hue-rotate(360deg) brightness(105%) contrast(105%);
}

.attendance-tooltip {
  position: absolute;
  bottom: -30px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
}

.attendance-icon-btn:hover .attendance-tooltip {
  opacity: 1;
}

/* ==================== 信息显示样式 ==================== */
.update-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.last-update {
  color: #999;
  font-size: 14px;
}

.section-card {
  background: #2d2d2d;
  border-radius: 8px;
  border: 1px solid #404040;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.section-title {
  color: #9feaf9;
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #404040;
  text-align: center;
}

.data-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
  list-style: none;
  margin: 0;
  padding: 0;
}

.data-item {
  display: flex;
  flex-direction: column;
  padding: 12px;
  background: #333333;
  border-radius: 6px;
  transition: background 0.3s ease;
  border: 1px solid #404040;
}

.data-item:hover {
  background: #3a3a3a;
  transform: translateY(-1px);
}

.label {
  font-size: 12px;
  color: #999;
  margin-bottom: 4px;
  font-weight: 500;
}

.value {
  font-size: 16px;
  color: #ccc;
  font-weight: 600;
}

/* 训练室特殊样式 */
.training-item {
  min-height: 60px;
}

.training-value {
  white-space: pre-line;
  line-height: 1.4;
}

.sub-value {
  font-size: 12px;
  color: #666;
  margin-top: 2px;
}

/* 助战干员头像样式 */
.char-avatar-container {
  display: flex;
  justify-content: center;
  margin-bottom: 8px;
}

.char-avatar {
  width: 50px;
  height: 50px;
  object-fit: cover;
  border: 2px solid #404040;
  background: #2d2d2d;
}

/* 助战干员网格布局 */
.assist-chars-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  margin-bottom: 12px;
}

.assist-char-item {
  background: #333333;
  border: 1px solid #404040;
  border-radius: 8px;
  padding: 12px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  transition: all 0.3s ease;
  min-height: 80px;
}

.assist-char-item:hover {
  background: #3a3a3a;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

/* 左边：头像容器 */
.char-avatar-container {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.char-avatar {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border: 2px solid #404040;
  background: #2d2d2d;
}

/* 右边：信息容器 */
.char-info-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0; /* 防止文本溢出 */
}

.char-name {
  font-size: 16px;
  font-weight: 600;
  color: #9feaf9;
  line-height: 1.2;
}

.char-level {
  font-size: 13px;
  color: #fad000;
  line-height: 1.2;
}

.char-skill {
  font-size: 12px;
  color: #6cc24a;
  line-height: 1.2;
}

.no-assist-char {
  grid-column: 1 / -1;
  text-align: center;
  color: #999;
  font-size: 14px;
  padding: 40px 20px;
  background: #333333;
  border: 1px solid #404040;
  border-radius: 8px;
}

.assist-count {
  text-align: center;
  font-size: 12px;
  color: #666;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #404040;
}

/* 数据项颜色区分 */
.data-item:nth-child(1) .value { color: #9feaf9; }
.data-item:nth-child(2) .value { color: #fad000; }
.data-item:nth-child(3) .value { color: #6cc24a; }
.data-item:nth-child(4) .value { color: #ff7eb9; }
.data-item:nth-child(5) .value { color: #7afcff; }
.data-item:nth-child(6) .value { color: #ff9800; }
.data-item:nth-child(7) .value { color: #ff65a3; }
.data-item:nth-child(8) .value { color: #feff9c; }
.data-item:nth-child(9) .value { color: #ff6b6b; }
.data-item:nth-child(10) .value { color: #6bffb8; }

/* ==================== 动画定义 ==================== */
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(255, 165, 0, 0.4); }
  70% { box-shadow: 0 0 0 10px rgba(255, 165, 0, 0); }
  100% { box-shadow: 0 0 0 0 rgba(255, 165, 0, 0); }
}
</style>

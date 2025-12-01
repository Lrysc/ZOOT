<template>
  <div class="game-data-container">

    <!-- ==================== 主内容区域 ==================== -->
    <!-- 数据卡片区域 -->
    <div class="cards-wrapper">

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
          <p class="prompt-text">请登录鹰角网络通行证以查看游戏数据</p>
          <p class="prompt-subtext">登录后即可查看详细的游戏信息和统计数据</p>
        </div>
      </div>

      <!-- 实时数据卡片 -->
      <div class="section-card" v-if="authStore.isLogin">
        <h3 class="section-title">--- 实时数据 ---</h3>
        <ul class="data-grid">
          <li class="data-item">
            <div class="ap-ring-container">
              <svg class="ap-ring-svg" viewBox="0 0 180 180">
                <!-- 背景圆环 -->
                <circle cx="90" cy="90" r="80" fill="none" stroke="#333" stroke-width="8"/>
                <!-- 进度圆环 -->
                <circle
                  cx="90" cy="90" r="80"
                  fill="none"
                  :stroke="gameDataStore.getActualApInfo?.remainSecs > 0 ? '#888' : '#4a90e2'"
                  stroke-width="8"
                  :stroke-dasharray="circumference"
                  :stroke-dashoffset="apProgress"
                  stroke-linecap="round"
                  transform="rotate(-90 90 90)"
                  class="ap-progress-circle"
                />
              </svg>
              <div class="ap-info">
                <span class="label">理智</span>
                <div class="ap-value">
                  <span class="current-ap">{{ gameDataStore.getActualApInfo?.current || '--' }}</span>
                  <span class="ap-separator">/</span>
                  <span class="max-ap">{{ gameDataStore.getActualApInfo?.max || '--' }}</span>
                </div>
                <div class="ap-recovery-info">
                  <span class="sub-value" v-if="gameDataStore.getActualApInfo?.remainSecs > 0">
                    {{ gameDataStore.formatRecoveryTime(gameDataStore.getActualApInfo?.recoverTime) }} 回满
                  </span>
                  <span class="sub-value" v-else-if="gameDataStore.getActualApInfo">已回满</span>
                </div>
              </div>
            </div>
          </li>
          <li class="data-item weekly-item">
            <div class="weekly-container">
              <h4 class="weekly-title">周常</h4>
              <div class="weekly-content">
                <div class="weekly-row">
                  <span class="weeklyrewards-label">剿灭作战</span>
                  <span class="weeklyrewards-value campaign-value">{{ gameDataStore.getCampaignReward || '--' }} 合成玉</span>
                </div>
                <div class="weekly-row">
                  <span class="weeklyrewards-label">数据增补仪</span>
                  <span class="weeklyrewards-value supplement-value">{{ gameDataStore.getTowerLowerItem || '--' }}</span>
                </div>
                <div class="weekly-row">
                  <span class="weeklyrewards-label">数据增补条</span>
                  <span class="weeklyrewards-value supplement-value">{{ gameDataStore.getTowerHigherItem || '--' }}</span>
                </div>
              </div>
            </div>
          </li>
          <li class="data-item task-item">
            <div class="task-container-horizontal">
              <div class="task-item-horizontal">
                <span class="task-label daily-label">每日</span>
                <span class="task-value daily-value">{{ gameDataStore.getDailyTaskProgress || '--' }}</span>
              </div>
              <div class="task-item-horizontal">
                <span class="task-label weekly-label">每周</span>
                <span class="task-value weekly-value">{{ gameDataStore.getWeeklyTaskProgress || '--' }}</span>
              </div>
            </div>
          </li>
          <li class="data-item">
            <div class="task-container">
              <div class="task-row">
                <span class="task-label hire-label">公开招募</span>
                <span class="task-value hire-value">{{ gameDataStore.getHireSlotCount || '--' }}</span>
              </div>
              <div class="task-row">
                <span class="task-label refresh-label">刷新次数</span>
                <span class="task-value refresh-value">{{ gameDataStore.getHireRefreshCount || '--' }}</span>
              </div>
            </div>
          </li>
        </ul>
      </div>

      <!-- 基建数据卡片 -->
      <div class="section-card" v-if="authStore.isLogin">
        <h3 class="section-title">--- 基建数据 ---</h3>
        <ul class="data-grid">
          <li class="data-item production-item">
            <div class="production-container">
              <div class="production-left">
                <span class="production-label">贸易站</span>
                <span class="production-value">{{ gameDataStore.getTradingOrderCount || '--' }}</span>
                <span class="production-buff" v-if="getTradingBuff()">{{ getTradingBuff() }}</span>
              </div>
              <div class="production-divider"></div>
              <div class="production-right">
                <span class="production-label">制造站</span>
                <span class="production-value">{{ gameDataStore.getManufactureStatus || '--' }}</span>
                <span class="production-buff" v-if="getManufactureBuff()">{{ getManufactureBuff() }}</span>
              </div>
            </div>
          </li>
          <li class="data-item dorm-tired-item">
            <div class="dorm-tired-container">
              <div class="dorm-tired-left">
                <span class="dorm-tired-label">宿舍休息</span>
                <span class="dorm-tired-value">{{ gameDataStore.getDormRestCount || '--' }} 人</span>
              </div>
              <div class="dorm-tired-divider"></div>
              <div class="dorm-tired-right">
                <span class="dorm-tired-label">干员疲劳</span>
                <span class="dorm-tired-value">{{ gameDataStore.getTiredCharsCount || '0' }} 人</span>
              </div>
            </div>
          </li>
          <li class="data-item">
            <span class="label">会客室线索</span>
            <span class="value clue-value">{{ gameDataStore.getClueCount || '--' }}</span>
            <span class="sub-value" v-if="gameDataStore.getClueCount && gameDataStore.getClueCount.startsWith('7/')">（已满）</span>
          </li>
          <li class="data-item">
            <span class="label">无人机</span>
            <span class="value drone-value">{{ gameDataStore.getLaborCount?.count || '--' }}</span>
            <span class="sub-value" v-if="gameDataStore.getLaborCount?.remainSecs > 0">
              {{ gameDataStore.getLaborCount?.recovery || '--' }} 回满
            </span>
            <span class="sub-value" v-else-if="gameDataStore.getLaborCount">已回满</span>
          </li>
          <li class="data-item training-item">
            <div class="training-header">
              <span class="training-title">训练室</span>
            </div>
            <div class="training-container">
              <div class="training-left">
                <div class="operator-info" v-if="gameDataStore.getTrainingDetails?.trainee">
                  <img
                    :src="getOperatorAvatarUrl(gameDataStore.getTrainingDetails.traineeCharId)"
                    :alt="gameDataStore.getTrainingDetails.trainee"
                    class="training-avatar"
                    @error="handleOperatorImageError(gameDataStore.getTrainingDetails.traineeCharId, 'avatar', $event)"
                  />
                  <span class="operator-name">{{ gameDataStore.getTrainingDetails.trainee }}</span>
                  <span class="operator-role">训练干员</span>
                </div>
                <div class="no-operator" v-else>
                  <div class="empty-avatar">?</div>
                  <span class="operator-name">无训练干员</span>
                  <span class="operator-role">训练干员</span>
                </div>
              </div>
              <div class="training-right">
                <div class="operator-info" v-if="gameDataStore.getTrainingDetails?.trainer">
                  <img
                    :src="getOperatorAvatarUrl(gameDataStore.getTrainingDetails.trainerCharId)"
                    :alt="gameDataStore.getTrainingDetails.trainer"
                    class="training-avatar"
                    @error="handleOperatorImageError(gameDataStore.getTrainingDetails.trainerCharId, 'avatar', $event)"
                  />
                  <span class="operator-name">{{ gameDataStore.getTrainingDetails.trainer }}</span>
                  <span class="operator-role">协助者</span>
                </div>
                <div class="no-operator" v-else>
                  <div class="empty-avatar">?</div>
                  <span class="operator-name">无协助干员</span>
                  <span class="operator-role">协助者</span>
                </div>
              </div>
            </div>
          </li>
        </ul>
      </div>

      <!-- 游戏战绩卡片 -->
      <div class="section-card" v-if="authStore.isLogin">
        <h3 class="section-title">--- 肉鸽成绩 ---</h3>
<!--        <ul class="data-grid">-->
<!--          <li class="data-item">-->
<!--            <span class="label">集成战略</span>-->
<!--            <span class="value">{{ gameDataStore.getRelicCount || '&#45;&#45;' }} 收藏品</span>-->
<!--          </li>-->
<!--        </ul>-->
        <h3 class="section-title">功能开发中</h3>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, inject, computed } from 'vue';
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

// ==================== 头像获取方法 ====================

/**
 * 获取干员头像URL
 * @param charId 干员ID
 * @returns 头像URL
 */
const getOperatorAvatarUrl = (charId: string): string => {
  if (!charId || !charId.startsWith('char_')) return '';
  try {
    const baseUrl = 'https://raw.githubusercontent.com/yuanyan3060/ArknightsGameResource/main/avatar';
    const avatarFileName = charId;
    const avatarUrl = `${baseUrl}/${avatarFileName}.png`;
    return avatarUrl;
  } catch (error) {
    console.error('生成干员头像URL失败', { charId, error });
    return '';
  }
};

/**
 * 处理干员图片加载错误
 * @param charId 干员ID
 * @param type 图片类型
 * @param event 错误事件
 */
const handleOperatorImageError = (charId: string, type: string, event: Event): void => {
  const imgElement = event.target as HTMLImageElement;
  console.warn('干员图片加载失败', { charId, type, imgSrc: imgElement.src });
  imgElement.style.display = 'none';
};

// ==================== 注入全局刷新方法 ====================
/**
 * 从App.vue注入的全局刷新方法
 * 用于在GameData组件内部也可以触发全局刷新
 */
const refreshData = inject('refreshData') as (() => Promise<void>) | undefined;

/**
 * 从App.vue注入的当前活动组件名称
 * 用于判断当前是否在GameData页面
 */
const currentActiveComponent = inject('currentActiveComponent') as { value: string };

// ==================== 组件状态管理 ====================

/**
 * 签到操作状态
 * 控制签到按钮的加载状态和禁用状态
 */
const isAttending = ref(false);

// ==================== 数据操作功能 ====================

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
      if (refreshData) {
        setTimeout(() => {
          refreshData();
        }, 1000);
      }
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
 * 手动刷新游戏数据
 * 提供给组件内部使用的刷新方法
 */
const handleManualRefresh = async () => {
  if (refreshData) {
    await refreshData();
  } else {
    // 如果全局刷新方法不可用，使用本地刷新
    try {
      await gameDataStore.refreshData();
    } catch (error: any) {
      const errorMessage = error?.message || '未知错误';
      console.error('刷新数据失败:', error);
      showError(`同步失败：${errorMessage}`);
    }
  }
};

// ==================== 生命周期管理 ====================

/**
 * 组件挂载时的初始化操作
 * 包括数据加载等
 */
onMounted(async () => {
  console.log('GameData组件挂载，开始初始化...');

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
        // showSuccess('欢迎回来，博士！');
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
 * 监听当前活动组件变化
 * 当切换到GameData页面时自动刷新数据（可选功能）
 */
watch(() => currentActiveComponent?.value, (newComponent, oldComponent) => {
  if (newComponent === 'GameData' && oldComponent !== 'GameData') {
    console.log('切换到GameData页面，自动刷新数据');
    // 可以在这里添加自动刷新逻辑，但为了避免频繁请求，暂时注释
    // handleManualRefresh();
  }
});

// ==================== 计算属性 ====================
/**
 * 圆环周长
 */
const circumference = ref(2 * Math.PI * 80);

/**
 * 理智进度计算
 * 根据当前理智和最大理智计算圆环进度
 */
const apProgress = computed(() => {
  const current = gameDataStore.getActualApInfo?.current || 0;
  const max = gameDataStore.getActualApInfo?.max || 1;
  const progress = (current / max) * circumference.value;
  return circumference.value - progress;
});

/**
 * 获取贸易站效率加成
 */
const getTradingBuff = () => {
  try {
    const tradingsData = gameDataStore.playerData?.building?.tradings || [];
    let totalBuff = 0;
    
    tradingsData.forEach(station => {
      const { totalSpeedBuff } = gameDataStore.calculateBuildingEfficiency(station.chars || [], 'TRADING');
      totalBuff = Math.max(totalBuff, totalSpeedBuff);
    });
    
    return totalBuff > 0 ? `+${(totalBuff * 100).toFixed(1)}%` : '';
  } catch (error) {
    return '';
  }
};

/**
 * 获取制造站效率加成
 */
const getManufactureBuff = () => {
  try {
    const manufacturesData = gameDataStore.playerData?.building?.manufactures || [];
    let totalBuff = 0;
    
    manufacturesData.forEach(station => {
      const { totalSpeedBuff } = gameDataStore.calculateBuildingEfficiency(station.chars || [], 'MANUFACTURE');
      totalBuff = Math.max(totalBuff, totalSpeedBuff);
    });
    
    return totalBuff > 0 ? `+${(totalBuff * 100).toFixed(1)}%` : '';
  } catch (error) {
    return '';
  }
};

// ==================== 暴露方法给模板 ====================
/**
 * 暴露手动刷新方法，供模板中使用（如果需要）
 */
defineExpose({
  handleManualRefresh
});
</script>

<style scoped>
/* ==================== 容器布局样式 ==================== */
.game-data-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  min-height: 100vh;
  position: relative;
  user-select: none; /* 防止文本选中干扰用户体验 */
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
  display: flex;
  flex-wrap: wrap;
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
  transition: all 0.3s ease;
  border: 1px solid #404040;
  flex: 1 1 calc(50% - 6px);
  min-width: 200px;
}

/* 理智容器特殊样式 - 占用更多空间 */
.data-item:first-child {
  flex: 1 1 calc(100% - 6px);
  min-width: 180px;
  max-width: 200px;
  margin: 0 auto;
}

.data-item:hover {
  background: #3a3a3a;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
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

/* 理智圆环样式 */
.ap-ring-container {
  position: relative;
  width: 180px;
  height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
}

.ap-ring-svg {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
}

.ap-progress-circle {
  transition: stroke-dashoffset 0.3s ease;
}

.ap-info {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.ap-value {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 22px;
  font-weight: 700;
  color: #fff;
}

.current-ap {
  font-size: 26px;
  color: #9feaf9;
}

.ap-separator {
  color: #999;
  margin: 0 1px;
}

.max-ap {
  font-size: 20px;
  color: #ccc;
}

.ap-recovery-info {
  font-size: 11px;
  color: #666;
  text-align: center;
}

/* 任务容器样式 */
.task-item {
  min-height: 60px;
  display: flex;
  align-items: center;
}

.task-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.task-container-horizontal {
  display: flex;
  flex-direction: row;
  gap: 12px;
  width: 100%;
  justify-content: center;
  align-items: center;
  height: 100%;
}

.task-item-horizontal {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.05);
  transition: background-color 0.2s ease;
  flex: 1;
}

.task-item-horizontal:hover {
  background: rgba(255, 255, 255, 0.1);
}

.task-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.05);
}

/* 周常容器样式 */
.weekly-item {
  min-height: 80px;
  display: flex;
  align-items: center;
}

.weekly-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  height: 100%;
  padding: 8px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.weekly-title {
  color: #fad000;
  font-size: 16px;
  font-weight: 600;
  text-align: center;
  margin: 0;
  padding-bottom: 4px;
  border-bottom: 1px solid rgba(250, 208, 0, 0.3);
}

.weekly-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  justify-content: center;
}

.weekly-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 3px 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.03);
  transition: background-color 0.2s ease;
}

.weekly-row:hover {
  background: rgba(255, 255, 255, 0.08);
}

.weekly-label {
  color: #4682b4;
  font-size: 13px;
  font-weight: 500;
}

.weekly-value {
  font-size: 14px;
  font-weight: 600;
}

/* 周常奖励样式 - 橙色系 */
.weeklyrewards-label {
  color: #ff9800;
  font-size: 13px;
  font-weight: 500;
}

.weeklyrewards-value {
  font-size: 14px;
  font-weight: 600;
}

.campaign-value {
  color: #ffd700 !important;
}

.supplement-value {
  color: #ffffff !important;
}

.task-label {
  font-size: 14px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 3px;
  min-width: 40px;
  text-align: center;
}

.daily-label {
  color: #6cc24a;
}



.task-value {
  font-size: 15px;
  font-weight: 600;
}

.daily-value {
  color: #6cc24a;
}

.weekly-value {
  color: #4682b4;
}

.hire-label {
  background: rgba(255, 165, 0, 0.3);
  color: #ffa500;
  border: 1px solid rgba(255, 165, 0, 0.5);
}

.refresh-label {
  background: rgba(255, 255, 255, 0.3);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.5);
}

.hire-value {
  color: #ffa500;
}

.refresh-value {
  color: #ffffff;
}

/* 训练室特殊样式 */
.training-item {
  min-height: 140px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.training-header {
  display: flex;
  align-items: flex-start;
  width: 100%;
}

.training-title {
  font-size: 14px;
  color: #999;
  font-weight: 500;
  margin-bottom: 4px;
}

.training-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  flex: 1;
}

.training-left,
.training-right {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  flex: 1;
}

.operator-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.no-operator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.training-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: 2px solid #444;
  object-fit: cover;
  transition: transform 0.2s ease, border-color 0.2s ease;
}

.training-avatar:hover {
  transform: scale(1.1);
  border-color: #9feaf9;
}

.empty-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: 2px dashed #666;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: bold;
  color: #666;
  background: rgba(255, 255, 255, 0.05);
}

.operator-name {
  font-size: 12px;
  color: #ccc;
  text-align: center;
  max-width: 70px;
  word-wrap: break-word;
  line-height: 1.2;
}

.operator-role {
  font-size: 10px;
  color: #888;
  text-align: center;
  padding: 1px 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.05);
  font-weight: 400;
  opacity: 0.8;
}

.sub-value {
  font-size: 12px;
  color: #666;
  margin-top: 2px;
}

/* 生产容器样式 */
.production-item {
  min-height: 60px;
  padding: 8px;
}

.production-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 100%;
}

.production-left,
.production-right {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex: 1;
}

.production-divider {
  width: 1px;
  height: 40px;
  background: #444;
  margin: 0 12px;
}

.production-label {
  font-size: 12px;
  color: #999;
  font-weight: 500;
}

.production-value {
  font-size: 14px;
  color: #4682b4;
  font-weight: 600;
}

.production-right .production-value {
  color: #ffd700;
}

.production-buff {
  font-size: 10px;
  color: #4caf50;
  background: rgba(76, 175, 80, 0.2);
  padding: 2px 4px;
  border-radius: 3px;
  margin-top: 2px;
  display: inline-block;
  font-weight: 500;
}

/* 宿舍疲劳容器样式 */
.dorm-tired-item {
  min-height: 60px;
  padding: 8px;
}

.dorm-tired-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 100%;
}

.dorm-tired-left,
.dorm-tired-right {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex: 1;
}

.dorm-tired-divider {
  width: 1px;
  height: 40px;
  background: #444;
  margin: 0 12px;
}

.dorm-tired-label {
  font-size: 12px;
  color: #999;
  font-weight: 500;
}

.dorm-tired-value {
  font-size: 14px;
  color: #6cc24a;
  font-weight: 600;
}

.dorm-tired-right .dorm-tired-value {
  color: #ff6b6b;
}

/* 线索交流颜色 */
.clue-value {
  color: #ffb366 !important;
}

/* 无人机颜色 */
.drone-value {
  color: #b19cd9 !important;
}

/* 数据项颜色区分 - 为不同类型数据提供视觉区分 */
.data-item:nth-child(1) .value { color: #9feaf9; } /* 理智 - 蓝色 */
.data-item:nth-child(2) .value { color: #6cc24a; } /* 每日任务 - 绿色 */
.data-item:nth-child(3) .value { color: #ff7eb9; } /* 每周任务 - 粉色 */
.data-item:nth-child(4) .value { color: #ff65a3; } /* 公开招募 - 玫红 */
.data-item:nth-child(5) .value { color: #feff9c; } /* 公招刷新 - 浅黄 */

/* 基建数据颜色 */
.data-item:nth-child(6) .value { color: #6bffb8; } /* 贸易站 - 亮绿 */
.data-item:nth-child(7) .value { color: #9feaf9; } /* 制造站 - 蓝色 */
.data-item:nth-child(8) .value { color: #ff7eb9; } /* 宿舍休息 - 粉色 */
.data-item:nth-child(9) .value { color: #fad000; } /* 会客室线索 - 黄色 */
.data-item:nth-child(10) .value { color: #ff6b6b; } /* 干员疲劳 - 红色 */
.data-item:nth-child(11) .value { color: #7afcff; } /* 无人机 - 青色 */
.data-item:nth-child(12) .value { color: #b18cff; } /* 训练室 - 紫色 */

/* 游戏战绩颜色 */
.data-item:nth-child(13) .value { color: #ff9800; } /* 集成战略 - 橙色 */

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

/* ==================== 响应式设计 ==================== */
@media (max-width: 768px) {
  .game-data-container {
    padding: 10px;
  }

  .data-grid {
    gap: 8px;
  }

  .data-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .header-buttons {
    align-self: flex-end;
  }

  .section-card {
    padding: 15px;
  }
}

@media (max-width: 480px) {
  .data-item {
    flex: 1 1 100%;
  }
}
</style>

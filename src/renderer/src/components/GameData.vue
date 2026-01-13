<template>
  <div class="game-data-container">

    <!-- ==================== 主内容区域 ==================== -->
    <!-- 数据卡片区域 -->
    <div class="cards-wrapper">

      <!-- 未登录时的提示信息 -->
      <div class="section-card" v-if="!authStore.isLogin">
        <h3 class="section-title">登录提示</h3>
        <div class="login-prompt">
          <p class="prompt-text">请登录鹰角网络通行证以查看游戏数据</p>
          <p class="prompt-subtext">登录后即可查看详细的游戏信息和统计数据</p>
        </div>
      </div>

      <!-- 实时数据卡片 -->
      <div class="section-card" v-if="authStore.isLogin">
        <h3 class="section-title">实时数据</h3>
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
              <div class="weekly-header">
                <h4 class="weekly-title">周常</h4>
                <span class="weekly-countdown">{{ weeklyCountdown }}</span>
              </div>
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
            <div class="task-container">
              <!-- 每日任务卡片 -->
              <div class="task-card" :class="{ 'task-completed': isDailyTaskCompleted() }">
                <div class="task-background-icon" v-if="isDailyTaskCompleted()">
                  <img src="@assets/complete.6cecac.svg" alt="completed" class="complete-icon" />
                </div>
                <div class="task-content">
                  <span class="task-label daily-label">每日任务</span>
                  <div class="task-value-wrapper">
                    <span class="task-value daily-value" v-if="!isDailyTaskCompleted()">
                      {{ gameDataStore.getDailyTaskProgress || '--' }}
                    </span>
                    <span class="task-completed-text" v-else>COMPLETED</span>
                  </div>
                </div>
              </div>

              <!-- 每周任务卡片 -->
              <div class="task-card" :class="{ 'task-completed': isWeeklyTaskCompleted() }">
                <div class="task-background-icon" v-if="isWeeklyTaskCompleted()">
                  <img src="@assets/complete.6cecac.svg" alt="completed" class="complete-icon" />
                </div>
                <div class="task-content">
                  <span class="task-label weekly-label">每周任务</span>
                  <div class="task-value-wrapper">
                    <span class="task-value weekly-value" v-if="!isWeeklyTaskCompleted()">
                      {{ gameDataStore.getWeeklyTaskProgress || '--' }}
                    </span>
                    <span class="task-completed-text" v-else>COMPLETED</span>
                  </div>
                </div>
              </div>
            </div>
          </li>
          <li class="data-item">
            <div class="task-container">
              <!-- 公开招募卡片 -->
              <div class="task-card hire-card">
                <div class="task-content">
                  <span class="task-label hire-label">公开招募</span>
                  <div class="task-value-wrapper">
                    <span class="task-value hire-value">{{ gameDataStore.getHireSlotCount || '--' }}</span>
                  </div>
                </div>
              </div>

              <!-- 刷新次数卡片 -->
              <div class="task-card refresh-card">
                <div class="task-content">
                  <span class="task-label refresh-label">刷新次数</span>
                  <div class="task-value-wrapper">
                    <span class="task-value refresh-value">{{ gameDataStore.getHireRefreshCount || '--' }}</span>
                  </div>
                </div>
              </div>
            </div>
          </li>
        </ul>
      </div>

      <!-- 基建数据卡片 -->
      <div class="section-card" v-if="authStore.isLogin">
        <h3 class="section-title">基建数据</h3>
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

      <!-- 肉鸽成绩卡片 -->
      <div class="section-card" v-if="authStore.isLogin && getRogueList().length > 0">
        <h3 class="section-title">肉鸽成绩</h3>
        <div class="rogue-container">
          <div
            v-for="rogue in getRogueList()"
            :key="rogue.rogueId"
            class="rogue-item"
          >
            <div class="rogue-image-wrapper">
              <img
                :src="getRogueInfo(rogue.rogueId)?.picUrl"
                :alt="getRogueInfo(rogue.rogueId)?.name"
                class="rogue-image"
                @error="(e) => handleRogueImageError(e, getRogueInfo(rogue.rogueId)?.picUrl, getRogueInfo(rogue.rogueId)?.name)"
                @load="handleRogueImageLoad"
                referrerpolicy="no-referrer"
              />
            </div>
            <div class="rogue-info">
              <div class="rogue-header">
                <div class="rogue-name">{{ getRogueInfo(rogue.rogueId)?.name }}</div>
                <div class="rogue-level-badge">
                  <span class="rogue-level-label">Lv</span>
                  <span class="rogue-level-value">{{ rogue.bpLevel }}</span>
                </div>
              </div>
              <div class="rogue-stats">
                <span class="rogue-stat">
                  <span class="stat-value">{{ rogue.clearTime }}</span>
                  <span class="stat-label">通关</span>
                </span>
                <span class="rogue-stat">
                  <span class="stat-value">{{ rogue.relicCnt }}</span>
                  <span class="stat-label">收藏</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, inject, computed, onUnmounted } from 'vue';
import { useAuthStore } from '@stores/auth';
import { useGameDataStore } from '@stores/gameData';
import { showError } from '@services/toastService';

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

// ==================== 数据操作功能 ====================

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

// ==================== 肉鸽数据处理方法 ====================

/**
 * 获取肉鸽列表
 * 根据sort排序，过滤掉无数据的肉鸽
 */
const getRogueList = () => {
  try {
    const playerData = gameDataStore.playerData;
    if (!playerData?.rogue?.records) {
      return [];
    }

    const records = playerData.rogue.records;

    return records
      .filter((record: any) => record && record.rogueId)
      .sort((a: any, b: any) => {
        const aInfo = getRogueInfo(a.rogueId);
        const bInfo = getRogueInfo(b.rogueId);
        return (aInfo?.sort || 999) - (bInfo?.sort || 999);
      });
  } catch (error) {
    console.error('获取肉鸽列表失败', error);
    return [];
  }
};

/**
 * 获取肉鸽信息
 * @param rogueId 肉鸽ID
 */
const getRogueInfo = (rogueId: string) => {
  try {
    const playerData = gameDataStore.playerData;
    console.log('获取肉鸽信息 - rogueId:', rogueId);
    console.log('playerData:', playerData);
    console.log('playerData.rogueInfoMap:', playerData?.rogueInfoMap);

    // 从API返回的rogueInfoMap中获取（在playerData根级别）
    if (playerData?.rogueInfoMap && playerData.rogueInfoMap[rogueId]) {
      const info = playerData.rogueInfoMap[rogueId];
      console.log('找到肉鸽信息:', info);
      return info;
    }
  } catch (error) {
    console.error('从API获取肉鸽信息失败', error);
  }

  // 如果API中没有对应数据，返回默认值
  console.log('未找到肉鸽信息，返回默认值');
  return { id: rogueId, name: '未知', picUrl: '', sort: 999 };
};

/**
 * 处理肉鸽图片加载错误
 */
const handleRogueImageError = (event: Event, url?: string, name?: string) => {
  const imgElement = event.target as HTMLImageElement;
  console.error('肉鸽图片加载失败', {
    src: imgElement.src,
    url: url,
    name: name,
    naturalWidth: imgElement.naturalWidth,
    naturalHeight: imgElement.naturalHeight,
    error: (event as ErrorEvent).error
  });
  imgElement.style.display = 'none';
};

/**
 * 处理肉鸽图片加载成功
 */
const handleRogueImageLoad = (event: Event) => {
  const imgElement = event.target as HTMLImageElement;
  console.log('肉鸽图片加载成功', { src: imgElement.src, naturalWidth: imgElement.naturalWidth, naturalHeight: imgElement.naturalHeight });
};

/**
 * 检查每日任务是否完成
 */
const isDailyTaskCompleted = () => {
  try {
    const daily = gameDataStore.playerData?.routine?.daily;
    const completed = daily?.current || 0;
    const total = daily?.total || 0;
    return completed >= total && total > 0;
  } catch (error) {
    return false;
  }
};

/**
 * 检查每周任务是否完成
 */
const isWeeklyTaskCompleted = () => {
  try {
    const weekly = gameDataStore.playerData?.routine?.weekly;
    const completed = weekly?.current || 0;
    const total = weekly?.total || 0;
    return completed >= total && total > 0;
  } catch (error) {
    return false;
  }
};

// ==================== 周常刷新倒计时 ====================

/**
 * 计算距离下周一凌晨4点的剩余时间
 */
const weeklyCountdown = computed(() => {
  const now = new Date();
  // 获取下周一凌晨4点的时间戳
  const nextMonday = new Date(now);
  const dayOfWeek = now.getDay(); // 0 是周日, 1 是周一
  const daysUntilMonday = dayOfWeek === 1 ? 7 : (8 - dayOfWeek) % 7;
  nextMonday.setDate(now.getDate() + daysUntilMonday);
  nextMonday.setHours(4, 0, 0, 0);
  
  const diff = nextMonday.getTime() - now.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) {
    return `还有${days}天${hours}小时刷新`;
  } else if (hours > 0) {
    return `还有${hours}小时${minutes}分钟刷新`;
  } else {
    return `还有${minutes}分钟刷新`;
  }
});

// 周常倒计时定时器
let weeklyCountdownInterval: number | null = null;

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

  // 启动周常倒计时定时器（每分钟更新一次）
  weeklyCountdownInterval = window.setInterval(() => {
    // 强制更新计算属性
    weeklyCountdown.value;
  }, 60000);
});

/**
 * 组件卸载时的清理操作
 */
onUnmounted(() => {
  if (weeklyCountdownInterval !== null) {
    clearInterval(weeklyCountdownInterval);
    weeklyCountdownInterval = null;
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

/* ==================== 信息显示样式 ==================== */
.update-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.section-card {
  background: #2d2d2d;
  border: 1px solid #404040;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.section-title {
  color: #ffffff;
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #404040;
  text-align: left;
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

.task-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
}

.task-card {
  position: relative;
  display: flex;
  flex-direction: column;
  background: #3a3a3a;

  padding: 12px 16px;
  border: 1px solid #404040;
  transition: all 0.3s ease;
  overflow: hidden;
}

.task-card:hover {
  background: #4a4a4a;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.task-card.task-completed {
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.15), rgba(76, 175, 80, 0.05));
  border-color: #4caf50;
}

.task-background-icon {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 0;
}

.complete-icon {
  width: 120px;
  height: 120px;
  opacity: 0.15;
  filter: brightness(0) invert(67%) sepia(51%) saturate(495%) hue-rotate(80deg) brightness(95%) contrast(89%);
}

.task-content {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.task-value-wrapper {
  display: flex;
  align-items: center;
}

.task-completed-text {
  font-size: 16px;
  font-weight: 700;
  color: #4caf50;
  letter-spacing: 2px;
}

/* 公开招募和刷新卡片特殊样式 */
.hire-card .hire-label {
  background: rgba(255, 165, 0, 0.2);
  padding: 4px 8px;

}

.refresh-card .refresh-label {
  background: rgba(255, 255, 255, 0.15);
  padding: 4px 8px;

}

.hire-value {
  color: #ffa500;
}

.refresh-value {
  color: #ffffff;
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

  border: 1px solid rgba(255, 255, 255, 0.05);
}

.weekly-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding-bottom: 4px;
  border-bottom: 1px solid rgba(250, 208, 0, 0.3);
}

.weekly-title {
  color: #fad000;
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}

.weekly-countdown {
  color: #888;
  font-size: 12px;
  font-weight: 500;
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

  min-width: 40px;
}

.daily-label {
  color: #6cc24a;
}

.task-value {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
}

.daily-value {
  color: #6cc24a;
}

.weekly-label {
  color: #4682b4;
}

.weekly-value {
  color: #4682b4;
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

/* ==================== 肉鸽成绩样式 ==================== */

.rogue-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.rogue-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px;
  border: 1px solid #444;
  cursor: pointer;
  overflow: hidden;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.rogue-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

/* 肉鸽图片容器 */
.rogue-image-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
}

/* 肉鸽图片 */
.rogue-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 肉鸽等级徽章 */
.rogue-level-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  flex-shrink: 0;
}

.rogue-level-label {
  font-size: 12px;
  font-weight: 600;
  color: #fff;
}

.rogue-level-value {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
}

/* 肉鸽信息 */
.rogue-info {
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  text-align: right;
}

.rogue-header {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
}

.rogue-name {
  font-size: 18px;
  font-weight: 600;
  color: #ffd700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rogue-stats {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.rogue-stat {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  color: #ccc;
}

.stat-value {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
}

.stat-label {
  font-size: 12px;
  color: #999;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .rogue-image-wrapper {
    height: 120px;
  }

  .rogue-info {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .rogue-image-wrapper {
    height: 100px;
  }

  .rogue-level-badge {
    padding: 4px 8px;
  }

  .rogue-level-label {
    font-size: 10px;
  }

  .rogue-level-value {
    font-size: 14px;
  }

  .rogue-name {
    font-size: 16px;
  }

  .rogue-stats {
    gap: 12px;
  }

  .rogue-stat {
    font-size: 12px;
  }

  .stat-value {
    font-size: 14px;
  }
}

/* 数据项颜色区分 - 为不同类型数据提供视觉区分 */
.data-item:nth-child(1) .value { color: #9feaf9; } /* 理智 - 蓝色 */
.data-item:nth-child(2) .task-value { color: #6cc24a; } /* 每日任务 - 绿色 */
.data-item:nth-child(2) .task-completed-text { color: #4caf50; } /* 每日任务完成 - 绿色 */
.data-item:nth-child(3) .task-value { color: #4682b4; } /* 每周任务 - 蓝色 */
.data-item:nth-child(3) .task-completed-text { color: #4caf50; } /* 每周任务完成 - 绿色 */
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

  .task-container {
    gap: 8px;
  }

  .task-card {
    padding: 10px 12px;
  }

  .complete-icon {
    width: 80px;
    height: 80px;
  }

  .section-card {
    padding: 15px;
  }
}

@media (max-width: 480px) {
  .data-item {
    flex: 1 1 100%;
  }

  .task-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }

  .task-label {
    font-size: 13px;
  }

  .task-value {
    font-size: 16px;
  }

  .task-completed-text {
    font-size: 14px;
  }
}
</style>

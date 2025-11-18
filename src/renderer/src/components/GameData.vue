<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { useAuthStore } from '@stores/auth';
import { AuthAPI } from '@services/api';

// 状态管理实例
const authStore = useAuthStore();

// 组件内部状态
const isLoading = ref(true);
const errorMsg = ref('');
const playerData = ref<any>(null);
const isRefreshing = ref(false);
const lastUpdateTime = ref<number>(0);
const isAttending = ref(false);
const attendanceMsg = ref('');
const currentTime = ref<number>(Math.floor(Date.now() / 1000));

// 刷新相关状态
const REFRESH_COOLDOWN = 30000; // 30秒冷却时间
const lastRefreshTime = ref<number>(0);
const refreshCooldownRemaining = ref<number>(0);
const refreshRetryCount = ref<number>(0);
const MAX_RETRY_COUNT = 3;

// 定时器
let timeUpdateInterval: NodeJS.Timeout | null = null;
let cooldownInterval: NodeJS.Timeout | null = null;

// 缓存相关
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存
const dataCache = ref<{ data: any; timestamp: number } | null>(null);

/**
 * 检查是否可以刷新
 */
const canRefresh = computed(() => {
  return refreshCooldownRemaining.value <= 0 &&
    !isRefreshing.value &&
    !isLoading.value &&
    authStore.isLogin;
});

/**
 * 更新冷却时间显示
 */
const updateCooldownDisplay = () => {
  const now = Date.now();
  const timeSinceLastRefresh = now - lastRefreshTime.value;

  if (timeSinceLastRefresh < REFRESH_COOLDOWN) {
    refreshCooldownRemaining.value = Math.ceil((REFRESH_COOLDOWN - timeSinceLastRefresh) / 1000);
  } else {
    refreshCooldownRemaining.value = 0;
  }
};

/**
 * 格式化冷却时间
 */
const formatCooldown = computed(() => {
  if (refreshCooldownRemaining.value <= 0) return '';
  return `${refreshCooldownRemaining.value}s`;
});

/**
 * 获取当前最新时间戳（秒级）
 */
const getCurrentTimestamp = () => {
  return currentTime.value;
};

/**
 * 格式化时间戳为本地日期时间
 */
const formatTimestamp = (ts?: number) => {
  if (!ts) return '未知';
  return new Date(ts * 1000).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * 计算实际理智数值 - 基于Kotlin代码逻辑
 */
const calculateActualAp = (apData: any) => {
  if (!apData) return { current: 0, max: 0, remainSecs: -1, recoverTime: -1 };

  const currentTs = getCurrentTimestamp();
  const max = apData.max || 130;
  const current = apData.current || 0;
  const completeRecoveryTime = apData.completeRecoveryTime || 0;

  if (current >= max) {
    return {
      current: current,
      max: max,
      remainSecs: -1,
      recoverTime: -1
    };
  }

  if (completeRecoveryTime < currentTs) {
    return {
      current: max,
      max: max,
      remainSecs: -1,
      recoverTime: -1
    };
  }

  const actualCurrent = max - Math.floor((completeRecoveryTime - currentTs) / (60 * 6) + 1);
  const remainSecs = completeRecoveryTime - currentTs;

  return {
    current: Math.max(0, actualCurrent),
    max: max,
    remainSecs: remainSecs,
    recoverTime: completeRecoveryTime
  };
};

/**
 * 格式化理智恢复时间
 */
const formatRecoveryTime = (recoveryTs?: number) => {
  if (!recoveryTs || recoveryTs <= 0) return '已回满';
  const now = getCurrentTimestamp();
  const diff = recoveryTs - now;

  if (diff <= 0) return '已回满';

  const hours = Math.floor(diff / 3600);
  const minutes = Math.floor((diff % 3600) / 60);

  if (hours > 0) return `${hours}小时${minutes}分钟`;
  return `${minutes}分钟`;
};

/**
 * 计算干员总数
 */
const getCharCount = computed(() => {
  return playerData.value?.chars?.length || 0;
});

/**
 * 修复作战进度显示逻辑
 * 根据API文档：全通关时mainStageProgress返回空，其他情况显示最新抵达的关卡
 */
const getMainStageProgress = computed(() => {
  const status = playerData.value?.status;
  if (!status) return '未知';

  // 优先使用mainStageProgress字段
  if (status.mainStageProgress) {
    return status.mainStageProgress;
  }

  // 如果mainStageProgress为空字符串，表示全通关
  if (status.mainStageProgress === '') {
    return '主线全通关';
  }

  // 如果没有mainStageProgress，尝试从其他字段推断
  if (status.mainStage) {
    return status.mainStage;
  }

  // 最后回退到默认值
  return '未通关主线';
});

/**
 * 格式化任务进度
 */
const formatTaskProgress = (task?: { completedCount?: number; totalCount?: number }) => {
  if (!task) return '0/0';
  return `${task.completedCount || 0}/${task.totalCount || 0}`;
};

/**
 * 获取公开招募状态
 */
const getHireStatus = computed(() => {
  const hireData = playerData.value?.building?.hire;
  if (!hireData || !Array.isArray(hireData.slots)) return '未开启';

  const activeHire = hireData.slots.some((slot: any) => slot.completeWorkTime > getCurrentTimestamp());
  return activeHire ? '招募中' : '空闲';
});

/**
 * 获取会客室线索总数
 */
const getClueCount = computed(() => {
  const clueBoard = playerData.value?.building?.meeting?.clue?.board;
  if (!clueBoard) return 0;

  return clueBoard.reduce((total: number, clue: any) => total + (clue.count || 0), 0);
});

/**
 * 获取制造站运行状态
 */
const getManufactureStatus = computed(() => {
  const manufactures = playerData.value?.building?.manufactures;
  if (!manufactures || !Array.isArray(manufactures) || manufactures.length === 0) return '0/3 运行中';

  const activeCount = manufactures.filter((mfg: any) => mfg.status === 'working').length;
  return `${activeCount}/${manufactures.length} 运行中`;
});

/**
 * 获取贸易站运行状态
 */
const getTradingStatus = computed(() => {
  const tradings = playerData.value?.building?.tradings;
  if (!tradings || !Array.isArray(tradings) || tradings.length === 0) return '0/3 运行中';

  const activeCount = tradings.filter((trade: any) => trade.status === 'working').length;
  return `${activeCount}/${tradings.length} 运行中`;
});

/**
 * 获取宿舍休息人数
 */
const getDormRestCount = computed(() => {
  const dormitories = playerData.value?.building?.dormitories;
  if (!dormitories) return 0;

  return dormitories.reduce((total: number, dorm: any) => total + (dorm.restCount || 0), 0);
});

/**
 * 获取训练室状态
 */
const getTrainingStatus = computed(() => {
  const trainees = playerData.value?.building?.training?.trainee;
  if (!trainees || !Array.isArray(trainees) || trainees.length === 0) return '0/2 训练中';

  const activeCount = trainees.filter((t: any) => t.completeTime > getCurrentTimestamp()).length;
  return `${activeCount}/${trainees.length} 训练中`;
});

/**
 * 获取保全派驻数据
 */
const getTowerStatus = computed(() => {
  const towerData = playerData.value?.tower?.reward;
  if (!towerData) return '未开启';

  const current = towerData.current || 0;
  const total = towerData.total || 0;
  return `${current}/${total} 数据增补仪`;
});

/**
 * 获取助战干员数量
 */
const getAssistCharCount = computed(() => {
  return playerData.value?.assistChars?.length || 0;
});

/**
 * 获取收藏品数量（肉鸽）
 */
const getRelicCount = computed(() => {
  return playerData.value?.rogue?.relicCnt || 0;
});

/**
 * 获取实际理智信息
 */
const getActualApInfo = computed(() => {
  const apData = playerData.value?.status?.ap;
  return calculateActualAp(apData);
});

/**
 * 显示操作消息
 */
const showOperationMessage = (message: string) => {
  attendanceMsg.value = message;
  setTimeout(() => {
    if (attendanceMsg.value === message) {
      attendanceMsg.value = '';
    }
  }, 3000);
};

/**
 * 加载游戏数据核心方法
 */
const fetchGameData = async (refresh = false, force = false) => {
  // 检查刷新冷却（强制刷新除外）
  if (refresh && !force) {
    const now = Date.now();
    if (now - lastRefreshTime.value < REFRESH_COOLDOWN) {
      console.log('刷新冷却中，跳过请求');
      return;
    }
  }

  // 检查缓存（非强制刷新时）
  if (!refresh && !force && dataCache.value && dataCache.value.data) {
    const currentMs = Date.now();
    const cacheAge = currentMs - dataCache.value.timestamp;
    if (cacheAge < CACHE_DURATION) {
      console.log('使用缓存数据，缓存年龄:', Math.floor(cacheAge / 1000), '秒');
      playerData.value = dataCache.value.data;
      lastUpdateTime.value = currentMs;
      isLoading.value = false;
      return;
    }
  }

  // 设置加载状态
  if (refresh) {
    isRefreshing.value = true;
    lastRefreshTime.value = Date.now();
    refreshCooldownRemaining.value = REFRESH_COOLDOWN / 1000;
  } else {
    isLoading.value = true;
  }

  errorMsg.value = '';

  try {
    console.log('开始加载游戏数据...', refresh ? '(刷新)' : '', force ? '(强制)' : '');

    // 检查登录状态
    if (!authStore.isLogin) {
      throw new Error('请先登录账号');
    }

    // 检查绑定角色
    if (!authStore.bindingRoles || authStore.bindingRoles.length === 0) {
      console.log('没有绑定角色，正在获取...');
      await authStore.fetchBindingRoles();

      if (!authStore.bindingRoles || authStore.bindingRoles.length === 0) {
        throw new Error('未找到绑定的游戏角色');
      }
    }

    // 获取默认角色
    const targetRole = authStore.bindingRoles.find((role: any) => role.isDefault) || authStore.bindingRoles[0];

    if (!targetRole) {
      throw new Error('未找到绑定的游戏角色');
    }

    console.log(`使用角色: ${targetRole.nickName} (${targetRole.uid})`);

    // 调用API获取玩家详细数据
    const data = await AuthAPI.getPlayerData(
      authStore.sklandCred,
      authStore.sklandSignToken,
      targetRole.uid
    );

    console.log('玩家数据获取成功');
    playerData.value = data;
    lastUpdateTime.value = Date.now();
    refreshRetryCount.value = 0; // 重置重试计数

    // 更新缓存
    dataCache.value = {
      data: data,
      timestamp: Date.now()
    };

    console.log('游戏数据加载完成并已缓存');

    // 显示成功消息
    if (refresh) {
      showOperationMessage('数据刷新成功');
    }

  } catch (error: any) {
    console.error('GameData load error:', error);
    refreshRetryCount.value++;

    // 错误处理
    if (error.response?.status === 401) {
      errorMsg.value = '登录已过期，请重新登录';
      authStore.logout();
    } else if (error.response?.status === 429) {
      errorMsg.value = '请求过于频繁，请稍后重试';
    } else if (error.message?.includes('Network Error')) {
      errorMsg.value = '网络连接失败，请检查网络设置';
    } else if (error.message?.includes('未找到绑定的游戏角色')) {
      errorMsg.value = '未找到游戏角色，请检查账号绑定';
    } else {
      errorMsg.value = error.message || '游戏数据加载失败，请稍后重试';
    }

    // 自动重试逻辑
    if (refreshRetryCount.value < MAX_RETRY_COUNT && !error.response?.status) {
      console.log(`加载失败，${3}秒后重试... (${refreshRetryCount.value}/${MAX_RETRY_COUNT})`);
      setTimeout(() => {
        fetchGameData(refresh, true);
      }, 3000);
    }

  } finally {
    isLoading.value = false;
    isRefreshing.value = false;
  }
};

/**
 * 刷新数据
 */
const refreshData = () => {
  if (!canRefresh.value) {
    console.log('刷新功能暂时不可用');
    return;
  }

  console.log('开始手动刷新数据...');
  fetchGameData(true);
};

/**
 * 强制刷新数据（忽略缓存和冷却）
 */
const forceRefresh = () => {
  console.log('强制刷新数据...');
  dataCache.value = null;
  refreshRetryCount.value = 0;
  fetchGameData(true, true);
};

/**
 * 重新加载数据
 */
const retryLoadData = () => {
  fetchGameData();
};

/**
 * 签到功能
 */
const handleAttendance = async () => {
  if (!authStore.isLogin || !authStore.bindingRoles.length) {
    errorMsg.value = '请先登录并绑定游戏角色';
    return;
  }

  isAttending.value = true;
  attendanceMsg.value = '';

  try {
    // 验证cred是否还有效
    const isCredValid = await AuthAPI.checkCred(authStore.sklandCred);
    if (!isCredValid) {
      throw new Error('Cred已失效，请重新登录');
    }

    const targetRole = authStore.bindingRoles.find((role: any) => role.isDefault) || authStore.bindingRoles[0];
    if (!targetRole) {
      throw new Error('未找到绑定的游戏角色');
    }

    const gameId = targetRole.channelMasterId;
    const attendanceData = await AuthAPI.attendance(
      authStore.sklandCred,
      authStore.sklandSignToken,
      targetRole.uid,
      gameId
    );

    if (attendanceData.alreadyAttended) {
      attendanceMsg.value = '今日已签到';
    } else {
      const awards = attendanceData.awards || [];
      const awardTexts = awards.map((award: any) => {
        const count = award.count || 0;
        const name = award.resource?.name || '未知奖励';
        return `${name} x${count}`;
      }).join(', ');

      attendanceMsg.value = `签到成功！获得：${awardTexts}`;
    }

    setTimeout(() => {
      attendanceMsg.value = '';
    }, 3000);

  } catch (error: any) {
    attendanceMsg.value = error.message || '签到失败，请稍后重试';
    console.error('签到失败:', error);
  } finally {
    isAttending.value = false;
  }
};

// 组件挂载时加载数据
onMounted(async () => {
  console.log('GameData组件挂载，开始初始化...');

  // 启动时间更新定时器
  timeUpdateInterval = setInterval(() => {
    currentTime.value = Math.floor(Date.now() / 1000);
  }, 1000);

  // 启动冷却时间更新定时器
  cooldownInterval = setInterval(updateCooldownDisplay, 1000);

  try {
    if (authStore.isLogin) {
      console.log('用户已登录，直接加载数据');
      await fetchGameData();
    } else {
      console.log('用户未登录，尝试恢复登录状态');
      const isRestored = await authStore.restoreAuthState();
      if (isRestored) {
        console.log('登录状态恢复成功，加载数据');
        await fetchGameData();
      } else {
        console.log('登录状态恢复失败');
        isLoading.value = false;
        errorMsg.value = '请先登录森空岛账号';
      }
    }
  } catch (error) {
    console.error('GameData组件初始化失败:', error);
    isLoading.value = false;
    errorMsg.value = '初始化失败，请刷新页面重试';
  }
});

// 监听登录状态变化
watch(() => authStore.isLogin, async (newLoginState, oldLoginState) => {
  if (newLoginState && !oldLoginState) {
    console.log('检测到登录状态变化，清除缓存并重新加载数据');
    dataCache.value = null;
    await fetchGameData();
  }
});

// 组件卸载时清理定时器
onUnmounted(() => {
  if (timeUpdateInterval) {
    clearInterval(timeUpdateInterval);
    timeUpdateInterval = null;
  }

  if (cooldownInterval) {
    clearInterval(cooldownInterval);
    cooldownInterval = null;
  }

  console.log('所有定时器已清理');
});
</script>

<template>
  <div class="game-data-container">
    <!-- 加载状态提示 -->
    <div class="loading-container" v-if="isLoading && !isRefreshing">
      <div class="spinner"></div>
      <p class="loading-text">加载游戏数据中...</p>
    </div>

    <!-- 数据加载失败提示 -->
    <div class="error-container" v-else-if="errorMsg">
      <p class="error-text">{{ errorMsg }}</p>
      <div class="error-actions">
        <button class="retry-btn" @click="retryLoadData">重新加载</button>
        <button class="force-retry-btn" @click="forceRefresh">强制刷新</button>
        <span class="retry-count" v-if="refreshRetryCount > 0">
          重试: {{ refreshRetryCount }}/{{ MAX_RETRY_COUNT }}
        </span>
      </div>
    </div>

    <!-- 数据卡片区域（加载成功时显示） -->
    <div class="cards-wrapper" v-else>
      <!-- 数据头部操作栏 -->
      <div class="data-header">
        <div class="left-section">
          <div class="update-info">
            <span class="last-update" v-if="lastUpdateTime">
              最后更新：{{ formatTimestamp(Math.floor(lastUpdateTime / 1000)) }}
            </span>
            <span class="cooldown-info" v-if="refreshCooldownRemaining > 0">
              （{{ formatCooldown }}后可刷新）
            </span>
          </div>
          <!-- 操作消息提示 -->
          <div class="operation-message" v-if="attendanceMsg" :class="{
            success: !attendanceMsg.includes('失败'),
            error: attendanceMsg.includes('失败')
          }">
            {{ attendanceMsg }}
          </div>
        </div>
        <div class="header-buttons">
          <button
            class="attendance-btn"
            @click="handleAttendance"
            :disabled="isAttending || !authStore.isLogin"
            :class="{ attending: isAttending }"
          >
            <span v-if="isAttending">签到中...</span>
            <span v-else>每日签到</span>
          </button>

          <button
            class="refresh-btn"
            @click="refreshData"
            :disabled="!canRefresh"
            :class="{
              refreshing: isRefreshing,
              cooldown: refreshCooldownRemaining > 0
            }"
          >
            <span class="refresh-icon">🔄</span>
            <span v-if="isRefreshing">刷新中...</span>
            <span v-else-if="refreshCooldownRemaining > 0">冷却({{ formatCooldown }})</span>
            <span v-else>刷新数据</span>
          </button>
        </div>
      </div>

      <!-- 刷新加载指示器 -->
      <div class="refresh-indicator" v-if="isRefreshing">
        <div class="refresh-spinner"></div>
        <span>正在刷新数据...</span>
      </div>

      <!-- 用户信息卡片 -->
      <ul class="UserCard">
        <li class="name">Dr.{{ playerData?.status?.name || '未知' }}</li>
        <li class="level">等级：{{ playerData?.status?.level || 0 }}</li>
        <li class="apcurrent">
          理智：{{ getActualApInfo.current }}/{{ getActualApInfo.max }}
          <span class="ap-recover" v-if="getActualApInfo.remainSecs > 0">
            （{{ formatRecoveryTime(getActualApInfo.recoverTime) }} 回满）
          </span>
          <span class="ap-full" v-else>（已回满）</span>
        </li>
        <li class="registerTs">入职日：{{ formatTimestamp(playerData?.status?.registerTs) }}</li>
        <li class="mainStageProgress">
          作战进度：{{ getMainStageProgress }}
        </li>
        <li class="chars">雇佣干员：{{ getCharCount }}</li>
        <li class="assist-chars">助战干员：{{ getAssistCharCount }}</li>
        <li class="shizhuangshulinag">时装数量：{{ playerData?.skins?.length || 0 }}</li>
        <li class="furniture">家具保有：{{ playerData?.building?.furniture.total || 0 }}</li>
        <li class="shikezhang">蚀刻章：{{ playerData?.medal?.count || 0 }}</li>
      </ul>

      <!-- 游戏功能数据卡片 -->
      <ul class="GameCard">
        <li class="daily">
          每日任务: {{ formatTaskProgress(playerData?.routine?.daily) }}
          <span class="refresh-time" v-if="playerData?.routine?.daily?.refreshTime">
            （{{ formatTimestamp(playerData.routine.daily.refreshTime) }} 刷新）
          </span>
        </li>
        <li class="week">
          每周任务: {{ formatTaskProgress(playerData?.routine?.weekly) }}
          <span class="refresh-time" v-if="playerData?.routine?.weekly?.refreshTime">
            （{{ formatTimestamp(playerData.routine.weekly.refreshTime) }} 刷新）
          </span>
        </li>
        <li class="completeWorkTime">
          公开招募: {{ getHireStatus }}
        </li>
        <li class="refreshCount">公招刷新: {{ playerData?.building?.hire?.refreshCount || 0 }}/4</li>
        <li class="wurenji">无人机：{{ playerData?.building?.labor?.count || 0 }}/{{ playerData?.building?.labor?.max || 0 }}</li>
        <li class="meetingroom">
          会客室：{{ getClueCount }} 条线索
          <span v-if="getClueCount >= 9" class="clue-full">（已满）</span>
        </li>
        <li class="zhizaozhan">制造站：{{ getManufactureStatus }}</li>
        <li class="maoyizhan">贸易站：{{ getTradingStatus }}</li>
        <li class="resttime">休息进度：{{ getDormRestCount }} 人休息中</li>
        <li class="tired">干员疲劳：{{ playerData?.building?.tiredChars?.length || 0 }} 人</li>
        <li class="xunlianshi">训练室：{{ getTrainingStatus }}</li>
        <li class="jiaomie">
          剿灭：{{ playerData?.campaign?.reward?.current || 0 }}/{{ playerData?.campaign?.reward?.total || 0 }} 合成玉
        </li>
        <li class="tower">
          保全派驻：{{ getTowerStatus }}
        </li>
        <li class="rogue">
          肉鸽收藏品：{{ getRelicCount }}
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.game-data-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

/* 加载状态样式 */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  gap: 16px;
  color: #ccc;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(100, 108, 255, 0.2);
  border-top: 4px solid #646cff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-text {
  font-size: 16px;
  color: #ccc;
}

/* 错误状态样式 */
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  gap: 16px;
  color: #ff6b6b;
}

.error-text {
  font-size: 16px;
  text-align: center;
  max-width: 400px;
}

.error-actions {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-top: 12px;
}

.retry-btn {
  padding: 10px 16px;
  background: #646cff;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.3s ease;
}

.retry-btn:hover {
  background: #747bff;
}

.force-retry-btn {
  padding: 10px 16px;
  background: #ff9800;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.3s ease;
}

.force-retry-btn:hover {
  background: #f57c00;
}

.retry-count {
  font-size: 12px;
  color: #999;
  margin-left: 8px;
}

/* 卡片容器样式 */
.cards-wrapper {
  display: flex;
  flex-direction: column;
  gap: 20px;
  position: relative;
}

/* 刷新指示器 */
.refresh-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(100, 108, 255, 0.1);
  border: 1px solid #646cff;
  border-radius: 6px;
  color: #646cff;
  font-size: 14px;
}

.refresh-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(100, 108, 255, 0.2);
  border-top: 2px solid #646cff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* 数据头部操作栏 */
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

/* 按钮基础样式 */
.attendance-btn,
.refresh-btn {
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
}

/* 签到按钮 */
.attendance-btn {
  background: #4caf50;
  color: white;
}

.attendance-btn:hover:not(:disabled) {
  background: #45a049;
  transform: translateY(-1px);
}

.attendance-btn:disabled {
  background: #666;
  cursor: not-allowed;
  opacity: 0.7;
}

.attendance-btn.attending {
  background: #ffa500;
}

/* 刷新按钮 */
.refresh-btn {
  background: #646cff;
  color: white;
}

.refresh-btn:hover:not(:disabled) {
  background: #747bff;
  transform: translateY(-1px);
}

.refresh-btn:disabled {
  background: #666;
  cursor: not-allowed;
  opacity: 0.7;
}

.refresh-btn.refreshing {
  background: #ffa500;
}

.refresh-btn.cooldown {
  background: #666;
}

.refresh-icon {
  font-size: 12px;
}

/* 更新信息 */
.update-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.last-update {
  color: #999;
  font-size: 14px;
}

.cooldown-info {
  color: #ff9800;
  font-size: 12px;
}

/* 操作消息提示 */
.operation-message {
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
}

.operation-message.success {
  background: rgba(76, 175, 80, 0.2);
  color: #4caf50;
  border: 1px solid #4caf50;
}

.operation-message.error {
  background: rgba(244, 67, 54, 0.2);
  color: #f44336;
  border: 1px solid #f44336;
}

/* 用户信息卡片样式 */
.UserCard {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 15px;
  list-style: none;
  margin: 0;
  padding: 24px;
  background: #2d2d2d;
  border-radius: 8px;
  border: 1px solid #404040;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.UserCard li {
  color: #ccc;
  font-size: 14px;
  padding: 10px 12px;
  text-align: center;
  border-radius: 4px;
  background: #333333;
  transition: background 0.3s ease;
}

.UserCard li:hover {
  background: #3a3a3a;
}

.UserCard .name {
  color: #9feaf9;
  font-weight: 600;
  font-size: 16px;
}

.UserCard .level {
  color: #fad000;
}

.UserCard .apcurrent {
  color: #6cc24a;
}

.UserCard .mainStageProgress {
  color: #ff7eb9;
}

.UserCard .chars {
  color: #7afcff;
}

.UserCard .assist-chars {
  color: #ff9800;
}

.UserCard .shizhuangshulinag {
  color: #ff65a3;
}

.UserCard .furniture {
  color: #feff9c;
}

.UserCard .shikezhang {
  color: #ff6b6b;
}

.UserCard .ap-recover,
.UserCard .ap-full {
  display: block;
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

/* 游戏数据卡片样式 */
.GameCard {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 15px;
  list-style: none;
  margin: 0;
  padding: 24px;
  background: #2d2d2d;
  border-radius: 8px;
  border: 1px solid #404040;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.GameCard li {
  color: #ccc;
  font-size: 14px;
  padding: 10px 12px;
  text-align: center;
  border-radius: 4px;
  background: #333333;
  transition: background 0.3s ease;
}

.GameCard li:hover {
  background: #3a3a3a;
}

.GameCard .daily {
  color: #9feaf9;
}

.GameCard .week {
  color: #fad000;
}

.GameCard .completeWorkTime {
  color: #6cc24a;
}

.GameCard .refreshCount {
  color: #ff7eb9;
}

.GameCard .wurenji {
  color: #7afcff;
}

.GameCard .meetingroom {
  color: #ff65a3;
}

.GameCard .zhizaozhan {
  color: #feff9c;
}

.GameCard .maoyizhan {
  color: #ff6b6b;
}

.GameCard .resttime {
  color: #6bffb8;
}

.GameCard .tired {
  color: #c78dff;
}

.GameCard .xunlianshi {
  color: #9feaf9;
}

.GameCard .jiaomie {
  color: #fad000;
}

.GameCard .tower {
  color: #9c27b0;
}

.GameCard .rogue {
  color: #00bcd4;
}

.GameCard .refresh-time {
  display: block;
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.GameCard .clue-full {
  color: #ff6b6b;
  font-size: 12px;
  margin-left: 4px;
}

/* 响应式适配 */
@media (max-width: 768px) {
  .UserCard,
  .GameCard {
    grid-template-columns: repeat(2, 1fr);
  }

  .data-header {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .left-section {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .header-buttons {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 8px;
  }

  .attendance-btn,
  .refresh-btn {
    flex: 1;
    min-width: 120px;
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .UserCard,
  .GameCard {
    grid-template-columns: 1fr;
  }

  .game-data-container {
    padding: 10px;
  }

  .header-buttons {
    flex-direction: column;
  }
}

/* 动画定义 */
@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>

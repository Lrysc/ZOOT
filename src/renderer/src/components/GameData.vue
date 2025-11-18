<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
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
const showDebug = ref(false); // 调试模式已关闭

// 缓存相关
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存
const dataCache = ref<{ data: any; timestamp: number } | null>(null);


/**
 * 格式化时间戳为本地日期时间
 * @param ts 时间戳（秒级）
 * @returns 格式化后的字符串
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
 * 格式化理智恢复时间
 * @param recoveryTs 恢复完成时间戳（秒级）
 * @returns 剩余时间字符串
 */
const formatRecoveryTime = (recoveryTs?: number) => {
  if (!recoveryTs) return '未知';
  const now = Math.floor(Date.now() / 1000);
  const diff = recoveryTs - now;

  if (diff <= 0) return '已回满';

  const hours = Math.floor(diff / 3600);
  const minutes = Math.floor((diff % 3600) / 60);

  if (hours > 0) return `${hours}小时${minutes}分钟`;
  return `${minutes}分钟`;
};

/**
 * 计算干员总数（遍历chars数组）
 * @returns 干员数量
 */
const getCharCount = computed(() => {
  return playerData.value?.chars?.length || 0;
});

/**
 * 格式化任务进度（已完成/总数）
 * @param task 任务数据对象
 * @returns 进度字符串
 */
const formatTaskProgress = (task?: { completedCount?: number; totalCount?: number }) => {
  if (!task) return '0/0';
  return `${task.completedCount || 0}/${task.totalCount || 0}`;
};

/**
 * 获取公开招募状态
 * @returns 招募状态描述
 */
const getHireStatus = computed(() => {
  const hireData = playerData.value?.building?.hire;
  if (!hireData || !Array.isArray(hireData.slots)) return '未开启';

  // 检查是否有正在进行的招募
  const activeHire = hireData.slots.some((slot: any) => slot.completeWorkTime > Math.floor(Date.now() / 1000));
  return activeHire ? '招募中' : '空闲';
});

/**
 * 获取会客室线索总数
 * @returns 线索数量
 */
const getClueCount = computed(() => {
  const clueBoard = playerData.value?.building?.meeting?.clue?.board;
  if (!clueBoard) return 0;

  // 计算所有线索数量总和
  return clueBoard.reduce((total: number, clue: any) => total + (clue.count || 0), 0);
});

/**
 * 获取制造站运行状态
 * @returns 制造站状态描述
 */
const getManufactureStatus = computed(() => {
  const manufactures = playerData.value?.building?.manufactures;
  if (!manufactures || !Array.isArray(manufactures) || manufactures.length === 0) return '0/3 运行中';

  // 计算正在运行的制造站数量
  const activeCount = manufactures.filter((mfg: any) => mfg.status === 'working').length;
  return `${activeCount}/${manufactures.length} 运行中`;
});

/**
 * 获取贸易站运行状态
 * @returns 贸易站状态描述
 */
const getTradingStatus = computed(() => {
  const tradings = playerData.value?.building?.tradings;
  if (!tradings || !Array.isArray(tradings) || tradings.length === 0) return '0/3 运行中';

  // 计算正在运行的贸易站数量
  const activeCount = tradings.filter((trade: any) => trade.status === 'working').length;
  return `${activeCount}/${tradings.length} 运行中`;
});

/**
 * 获取宿舍休息人数
 * @returns 休息人数
 */
const getDormRestCount = computed(() => {
  const dormitories = playerData.value?.building?.dormitories;
  if (!dormitories) return 0;

  // 计算所有宿舍休息人数总和
  return dormitories.reduce((total: number, dorm: any) => total + (dorm.restCount || 0), 0);
});

/**
 * 获取训练室状态
 * @returns 训练室状态描述
 */
const getTrainingStatus = computed(() => {
  const trainees = playerData.value?.building?.training?.trainee;
  if (!trainees || !Array.isArray(trainees) || trainees.length === 0) return '0/2 训练中';

  // 计算正在训练的干员数量
  const activeCount = trainees.filter((t: any) => t.completeTime > Math.floor(Date.now() / 1000)).length;
  return `${activeCount}/${trainees.length} 训练中`;
});

/**
 * 获取保全派驻数据
 * @returns 保全派驻状态描述
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
 * @returns 助战干员数量
 */
const getAssistCharCount = computed(() => {
  return playerData.value?.assistChars?.length || 0;
});

/**
 * 获取收藏品数量（肉鸽）
 * @returns 收藏品数量
 */
const getRelicCount = computed(() => {
  return playerData.value?.rogue?.relicCnt || 0;
});

/**
 * 获取家具保有数量
 * @returns 家具数量
 */
const getFurnitureCount = computed(() => {
  // 根据 README: data.building.furniture
  const furniture = playerData.value?.building?.furniture;

  // 调试输出
  console.log('家具数据原始值:', furniture, '类型:', typeof furniture);

  // 处理可能的多种数据格式
  if (typeof furniture === 'number') {
    console.log('家具数据是数字:', furniture);
    return furniture;
  }

  // 如果是对象格式，尝试获取 total 字段
  if (typeof furniture === 'object' && furniture !== null) {
    console.log('家具数据是对象:', furniture);
    // 优先使用 total 字段，如果没有则尝试其他可能的字段
    return furniture.total || furniture.count || furniture.value || 0;
  }

  // 如果是字符串，尝试转换为数字
  if (typeof furniture === 'string') {
    const parsed = parseInt(furniture);
    if (!isNaN(parsed)) {
      console.log('家具数据是字符串，转换为数字:', parsed);
      return parsed;
    }
  }

  console.log('家具数据格式无法识别，返回0');
  return 0;
});

/**
 * 加载游戏数据核心方法
 */
const fetchGameData = async (refresh = false) => {
  // 检查缓存（非强制刷新时）
  if (!refresh && dataCache.value && dataCache.value.data) {
    const cacheAge = Date.now() - dataCache.value.timestamp;
    if (cacheAge < CACHE_DURATION) {
      console.log('使用缓存数据，缓存年龄:', Math.floor(cacheAge / 1000), '秒');
      playerData.value = dataCache.value.data;
      lastUpdateTime.value = dataCache.value.timestamp;
      isLoading.value = false;
      return;
    }
  }

  if (refresh) {
    isRefreshing.value = true;
  } else {
    isLoading.value = true;
  }
  errorMsg.value = '';

  try {
    console.log('开始加载游戏数据...');

    // 1. 检查登录状态，未登录则抛出错误
    if (!authStore.isLogin) {
      console.log('用户未登录');
      throw new Error('请先登录账号');
    }

    console.log('用户已登录，检查绑定角色...');

    // 2. 检查绑定角色，无角色则获取角色列表
    if (!authStore.bindingRoles || authStore.bindingRoles.length === 0) {
      console.log('没有绑定角色，正在获取...');
      await authStore.fetchBindingRoles();
    }

    console.log(`当前绑定角色数量: ${authStore.bindingRoles.length}`);

    // 3. 获取默认角色
    const targetRole = authStore.bindingRoles.find((role: any) => role.isDefault) || authStore.bindingRoles[0];

    if (!targetRole) {
      console.log('未找到绑定的游戏角色');
      throw new Error('未找到绑定的游戏角色');
    }

    console.log(`使用角色: ${targetRole.nickName} (${targetRole.uid})`);

    // 4. 调用API获取玩家详细数据
    const data = await AuthAPI.getPlayerData(
      authStore.sklandCred,
      authStore.sklandSignToken,
      targetRole.uid
    );

    console.log('玩家数据获取成功');
    playerData.value = data;
    lastUpdateTime.value = Date.now();

    // 更新缓存
    dataCache.value = {
      data: data,
      timestamp: Date.now()
    };

    console.log('游戏数据加载完成并已缓存');
  } catch (error: any) {
    console.error('GameData load error:', error);
    errorMsg.value = error.message || '游戏数据加载失败，请稍后重试';

    // 确保在出错时也停止加载状态
    if (!refresh) {
      isLoading.value = false;
    }
  } finally {
    isLoading.value = false;
    isRefreshing.value = false;
    console.log('加载状态已重置');
  }
};

/**
 * 刷新数据
 */
const refreshData = async () => {
  await fetchGameData(true);
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
    // 先验证cred是否还有效
    console.log('=== 验证cred有效性 ===');
    const isCredValid = await AuthAPI.checkCred(authStore.sklandCred);
    console.log('Cred有效性:', isCredValid);

    if (!isCredValid) {
      throw new Error('Cred已失效，请重新登录');
    }

    const targetRole = authStore.bindingRoles.find((role: any) => role.isDefault) || authStore.bindingRoles[0];

    if (!targetRole) {
      throw new Error('未找到绑定的游戏角色');
    }

    console.log('=== 绑定角色调试信息 ===');
    console.log('完整的绑定角色列表:', JSON.stringify(authStore.bindingRoles, null, 2));
    console.log('选中的角色信息:', JSON.stringify(targetRole, null, 2));
    console.log('角色UID:', targetRole.uid);
    console.log('channelMasterId:', targetRole.channelMasterId);
    console.log('========================');

    // gameId需要是uint32类型，使用channelMasterId并转换为数字
    const gameId = targetRole.channelMasterId;
    console.log('使用的gameId:', gameId);
    console.log('gameId类型:', typeof gameId);
    console.log('转换为数字:', parseInt(gameId));

    const attendanceData = await AuthAPI.attendance(
      authStore.sklandCred,
      authStore.sklandSignToken,
      targetRole.uid,
      gameId
    );

    // 检查是否已经签到
    if (attendanceData.alreadyAttended) {
      attendanceMsg.value = '今日已签到';
    } else {
      // 解析签到奖励
      const awards = attendanceData.awards || [];
      const awardTexts = awards.map((award: any) => {
        const count = award.count || 0;
        const name = award.resource?.name || '未知奖励';
        return `${name} x${count}`;
      }).join(', ');

      attendanceMsg.value = `签到成功！获得：${awardTexts}`;
    }

    // 3秒后清除签到消息
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

  try {
    // 监听登录状态变化，登录后自动加载数据
    if (authStore.isLogin) {
      console.log('用户已登录，直接加载数据');
      await fetchGameData();
    } else {
      console.log('用户未登录，尝试恢复登录状态');
      // 未登录时尝试恢复登录状态
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

// 监听登录状态变化，登录后自动刷新数据
watch(() => authStore.isLogin, async (newLoginState, oldLoginState) => {
  if (newLoginState && !oldLoginState) {
    // 从未登录变为已登录
    console.log('检测到登录状态变化，清除缓存并重新加载数据');
    dataCache.value = null; // 清除缓存
    await fetchGameData();
  }
});
</script>

<template>
  <div class="game-data-container">
    <!-- 加载状态提示 -->
    <div class="loading-container" v-if="isLoading">
      <div class="spinner"></div>
      <p class="loading-text">加载游戏数据中...</p>
    </div>

    <!-- 数据加载失败提示 -->
    <div class="error-container" v-else-if="errorMsg">
      <p class="error-text">{{ errorMsg }}</p>
      <button class="retry-btn" @click="fetchGameData">重新加载</button>
    </div>

    <!-- 调试信息 -->
    <div class="debug-container" v-if="showDebug">
      <h3>调试信息</h3>
      <p>isLogin: {{ authStore.isLogin }}</p>
      <p>isLoading: {{ isLoading }}</p>
      <p>errorMsg: {{ errorMsg }}</p>
      <p>bindingRoles length: {{ authStore.bindingRoles.length }}</p>
      <p>sklandCred: {{ authStore.sklandCred ? '已设置' : '未设置' }}</p>
      <p>sklandSignToken: {{ authStore.sklandSignToken ? '已设置' : '未设置' }}</p>
      <p>playerData: {{ playerData ? '已加载' : '未加载' }}</p>
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
          </div>
          <!-- 签到消息提示 -->
          <div class="attendance-message" v-if="attendanceMsg" :class="{ success: !attendanceMsg.includes('失败'), error: attendanceMsg.includes('失败') }">
            {{ attendanceMsg }}
          </div>
        </div>
        <div class="header-buttons">
          <button
            class="attendance-btn"
            @click="handleAttendance"
            :disabled="isAttending"
            :class="{ attending: isAttending }"
          >
            <span v-if="isAttending">签到中...</span>
            <span v-else>每日签到</span>
          </button>
          <button
            class="refresh-btn"
            @click="refreshData"
            :disabled="isRefreshing"
            :class="{ refreshing: isRefreshing }"
          >
            <span v-if="isRefreshing">刷新中...</span>
            <span v-else>刷新数据</span>
          </button>
        </div>
      </div>

      <!-- 用户信息卡片 -->
      <ul class="UserCard">
        <li class="name">Dr.{{ playerData?.status?.name || '未知' }}</li>
        <li class="level">等级：{{ playerData?.status?.level || 0 }}</li>
        <li class="apcurrent">
          理智：{{ playerData?.status?.ap?.current || 0 }}/{{ playerData?.status?.ap?.max || 130 }}
          <span class="ap-recover" v-if="playerData?.status?.ap?.completeRecoveryTime">
            （{{ formatRecoveryTime(playerData.status.ap.completeRecoveryTime) }} 回满）
          </span>
        </li>
        <li class="registerTs">入职日：{{ formatTimestamp(playerData?.status?.registerTs) }}</li>
        <li class="mainStageProgress">
          作战进度：{{ playerData?.status?.mainStageProgress || '未通关主线' }}
        </li>
        <li class="chars">雇佣干员：{{ getCharCount }}</li>
        <li class="assist-chars">助战干员：{{ getAssistCharCount }}</li>
        <li class="shizhuangshulinag">时装数量：{{ playerData?.skins?.length || 0 }}</li>
        <li class="furniture">家具保有：{{ getFurnitureCount }}</li>
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
/* 容器样式 */
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

.retry-btn {
  padding: 10px 24px;
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

/* 卡片容器样式 */
.cards-wrapper {
  display: flex;
  flex-direction: column;
  gap: 20px;
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
}

.attendance-btn {
  padding: 8px 16px;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
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

.attendance-message {
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
}

.attendance-message.success {
  background: rgba(76, 175, 80, 0.2);
  color: #4caf50;
  border: 1px solid #4caf50;
}

.attendance-message.error {
  background: rgba(244, 67, 54, 0.2);
  color: #f44336;
  border: 1px solid #f44336;
}



.update-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.last-update {
  color: #999;
  font-size: 14px;
}

.refresh-btn {
  padding: 8px 16px;
  background: #646cff;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
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

/* 用户卡片特殊样式 */
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

.UserCard .ap-recover {
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

/* 游戏卡片特殊样式 */
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

/* 游戏卡片辅助文本样式 */
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
    flex-direction: column;
    gap: 8px;
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


}

/* 调试信息样式 */
.debug-container {
  background: #333;
  border: 1px solid #666;
  border-radius: 8px;
  padding: 20px;
  margin: 20px 0;
  color: #fff;
}

.debug-container h3 {
  margin-top: 0;
  color: #646cff;
}

.debug-container p {
  margin: 5px 0;
  font-family: monospace;
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

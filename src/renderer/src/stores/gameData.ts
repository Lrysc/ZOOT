import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { AuthAPI } from '@services/api';
import { useAuthStore } from '@stores/auth';

/**
 * 游戏数据状态管理Store
 * 负责玩家游戏数据的获取、缓存和状态管理
 * 包含理智计算、任务进度、基建状态等核心功能
 */
export const useGameDataStore = defineStore('gameData', () => {
  // ========== 状态定义 ==========

  /**
   * 数据加载状态
   * true: 正在加载数据
   * false: 数据加载完成
   */
  const isLoading = ref(true);

  /**
   * 错误消息
   * 空字符串: 无错误
   * 非空字符串: 显示错误信息
   */
  const errorMsg = ref('');

  /**
   * 玩家游戏数据
   * 从森空岛API获取的完整玩家数据
   * 包含角色、基建、任务等所有游戏信息
   */
  const playerData = ref();

  /**
   * 数据刷新状态
   * true: 正在刷新数据
   * false: 刷新完成
   */
  const isRefreshing = ref(false);

  /**
   * 最后更新时间戳
   * 记录数据最后一次成功获取的时间
   * 用于显示"最后更新"信息
   */
  const lastUpdateTime = ref(0);

  /**
   * 当前时间戳（秒级）
   * 用于实时计算理智恢复、任务刷新等时间相关功能
   */
  const currentTime = ref(Math.floor(Date.now() / 1000));

  // ========== 缓存配置 ==========

  /**
   * 缓存持续时间（5分钟）
   * 在此期间内不会重复请求API，使用缓存数据
   */
  const CACHE_DURATION = 5 * 60 * 1000;

  /**
   * 数据缓存对象
   * 存储玩家数据和缓存时间戳，减少API请求频率
   */
  const dataCache = ref<{ data: any; timestamp: number }>();

  // ========== 依赖注入 ==========

  /**
   * 认证Store实例
   * 用于获取登录状态、用户凭证等认证信息
   */
  const authStore = useAuthStore();

  // ========== 定时器 ==========

  /**
   * 时间更新定时器
   * 每秒更新一次当前时间，确保时间相关计算准确
   */
  let timeUpdateInterval: NodeJS.Timeout | null = null;

  // ========== 工具函数 ==========

  /**
   * 获取当前最新时间戳（秒级）
   * @returns 当前时间戳（秒）
   */
  const getCurrentTimestamp = () => {
    return currentTime.value;
  };

  /**
   * 格式化时间戳为本地日期时间
   * @param ts - 时间戳（秒级）
   * @returns 格式化的日期时间字符串
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
   * 根据恢复时间动态计算当前实际理智值
   * @param apData - 理智数据对象
   * @returns 包含当前理智、最大理智、剩余恢复时间等信息的对象
   */
  const calculateActualAp = (apData: any) => {
    if (!apData) return { current: 0, max: 0, remainSecs: -1, recoverTime: -1 };

    const currentTs = getCurrentTimestamp();
    const max = apData.max || 130;
    const current = apData.current || 0;
    const completeRecoveryTime = apData.completeRecoveryTime || 0;

    // 基于Kotlin代码的逻辑
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

    // 计算实际当前理智：最大理智 - (剩余恢复时间 / 6分钟 + 1)
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
   * 将秒数转换为易读的时间格式
   * @param recoveryTs - 恢复完成时间戳（秒级）
   * @returns 格式化的时间字符串（如"2小时30分钟"）
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
   * 格式化任务进度（已完成/总数）
   * 根据实际数据结构使用 current/total 字段
   */
  const formatTaskProgress = (task?: any) => {
    if (!task) return '0/0';

    // 根据实际数据结构，使用 current/total 字段
    const completed = task.current || 0;
    const total = task.total || 0;

    return `${completed}/${total}`;
  };

  /**
   * 从秒数格式化恢复时间
   * 将秒数转换为易读的时间格式（小时和分钟）
   * @param seconds - 剩余秒数
   * @returns 格式化的时间字符串
   */
  const formatRecoveryTimeFromSeconds = (seconds: number) => {
    if (!seconds || seconds <= 0) return '已回满';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) return `${hours}小时${minutes}分钟`;
    return `${minutes}分钟`;
  };

  // ========== 计算属性 ==========

  /**
   * 获取干员总数
   * 通过遍历chars数组计算拥有的干员数量
   */
  const getCharCount = computed(() => {
    return playerData.value?.chars?.length || 0;
  });

  /**
   * 获取作战进度显示
   * 根据API文档：全通关时mainStageProgress返回空，其他情况显示最新抵达的关卡
   */
  const getMainStageProgress = computed(() => {
    const status = playerData.value?.status;
    if (!status) return '未知';

    // 如果mainStageProgress为空字符串，表示全通关
    if (status.mainStageProgress === '') {
      return '全部完成';
    }

    // 如果mainStageProgress有值，显示具体的关卡进度
    if (status.mainStageProgress && typeof status.mainStageProgress === 'string') {
      return status.mainStageProgress.trim();
    }

    // 最后回退到默认值
    return '未通关主线';
  });

  /**
   * 获取公开招募刷新次数
   * 显示当前刷新次数和最大次数（0/3）
   */
  const getHireRefreshCount = computed(() => {
    const refreshCount = playerData.value?.building?.hire?.refreshCount || 0;
    return `${refreshCount}/3`;
  });

  /**
   * 获取公开招募位置数量和状态
   * 根据 recruit 数组计算总槽位和正在招募的槽位
   * state: 1=空闲, 2=正在招募, 3=招募完成
   */
  const getHireSlotCount = computed(() => {
    const recruit = playerData.value?.recruit;

    if (!Array.isArray(recruit)) return '0/4';

    const totalSlots = recruit.length;
    const activeSlots = recruit.filter(slot => slot.state === 3).length;

    return `${activeSlots}/${totalSlots} ${activeSlots > 1 ? '招募中' : '空闲'}`;
  });

  /**
   * 获取公开招募完成状态
   * 显示已完成招募的槽位数量
   */
  const getCompletedRecruitCount = computed(() => {
    const recruit = playerData.value?.recruit;

    if (!Array.isArray(recruit)) return '0';

    const completedSlots = recruit.filter(slot => slot.state === 3).length;
    return `${completedSlots}`;
  });

  /**
   * 获取公开招募详细信息
   * 包含每个槽位的状态和完成时间
   */
  const getRecruitDetails = computed(() => {
    const recruit = playerData.value?.recruit;

    if (!Array.isArray(recruit)) return [];

    return recruit.map((slot, index) => {
      let status: string;
      let finishTime = '';

      switch (slot.state) {
        case 1:
          status = '空闲';
          break;
        case 2:
          status = '招募中';
          if (slot.finishTs && slot.finishTs > 0) {
            finishTime = formatTimestamp(slot.finishTs);
          }
          break;
        case 3:
          status = '已完成';
          if (slot.finishTs && slot.finishTs > 0) {
            finishTime = formatTimestamp(slot.finishTs);
          }
          break;
        default:
          status = '未知';
      }

      return {
        slotIndex: index + 1,
        state: slot.state,
        status,
        startTime: slot.startTs > 0 ? formatTimestamp(slot.startTs) : '',
        finishTime,
        startTs: slot.startTs,
        finishTs: slot.finishTs
      };
    });
  });

  /**
   * 获取正在进行的公开招募剩余时间
   */
  const getRecruitRemainingTime = computed(() => {
    const recruit = playerData.value?.recruit;

    if (!Array.isArray(recruit)) return [];

    const currentTime = getCurrentTimestamp();

    return recruit
      .filter(slot => slot.state === 2 && slot.finishTs > currentTime)
      .map(slot => {
        const remainingSeconds = slot.finishTs - currentTime;
        const hours = Math.floor(remainingSeconds / 3600);
        const minutes = Math.floor((remainingSeconds % 3600) / 60);

        return {
          slotIndex: recruit.indexOf(slot) + 1,
          remainingTime: hours > 0 ? `${hours}小时${minutes}分钟` : `${minutes}分钟`,
          remainingSeconds
        };
      });
  });

  /**
   * 获取会客室线索总数
   * 会客室最多可以存放7个线索
   */
  const getClueCount = computed(() => {
    const clueBoard = playerData.value?.building?.meeting?.clue?.board;
    const meetingRoom = playerData.value?.building?.meeting;

    let clueCount = 0;

    if (Array.isArray(clueBoard)) {
      clueCount = clueBoard.reduce((total: number, clue: any) => total + (clue.count || 0), 0);
    } else if (meetingRoom?.ownClues && Array.isArray(meetingRoom.ownClues)) {
      clueCount = meetingRoom.ownClues.length;
    } else if (meetingRoom?.clue?.own && Array.isArray(meetingRoom.clue.own)) {
      clueCount = meetingRoom.clue.own.length;
    }

    return `${clueCount}/7`;
  });

  /**
   * 获取制造站运行状态和货物数量
   */
  const getManufactureStatus = computed(() => {
    const manufactures = playerData.value?.building?.manufactures;

    if (!manufactures || !Array.isArray(manufactures) || manufactures.length === 0) return '0 货物 | 0/0 运行中';

    const totalManufactured = manufactures.reduce((total, mfg) => {
      const remain = mfg.remain || 0;
      return total + (99 - remain);
    }, 0);

    const totalStations = manufactures.length;
    const activeStations = manufactures.filter((mfg: any) => {
      return mfg.completeWorkTime > getCurrentTimestamp();
    }).length;

    return `${totalManufactured} 货物 | ${activeStations}/${totalStations} 运行中`;
  });

  /**
   * 获取贸易站订单数量
   */
  const getTradingOrderCount = computed(() => {
    const tradings = playerData.value?.building?.tradings;

    if (!tradings || !Array.isArray(tradings)) return '0/0 订单';

    let totalStockLimit = 0;
    let totalCurrentStock = 0;

    tradings.forEach((trading: any) => {
      const stockLimit = trading.stockLimit || 0;
      const currentStock = Array.isArray(trading.stock) ? trading.stock.length : 0;

      totalStockLimit += stockLimit;
      totalCurrentStock += currentStock;
    });

    return `${totalCurrentStock}/${totalStockLimit} 订单`;
  });

  /**
   * 获取无人机数量和恢复时间
   */
  const getLaborCount = computed(() => {
    const labor = playerData.value?.building?.labor;
    const current = labor?.value || labor?.count || labor?.current || 0;
    const max = labor?.maxValue || labor?.max || 0;
    const remainSecs = labor?.remainSecs || 0;

    const recoveryTime = formatRecoveryTimeFromSeconds(remainSecs);

    return {
      count: `${current}/${max}`,
      recovery: remainSecs > 0 ? recoveryTime : '已回满',
      remainSecs: remainSecs
    };
  });

  /**
   * 获取宿舍休息人数
   * 宿舍休息人数上限为15人
   */
  const getDormRestCount = computed(() => {
    const dormitories = playerData.value?.building?.dormitories;
    if (!dormitories || !Array.isArray(dormitories)) return '0/15';

    const totalResting = dormitories.reduce((total: number, dorm: any) => {
      const restCount = dorm.restCount || dorm.chars?.length || dorm.characterCount || 0;
      return total + restCount;
    }, 0);

    const actualResting = Math.min(totalResting, 15);

    return `${actualResting}/15`;
  });

  /**
   * 获取训练室状态
   */
  const getTrainingStatus = computed(() => {
    const trainees = playerData.value?.building?.training?.trainee;
    if (!trainees || !Array.isArray(trainees) || trainees.length === 0) return '0/0 训练中';

    const activeCount = trainees.filter((t: any) => t.completeTime > getCurrentTimestamp()).length;
    return `${activeCount}/${trainees.length} 训练中`;
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
   * 获取疲劳干员数量
   */
  const getTiredCharsCount = computed(() => {
    return playerData.value?.building?.tiredChars?.length || 0;
  });

  /**
   * 获取剿灭作战合成玉进度
   */
  const getCampaignReward = computed(() => {
    const reward = playerData.value?.campaign?.reward;
    return `${reward?.current || 0}/${reward?.total || 0}`;
  });

  /**
   * 获取数据增补仪进度
   */
  const getTowerLowerItem = computed(() => {
    const lowerItem = playerData.value?.tower?.reward?.lowerItem;
    return `${lowerItem?.current || 0}/${lowerItem?.total || 0}`;
  });

  /**
   * 获取数据增补条进度
   */
  const getTowerHigherItem = computed(() => {
    const higherItem = playerData.value?.tower?.reward?.higherItem;
    return `${higherItem?.current || 0}/${higherItem?.total || 0}`;
  });

  /**
   * 获取每日任务进度
   */
  const getDailyTaskProgress = computed(() => {
    const daily = playerData.value?.routine?.daily;
    return formatTaskProgress(daily);
  });

  /**
   * 获取每周任务进度
   */
  const getWeeklyTaskProgress = computed(() => {
    const weekly = playerData.value?.routine?.weekly;
    return formatTaskProgress(weekly);
  });

  // ========== 调试功能 ==========

  /**
   * 调试数据函数
   */
  const debugData = () => {
    console.log('=== 完整玩家数据 ===', playerData.value);
    console.log('=== 任务数据 ===', playerData.value?.routine);
    console.log('=== 基建数据 ===', playerData.value?.building);
    console.log('=== 宿舍数据 ===', playerData.value?.building?.dormitories);
    console.log('=== 会客室数据 ===', playerData.value?.building?.meeting);
    console.log('=== 无人机数据 ===', playerData.value?.building?.labor);
    console.log('=== 贸易站数据 ===', playerData.value?.building?.tradings);
    console.log('=== 制造站数据 ===', playerData.value?.building?.manufactures);
    console.log('=== 公招数据 ===', playerData.value?.recruit);
  };

  // ========== 核心方法 ==========

  /**
   * 加载游戏数据核心方法
   * @param refresh - 是否强制刷新（忽略缓存）
   */
  const fetchGameData = async (refresh = false) => {
    if (!refresh && dataCache.value && dataCache.value.data) {
      const currentMs = Date.now();
      const cacheAge = currentMs - dataCache.value.timestamp;
      if (cacheAge < CACHE_DURATION) {
        console.log('使用缓存数据，缓存年龄:', Math.floor(cacheAge / 1000), '秒');
        playerData.value = dataCache.value.data;
        lastUpdateTime.value = currentMs;
        isLoading.value = false;
        debugData();
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

      if (!authStore.isLogin) {
        errorMsg.value = '请先登录账号';
        return;
      }

      console.log('用户已登录，检查绑定角色...');

      if (!authStore.bindingRoles || authStore.bindingRoles.length === 0) {
        console.log('没有绑定角色，正在获取...');
        try {
          await authStore.fetchBindingRoles();
        } catch (error: any) {
          errorMsg.value = '获取角色列表失败: ' + (error.message || '未知错误');
          return;
        }
      }

      console.log(`当前绑定角色数量: ${authStore.bindingRoles.length}`);

      const targetRole = authStore.bindingRoles.find((role: any) => role.isDefault) || authStore.bindingRoles[0];

      if (!targetRole) {
        errorMsg.value = '未找到绑定的游戏角色';
        return;
      }

      console.log(`使用角色: ${targetRole.nickName} (${targetRole.uid})`);

      const data = await AuthAPI.getPlayerData(
        authStore.sklandCred,
        authStore.sklandSignToken,
        targetRole.uid
      );

      console.log('玩家数据获取成功');
      playerData.value = data;
      lastUpdateTime.value = Date.now();

      dataCache.value = {
        data: data,
        timestamp: getCurrentTimestamp() * 1000
      };

      debugData();

      console.log('游戏数据加载完成并已缓存');
    } catch (error: any) {
      console.error('GameData load error:', error);

      const message = error.message || '游戏数据加载失败，请稍后重试';

      if (message.includes('认证失败') || message.includes('401')) {
        errorMsg.value = '登录已过期，请重新登录';
      } else if (message.includes('网络') || message.includes('Network')) {
        errorMsg.value = '网络连接失败，请检查网络设置';
      } else if (message.includes('角色')) {
        errorMsg.value = '未找到游戏角色，请确认账号绑定';
      } else {
        errorMsg.value = message;
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
   * 启动时间更新定时器
   */
  const startTimeUpdate = () => {
    if (timeUpdateInterval) {
      return;
    }

    timeUpdateInterval = setInterval(() => {
      currentTime.value = Math.floor(Date.now() / 1000);
    }, 1000);
  };

  /**
   * 停止时间更新定时器
   */
  const stopTimeUpdate = () => {
    if (timeUpdateInterval) {
      clearInterval(timeUpdateInterval);
      timeUpdateInterval = null;
      console.log('时间更新定时器已清理');
    }
  };

  /**
   * 清除缓存
   */
  const clearCache = () => {
    dataCache.value = undefined;
  };

  // ========== 导出接口 ==========
  return {
    // 状态
    isLoading,
    errorMsg,
    playerData,
    isRefreshing,
    lastUpdateTime,
    currentTime,

    // 计算属性
    getCharCount,
    getMainStageProgress,
    getHireRefreshCount,
    getHireSlotCount,
    getCompletedRecruitCount,
    getRecruitDetails,
    getRecruitRemainingTime,
    getClueCount,
    getManufactureStatus,
    getTradingOrderCount,
    getLaborCount,
    getDormRestCount,
    getTrainingStatus,
    getAssistCharCount,
    getRelicCount,
    getActualApInfo,
    getTiredCharsCount,
    getCampaignReward,
    getTowerLowerItem,
    getTowerHigherItem,
    getDailyTaskProgress,
    getWeeklyTaskProgress,

    // 方法
    fetchGameData,
    refreshData,
    formatTimestamp,
    formatRecoveryTime,
    debugData,
    startTimeUpdate,
    stopTimeUpdate,
    clearCache
  };
});

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { AuthAPI } from '@services/api';
import { useAuthStore } from '@stores/auth';
import { showSuccess, showError } from '@services/toastService';
import { logger } from '@services/logger';

/**
 * 游戏数据状态管理Store
 * 负责玩家游戏数据的获取、缓存和状态管理
 * 包含理智计算、任务进度、基建状态等核心功能
 * 新增用户头像、UID复制等设置相关功能
 */
export const useGameDataStore = defineStore('gameData', () => {
  // ========== 状态定义 ==========
  const isLoading = ref(true);
  const errorMsg = ref('');
  const playerData = ref<any>(null);
  const isRefreshing = ref(false);
  const lastUpdateTime = ref(0);
  const currentTime = ref(Math.floor(Date.now() / 1000));
  const userAvatar = ref('');
  const avatarLoadError = ref(false);

  // ========== 缓存配置 ==========
  const CACHE_DURATION = 5 * 60 * 1000;
  const dataCache = ref<{ data: any; timestamp: number } | null>(null);

  // ========== 依赖注入 ==========
  const authStore = useAuthStore();

  // ========== 定时器 ==========
  let timeUpdateInterval: NodeJS.Timeout | null = null;

  // ========== 工具函数 ==========

  /**
   * 获取当前最新时间戳（秒级）
   * @returns 当前时间戳（秒）
   */
  const getCurrentTimestamp = (): number => {
    return currentTime.value;
  };

  /**
   * 格式化时间戳为本地日期时间
   * @param ts - 时间戳（秒级）
   * @returns 格式化的日期时间字符串
   */
  const formatTimestamp = (ts?: number): string => {
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
  const formatRecoveryTime = (recoveryTs?: number): string => {
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
  const formatTaskProgress = (task?: any): string => {
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
  const formatRecoveryTimeFromSeconds = (seconds: number): string => {
    if (!seconds || seconds <= 0) return '已回满';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) return `${hours}小时${minutes}分钟`;
    return `${minutes}分钟`;
  };

  // ========== 设置相关功能 ==========

  /**
   * 处理CDN图片URL
   * 将相对路径转换为完整的CDN URL
   * @param url - 原始图片URL
   * @returns 处理后的完整URL
   */
  const processImageUrl = (url: string): string => {
    if (!url) return '';

    // 如果已经是完整URL，直接返回
    if (url.startsWith('http')) {
      return url;
    }

    // 如果是相对路径，添加CDN域名
    if (url.startsWith('/')) {
      return `https://web.hycdn.cn${url}`;
    }

    return url;
  };

  /**
   * 获取头像占位符
   * 当头像加载失败时显示用户名的第一个字符
   * @returns 头像占位符字符
   */
  const getAvatarPlaceholder = (): string => {
    if (!authStore.userName) return '👤';

    // 从用户名中提取第一个字符作为占位符
    const firstChar = authStore.userName.charAt(0);
    return firstChar || '👤';
  };

  /**
   * 处理头像加载错误
   * 当头像加载失败时设置错误状态
   */
  const handleAvatarError = (): void => {
    logger.warn('头像加载失败，使用默认占位符');
    avatarLoadError.value = true;
  };

  /**
   * 处理头像加载成功
   * 当头像加载成功时清除错误状态
   */
  const handleAvatarLoad = (): void => {
    logger.debug('头像加载成功');
    avatarLoadError.value = false;
  };

  /**
   * 获取用户头像
   * 从玩家数据中提取并处理头像URL
   */
  const fetchUserAvatar = (): void => {
    if (!authStore.isLogin || !playerData.value?.status?.avatar) {
      userAvatar.value = '';
      avatarLoadError.value = true;
      logger.debug('无法获取用户头像：未登录或没有头像数据');
      return;
    }

    try {
      // 直接从 playerData 中获取头像信息
      const avatarData = playerData.value.status.avatar;
      if (avatarData && avatarData.url) {
        // 处理CDN URL
        userAvatar.value = processImageUrl(avatarData.url);
        avatarLoadError.value = false;
        logger.debug('用户头像URL处理成功', {
          originalUrl: avatarData.url,
          processedUrl: userAvatar.value
        });
      } else {
        userAvatar.value = '';
        avatarLoadError.value = true;
        logger.warn('头像数据不完整', { avatarData });
      }
    } catch (error) {
      logger.error('获取用户头像失败', error);
      userAvatar.value = '';
      avatarLoadError.value = true;
    }
  };

  /**
   * 复制文本到剪贴板的现代化实现
   * 避免使用已弃用的 document.execCommand
   * @param text - 要复制的文本
   * @returns 复制是否成功的Promise
   */
  const copyToClipboard = async (text: string): Promise<boolean> => {
    return logger.performanceAsync('复制到剪贴板', async () => {
      try {
        // 优先使用现代剪贴板API
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
          logger.debug('使用现代剪贴板API复制成功');
          return true;
        } else {
          // 降级方案：使用textarea元素和现代选择API
          const textArea = document.createElement('textarea');
          textArea.value = text;

          // 设置样式确保元素不可见
          textArea.style.position = 'fixed';
          textArea.style.top = '0';
          textArea.style.left = '0';
          textArea.style.width = '2em';
          textArea.style.height = '2em';
          textArea.style.padding = '0';
          textArea.style.border = 'none';
          textArea.style.outline = 'none';
          textArea.style.boxShadow = 'none';
          textArea.style.background = 'transparent';
          textArea.style.opacity = '0';

          document.body.appendChild(textArea);

          try {
            // 使用现代选择API选择文本
            textArea.select();
            textArea.setSelectionRange(0, textArea.value.length);

            // 尝试使用现代剪贴板API
            if (navigator.clipboard) {
              await navigator.clipboard.writeText(text);
              logger.debug('使用降级方案的剪贴板API复制成功');
              return true;
            } else {
              // 如果现代API不可用，提示用户手动复制
              logger.warn('剪贴板API不可用，需要用户手动复制');
              return false;
            }
          } finally {
            // 确保清理DOM元素
            document.body.removeChild(textArea);
          }
        }
      } catch (error) {
        logger.error('复制到剪贴板失败', error);
        return false;
      }
    });
  };

  /**
   * 复制UID到剪贴板
   * 使用现代化的剪贴板API，避免使用已弃用的方法
   * @param uid - 要复制的UID
   */
  const copyUid = async (uid: string): Promise<void> => {
    // 检查UID是否有效
    if (!uid || uid === '未获取') {
      const error = new Error('UID不可用，无法复制');
      logger.warn('复制UID失败', error);
      showError('UID不可用，无法复制');
      return;
    }

    try {
      logger.info('用户尝试复制UID', { uid });

      const success = await copyToClipboard(uid);
      if (success) {
        logger.info('UID复制成功', { uid });
        showSuccess(`已复制 UID ${uid}`);
      } else {
        // 如果复制失败，提供手动复制选项
        logger.warn('UID复制失败，提供手动复制选项');
        showError('复制失败，请手动选择并复制UID');

        // 自动选择文本以便用户手动复制
        const selection = window.getSelection();
        const range = document.createRange();
        const elements = document.querySelectorAll('.uid-value.copyable');
        if (elements.length > 0 && selection) {
          range.selectNodeContents(elements[0] as Node);
          selection.removeAllRanges();
          selection.addRange(range);
          logger.debug('已自动选择UID文本供用户手动复制');
        }
      }
    } catch (error) {
      logger.error('复制UID过程中发生异常', error);
      showError('复制失败，请手动复制UID');
    }
  };

  /**
   * 复制昵称到剪贴板
   * @param nickname - 要复制的昵称
   */
  const copyNickname = async (nickname: string): Promise<void> => {
    // 检查昵称是否有效
    if (!nickname || nickname === '未获取' || nickname === '未知用户') {
      showError('昵称不可用，无法复制');
      return;
    }

    try {
      logger.info('用户尝试复制昵称', { nickname });

      const success = await copyToClipboard(nickname);
      if (success) {
        logger.info('昵称复制成功', { nickname });
        showSuccess(`已复制昵称 ${nickname}`);
      } else {
        logger.warn('昵称复制失败');
        showError('复制失败，请手动复制');
      }
    } catch (error) {
      logger.error('复制昵称过程中发生异常', error);
      showError('复制失败，请手动复制');
    }
  };

  // ========== 计算属性 ==========

  /**
   * 获取游戏内UID
   * 返回默认角色或第一个角色的UID
   */
  const gameUid = computed((): string => {
    if (!authStore.isLogin || !authStore.bindingRoles?.length) {
      return '未获取';
    }

    // 获取默认角色或第一个角色的UID
    const defaultRole = authStore.bindingRoles.find(role => role.isDefault) || authStore.bindingRoles[0];
    return defaultRole?.uid || '未获取';
  });

  /**
   * 获取用户等级
   * 从玩家状态数据中提取等级信息
   */
  const userLevel = computed((): string => {
    if (!authStore.isLogin || !playerData.value?.status) {
      return '未获取';
    }
    return playerData.value.status.level?.toString() || '未获取';
  });

  /**
   * 获取干员总数
   * 通过遍历chars数组计算拥有的干员数量
   */
  const getCharCount = computed((): number => {
    if (!playerData.value?.chars) return 0;
    return Math.max(0, playerData.value.chars.length - 2);
  });

  /**
   * 获取作战进度显示
   * 根据API文档：全通关时mainStageProgress返回空，其他情况显示最新抵达的关卡
   */
  const getMainStageProgress = computed((): string => {
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
  const getHireRefreshCount = computed((): string => {
    const refreshCount = playerData.value?.building?.hire?.refreshCount || 0;
    return `${refreshCount}/3`;
  });

  /**
   * 获取公开招募位置数量和状态
   * 根据 recruit 数组计算总槽位和正在招募的槽位
   * state: 1=空闲, 2=正在招募, 3=招募完成
   */
  const getHireSlotCount = computed((): string => {
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
  const getCompletedRecruitCount = computed((): string => {
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
    const meetingRoom = playerData.value?.building?.meeting;

    if (!meetingRoom) return '已获得线索 0/7 ';

    let clueCount = 0;

    // 方法1：从 clue.board 数组长度获取（根据您的调试数据）
    if (meetingRoom.clue?.board && Array.isArray(meetingRoom.clue.board)) {
      clueCount = meetingRoom.clue.board.length;
    }
    // 方法2：从 ownClues 获取
    else if (meetingRoom.ownClues && Array.isArray(meetingRoom.ownClues)) {
      clueCount = meetingRoom.ownClues.length;
    }
    // 方法3：从 clue.own 获取
    else if (meetingRoom.clue?.own !== undefined) {
      clueCount = meetingRoom.clue.own;
    }

    return `已获得线索 ${clueCount}/7`;
  });

  /**
   * 获取制造站运行状态和货物数量
   */
  const getManufactureStatus = computed((): string => {
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
  const getTradingOrderCount = computed((): string => {
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
   * 计算无人机信息 - 基于Kotlin代码逻辑
   */
  const calculateLaborInfo = (labor: any, currentTs: number) => {
    if (!labor) {
      return {
        current: 0,
        max: 0,
        remainSecs: -1,
        recoverTime: -1
      };
    }

    const max = labor.maxValue || labor.max || 0;
    const laborRemain = labor.remainSecs - (currentTs - labor.lastUpdateTime);

    // 计算当前无人机数量
    let current = 0;
    if (labor.remainSecs === 0) {
      current = labor.value || labor.current || 0;
    } else {
      current = Math.min(
        max,
        Math.floor(
          ((currentTs - labor.lastUpdateTime) * (max - (labor.value || labor.current || 0)) /
            labor.remainSecs + (labor.value || labor.current || 0))
        )
      );
    }

    const remainSecs = laborRemain < 0 ? 0 : laborRemain;
    const recoverTime = labor.remainSecs + labor.lastUpdateTime;

    return {
      current,
      max,
      remainSecs,
      recoverTime
    };
  };

  /**
   * 获取无人机数量和恢复时间
   */
  const getLaborCount = computed(() => {
    const labor = playerData.value?.building?.labor;
    const currentTime = getCurrentTimestamp();

    const laborInfo = calculateLaborInfo(labor, currentTime);

    const recoveryTime = formatRecoveryTimeFromSeconds(laborInfo.remainSecs);

    return {
      count: `${laborInfo.current}/${laborInfo.max}`,
      recovery: laborInfo.remainSecs > 0 ? recoveryTime : '已回满',
      remainSecs: laborInfo.remainSecs,
      recoverTime: laborInfo.recoverTime,
      // 添加原始数据用于调试
      rawData: labor
    };
  });

  /**
   * 获取无人机恢复进度百分比
   */
  const getLaborRecoveryProgress = computed((): number => {
    const labor = playerData.value?.building?.labor;
    const currentTime = getCurrentTimestamp();

    const laborInfo = calculateLaborInfo(labor, currentTime);

    if (laborInfo.max === 0) return 0;
    return Math.min(100, Math.floor((laborInfo.current / laborInfo.max) * 100));
  });

  /**
   * 获取无人机恢复详细信息
   */
  const getLaborRecoveryDetails = computed(() => {
    const labor = playerData.value?.building?.labor;
    const currentTime = getCurrentTimestamp();

    const laborInfo = calculateLaborInfo(labor, currentTime);

    return {
      current: laborInfo.current,
      max: laborInfo.max,
      remainSeconds: laborInfo.remainSecs,
      recoveryPercentage: getLaborRecoveryProgress.value,
      nextRecoveryTime: laborInfo.recoverTime > 0 ? formatTimestamp(laborInfo.recoverTime) : '已满',
      isFull: laborInfo.current >= laborInfo.max,
      isRecovering: laborInfo.remainSecs > 0 && laborInfo.current < laborInfo.max
    };
  });

  /**
   * 获取无人机每小时恢复数量
   */
  const getLaborRecoveryRate = computed((): number => {
    const labor = playerData.value?.building?.labor;
    if (!labor) return 0;

    // 根据游戏机制，无人机每小时恢复 (max - current) / (remainSecs / 3600)
    const laborInfo = calculateLaborInfo(labor, getCurrentTimestamp());

    if (laborInfo.remainSecs <= 0) return 0;

    const hoursRemaining = laborInfo.remainSecs / 3600;
    const dronesToRecover = laborInfo.max - laborInfo.current;

    return hoursRemaining > 0 ? Math.floor(dronesToRecover / hoursRemaining) : 0;
  });

  /**
   * 获取宿舍休息人数
   * 宿舍休息人数上限为15人
   */
  const getDormRestCount = computed((): string => {
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
   * 获取训练室状态 - 分行显示训练干员和协助者名字
   */
  const getTrainingStatus = computed((): string => {
    const training = playerData.value?.building?.training;
    if (!training) return '未配置训练室';

    const trainee = training.trainee;
    const trainer = training.trainer;

    if (!trainee && !trainer) return '训练室空闲';

    // 获取角色信息映射表
    const charInfoMap = playerData.value?.charInfoMap;

    let result = '';

    // 处理训练干员
    if (trainee && trainee.charId) {
      const traineeInfo = charInfoMap?.[trainee.charId];
      const traineeName = traineeInfo?.name || trainee.charId;
      result += `训练干员：${traineeName}`;
    }

    // 处理协助者
    if (trainer && trainer.charId) {
      const trainerInfo = charInfoMap?.[trainer.charId];
      const trainerName = trainerInfo?.name || trainer.charId;
      if (result) {
        result += `\n协助干员：${trainerName}`;
      } else {
        result += `协助干员：${trainerName}`;
      }
    }

    return result || '训练室配置异常';
  });

  /**
   * 获取训练室详细信息
   */
  const getTrainingDetails = computed(() => {
    const training = playerData.value?.building?.training;
    if (!training) return null;

    const trainee = training.trainee;
    const trainer = training.trainer;
    const charInfoMap = playerData.value?.charInfoMap;

    const details: {
      trainee?: { charId: string; name: string; originalData: any };
      trainer?: { charId: string; name: string; originalData: any };
    } = {};

    // 处理训练干员信息
    if (trainee && trainee.charId) {
      const traineeInfo = charInfoMap?.[trainee.charId];
      details.trainee = {
        charId: trainee.charId,
        name: traineeInfo?.name || trainee.charId,
        originalData: trainee
      };
    }

    // 处理协助者信息
    if (trainer && trainer.charId) {
      const trainerInfo = charInfoMap?.[trainer.charId];
      details.trainer = {
        charId: trainer.charId,
        name: trainerInfo?.name || trainer.charId,
        originalData: trainer
      };
    }

    return details;
  });

  /**
   * 获取训练室状态（简版）- 用于卡片显示，分行显示
   */
  const getTrainingSimpleStatus = computed((): string => {
    const details = getTrainingDetails.value;
    if (!details) return '训练室空闲';

    const traineeName = details.trainee?.name || '无';
    const trainerName = details.trainer?.name || '无';

    return `训练干员：${traineeName}\n协助干员：${trainerName}`;
  });

  /**
   * 获取训练室状态（HTML格式）- 用于支持HTML渲染的组件
   */
  const getTrainingHtmlStatus = computed((): string => {
    const details = getTrainingDetails.value;
    if (!details) return '训练室空闲';

    const traineeName = details.trainee?.name || '无';
    const trainerName = details.trainer?.name || '无';

    return `<p>训练干员：</p>${traineeName}<br> <p>协助干员：</p>${trainerName}`;
  });

  /**
   * 检查训练室是否正在运行
   */
  const isTrainingActive = computed((): boolean => {
    const training = playerData.value?.building?.training;
    if (!training) return false;

    const trainee = training.trainee;
    return !!(trainee && trainee.charId);
  });

  /**
   * 获取干员头像URL
   * @param charId 干员ID
   * @param evolvePhase 精英阶段
   * @returns 干员头像URL
   */
  const getOperatorAvatarUrl = (charId: string, evolvePhase: number): string => {
    if (!charId) return '';

    // 基础CDN URL
    const baseUrl = 'https://raw.githubusercontent.com/yuanyan3060/ArknightsGameResource/main/avatar';

    let avatarFileName = charId;

    // 根据精英阶段判断头像文件名
    // 精英阶段0和1使用基础头像，精英阶段2使用精英二头像
    if (evolvePhase === 2) {
      // 精英二头像文件名格式：charId + '_2'
      avatarFileName = `${charId}_2`;
    }
    // 精英阶段0和1使用基础头像，不需要修改文件名

    // 构建完整的头像URL
    const avatarUrl = `${baseUrl}/${avatarFileName}.png`;

    logger.debug('生成干员头像URL', {
      charId,
      evolvePhase,
      avatarFileName,
      avatarUrl
    });

    return avatarUrl;
  };

  /**
   * 处理干员头像加载错误
   * @param charId 干员ID
   * @param event 错误事件
   */
  const handleOperatorAvatarError = (charId: string, event: Event): void => {
    const imgElement = event.target as HTMLImageElement;
    logger.warn('干员头像加载失败', {
      charId,
      imgSrc: imgElement.src
    });

    // 可以在这里设置默认头像或错误处理
    // 目前只是记录日志，保持原有显示
  };

  /**
   * 处理干员头像加载成功
   * @param charId 干员ID
   */
  const handleOperatorAvatarLoad = (charId: string): void => {
    logger.debug('干员头像加载成功', { charId });
  };

  /**
   * 获取助战干员详细信息（每个干员作为独立对象）
   */
  const getAssistCharDetails = computed(() => {
    const assistChars = playerData.value?.assistChars;

    if (!Array.isArray(assistChars) || assistChars.length === 0) {
      return [];
    }

    const charInfoMap = playerData.value?.charInfoMap;

    return assistChars.map((char: any) => {
      const charInfo = charInfoMap?.[char.charId];
      const charName = charInfo?.name || char.charId;

      // 处理精英阶段显示
      let evolvePhaseText = '';
      if (char.evolvePhase === 1) {
        evolvePhaseText = '精一';
      } else if (char.evolvePhase === 2) {
        evolvePhaseText = '精二';
      }

      // 处理技能信息
      let skillText = '';
      let skillNumber = '1';
      if (char.skillId) {
        // 从skillId中提取技能编号，如 "skchr_wisdel_3" 中的 3
        const skillMatch = char.skillId.match(/_(\d+)$/);
        skillNumber = skillMatch ? skillMatch[1] : '1';
        skillText = `${skillNumber}技能 ${char.mainSkillLvl || 1}级`;
      } else {
        skillText = `1技能 ${char.mainSkillLvl || 1}级`;
      }

      // 处理潜能等级
      const potentialText = char.potentialRank > 0 ? `潜${char.potentialRank}` : '';

      // 处理模组等级
      let moduleText = '';
      if (char.specializeLevel > 0) {
        moduleText = `模组${char.specializeLevel}级`;
      }

      // 获取干员头像URL
      const avatarUrl = getOperatorAvatarUrl(char.charId, char.evolvePhase || 0);

      return {
        charId: char.charId,
        name: charName,
        level: char.level || 0,
        evolvePhase: char.evolvePhase || 0,
        evolvePhaseText,
        skillId: char.skillId || '',
        skillNumber,
        skillText,
        mainSkillLvl: char.mainSkillLvl || 1,
        potentialRank: char.potentialRank || 0,
        potentialText,
        specializeLevel: char.specializeLevel || 0,
        moduleText,
        skinId: char.skinId || '',
        avatarUrl, // 添加头像URL
        originalData: char
      };
    });
  });
  /**
   * 获取助战干员数量
   */
  const getAssistCharCount = computed((): number => {
    return playerData.value?.assistChars?.length || 0;
  });

  /**
   * 获取助战干员状态（数组格式）- 每个干员独立显示
   */
  const getAssistCharArrayStatus = computed((): any[] => {
    const details = getAssistCharDetails.value;
    if (details.length === 0) return [{ name: '无助战干员', level: '', skill: '', avatarUrl: '' }];

    return details.map(char => {
      const levelText = char.evolvePhaseText ? `${char.evolvePhaseText} ${char.level}级` : `${char.level}级`;
      const potentialText = char.potentialText ? ` ${char.potentialText}` : '';
      const moduleText = char.moduleText ? ` ${char.moduleText}` : '';

      return {
        name: char.name,
        level: `${levelText}${potentialText}`,
        skill: `${char.skillText}${moduleText}`,
        fullInfo: `${char.name} ${levelText}${potentialText} ${char.skillText}${moduleText}`,
        avatarUrl: char.avatarUrl, // 添加头像URL
        charId: char.charId, // 添加charId用于错误处理
        evolvePhase: char.evolvePhase, // 添加精英阶段
        rawData: char
      };
    });
  });

  /**
   * 获取收藏品数量（肉鸽）
   */
  const getRelicCount = computed((): number => {
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
  const getTiredCharsCount = computed((): number => {
    return playerData.value?.building?.tiredChars?.length || 0;
  });

  /**
   * 获取剿灭作战合成玉进度
   */
  const getCampaignReward = computed((): string => {
    const reward = playerData.value?.campaign?.reward;
    return `${reward?.current || 0}/${reward?.total || 0}`;
  });

  /**
   * 获取数据增补仪进度
   */
  const getTowerLowerItem = computed((): string => {
    const lowerItem = playerData.value?.tower?.reward?.lowerItem;
    return `${lowerItem?.current || 0}/${lowerItem?.total || 0}`;
  });

  /**
   * 获取数据增补条进度
   */
  const getTowerHigherItem = computed((): string => {
    const higherItem = playerData.value?.tower?.reward?.higherItem;
    return `${higherItem?.current || 0}/${higherItem?.total || 0}`;
  });

  /**
   * 获取每日任务进度
   */
  const getDailyTaskProgress = computed((): string => {
    const daily = playerData.value?.routine?.daily;
    return formatTaskProgress(daily);
  });

  /**
   * 获取每周任务进度
   */
  const getWeeklyTaskProgress = computed((): string => {
    const weekly = playerData.value?.routine?.weekly;
    return formatTaskProgress(weekly);
  });

  // ========== 调试功能 ==========

  /**
   * 调试数据函数
   */
  const debugData = (): void => {
    logger.debug('=== 完整玩家数据 ===', playerData.value);
    logger.debug('=== 任务数据 ===', playerData.value?.routine);
    logger.debug('=== 基建数据 ===', playerData.value?.building);
    logger.debug('=== 宿舍数据 ===', playerData.value?.building?.dormitories);
    logger.debug('=== 会客室数据 ===', playerData.value?.building?.meeting);
    logger.debug('=== 无人机数据 ===', playerData.value?.building?.labor);
    logger.debug('=== 贸易站数据 ===', playerData.value?.building?.tradings);
    logger.debug('=== 制造站数据 ===', playerData.value?.building?.manufactures);
    logger.debug('=== 公招数据 ===', playerData.value?.recruit);
  };

  // ========== 核心方法 ==========

  /**
   * 加载游戏数据核心方法
   * @param refresh - 是否强制刷新（忽略缓存）
   */
  const fetchGameData = async (refresh = false): Promise<void> => {
    return logger.performanceAsync('加载游戏数据', async () => {
      // 缓存检查逻辑
      if (!refresh && dataCache.value && dataCache.value.data) {
        const currentMs = Date.now();
        const cacheAge = currentMs - dataCache.value.timestamp;
        if (cacheAge < CACHE_DURATION) {
          const cacheAgeSeconds = Math.floor(cacheAge / 1000);
          logger.debug('使用缓存数据', {
            cacheAge: cacheAgeSeconds,
            cacheDuration: CACHE_DURATION / 1000
          });
          playerData.value = dataCache.value.data;
          lastUpdateTime.value = currentMs;
          // 数据加载成功后更新头像
          fetchUserAvatar();
          isLoading.value = false;
          debugData();
          return;
        }
      }

      if (refresh) {
        isRefreshing.value = true;
        logger.info('手动刷新游戏数据');
      } else {
        isLoading.value = true;
        logger.info('开始加载游戏数据');
      }
      errorMsg.value = '';

      try {
        logger.debug('检查用户登录状态');
        if (!authStore.isLogin) {
          errorMsg.value = '请先登录账号';
          logger.warn('未登录状态下尝试获取游戏数据');
          return;
        }

        logger.debug('检查绑定角色列表');
        if (!authStore.bindingRoles || authStore.bindingRoles.length === 0) {
          logger.info('没有绑定角色，正在获取角色列表...');
          try {
            await authStore.fetchBindingRoles();
            logger.info('角色列表获取成功');
          } catch (error: any) {
            errorMsg.value = '获取角色列表失败: ' + (error.message || '未知错误');
            logger.error('获取角色列表失败', error);
            return;
          }
        }

        const roleCount = authStore.bindingRoles.length;
        logger.debug(`当前绑定角色数量: ${roleCount}`);

        const targetRole = authStore.bindingRoles.find((role: any) => role.isDefault) || authStore.bindingRoles[0];

        if (!targetRole) {
          errorMsg.value = '未找到绑定的游戏角色';
          logger.error('未找到绑定的游戏角色');
          return;
        }

        logger.info(`使用角色获取数据`, {
          name: targetRole.nickName,
          uid: targetRole.uid
        });

        const data = await AuthAPI.getPlayerData(
          authStore.sklandCred,
          authStore.sklandSignToken,
          targetRole.uid
        );

        logger.info('玩家数据获取成功', {
          hasData: !!data,
          dataKeys: data ? Object.keys(data) : []
        });

        playerData.value = data;
        lastUpdateTime.value = Date.now();

        dataCache.value = {
          data: data,
          timestamp: Date.now()
        };

        // 数据加载成功后更新头像
        fetchUserAvatar();
        debugData();

        logger.debug('游戏数据加载完成并已缓存');

      } catch (error: any) {
        const message = error.message || '游戏数据加载失败，请稍后重试';
        logger.error('游戏数据加载失败', error);

        if (message.includes('认证失败') || message.includes('401')) {
          errorMsg.value = '登录已过期，请重新登录';
          logger.warn('认证失败，需要重新登录');
        } else if (message.includes('网络') || message.includes('Network')) {
          errorMsg.value = '网络连接失败，请检查网络设置';
          logger.warn('网络连接失败');
        } else if (message.includes('角色')) {
          errorMsg.value = '未找到游戏角色，请确认账号绑定';
          logger.warn('未找到游戏角色');
        } else {
          errorMsg.value = message;
          logger.error('未知错误类型', { message });
        }
      } finally {
        isLoading.value = false;
        isRefreshing.value = false;
        logger.debug('游戏数据加载状态已重置', {
          isLoading: isLoading.value,
          isRefreshing: isRefreshing.value
        });
      }
    });
  };

  /**
   * 刷新数据
   */
  const refreshData = async (): Promise<void> => {
    logger.info('用户手动刷新游戏数据');
    await fetchGameData(true);
  };

  /**
   * 启动时间更新定时器
   */
  const startTimeUpdate = (): void => {
    if (timeUpdateInterval) {
      logger.debug('时间更新定时器已在运行');
      return;
    }

    timeUpdateInterval = setInterval(() => {
      currentTime.value = Math.floor(Date.now() / 1000);
    }, 1000);

    logger.info('时间更新定时器已启动');
  };

  /**
   * 停止时间更新定时器
   */
  const stopTimeUpdate = (): void => {
    if (timeUpdateInterval) {
      clearInterval(timeUpdateInterval);
      timeUpdateInterval = null;
      logger.info('时间更新定时器已停止');
    } else {
      logger.debug('时间更新定时器未运行，无需停止');
    }
  };

  /**
   * 清除缓存
   */
  const clearCache = (): void => {
    dataCache.value = null;
    logger.info('游戏数据缓存已清除');
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
    userAvatar,
    avatarLoadError,

    // 计算属性
    gameUid,
    userLevel,
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
    getLaborRecoveryProgress,
    getLaborRecoveryDetails,
    getLaborRecoveryRate,
    getDormRestCount,
    getTrainingStatus,
    getTrainingDetails,
    getTrainingSimpleStatus,
    getTrainingHtmlStatus,
    isTrainingActive,
    // 助战干员相关计算属性
    getAssistCharCount,
    getAssistCharDetails,
    getAssistCharArrayStatus,
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
    clearCache,
    // 设置相关方法
    processImageUrl,
    getAvatarPlaceholder,
    handleAvatarError,
    handleAvatarLoad,
    fetchUserAvatar,
    copyUid,
    copyNickname,
    // 干员头像相关方法
    getOperatorAvatarUrl,
    handleOperatorAvatarError,
    handleOperatorAvatarLoad
  };
});

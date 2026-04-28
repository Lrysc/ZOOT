// ============================================================================
// 主入口文件 - 导出所有内容，保持向后兼容
// ============================================================================

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { AuthAPI } from '@services/api';
import { useAuthStore } from '@stores/auth';
import { logger } from '@services/logger';
import { processImageUrl, getOperatorPortraitUrl, getOperatorAvatarUrl, handleImageError, handleImageLoad } from '@utils/image';
import { copyToClipboard } from '@utils/copy';
import type {
  ApInfo,
  TrainingInfo,
  RecruitInfo,
  HireInfo,
  RecruitSlotDetail,
  TradingDetail,
  ManufactureDetail,
  AssistCharDetail,
  AssistCharStatus,
  DataCache
} from '@types/game';
import type {
  TradingStation,
  TradingsInfo,
  ManufactureStation,
  ManufacturesInfo,
  LaborInfo,
  DormitoriesInfo,
  TiredInfo,
  BuildingEfficiency
} from '@types/building';
import type { PlayerData } from '@types/api';

// 导入子模块
import { createCoreState, isValidPlayerData, isValidCache, getCacheDuration } from './core';
import { createAvatarModule } from './avatar';
import { formatTimestamp as formatTimestampUtil, formatTimeFromSeconds, formatRecoveryTimeFromSeconds, setDateLogger } from '@utils/date';
import { OPERATOR_BUFFS, calculateOperatorBuff, createEfficiencyCache, calculateBuildingEfficiency, getBuildingBuff } from './building';
import { calculateRecruitInfo, calculateHireInfo, getRecruitDetails as calcRecruitDetails, getHireSlotCount as calcHireSlotCount, getHireRefreshCount as calcHireRefreshCount, getCompletedRecruitCount as calcCompletedRecruitCount, getRecruitRemainingTime as calcRecruitRemainingTime } from './recruit';
import { calculateTrainingInfo, getTrainingStatus as calcTrainingStatus, getTrainingSimpleStatus as calcTrainingSimpleStatus } from './training';
import { getAssistCharDetails as calcAssistCharDetails, getAssistCharArrayStatus as calcAssistCharArrayStatus } from './assist';
import { calculateActualAp, getCampaignReward as calcCampaignReward, getDailyTaskProgress as calcDailyTaskProgress, getWeeklyTaskProgress as calcWeeklyTaskProgress, getTowerLowerItem as calcTowerLowerItem, getTowerHigherItem as calcTowerHigherItem, getWeeklyCountdown as calcWeeklyCountdown, getRelicCount as calcRelicCount, getGameUid, getUserLevel as calcUserLevel, getCharCount as calcCharCount, getMainStageProgress as calcMainStageProgress } from './daily';

// 设置日期工具的日志记录器
setDateLogger(logger);

/**
 * 格式化恢复时间
 */
const formatRecoveryTime = (recoveryTs: number | undefined, currentTime: number): string => {
  if (!recoveryTs || recoveryTs <= 0) return '已回满';
  try {
    const diff = recoveryTs - currentTime;
    if (diff <= 0) return '已回满';
    return formatTimeFromSeconds(diff);
  } catch (error) {
    logger.error('格式化恢复时间失败', { recoveryTs, error });
    return '计算中';
  }
};

/**
 * 游戏数据状态管理Store
 */
export const useGameDataStore = defineStore('gameData', () => {
  // ========== 核心状态 ==========
  const core = createCoreState();
  const { isLoading, errorMsg, playerData, isRefreshing, lastUpdateTime, currentTime, dataCache, CACHE_DURATION, apFullNotified, prevApValue, weeklyReminderNotified } = core;

  // ========== 缓存配置 ==========
  const efficiencyCache = createEfficiencyCache();

  // ========== 依赖注入 ==========
  const authStore = useAuthStore();

  // ========== 头像模块 ==========
  const avatar = createAvatarModule(authStore, () => playerData.value);
  const { userAvatar, avatarLoadError, getAvatarPlaceholder, handleAvatarError, handleAvatarLoad, fetchUserAvatar } = avatar;

  // ========== 复制功能 ==========
  const copyUid = async (uid: string): Promise<void> => {
    if (!uid || uid === '未获取') {
      logger.warn('复制UID失败', new Error('UID不可用，无法复制'));
      return;
    }

    try {
      logger.info('用户尝试复制UID', { uid });
      const success = await copyToClipboard(uid, 'UID');
      if (success) {
        logger.info('UID复制成功', { uid });
      } else {
        logger.warn('UID复制失败，提供手动复制选项');
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
    }
  };

  const copyNickname = async (nickname: string): Promise<void> => {
    if (!nickname || nickname === '未获取' || nickname === '未知用户') {
      return;
    }

    try {
      logger.info('用户尝试复制昵称', { nickname });
      await copyToClipboard(nickname, '昵称');
      logger.info('昵称复制成功', { nickname });
    } catch (error) {
      logger.error('复制昵称过程中发生异常', error);
    }
  };

  // ========== 贸易站相关计算 ==========
  const calculateTradingsInfo = (tradingsNode: any[] = []): TradingsInfo => {
    try {
      if (!tradingsNode || !Array.isArray(tradingsNode)) {
        return { isNull: true, current: 0, max: 0, remainSecs: -1, completeTime: -1, tradings: [] };
      }

      const TRADING_CONFIG = {
        BASIC_SPEED_BUFF: 0.01,
        PHASES: [
          { orderSpeed: 1.0, orderLimit: 6, orderRarity: 1 },
          { orderSpeed: 1.0, orderLimit: 8, orderRarity: 2 },
          { orderSpeed: 1.0, orderLimit: 10, orderRarity: 3 }
        ],
        ORDER_TIMES: {
          'O_GOLD': 3600,
          'DEFAULT': 1800
        }
      };

      let stockSum = 0;
      let stockLimitSum = 0;
      let completeTimeAll = -1;
      let remainSecsAll = -1;
      const tradings: TradingStation[] = [];

      tradingsNode.forEach((node, stationIndex) => {
        try {
          if (!node || typeof node !== 'object') {
            logger.warn('跳过无效的贸易站节点', { stationIndex, node });
            return;
          }

          const strategy = node.strategy || 'UNKNOWN';
          const max = node.stockLimit || TRADING_CONFIG.PHASES[0].orderLimit;

          if (!node.completeWorkTime || !node.lastUpdateTime ||
              node.completeWorkTime <= 0 || node.lastUpdateTime <= 0) {
            tradings.push({ strategy, max, current: 0, completeTime: -1, remainSecs: -1 });
            return;
          }

          const chars = Array.isArray(node.chars) ? node.chars : [];
          const { totalSpeedBuff } = calculateBuildingEfficiency(chars, 'TRADING', efficiencyCache);

          const baseTime = TRADING_CONFIG.ORDER_TIMES[strategy] || TRADING_CONFIG.ORDER_TIMES.DEFAULT;
          const speedMultiplier = Math.max(0.1, 1 + totalSpeedBuff);
          const targetPoint = Math.floor(baseTime / speedMultiplier);

          if (targetPoint <= 0) {
            tradings.push({ strategy, max, current: 0, completeTime: -1, remainSecs: -1 });
            return;
          }

          const timeDiff = node.completeWorkTime - node.lastUpdateTime;
          if (timeDiff < 0) {
            tradings.push({ strategy, max, current: 0, completeTime: -1, remainSecs: -1 });
            return;
          }

          const geneStock = Math.floor(timeDiff / targetPoint);
          let stock = Math.max(0, (node.stock?.length || 0) + geneStock);

          if (geneStock > 0 && currentTime.value < node.completeWorkTime) {
            stock = Math.max(0, stock - 1);
          } else if (currentTime.value >= node.completeWorkTime) {
            const additionalStock = Math.floor((currentTime.value - node.completeWorkTime) / targetPoint);
            stock = Math.max(0, Math.min(stock + additionalStock, max));
          }

          stock = Math.min(stock, max);

          let completeTime = -1;
          let remainSecs = -1;

          if (stock < max) {
            const restStock = max - stock;
            if (currentTime.value < node.completeWorkTime) {
              remainSecs = restStock * targetPoint + (node.completeWorkTime - currentTime.value);
              completeTime = currentTime.value + remainSecs;
            } else {
              completeTime = restStock * targetPoint + node.completeWorkTime;
              remainSecs = Math.max(0, completeTime - currentTime.value);
            }
          }

          tradings.push({ strategy, max, current: stock, completeTime, remainSecs });

          stockSum += stock;
          stockLimitSum += max;

          if (completeTime > completeTimeAll) {
            completeTimeAll = completeTime;
            remainSecsAll = remainSecs;
          }
        } catch (nodeError) {
          logger.error('计算单个贸易站信息失败', { node, error: nodeError });
        }
      });

      return { isNull: false, current: stockSum, max: stockLimitSum, remainSecs: remainSecsAll, completeTime: completeTimeAll, tradings };
    } catch (error) {
      logger.error('计算贸易站信息失败', { tradingsNode, error });
      return { isNull: true, current: 0, max: 0, remainSecs: -1, completeTime: -1, tradings: [] };
    }
  };

  // ========== 制造站相关计算 ==========
  const calculateManufacturesInfo = (manufacturesNode: any[] = [], formulaMap: Record<string, any> = {}): ManufacturesInfo => {
    try {
      if (!manufacturesNode || !Array.isArray(manufacturesNode)) {
        return { isNull: true, current: 0, max: 0, remainSecs: -1, completeTime: -1, manufactures: [] };
      }

      const MANUFACTURE_CONFIG = {
        BASIC_BUFF: 0.1,
        INPUT_CAPACITY: 99,
        FORMULAS: {
          '1': { name: '初级作战记录', costPoint: 7200, formulaType: 'F_EXP' },
          '2': { name: '中级作战记录', costPoint: 10800, formulaType: 'F_EXP' },
          '3': { name: '高级作战记录', costPoint: 14400, formulaType: 'F_EXP' },
          '4': { name: '赤金', costPoint: 4320, formulaType: 'F_GOLD' },
          '5': { name: '装置', costPoint: 3600, formulaType: 'F_ASC' },
          '6': { name: '模组', costPoint: 3600, formulaType: 'F_ASC' },
          '13': { name: '源石碎片', costPoint: 3600, formulaType: 'F_DIAMOND' }
        }
      };

      let stockSum = 0;
      let stockLimitSum = 0;
      let completeTimeAll = -1;
      let remainSecsAll = -1;
      const manufactures: ManufactureStation[] = [];

      manufacturesNode.forEach((node, index) => {
        try {
          if (!node || typeof node !== 'object') {
            logger.warn('跳过无效的制造站节点', { index, node });
            return;
          }

          const formulaId = node.formulaId || 'UNKNOWN';
          const formulaInfo = formulaMap[formulaId];
          const weight = formulaInfo?.weight || 1;

          if (!node.capacity || node.capacity <= 0 || weight <= 0) {
            manufactures.push({ formula: formulaId, max: 0, current: 0, completeTime: -1, remainSecs: -1 });
            return;
          }

          const stockLimit = Math.floor(node.capacity / weight);
          const max = Math.max(0, stockLimit);

          let stock = Math.max(0, node.complete || 0);
          let completeTime = -1;
          let remainSecs = -1;

          if (!node.completeWorkTime || !node.lastUpdateTime ||
              node.completeWorkTime <= 0 || node.lastUpdateTime <= 0) {
            manufactures.push({ formula: formulaId, max, current: stock, completeTime: -1, remainSecs: -1 });
            return;
          }

          if (currentTime.value >= node.completeWorkTime) {
            stock = max;
          } else {
            const elapsedTime = currentTime.value - node.lastUpdateTime;
            const totalTime = node.completeWorkTime - node.lastUpdateTime;

            if (totalTime > 0) {
              const chars = Array.isArray(node.chars) ? node.chars : [];
              const { totalSpeedBuff } = calculateBuildingEfficiency(chars, 'MANUFACTURE', efficiencyCache);
              const speed = Math.max(0.1, node.speed || 1);
              const totalBuff = Math.max(0.1, 1 + totalSpeedBuff + (speed - 1));

              const progressRatio = Math.min(1, Math.max(0, elapsedTime / totalTime));
              const currentProduction = Math.floor(progressRatio * max);
              stock = Math.min(Math.max(0, node.complete) + currentProduction, max);
            }

            completeTime = node.completeWorkTime;
            remainSecs = Math.max(0, node.completeWorkTime - currentTime.value);
          }

          stock = Math.min(Math.max(0, stock), max);

          manufactures.push({ formula: formulaId, max, current: stock, completeTime, remainSecs });

          stockLimitSum += stockLimit;
          stockSum += stock;

          completeTimeAll = Math.max(completeTimeAll, completeTime);
          remainSecsAll = Math.max(remainSecsAll, remainSecs);

        } catch (nodeError) {
          logger.error('计算单个制造站信息失败', { node, error: nodeError });
        }
      });

      return { isNull: false, current: stockSum, max: stockLimitSum, remainSecs: remainSecsAll, completeTime: completeTimeAll, manufactures };
    } catch (error) {
      logger.error('计算制造站信息失败', { manufacturesNode, error });
      return { isNull: true, current: 0, max: 0, remainSecs: -1, completeTime: -1, manufactures: [] };
    }
  };

  // ========== 无人机计算 ==========
  const calculateLaborInfo = (labor: any): LaborInfo => {
    try {
      if (!labor) {
        return { current: 0, max: 0, remainSecs: -1, recoverTime: -1 };
      }

      const max = labor.maxValue || labor.max || 0;
      const laborRemain = Math.max(0, labor.remainSecs - (currentTime.value - labor.lastUpdateTime));

      let current = 0;
      if (labor.remainSecs === 0) {
        current = labor.value || labor.current || 0;
      } else {
        current = Math.min(
          max,
          Math.floor(
            ((currentTime.value - labor.lastUpdateTime) * (max - (labor.value || labor.current || 0)) /
              Math.max(1, labor.remainSecs) + (labor.value || labor.current || 0))
          )
        );
      }

      const remainSecs = laborRemain;
      const recoverTime = labor.remainSecs + labor.lastUpdateTime;

      return { current, max, remainSecs, recoverTime };
    } catch (error) {
      logger.error('计算无人机信息失败', { labor, error });
      return { current: 0, max: 0, remainSecs: -1, recoverTime: -1 };
    }
  };

  // ========== 宿舍计算 ==========
  const calculateDormitoriesInfo = (dormitoriesNode: any[] = []): DormitoriesInfo => {
    try {
      if (!dormitoriesNode || !Array.isArray(dormitoriesNode)) {
        return { isNull: true, current: 0, max: 0 };
      }

      let max = 0;
      let value = 0;

      dormitoriesNode.forEach(node => {
        const chars = node.chars || [];
        const speed = (node.level || 0) * 0.1 + 1.5 + (node.comfort || 0) / 2500.0;
        max += chars.length;

        chars.forEach((chr: any) => {
          if (chr.ap === 8640000) {
            value++;
          } else {
            const ap = ((currentTime.value - (chr.lastApAddTime || currentTime.value)) * speed * 100 + (chr.ap || 0));
            if (ap >= 8640000) value++;
          }
        });
      });

      return { isNull: false, current: value, max };
    } catch (error) {
      logger.error('计算宿舍信息失败', { dormitoriesNode, error });
      return { isNull: true, current: 0, max: 0 };
    }
  };

  // ========== 疲劳干员计算 ==========
  const calculateTiredInfo = (building: any): TiredInfo => {
    try {
      if (!building) {
        return { current: 0, remainSecs: -1 };
      }

      let current = building.tiredChars?.length || 0;
      let remainSecs = Number.MAX_SAFE_INTEGER;

      const charList: any[] = [];

      if (building.meeting?.chars) charList.push(...building.meeting.chars);
      if (building.control?.chars) charList.push(...building.control.chars);
      if (building.hire?.chars) charList.push(...building.hire.chars);
      if (building.tradings) {
        building.tradings.forEach((trading: any) => {
          if (trading.chars) charList.push(...trading.chars);
        });
      }
      if (building.manufactures) {
        building.manufactures.forEach((manufacture: any) => {
          if (manufacture.chars) charList.push(...manufacture.chars);
        });
      }
      if (building.powers) {
        building.powers.forEach((power: any) => {
          if (power.chars) charList.push(...power.chars);
        });
      }

      charList.forEach(char => {
        if (char.workTime !== 0 && char.workTime !== undefined && char.workTime !== null) {
          const safeWorkTime = Math.max(1, char.workTime);
          const speed = (8640000 - (char.ap || 0)) / safeWorkTime;
          const safeSpeed = Math.max(0.01, speed);
          const restTime = (char.ap || 0) / safeSpeed;

          if ((currentTime.value - (char.lastApAddTime || currentTime.value)) > restTime) {
            current++;
          } else {
            remainSecs = Math.min(remainSecs, Math.floor(restTime));
          }
        }
      });

      return { current, remainSecs: remainSecs === Number.MAX_SAFE_INTEGER ? -1 : remainSecs };
    } catch (error) {
      logger.error('计算疲劳干员信息失败', { building, error });
      return { current: 0, remainSecs: -1 };
    }
  };

  // ========== 计算属性 ==========
  const gameUid = computed((): string => {
    return getGameUid(authStore.bindingRoles);
  });

  const userLevel = computed((): string => {
    return calcUserLevel(playerData.value?.status);
  });

  const getCharCount = computed((): number => {
    return calcCharCount(playerData.value?.chars);
  });

  const getMainStageProgress = computed((): string => {
    return calcMainStageProgress(playerData.value?.status);
  });

  // 公开招募相关计算属性
  const getRecruitInfo = computed((): RecruitInfo => {
    return calculateRecruitInfo(playerData.value?.recruit || [], currentTime.value);
  });

  const getHireInfo = computed((): HireInfo => {
    return calculateHireInfo(playerData.value?.building?.hire, currentTime.value);
  });

  const getHireSlotCount = computed((): string => {
    return calcHireSlotCount(getRecruitInfo.value);
  });

  const getHireRefreshCount = computed((): string => {
    return calcHireRefreshCount(getHireInfo.value);
  });

  const getCompletedRecruitCount = computed((): string => {
    return calcCompletedRecruitCount(getRecruitInfo.value);
  });

  const getRecruitRemainingTime = computed((): string => {
    return calcRecruitRemainingTime(getRecruitInfo.value);
  });

  const getRecruitDetails = computed((): RecruitSlotDetail[] => {
    return calcRecruitDetails(playerData.value?.recruit, (ts: number) => formatTimestamp(ts, currentTime.value));
  });

  // 贸易站相关计算属性
  const getTradingsInfo = computed((): TradingsInfo => {
    return calculateTradingsInfo(playerData.value?.building?.tradings || []);
  });

  const getTradingOrderCount = computed((): string => {
    const info = getTradingsInfo.value;
    if (info.isNull) return '0/0';
    return `${info.current < 0 ? 0 : info.current}/${info.max}`;
  });

  const getTradingRemainingTime = computed((): string => {
    const info = getTradingsInfo.value;
    if (info.isNull || info.remainSecs <= 0) return '已完成';
    return formatTimeFromSeconds(info.remainSecs);
  });

  const getTradingDetails = computed((): TradingDetail[] => {
    const info = getTradingsInfo.value;
    if (info.isNull) return [];

    return info.tradings.map((trading: TradingStation, index: number): TradingDetail => ({
      stationIndex: index + 1,
      strategy: trading.strategy,
      strategyName: trading.strategy === 'O_GOLD' ? '龙门币订单' : '其他订单',
      current: trading.current,
      max: trading.max,
      progress: trading.max > 0 ? Math.floor((trading.current / trading.max) * 100) : 0,
      remainSecs: trading.remainSecs,
      remainingTime: trading.remainSecs > 0 ? formatTimeFromSeconds(trading.remainSecs) : '已完成',
      completeTime: trading.completeTime > 0 ? formatTimestamp(trading.completeTime, currentTime.value) : '已完成'
    }));
  });

  // 制造站相关计算属性
  const getManufacturesInfo = computed((): ManufacturesInfo => {
    const formulaMap = playerData.value?.manufactureFormulaInfoMap || {};
    return calculateManufacturesInfo(playerData.value?.building?.manufactures || [], formulaMap);
  });

  const getManufactureStatus = computed((): string => {
    const info = getManufacturesInfo.value;
    if (info.isNull) return '0/0';
    return `${info.current}/${info.max} `;
  });

  const getManufactureRemainingTime = computed((): string => {
    const info = getManufacturesInfo.value;
    if (info.isNull || info.remainSecs <= 0) return '已完成';
    return formatTimeFromSeconds(info.remainSecs);
  });

  const getManufactureDetails = computed((): ManufactureDetail[] => {
    const info = getManufacturesInfo.value;
    if (info.isNull) return [];

    return info.manufactures.map((manufacture: ManufactureStation, index: number): ManufactureDetail => ({
      stationIndex: index + 1,
      formula: manufacture.formula,
      current: manufacture.current,
      max: manufacture.max,
      progress: manufacture.max > 0 ? Math.floor((manufacture.current / manufacture.max) * 100) : 0,
      remainSecs: manufacture.remainSecs,
      remainingTime: manufacture.remainSecs > 0 ? formatTimeFromSeconds(manufacture.remainSecs) : '已完成',
      completeTime: manufacture.completeTime > 0 ? formatTimestamp(manufacture.completeTime, currentTime.value) : '已完成'
    }));
  });

  // 训练室相关计算属性
  const getTrainingInfo = computed((): TrainingInfo => {
    const charInfoMap = playerData.value?.charInfoMap || {};
    return calculateTrainingInfo(playerData.value?.building?.training, charInfoMap, currentTime.value);
  });

  const getTrainingStatus = computed((): string => {
    return calcTrainingStatus(getTrainingInfo.value, formatTimeFromSeconds);
  });

  const getTrainingDetails = computed(() => {
    const info = getTrainingInfo.value;
    if (info.isNull) return null;

    const trainingData = playerData.value?.building?.training;

    return {
      trainee: info.trainee,
      trainer: info.trainer,
      traineeCharId: trainingData?.trainee?.charId || '',
      trainerCharId: trainingData?.trainer?.charId || '',
      profession: info.profession,
      targetSkill: info.targetSkill,
      status: info.status,
      remainSecs: info.remainSecs,
      completeTime: info.completeTime,
      totalPoint: info.totalPoint,
      remainPoint: info.remainPoint,
      changeRemainSecsIrene: info.changeRemainSecsIrene,
      changeTimeIrene: info.changeTimeIrene,
      changeRemainSecsLogos: info.changeRemainSecsLogos,
      changeTimeLogos: info.changeTimeLogos
    };
  });

  const getTrainingSimpleStatus = computed((): string => {
    return calcTrainingSimpleStatus(getTrainingInfo.value);
  });

  const isTrainingActive = computed((): boolean => {
    const info = getTrainingInfo.value;
    return !info.isNull && info.status === 1;
  });

  // 助战干员相关计算属性
  const getAssistCharDetails = computed((): AssistCharDetail[] => {
    const charInfoMap = playerData.value?.charInfoMap || {};
    return calcAssistCharDetails(playerData.value?.assistChars, charInfoMap);
  });

  const getAssistCharArrayStatus = computed((): AssistCharStatus[] => {
    return calcAssistCharArrayStatus(getAssistCharDetails.value);
  });

  const getAssistCharCount = computed((): number => {
    return playerData.value?.assistChars?.length || 0;
  });

  const getRelicCount = computed((): number => {
    return calcRelicCount(playerData.value?.rogue);
  });

  // 其他基建相关计算属性
  const getClueCount = computed((): string => {
    try {
      const meetingRoom = playerData.value?.building?.meeting;
      if (!meetingRoom) return '已获得线索 0/7 ';

      let clueCount = 0;
      if (meetingRoom.clue?.board && Array.isArray(meetingRoom.clue.board)) {
        clueCount = meetingRoom.clue.board.length;
      } else if (meetingRoom.ownClues && Array.isArray(meetingRoom.ownClues)) {
        clueCount = meetingRoom.ownClues.length;
      } else if (meetingRoom.clue?.own !== undefined) {
        clueCount = meetingRoom.clue.own;
      }

      return `已获得线索 ${clueCount}/7`;
    } catch (error) {
      logger.error('获取线索数量失败', error);
      return '已获得线索 0/7 ';
    }
  });

  const getLaborCount = computed(() => {
    try {
      const labor = playerData.value?.building?.labor;
      const laborInfo = calculateLaborInfo(labor);
      const recoveryTime = formatTimeFromSeconds(laborInfo.remainSecs);

      return {
        count: `${laborInfo.current}/${laborInfo.max}`,
        recovery: laborInfo.remainSecs > 0 ? recoveryTime : '已回满',
        remainSecs: laborInfo.remainSecs,
        recoverTime: laborInfo.recoverTime
      };
    } catch (error) {
      logger.error('获取无人机数量失败', error);
      return { count: '0/0', recovery: '计算中', remainSecs: -1, recoverTime: -1 };
    }
  });

  const getLaborRecoveryProgress = computed((): number => {
    try {
      const laborInfo = calculateLaborInfo(playerData.value?.building?.labor);
      if (laborInfo.max === 0) return 0;
      return Math.min(100, Math.floor((laborInfo.current / laborInfo.max) * 100));
    } catch (error) {
      logger.error('获取无人机恢复进度失败', error);
      return 0;
    }
  });

  const getDormRestCount = computed((): string => {
    try {
      const info = calculateDormitoriesInfo(playerData.value?.building?.dormitories || []);
      return `${info.current}/${info.max}`;
    } catch (error) {
      logger.error('获取宿舍休息人数失败', error);
      return '0/0';
    }
  });

  const getTiredCharsCount = computed((): number => {
    try {
      const tiredInfo = calculateTiredInfo(playerData.value?.building);
      return tiredInfo.current;
    } catch (error) {
      logger.error('获取疲劳干员数量失败', error);
      return 0;
    }
  });

  const getActualApInfo = computed((): ApInfo => {
    return calculateActualAp(playerData.value?.status?.ap, currentTime.value);
  });

  const getCampaignReward = computed((): string => {
    return calcCampaignReward(playerData.value?.campaign);
  });

  const getDailyTaskProgress = computed((): string => {
    return calcDailyTaskProgress(playerData.value?.routine);
  });

  const getWeeklyTaskProgress = computed((): string => {
    return calcWeeklyTaskProgress(playerData.value?.routine);
  });

  const getTowerLowerItem = computed((): string => {
    return calcTowerLowerItem(playerData.value?.tower);
  });

  const getTowerHigherItem = computed((): string => {
    return calcTowerHigherItem(playerData.value?.tower);
  });

  const getWeeklyCountdown = computed((): string => {
    return calcWeeklyCountdown();
  });

  // ========== 调试功能 ==========
  const debugData = (): void => {
    try {
      logger.debug('=== 完整玩家数据 ===', playerData.value);
      logger.debug('=== 基建数据 ===', playerData.value?.building);
      logger.debug('=== 公开招募数据 ===', playerData.value?.recruit);
      logger.debug('=== 公招刷新数据 ===', playerData.value?.building?.hire);
      logger.debug('=== 贸易站数据 ===', playerData.value?.building?.tradings);
      logger.debug('=== 制造站数据 ===', playerData.value?.building?.manufactures);
      logger.debug('=== 训练室数据 ===', playerData.value?.building?.training);
      logger.debug('=== 助战干员数据 ===', playerData.value?.assistChars);
      logger.debug('=== 计算后的公开招募信息 ===', getRecruitInfo.value);
      logger.debug('=== 计算后的公招刷新信息 ===', getHireInfo.value);
      logger.debug('=== 计算后的贸易站信息 ===', getTradingsInfo.value);
      logger.debug('=== 计算后的制造站信息 ===', getManufacturesInfo.value);
      logger.debug('=== 计算后的训练室信息 ===', getTrainingInfo.value);
      logger.debug('=== 计算后的助战干员信息 ===', getAssistCharDetails.value);
    } catch (error) {
      logger.error('调试数据失败', error);
    }
  };

  // ========== 核心方法 ==========
  const fetchGameData = async (refresh = false): Promise<void> => {
    try {
      if (!refresh && isValidCache(dataCache.value, isValidPlayerData)) {
        const currentMs = Date.now();
        const cacheAge = currentMs - dataCache.value.timestamp;
        if (cacheAge < CACHE_DURATION) {
          const cacheAgeSeconds = Math.floor(cacheAge / 1000);
          logger.debug('使用缓存数据', { cacheAge: cacheAgeSeconds, cacheDuration: CACHE_DURATION / 1000 });
          playerData.value = dataCache.value.data;
          lastUpdateTime.value = currentMs;
          fetchUserAvatar(playerData.value);
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

      logger.debug('检查用户登录状态');
      if (!authStore.isLogin) {
        errorMsg.value = '请先登录账号';
        logger.warn('未登录状态下尝试获取游戏数据');
        return;
      }

      logger.debug('检查绑定角色列表');
      if (!authStore.bindingRoles || authStore.bindingRoles.length === 0) {
        try {
          await authStore.fetchBindingRoles();
        } catch (error: any) {
          errorMsg.value = '获取角色列表失败: ' + (error.message || '未知错误');
          logger.error('获取角色列表失败', error);
          return;
        }
      }

      const targetRole = authStore.bindingRoles.find((role: any) => role.isDefault) || authStore.bindingRoles[0];

      if (!targetRole) {
        errorMsg.value = '未找到绑定的游戏角色';
        logger.error('未找到绑定的游戏角色');
        return;
      }

      const data = await AuthAPI.getPlayerData(
        authStore.sklandCred,
        authStore.sklandSignToken,
        targetRole.uid
      );

      if (!isValidPlayerData(data)) {
        throw new Error('API返回的数据格式不正确');
      }

      logger.debug('玩家数据获取成功', { dataKeys: data ? Object.keys(data) : [] });

      playerData.value = data;
      lastUpdateTime.value = Date.now();

      dataCache.value = { data: data, timestamp: Date.now() };

      fetchUserAvatar(playerData.value);
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
      logger.debug('游戏数据加载状态已重置', { isLoading: isLoading.value, isRefreshing: isRefreshing.value });
    }
  };

  const refreshData = async (): Promise<void> => {
    logger.info('用户手动刷新游戏数据');
    await fetchGameData(true);
  };

  const startTimeUpdate = (): void => {
    if (core.timeUpdateInterval) {
      logger.debug('时间更新定时器已在运行');
      return;
    }

    core.timeUpdateInterval = setInterval(() => {
      currentTime.value = Math.floor(Date.now() / 1000);
      checkApFull();
      checkWeeklyReminder();
    }, 1000);

    logger.info('时间更新定时器已启动');
  };

  const checkApFull = (): void => {
    try {
      const apInfo = getActualApInfo.value;

      if (apInfo.max <= 0) {
        return;
      }

      const currentAp = apInfo.current;
      const isApFull = currentAp >= apInfo.max && apInfo.remainSecs <= 0;

      if (isApFull) {
        if (!apFullNotified.value) {
          if (prevApValue.value < apInfo.max) {
            sendApFullNotification();
            apFullNotified.value = true;
            logger.info('理智已达到上限，已发送通知', { current: currentAp, max: apInfo.max });
          }
        }
      } else {
        if (apFullNotified.value) {
          apFullNotified.value = false;
          logger.debug('理智未满，重置通知标志');
        }
      }

      prevApValue.value = currentAp;
    } catch (error) {
      logger.error('检查理智上限状态失败', error);
    }
  };

  const sendApFullNotification = async (): Promise<void> => {
    try {
      const apInfo = getActualApInfo.value;
      const message = `理智已回满！当前理智: ${apInfo.current}/${apInfo.max}`;

      if (window.api?.showNotification) {
        await window.api.showNotification('理智回满提醒', message);
        logger.info('理智上限通知已发送');
      }
    } catch (error) {
      logger.error('发送理智上限通知失败', error);
    }
  };

  const checkWeeklyReminder = (): void => {
    try {
      const weekly = playerData.value?.routine?.weekly;
      const weeklyCompleted = weekly?.current || 0;
      const weeklyTotal = weekly?.total || 0;

      if (weeklyTotal > 0 && weeklyCompleted >= weeklyTotal) {
        if (weeklyReminderNotified.value) {
          weeklyReminderNotified.value = false;
          logger.debug('周常已完成，重置提醒标志');
        }
        return;
      }

      if (weeklyTotal <= 0) {
        return;
      }

      const now = new Date();
      const nextMonday = new Date(now);
      const dayOfWeek = now.getDay();
      const daysUntilMonday = dayOfWeek === 1 ? 7 : (8 - dayOfWeek) % 7;
      nextMonday.setDate(now.getDate() + daysUntilMonday);
      nextMonday.setHours(4, 0, 0, 0);

      const diffMs = nextMonday.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      if (diffHours > 0 && diffHours <= 24 && !weeklyReminderNotified.value) {
        const hours = Math.floor(diffHours);
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        sendWeeklyReminderNotification(hours, minutes);
        weeklyReminderNotified.value = true;
        logger.info('周常刷新提醒已发送', { hours, minutes });
      }

      if (diffHours > 24 && weeklyReminderNotified.value) {
        weeklyReminderNotified.value = false;
        logger.debug('距离周常刷新超过24小时，重置提醒标志');
      }
    } catch (error) {
      logger.error('检查周常刷新提醒失败', error);
    }
  };

  const sendWeeklyReminderNotification = async (hours: number, minutes: number): Promise<void> => {
    try {
      const message = `还剩下${hours}小时${minutes}分剿灭刷新，请记得完成剿灭！`;

      if (window.api?.showNotification) {
        await window.api.showNotification('周常刷新提醒', message);
        logger.info('周常刷新提醒通知已发送', { hours, minutes });
      }
    } catch (error) {
      logger.error('发送周常刷新提醒通知失败', error);
    }
  };

  const stopTimeUpdate = (): void => {
    if (core.timeUpdateInterval) {
      clearInterval(core.timeUpdateInterval);
      core.timeUpdateInterval = null;
      apFullNotified.value = false;
      prevApValue.value = 0;
      weeklyReminderNotified.value = false;
      logger.info('时间更新定时器已停止');
    } else {
      logger.debug('时间更新定时器未运行，无需停止');
    }
  };

  const clearCache = (): void => {
    dataCache.value = null;
    efficiencyCache.clear();
    apFullNotified.value = false;
    prevApValue.value = 0;
    weeklyReminderNotified.value = false;
    logger.info('游戏数据缓存和效率缓存已清除');
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

    // 公开招募相关
    getRecruitInfo,
    getHireInfo,
    getHireSlotCount,
    getHireRefreshCount,
    getCompletedRecruitCount,
    getRecruitRemainingTime,
    getRecruitDetails,

    // 贸易站相关
    getTradingsInfo,
    getTradingOrderCount,
    getTradingRemainingTime,
    getTradingDetails,

    // 制造站相关
    getManufacturesInfo,
    getManufactureStatus,
    getManufactureRemainingTime,
    getManufactureDetails,

    // 训练室相关
    getTrainingInfo,
    getTrainingStatus,
    getTrainingDetails,
    getTrainingSimpleStatus,
    isTrainingActive,

    // 助战干员相关
    getAssistCharCount,
    getAssistCharDetails,
    getAssistCharArrayStatus,
    getRelicCount,

    // 其他基建相关
    getClueCount,
    getLaborCount,
    getLaborRecoveryProgress,
    getDormRestCount,
    getTiredCharsCount,
    getActualApInfo,
    getCampaignReward,
    getDailyTaskProgress,
    getWeeklyTaskProgress,
    getTowerLowerItem,
    getTowerHigherItem,
    getWeeklyCountdown,

    // 方法
    fetchGameData,
    refreshData,
    formatTimestamp: (ts: number) => formatTimestampUtil(ts, { emptyValue: '未知', enableValidation: false }),
    formatRecoveryTime,
    formatRecoveryTimeFromSeconds,
    formatTimeFromSeconds,
    getBuildingBuff: (data: any[], roomType: string) => getBuildingBuff(data, roomType, currentTime.value, efficiencyCache),
    debugData,
    startTimeUpdate,
    stopTimeUpdate,
    clearCache,

    // 基建效率计算
    calculateOperatorBuff,
    calculateBuildingEfficiency: (chars: unknown[], roomType: string) => calculateBuildingEfficiency(chars, roomType, efficiencyCache),

    // 头像相关方法
    processImageUrl,
    getAvatarPlaceholder,
    handleAvatarError,
    handleAvatarLoad,
    fetchUserAvatar: (data: any) => fetchUserAvatar(data),

    // 干员图片相关方法
    getOperatorPortraitUrl,
    getOperatorAvatarUrl,
    handleImageError,
    handleImageLoad,

    // 剪贴板相关方法
    copyUid,
    copyNickname
  };
});

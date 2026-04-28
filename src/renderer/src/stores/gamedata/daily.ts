// ============================================================================
// 理智与日常任务模块
// ============================================================================

import { logger } from '@services/logger';
import type { ApInfo } from '@types/game';
import { formatTimeFromSeconds } from '@utils/date';

/**
 * 计算理智信息
 */
export const calculateActualAp = (
  apData: any,
  currentTime: number
): ApInfo => {
  try {
    if (!apData) return { current: 0, max: 0, remainSecs: -1, recoverTime: -1 };

    const max = apData.max || 130;
    const current = apData.current || 0;
    const completeRecoveryTime = apData.completeRecoveryTime || 0;

    if (current >= max) return { current, max, remainSecs: -1, recoverTime: -1 };
    if (completeRecoveryTime < currentTime) return { current: max, max, remainSecs: -1, recoverTime: -1 };

    const actualCurrent = max - Math.floor((completeRecoveryTime - currentTime) / (60 * 6) + 1);
    const remainSecs = Math.max(0, completeRecoveryTime - currentTime);

    return {
      current: Math.max(0, actualCurrent),
      max,
      remainSecs,
      recoverTime: completeRecoveryTime
    };
  } catch (error) {
    logger.error('计算理智信息失败', { apData, error });
    return { current: 0, max: 0, remainSecs: -1, recoverTime: -1 };
  }
};

/**
 * 获取剿灭作战奖励进度
 */
export const getCampaignReward = (campaign: any): string => {
  try {
    const reward = campaign?.reward;
    return `${reward?.current || 0}/${reward?.total || 0}`;
  } catch (error) {
    logger.error('获取剿灭作战奖励失败', error);
    return '0/0';
  }
};

/**
 * 获取每日任务进度
 */
export const getDailyTaskProgress = (routine: any): string => {
  try {
    const daily = routine?.daily;
    const completed = daily?.current || 0;
    const total = daily?.total || 0;
    return `${completed}/${total}`;
  } catch (error) {
    logger.error('获取每日任务进度失败', error);
    return '0/0';
  }
};

/**
 * 获取每周任务进度
 */
export const getWeeklyTaskProgress = (routine: any): string => {
  try {
    const weekly = routine?.weekly;
    const completed = weekly?.current || 0;
    const total = weekly?.total || 0;
    return `${completed}/${total}`;
  } catch (error) {
    logger.error('获取每周任务进度失败', error);
    return '0/0';
  }
};

/**
 * 获取数据增补仪进度
 */
export const getTowerLowerItem = (tower: any): string => {
  try {
    const lowerItem = tower?.reward?.lowerItem;
    return `${lowerItem?.current || 0}/${lowerItem?.total || 0}`;
  } catch (error) {
    logger.error('获取数据增补仪进度失败', error);
    return '0/0';
  }
};

/**
 * 获取数据增补条进度
 */
export const getTowerHigherItem = (tower: any): string => {
  try {
    const higherItem = tower?.reward?.higherItem;
    return `${higherItem?.current || 0}/${higherItem?.total || 0}`;
  } catch (error) {
    logger.error('获取数据增补条进度失败', error);
    return '0/0';
  }
};

/**
 * 计算距离下周一凌晨4点的剩余时间
 */
export const getWeeklyCountdown = (): string => {
  const now = new Date();
  const nextMonday = new Date(now);
  const dayOfWeek = now.getDay();
  const daysUntilMonday = dayOfWeek === 1 ? 7 : (8 - dayOfWeek) % 7;
  nextMonday.setDate(now.getDate() + daysUntilMonday);
  nextMonday.setHours(4, 0, 0, 0);

  const diff = nextMonday.getTime() - now.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `还有${days}天${hours}小时刷新`;
  if (hours > 0) return `还有${hours}小时${minutes}分钟刷新`;
  return `还有${minutes}分钟刷新`;
};

/**
 * 获取收藏品数量
 */
export const getRelicCount = (rogue: any): number => {
  try {
    return rogue?.relicCnt || 0;
  } catch (error) {
    logger.error('获取收藏品数量失败', error);
    return 0;
  }
};

/**
 * 获取游戏UID
 */
export const getGameUid = (bindingRoles: any[] | undefined): string => {
  try {
    if (!bindingRoles?.length) {
      return '未获取';
    }
    const defaultRole = bindingRoles.find((role: any) => role.isDefault) || bindingRoles[0];
    return defaultRole?.uid || '未获取';
  } catch (error) {
    logger.error('获取游戏UID失败', error);
    return '未获取';
  }
};

/**
 * 获取用户等级
 */
export const getUserLevel = (status: any): string => {
  try {
    return status?.level?.toString() || '未获取';
  } catch (error) {
    logger.error('获取用户等级失败', error);
    return '未获取';
  }
};

/**
 * 获取干员数量
 */
export const getCharCount = (chars: any[] | undefined): number => {
  try {
    if (!chars) return 0;
    return Math.max(0, chars.length - 2);
  } catch (error) {
    logger.error('获取干员数量失败', error);
    return 0;
  }
};

/**
 * 获取主线作战进度
 */
export const getMainStageProgress = (status: any): string => {
  try {
    if (!status) return '未知';
    if (status.mainStageProgress === '') return '全部完成';
    if (status.mainStageProgress && typeof status.mainStageProgress === 'string') {
      const progress = status.mainStageProgress.trim();
      // 移除 "main_" 前缀（如果存在）
      return progress.replace(/^main_/, '');
    }
    return '未通关主线';
  } catch (error) {
    logger.error('获取主线进度失败', error);
    return '未知';
  }
};

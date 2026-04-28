// ============================================================================
// 公开招募模块
// ============================================================================

import { logger } from '@services/logger';
import type { RecruitInfo, HireInfo, RecruitSlotDetail } from '@types/game';
import { formatTimeFromSeconds } from '@utils/date';

/**
 * 计算公开招募信息
 */
export const calculateRecruitInfo = (
  recruitNode: any[] = [],
  currentTime: number
): RecruitInfo => {
  try {
    if (!recruitNode || !Array.isArray(recruitNode)) {
      return { isNull: true, max: 0, complete: 0, remainSecs: -1, completeTime: -1 };
    }

    let unable = 0;
    let complete = 0;
    let maxFinishTs = -1;

    recruitNode.forEach(node => {
      switch (node.state) {
        case 0:
          unable++;
          break;
        case 3:
          complete++;
          break;
        case 2:
          if (node.finishTs) {
            if (node.finishTs < currentTime) {
              complete++;
            }
            maxFinishTs = Math.max(maxFinishTs, node.finishTs);
          }
          break;
      }
    });

    const max = Math.max(0, 4 - unable);
    let remainSecs = -1;
    let completeTime = -1;

    if (maxFinishTs !== -1 && maxFinishTs > currentTime) {
      remainSecs = Math.max(0, maxFinishTs - currentTime);
      completeTime = maxFinishTs;
    }

    return { isNull: false, max, complete, remainSecs, completeTime };
  } catch (error) {
    logger.error('计算公开招募信息失败', { recruitNode, error });
    return { isNull: true, max: 0, complete: 0, remainSecs: -1, completeTime: -1 };
  }
};

/**
 * 计算公招刷新信息
 */
export const calculateHireInfo = (
  hireNode: any,
  currentTime: number
): HireInfo => {
  try {
    if (!hireNode) {
      return { isNull: true, count: 0, max: 3, remainSecs: -1, completeTime: -1 };
    }

    const remainSecs = Math.max(0, hireNode.completeWorkTime - currentTime);

    let count = 0;
    let completeTime = -1;

    if (remainSecs <= 0) {
      completeTime = -1;
      count = Math.min(hireNode.refreshCount + 1, 3);
    } else {
      completeTime = hireNode.completeWorkTime;
      count = hireNode.refreshCount || 0;
    }

    return {
      isNull: false,
      count,
      max: 3,
      remainSecs: remainSecs <= 0 ? -1 : remainSecs,
      completeTime
    };
  } catch (error) {
    logger.error('计算公招刷新信息失败', { hireNode, error });
    return { isNull: true, count: 0, max: 3, remainSecs: -1, completeTime: -1 };
  }
};

/**
 * 获取公开招募详情
 */
export const getRecruitDetails = (
  recruitData: any[] | undefined,
  formatTimestamp: (ts: number) => string
): RecruitSlotDetail[] => {
  try {
    if (!recruitData || !Array.isArray(recruitData)) return [];

    return recruitData.map((slot, index): RecruitSlotDetail => {
      let status: string;
      let finishTime = '';

      switch (slot.state) {
        case 0:
          status = '无法招募';
          break;
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
  } catch (error) {
    logger.error('获取招募详情失败', error);
    return [];
  }
};

/**
 * 获取公招槽位数量
 */
export const getHireSlotCount = (recruitInfo: RecruitInfo): string => {
  if (recruitInfo.isNull) return '0/4';
  return `${recruitInfo.complete}/${recruitInfo.max}`;
};

/**
 * 获取公招刷新次数
 */
export const getHireRefreshCount = (hireInfo: HireInfo): string => {
  return `${hireInfo.count}/${hireInfo.max}`;
};

/**
 * 获取完成招募数量
 */
export const getCompletedRecruitCount = (recruitInfo: RecruitInfo): string => {
  return recruitInfo.isNull ? '0' : `${recruitInfo.complete}`;
};

/**
 * 获取招募剩余时间
 */
export const getRecruitRemainingTime = (recruitInfo: RecruitInfo): string => {
  if (recruitInfo.isNull || recruitInfo.remainSecs <= 0) {
    return '已完成';
  }
  return formatTimeFromSeconds(recruitInfo.remainSecs);
};

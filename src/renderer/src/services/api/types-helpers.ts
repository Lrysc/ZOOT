// ============================================================================
// 类型相关工具函数
// ============================================================================

import type { PlayerData, RoutineData } from '@types/player';
import type { ApInfo } from '@types/player';

/**
 * 计算理智信息
 */
export const calculateApInfo = (playerData: PlayerData): ApInfo => {
  const { current, max, completeRecoveryTime } = playerData.status.ap;
  const currentTime = Math.floor(Date.now() / 1000);
  const remainSecs = Math.max(0, completeRecoveryTime - currentTime);
  const recoverTime = completeRecoveryTime * 1000;

  return {
    current,
    max,
    remainSecs,
    recoverTime
  };
};

/**
 * 获取日常周常任务进度
 */
export const getRoutineProgress = (routine: RoutineData) => {
  const dailyCompleted = routine.daily?.completed || 0;
  const dailyTotal = routine.daily?.total || 0;
  const weeklyCompleted = routine.weekly?.completed || 0;
  const weeklyTotal = routine.weekly?.total || 0;

  return {
    daily: {
      completed: dailyCompleted,
      total: dailyTotal,
      progress: dailyTotal > 0 ? (dailyCompleted / dailyTotal) * 100 : 0
    },
    weekly: {
      completed: weeklyCompleted,
      total: weeklyTotal,
      progress: weeklyTotal > 0 ? (weeklyCompleted / weeklyTotal) * 100 : 0
    }
  };
};

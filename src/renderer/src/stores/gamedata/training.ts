// ============================================================================
// 训练室模块
// ============================================================================

import { logger } from '@services/logger';
import type { TrainingInfo } from '@types/game';

/**
 * 计算训练点数
 */
const getTotalPoint = (computePoint: number): number => {
  try {
    if (computePoint > 86400) return 86400;
    if (computePoint > 57600) return 86400;
    if (computePoint > 43200) return 57600;
    if (computePoint > 28800) return 43200;
    return 28800;
  } catch (error) {
    logger.error('计算训练点数失败', { computePoint, error });
    return 28800;
  }
};

/**
 * 计算训练室信息
 */
export const calculateTrainingInfo = (
  training: any,
  charInfoMap: Record<string, any> = {},
  currentTime: number
): TrainingInfo => {
  try {
    if (!training) {
      return {
        isNull: true,
        traineeIsNull: true,
        trainerIsNull: true,
        status: -1,
        remainSecs: -1,
        completeTime: -1,
        trainee: '',
        trainer: '',
        profession: '',
        targetSkill: 0,
        totalPoint: 1,
        remainPoint: 1,
        changeRemainSecsIrene: -1,
        changeTimeIrene: -1,
        changeRemainSecsLogos: -1,
        changeTimeLogos: -1
      };
    }

    const result: TrainingInfo = {
      isNull: false,
      traineeIsNull: !training.trainee,
      trainerIsNull: !training.trainer,
      status: -1,
      remainSecs: training.remainSecs || -1,
      completeTime: -1,
      trainee: '',
      trainer: '',
      profession: '',
      targetSkill: 0,
      totalPoint: 1,
      remainPoint: 1,
      changeRemainSecsIrene: -1,
      changeTimeIrene: -1,
      changeRemainSecsLogos: -1,
      changeTimeLogos: -1
    };

    if (training.trainee?.charId) {
      const charInfo = charInfoMap[training.trainee.charId];
      if (charInfo) {
        result.trainee = charInfo.name || training.trainee.charId;
        result.profession = charInfo.profession || '';
        result.targetSkill = (training.trainee.targetSkill || 0) + 1;
      }
    }

    if (training.trainer?.charId) {
      const charInfo = charInfoMap[training.trainer.charId];
      if (charInfo) {
        result.trainer = charInfo.name || training.trainer.charId;
      }
    }

    if (training.remainSecs !== undefined && training.remainSecs !== null) {
      result.remainSecs = training.remainSecs;
      result.completeTime = training.remainSecs + currentTime;

      if (training.remainSecs === 0) {
        result.status = 0;
        result.totalPoint = 1;
        result.remainPoint = 0;
      } else if (training.remainSecs === -1) {
        result.status = -1;
        result.totalPoint = 1;
        result.remainPoint = 1;
      } else {
        result.status = 1;
        if (training.speed && training.speed > 0) {
          // 防止除零和负数速度
          const safeSpeed = Math.max(0.01, training.speed);
          result.remainPoint = Math.floor(training.remainSecs * safeSpeed);
          const totalPointCalc = Math.floor(
            ((currentTime - (training.lastUpdateTime || currentTime)) * safeSpeed) + result.remainPoint
          );
          result.totalPoint = getTotalPoint(totalPointCalc);

          const targetPointIrene = (result.profession === "SNIPER" || result.profession === "WARRIOR") ? 24300 : 18900;
          const targetPointLogos = (result.profession === "CASTER" || result.profession === "SUPPORT") ? 24300 : 18900;

          if (result.remainPoint > targetPointIrene) {
            const secs = (result.remainPoint - targetPointIrene) / safeSpeed;
            result.changeRemainSecsIrene = Math.floor(secs);
            result.changeTimeIrene = currentTime + Math.floor(secs);
          }

          if (result.remainPoint > targetPointLogos) {
            const secs = (result.remainPoint - targetPointLogos) / safeSpeed;
            result.changeRemainSecsLogos = Math.floor(secs);
            result.changeTimeLogos = currentTime + Math.floor(secs);
          }
        } else {
          logger.debug('训练速度无效', { speed: training.speed });
          result.remainPoint = 0;
          result.totalPoint = 1;
        }
      }
    }

    return result;
  } catch (error) {
    logger.error('计算训练室信息失败', { training, error });
    return {
      isNull: true,
      traineeIsNull: true,
      trainerIsNull: true,
      status: -1,
      remainSecs: -1,
      completeTime: -1,
      trainee: '',
      trainer: '',
      profession: '',
      targetSkill: 0,
      totalPoint: 1,
      remainPoint: 1,
      changeRemainSecsIrene: -1,
      changeTimeIrene: -1,
      changeRemainSecsLogos: -1,
      changeTimeLogos: -1
    };
  }
};

/**
 * 获取训练室状态文本
 */
export const getTrainingStatus = (
  trainingInfo: TrainingInfo,
  formatTimeFromSeconds: (seconds: number) => string
): string => {
  if (trainingInfo.isNull) return '未配置训练室';
  if (trainingInfo.status === -1) return '训练室空闲';
  if (trainingInfo.status === 0) return '专精训练完成';
  if (trainingInfo.status === 1) return `训练中 - 剩余${formatTimeFromSeconds(trainingInfo.remainSecs)}`;
  return '训练室状态未知';
};

/**
 * 获取训练室简版状态
 */
export const getTrainingSimpleStatus = (trainingInfo: TrainingInfo): string => {
  if (trainingInfo.isNull) return '训练室空闲';
  const traineeName = trainingInfo.trainee || '无';
  const trainerName = trainingInfo.trainer || '无';
  return `训练干员：${traineeName}\n协助干员：${trainerName}`;
};

// ============================================================================
// 基建效率计算模块
// ============================================================================

import { logger } from '@services/logger';
import type { BuildingEfficiency } from '@types/building';

/**
 * 基于官方游戏数据的干员技能配置
 */
export const OPERATOR_BUFFS: Record<string, { level: number; buffs: { buffType: string; buffValue: number }[] }[]> = {
  // 制造站相关干员
  'char_286_cast3': [
    { level: 1, buffs: [{ buffType: 'power_rec_spd', buffValue: 0 }] },
    { level: 30, buffs: [{ buffType: 'manu_formula_spd', buffValue: 0.10 }] }
  ],
  'char_500_noirc': [
    { level: 1, buffs: [{ buffType: 'manu_prod_spd&limit', buffValue: 0.01 }] },
    { level: 30, buffs: [{ buffType: 'trade_ord_spd&limit', buffValue: 0 }] }
  ],
  // 贸易站相关干员
  'char_009_12fce': [
    { level: 1, buffs: [{ buffType: 'meet_spd', buffValue: 0.20 }] },
    { level: 30, buffs: [{ buffType: 'workshop_formula_probability', buffValue: 300 }] }
  ],
  // 通用基建干员
  'char_285_medic2': [
    { level: 1, buffs: [{ buffType: 'power_rec_spd', buffValue: 0 }] },
    { level: 30, buffs: [{ buffType: 'dorm_rec_single', buffValue: 0 }] }
  ],
  'char_501_durin': [
    { level: 1, buffs: [{ buffType: 'dorm_rec_all&oneself', buffValue: 0 }] },
    { level: 30, buffs: [{ buffType: 'dorm_rec_all&oneself', buffValue: 0.01 }] }
  ]
};

/**
 * 基于官方数据的干员技能加成计算
 */
export const calculateOperatorBuff = (
  charId: string,
  roomType: string,
  level: number = 30
): { buffType: string; buffValue: number }[] => {
  // 数据验证
  if (!charId || typeof charId !== 'string') {
    logger.warn('无效的干员ID', { charId });
    return [];
  }

  if (!roomType || typeof roomType !== 'string') {
    logger.warn('无效的房间类型', { roomType });
    return [];
  }

  const operatorData = OPERATOR_BUFFS[charId];
  if (!operatorData) return [];

  // 找到对应等级的技能
  const levelData = operatorData.find(data => level >= data.level);
  if (!levelData) return [];

  // 根据房间类型过滤技能
  return levelData.buffs.filter(buff => {
    if (roomType === 'MANUFACTURE') {
      return buff.buffType.includes('manu') || buff.buffType.includes('power');
    } else if (roomType === 'TRADING') {
      return buff.buffType.includes('trade') || buff.buffType.includes('meet');
    } else if (roomType === 'WORKSHOP') {
      return buff.buffType.includes('workshop');
    }
    return false;
  });
};

/**
 * 基建效率计算缓存
 */
export const createEfficiencyCache = (): Map<string, BuildingEfficiency> => {
  return new Map<string, BuildingEfficiency>();
};

/**
 * 计算基建总效率加成
 */
export const calculateBuildingEfficiency = (
  chars: unknown[],
  roomType: string,
  efficiencyCache: Map<string, BuildingEfficiency>
): BuildingEfficiency => {
  // 数据验证
  if (!chars || !Array.isArray(chars) || chars.length === 0) {
    return { totalSpeedBuff: 0, totalLimitBuff: 0 };
  }

  // 生成缓存键：基于干员ID、等级和房间类型
  const cacheKey = chars
    .map(char => `${char && (char as any).charId || 'unknown'}_${(char && (char as any).level) || 0}`)
    .sort()
    .join('|') + `_${roomType}`;

  // 检查缓存
  if (efficiencyCache.has(cacheKey)) {
    return efficiencyCache.get(cacheKey)!;
  }

  let totalSpeedBuff = 0;
  let totalLimitBuff = 0;

  chars.forEach(char => {
    // 验证干员数据
    if (!char || !(char as any).charId) {
      logger.warn('跳过无效的干员数据', { char });
      return;
    }

    const buffs = calculateOperatorBuff((char as any).charId, roomType, (char as any).level || 30);
    buffs.forEach(buff => {
      if (buff.buffType.includes('spd')) {
        totalSpeedBuff += buff.buffValue;
      }
      if (buff.buffType.includes('limit')) {
        totalLimitBuff += buff.buffValue;
      }
    });
  });

  const result = { totalSpeedBuff, totalLimitBuff };

  // 缓存结果（限制缓存大小）
  if (efficiencyCache.size >= 100) {
    const firstKey = efficiencyCache.keys().next().value;
    if (firstKey) {
      efficiencyCache.delete(firstKey);
    }
  }
  efficiencyCache.set(cacheKey, result);

  return result;
};

/**
 * 统一的buff计算函数
 */
export const getBuildingBuff = (
  data: any[],
  roomType: string,
  currentTime: number,
  efficiencyCache: Map<string, BuildingEfficiency>
): string => {
  try {
    if (!data || !Array.isArray(data)) return '';
    let totalBuff = 0;
    data.forEach(station => {
      const { totalSpeedBuff } = calculateBuildingEfficiency(station.chars || [], roomType, efficiencyCache);
      totalBuff = Math.max(totalBuff, totalSpeedBuff);
    });
    return totalBuff > 0 ? `+${(totalBuff * 100).toFixed(1)}%` : '';
  } catch (error) {
    return '';
  }
};

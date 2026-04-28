// ============================================================================
// 核心模块 - 基础状态、核心方法、数据获取
// ============================================================================

import { ref } from 'vue';
import type { PlayerData, DataCache } from '@types/game';

/**
 * 创建核心状态
 */
export const createCoreState = () => {
  const isLoading = ref(true);
  const errorMsg = ref('');
  const playerData = ref<PlayerData | null>(null);
  const isRefreshing = ref(false);
  const lastUpdateTime = ref(0);
  const currentTime = ref(Math.floor(Date.now() / 1000));

  // 缓存配置
  const CACHE_DURATION = 5 * 60 * 1000;
  const dataCache = ref<DataCache | null>(null);

  // 定时器
  let timeUpdateInterval: NodeJS.Timeout | null = null;

  // 理智上限通知
  const apFullNotified = ref(false);
  const prevApValue = ref(0);

  // 周常刷新提醒
  const weeklyReminderNotified = ref(false);

  return {
    isLoading,
    errorMsg,
    playerData,
    isRefreshing,
    lastUpdateTime,
    currentTime,
    dataCache,
    CACHE_DURATION,
    timeUpdateInterval,
    apFullNotified,
    prevApValue,
    weeklyReminderNotified
  };
};

/**
 * 验证玩家数据格式
 */
export const isValidPlayerData = (data: any): data is PlayerData => {
  return data && typeof data === 'object' && !Array.isArray(data);
};

/**
 * 验证缓存格式
 */
export const isValidCache = (cache: any, isValidPlayerDataFn: (data: any) => data is PlayerData): cache is DataCache => {
  return cache &&
    cache.data &&
    typeof cache.timestamp === 'number' &&
    isValidPlayerDataFn(cache.data);
};

/**
 * 获取缓存时长（毫秒）
 */
export const getCacheDuration = (): number => {
  return 5 * 60 * 1000; // 5分钟
};

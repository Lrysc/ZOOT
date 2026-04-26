import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { AuthAPI } from '@services/api';
import { useAuthStore } from '@stores/auth';
import { logger } from '@services/logger';
import { processImageUrl, getOperatorPortraitUrl, getOperatorAvatarUrl, handleImageError, handleImageLoad } from '@utils/image';
import { copyToClipboard } from '@utils/copy';
import { formatTimestamp as formatTimestampUtil, formatRecoveryTime as formatRecoveryTimeUtil, setDateLogger } from '@utils/date';
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

// 设置日期工具的日志记录器
setDateLogger(logger);

/**
 * 游戏数据状态管理Store
 */
export const useGameDataStore = defineStore('gameData', () => {
  // ========== 状态定义 ==========
  const isLoading = ref(true);
  const errorMsg = ref('');
  const playerData = ref<PlayerData | null>(null);
  const isRefreshing = ref(false);
  const lastUpdateTime = ref(0);
  const currentTime = ref(Math.floor(Date.now() / 1000));
  const userAvatar = ref('');
  const avatarLoadError = ref(false);

  // ========== 缓存配置 ==========
  const CACHE_DURATION = 5 * 60 * 1000;
  const dataCache = ref<DataCache | null>(null);

  // ========== 依赖注入 ==========
  const authStore = useAuthStore();

  // ========== 定时器 ==========
  let timeUpdateInterval: NodeJS.Timeout | null = null;

  // ========== 理智上限通知 ==========
  let apFullNotified = ref(false); // 是否已发送理智上限通知
  let prevApValue = ref(0); // 上一次的理智值，用于检测变化

  // ========== 周常刷新提醒 ==========
  let weeklyReminderNotified = ref(false); // 是否已发送周常刷新提醒

  // ========== 数据验证函数 ==========

  const isValidPlayerData = (data: any): data is PlayerData => {
    return data && typeof data === 'object' && !Array.isArray(data);
  };

  const isValidCache = (cache: any): cache is DataCache => {
    return cache &&
      cache.data &&
      typeof cache.timestamp === 'number' &&
      isValidPlayerData(cache.data);
  };

  // ========== 基建效率计算工具 ==========

  // 基于官方游戏数据的干员技能配置 - 移到函数外部以提高性能
  const OPERATOR_BUFFS = {
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
  const calculateOperatorBuff = (charId: string, roomType: string, level: number = 30): { buffType: string; buffValue: number }[] => {
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
   * 计算基建总效率加成
   */
  // 基建效率计算缓存
  const efficiencyCache = new Map<string, BuildingEfficiency>();

  const calculateBuildingEfficiency = (chars: unknown[], roomType: string): BuildingEfficiency => {
    // 数据验证
    if (!chars || !Array.isArray(chars) || chars.length === 0) {
      return { totalSpeedBuff: 0, totalLimitBuff: 0 };
    }

    // 生成缓存键：基于干员ID、等级和房间类型
    const cacheKey = chars
      .map(char => `${char.charId || 'unknown'}_${char.level || 0}`)
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
      if (!char || !char.charId) {
        logger.warn('跳过无效的干员数据', { char });
        return;
      }

      const buffs = calculateOperatorBuff(char.charId, roomType, char.level || 30);
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
    
    // 缓存结果（限制缓存大小）- 改进缓存清理策略
    if (efficiencyCache.size >= 100) {
      const firstKey = efficiencyCache.keys().next().value;
      if (firstKey) {
        efficiencyCache.delete(firstKey);
      }
    }
    efficiencyCache.set(cacheKey, result);

    return result;
  };

  // ========== 工具函数 ==========

  const getCurrentTimestamp = (): number => {
    return currentTime.value;
  };

  // 使用统一的日期格式化工具，保持空值返回 '未知' 的语义
  const formatTimestamp = (ts?: number): string => {
    return formatTimestampUtil(ts, { emptyValue: '未知', enableValidation: false });
  };

  // ========== 统一的时间格式化工具 ==========

  /**
   * 统一的时间格式化函数
   * @param seconds 秒数
   * @returns 格式化后的时间字符串
   */
  const formatTimeFromSeconds = (seconds: number): string => {
    if (seconds <= 0) return '已完成';
    try {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      if (hours > 0) return `${hours}小时${minutes}分钟`;
      return `${minutes}分钟`;
    } catch (error) {
      logger.error('格式化时间失败', { seconds, error });
      return '计算中';
    }
  };

  const formatRecoveryTimeFromSeconds = formatTimeFromSeconds;

  const formatRecoveryTime = (recoveryTs?: number): string => {
    if (!recoveryTs || recoveryTs <= 0) return '已回满';
    try {
      const now = getCurrentTimestamp();
      const diff = recoveryTs - now;
      if (diff <= 0) return '已回满';
      return formatTimeFromSeconds(diff);
    } catch (error) {
      logger.error('格式化理智恢复时间失败', { recoveryTs, error });
      return '计算中';
    }
  };

  // ========== 统一的buff计算工具 ==========

  /**
   * 统一的buff计算函数
   * @param data 站点数据数组
   * @param roomType 房间类型
   * @returns 格式化后的buff字符串
   */
  const getBuildingBuff = (data: any[], roomType: string): string => {
    try {
      if (!data || !Array.isArray(data)) return '';
      let totalBuff = 0;
      data.forEach(station => {
        const { totalSpeedBuff } = calculateBuildingEfficiency(station.chars || [], roomType);
        totalBuff = Math.max(totalBuff, totalSpeedBuff);
      });
      return totalBuff > 0 ? `+${(totalBuff * 100).toFixed(1)}%` : '';
    } catch (error) {
      return '';
    }
  };

  const getTradingBuff = () => {
    const tradingsData = playerData.value?.building?.tradings || [];
    return getBuildingBuff(tradingsData, 'TRADING');
  };

  const getManufactureBuff = () => {
    const manufacturesData = playerData.value?.building?.manufactures || [];
    return getBuildingBuff(manufacturesData, 'MANUFACTURE');
  };

  // ========== 头像相关功能 ==========

  const getAvatarPlaceholder = (): string => {
    return authStore.userName ? authStore.userName.charAt(0) || '👤' : '👤';
  };

  const handleAvatarError = (): void => {
    logger.warn('头像加载失败，使用默认占位符');
    // 只有当 userAvatar 有值时才设置为错误状态
    // 这样可以避免在 URL 还未设置完成时就显示默认头像
    if (userAvatar.value) {
      avatarLoadError.value = true;
    }
  };

  const handleAvatarLoad = (): void => {
    logger.debug('头像加载成功');
    avatarLoadError.value = false;
  };

  // 头像加载超时定时器
  let avatarLoadTimeout: NodeJS.Timeout | null = null;

  const fetchUserAvatar = (): void => {
    if (!authStore.isLogin) {
      userAvatar.value = '';
      avatarLoadError.value = true;
      logger.debug('无法获取用户头像：用户未登录');
      return;
    }

    try {
      const avatarData = playerData.value?.status?.avatar;
      let url = '';
      
      // 处理 avatar 是对象 { url: string } 的情况
      if (avatarData && typeof avatarData === 'object' && 'url' in avatarData) {
        url = avatarData.url;
      }
      // 处理 avatar 直接是字符串 URL 的情况
      else if (typeof avatarData === 'string') {
        url = avatarData;
      }
      
      // 只有当 URL 有效时才更新头像
      if (url && typeof url === 'string' && url.trim()) {
        const processedUrl = processImageUrl(url);
        // 只有 URL 真正变化了才更新，避免不必要的重新渲染
        if (userAvatar.value !== processedUrl) {
          userAvatar.value = processedUrl;
          avatarLoadError.value = false; // 重置错误状态
          logger.debug('用户头像URL处理成功', {
            originalUrl: url,
            processedUrl: userAvatar.value
          });
          
          // 清除之前的超时定时器
          if (avatarLoadTimeout) {
            clearTimeout(avatarLoadTimeout);
          }
          
          // 设置一个安全超时，如果图片在 5 秒内没有加载成功，则显示默认头像
          avatarLoadTimeout = setTimeout(() => {
            if (avatarLoadError.value && userAvatar.value) {
              logger.warn('头像加载超时，保留当前头像URL');
              // 超时后不清除头像，只是记录日志
            }
          }, 5000);
        }
      } else {
        // 没有头像数据
        userAvatar.value = '';
        avatarLoadError.value = true;
        logger.debug('用户头像数据为空或无效', { avatarData });
      }
    } catch (error) {
      logger.error('获取用户头像失败', error);
      userAvatar.value = '';
      avatarLoadError.value = true;
    }
  };

  // ========== 干员图片相关功能 ==========
  // handleImageError, handleImageLoad 已从 @utils/image 导入

  // ========== 核心计算逻辑 ==========

  const calculateActualAp = (apData: any): ApInfo => {
    try {
      if (!apData) return { current: 0, max: 0, remainSecs: -1, recoverTime: -1 };

      const currentTs = getCurrentTimestamp();
      const max = apData.max || 130;
      const current = apData.current || 0;
      const completeRecoveryTime = apData.completeRecoveryTime || 0;

      if (current >= max) return { current, max, remainSecs: -1, recoverTime: -1 };
      if (completeRecoveryTime < currentTs) return { current: max, max, remainSecs: -1, recoverTime: -1 };

      const actualCurrent = max - Math.floor((completeRecoveryTime - currentTs) / (60 * 6) + 1);
      const remainSecs = Math.max(0, completeRecoveryTime - currentTs);

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

  const calculateTrainingInfo = (training: any, charInfoMap: Record<string, any> = {}): TrainingInfo => {
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

      const currentTs = getCurrentTimestamp();
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
        result.completeTime = training.remainSecs + currentTs;

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
              ((currentTs - (training.lastUpdateTime || currentTs)) * safeSpeed) + result.remainPoint
            );
            result.totalPoint = getTotalPoint(totalPointCalc);

            const targetPointIrene = (result.profession === "SNIPER" || result.profession === "WARRIOR") ? 24300 : 18900;
            const targetPointLogos = (result.profession === "CASTER" || result.profession === "SUPPORT") ? 24300 : 18900;

            if (result.remainPoint > targetPointIrene) {
              const secs = (result.remainPoint - targetPointIrene) / safeSpeed;
              result.changeRemainSecsIrene = Math.floor(secs);
              result.changeTimeIrene = currentTs + Math.floor(secs);
            }

            if (result.remainPoint > targetPointLogos) {
              const secs = (result.remainPoint - targetPointLogos) / safeSpeed;
              result.changeRemainSecsLogos = Math.floor(secs);
              result.changeTimeLogos = currentTs + Math.floor(secs);
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

  const calculateRecruitInfo = (recruitNode: any[] = []): RecruitInfo => {
    try {
      if (!recruitNode || !Array.isArray(recruitNode)) {
        return { isNull: true, max: 0, complete: 0, remainSecs: -1, completeTime: -1 };
      }

      const currentTs = getCurrentTimestamp();
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
              if (node.finishTs < currentTs) {
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

      if (maxFinishTs !== -1 && maxFinishTs > currentTs) {
        remainSecs = Math.max(0, maxFinishTs - currentTs);
        completeTime = maxFinishTs;
      }

      return { isNull: false, max, complete, remainSecs, completeTime };
    } catch (error) {
      logger.error('计算公开招募信息失败', { recruitNode, error });
      return { isNull: true, max: 0, complete: 0, remainSecs: -1, completeTime: -1 };
    }
  };

  const calculateHireInfo = (hireNode: any): HireInfo => {
    try {
      if (!hireNode) {
        return { isNull: true, count: 0, max: 3, remainSecs: -1, completeTime: -1 };
      }

      const currentTs = getCurrentTimestamp();
      const remainSecs = Math.max(0, hireNode.completeWorkTime - currentTs);

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
   * 计算贸易站信息 - 基于官方游戏数据优化
   */
  const calculateTradingsInfo = (tradingsNode: any[] = []): TradingsInfo => {
    try {
      if (!tradingsNode || !Array.isArray(tradingsNode)) {
        return {
          isNull: true,
          current: 0,
          max: 0,
          remainSecs: -1,
          completeTime: -1,
          tradings: []
        };
      }

      const currentTs = getCurrentTimestamp();
      let stockSum = 0;
      let stockLimitSum = 0;
      let completeTimeAll = -1;
      let remainSecsAll = -1;
      const tradings: TradingStation[] = [];

      // 基于官方数据的贸易站配置
      const TRADING_CONFIG = {
        // 贸易站基础参数
        BASIC_SPEED_BUFF: 0.01,
        // 各等级订单限制和稀有度
        PHASES: [
          { orderSpeed: 1.0, orderLimit: 6, orderRarity: 1 },
          { orderSpeed: 1.0, orderLimit: 8, orderRarity: 2 },
          { orderSpeed: 1.0, orderLimit: 10, orderRarity: 3 }
        ],
        // 订单类型基础生产时间（秒）
        ORDER_TIMES: {
          'O_GOLD': 3600,  // 龙门币订单：1小时 = 3600秒
          'DEFAULT': 1800  // 默认订单：30分钟 = 1800秒
        },
        // 多站人力消耗修正 [0, 0, -5, -10]
        MANPOWER_COST_BY_NUM: [0, 0, -5, -10]
      };

      tradingsNode.forEach((node, stationIndex) => {
        try {
          // 数据验证
          if (!node || typeof node !== 'object') {
            logger.warn('跳过无效的贸易站节点', { stationIndex, node });
            return;
          }

          const strategy = node.strategy || 'UNKNOWN';
          const max = node.stockLimit || TRADING_CONFIG.PHASES[0].orderLimit;
          
          // 验证时间戳 - 使用debug级别避免每秒刷屏
          if (!node.completeWorkTime || !node.lastUpdateTime || 
              node.completeWorkTime <= 0 || node.lastUpdateTime <= 0) {
            logger.debug('贸易站时间戳无效', { stationIndex, completeWorkTime: node.completeWorkTime, lastUpdateTime: node.lastUpdateTime });
            tradings.push({ strategy, max, current: 0, completeTime: -1, remainSecs: -1 });
            return;
          }

          // 计算干员技能加成 - 添加数据验证
          const chars = Array.isArray(node.chars) ? node.chars : [];
          const { totalSpeedBuff } = calculateBuildingEfficiency(chars, 'TRADING');
          
          // 根据订单类型确定生产时间，并应用加成 - 防止除零
          const baseTime = TRADING_CONFIG.ORDER_TIMES[strategy] || TRADING_CONFIG.ORDER_TIMES.DEFAULT;
          const speedMultiplier = Math.max(0.1, 1 + totalSpeedBuff); // 防止除零和负数
          const targetPoint = Math.floor(baseTime / speedMultiplier);
          
          // 验证计算结果 - 使用debug级别避免每秒刷屏
          if (targetPoint <= 0) {
            logger.debug('贸易站生产时间计算异常', { stationIndex, strategy, baseTime, totalSpeedBuff, targetPoint });
            tradings.push({ strategy, max, current: 0, completeTime: -1, remainSecs: -1 });
            return;
          }
          
          // 计算当前库存，基于官方算法 - 添加边界检查
          const timeDiff = node.completeWorkTime - node.lastUpdateTime;
          if (timeDiff < 0) {
            logger.debug('贸易站时间差为负数', { stationIndex, completeWorkTime: node.completeWorkTime, lastUpdateTime: node.lastUpdateTime });
            tradings.push({ strategy, max, current: 0, completeTime: -1, remainSecs: -1 });
            return;
          }

          const geneStock = Math.floor(timeDiff / targetPoint);
          let stock = Math.max(0, (node.stock?.length || 0) + geneStock);

          // 处理正在生产的订单 - 优化逻辑
          if (geneStock > 0 && currentTs < node.completeWorkTime) {
            stock = Math.max(0, stock - 1);
          } else if (currentTs >= node.completeWorkTime) {
            const additionalStock = Math.floor((currentTs - node.completeWorkTime) / targetPoint);
            stock = Math.max(0, Math.min(stock + additionalStock, max));
          }

          // 不超过上限
          stock = Math.min(stock, max);

          let completeTime = -1;
          let remainSecs = -1;

          if (stock < max) {
            const restStock = max - stock;
            if (currentTs < node.completeWorkTime) {
              remainSecs = restStock * targetPoint + (node.completeWorkTime - currentTs);
              completeTime = currentTs + remainSecs;
            } else {
              completeTime = restStock * targetPoint + node.completeWorkTime;
              remainSecs = Math.max(0, completeTime - currentTs);
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

      return {
        isNull: false,
        current: stockSum,
        max: stockLimitSum,
        remainSecs: remainSecsAll,
        completeTime: completeTimeAll,
        tradings
      };
    } catch (error) {
      logger.error('计算贸易站信息失败', { tradingsNode, error });
      return {
        isNull: true,
        current: 0,
        max: 0,
        remainSecs: -1,
        completeTime: -1,
        tradings: []
      };
    }
  };

  /**
   * 计算制造站信息 - 基于官方游戏数据优化
   */
  const calculateManufacturesInfo = (manufacturesNode: any[] = [], formulaMap: Record<string, any> = {}): ManufacturesInfo => {
    try {
      if (!manufacturesNode || !Array.isArray(manufacturesNode)) {
        return {
          isNull: true,
          current: 0,
          max: 0,
          remainSecs: -1,
          completeTime: -1,
          manufactures: []
        };
      }

      const currentTs = getCurrentTimestamp();
      let stockSum = 0;
      let stockLimitSum = 0;
      let completeTimeAll = -1;
      let remainSecsAll = -1;
      const manufactures: ManufactureStation[] = [];

      // 基于官方数据的制造站配置
      const MANUFACTURE_CONFIG = {
        // 制造站基础参数
        BASIC_BUFF: 0.1,
        INPUT_CAPACITY: 99,
        REDUCE_TIME_UNIT: 180, // 3分钟
        LABOR_COST_UNIT: 1,
        // 多站人力消耗修正 [0, 0, -5, -10]
        MANPOWER_COST_BY_NUM: [0, 0, -5, -10],
        // 基础配方数据（基于官方数据）
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

      manufacturesNode.forEach((node, index) => {
        try {
          // 数据验证
          if (!node || typeof node !== 'object') {
            logger.warn('跳过无效的制造站节点', { index, node });
            return;
          }

          const formulaId = node.formulaId || 'UNKNOWN';
          const formulaInfo = formulaMap[formulaId];
          const weight = formulaInfo?.weight || 1;
          
          // 验证基础数据 - 使用debug级别避免每秒刷屏
          if (!node.capacity || node.capacity <= 0 || weight <= 0) {
            logger.debug('制造站容量或权重无效', { index, capacity: node.capacity, weight });
            manufactures.push({ 
              formula: formulaId, 
              max: 0, 
              current: 0, 
              completeTime: -1, 
              remainSecs: -1 
            });
            return;
          }
          
          // 基于官方数据的库存上限计算
          const stockLimit = Math.floor(node.capacity / weight);
          const max = Math.max(0, stockLimit);

          let stock = Math.max(0, node.complete || 0);
          let completeTime = -1;
          let remainSecs = -1;

          // 验证时间戳 - 使用debug级别避免每秒刷屏
          if (!node.completeWorkTime || !node.lastUpdateTime || 
              node.completeWorkTime <= 0 || node.lastUpdateTime <= 0) {
            logger.debug('制造站时间戳无效', { index, completeWorkTime: node.completeWorkTime, lastUpdateTime: node.lastUpdateTime });
            manufactures.push({ 
              formula: formulaId, 
              max, 
              current: stock, 
              completeTime: -1, 
              remainSecs: -1 
            });
            return;
          }

          if (currentTs >= node.completeWorkTime) {
            // 已完成
            stock = max;
          } else {
            // 进行中：基于官方生产时间计算
            const elapsedTime = currentTs - node.lastUpdateTime;
            const totalTime = node.completeWorkTime - node.lastUpdateTime;

            if (totalTime > 0) {
              // 计算干员技能加成 - 添加数据验证
              const chars = Array.isArray(node.chars) ? node.chars : [];
              const { totalSpeedBuff } = calculateBuildingEfficiency(chars, 'MANUFACTURE');
              
              // 获取配方信息
              const formulaConfig = MANUFACTURE_CONFIG.FORMULAS[formulaId];
              const baseCostPoint = formulaConfig?.costPoint || 7200;
              
              // 考虑生产速度和干员加成 - 防止除零
              const speed = Math.max(0.1, node.speed || 1);
              const totalBuff = Math.max(0.1, 1 + totalSpeedBuff + (speed - 1)); // 防止除零和负数
              const adjustedCostPoint = Math.floor(baseCostPoint / totalBuff);
              
              // 验证计算结果 - 使用debug级别避免每秒刷屏
              if (adjustedCostPoint <= 0) {
                logger.debug('制造站生产时间计算异常', { index, formulaId, baseCostPoint, totalBuff, adjustedCostPoint });
              } else {
                // 基于官方算法计算当前产量
                const progressRatio = Math.min(1, Math.max(0, elapsedTime / totalTime));
                const currentProduction = Math.floor(progressRatio * max);
                
                // 考虑初始完成数量
                stock = Math.min(Math.max(0, node.complete) + currentProduction, max);
              }
            }

            completeTime = node.completeWorkTime;
            remainSecs = Math.max(0, node.completeWorkTime - currentTs);
          }

          // 确保不超过上限且为非负数
          stock = Math.min(Math.max(0, stock), max);

          manufactures.push({ 
            formula: formulaId, 
            max, 
            current: stock, 
            completeTime, 
            remainSecs 
          });

          stockLimitSum += stockLimit;
          stockSum += stock;

          completeTimeAll = Math.max(completeTimeAll, completeTime);
          remainSecsAll = Math.max(remainSecsAll, remainSecs);

        } catch (nodeError) {
          logger.error('计算单个制造站信息失败', { node, error: nodeError });
        }
      });

      return {
        isNull: false,
        current: stockSum,
        max: stockLimitSum,
        remainSecs: remainSecsAll,
        completeTime: completeTimeAll,
        manufactures
      };
    } catch (error) {
      logger.error('计算制造站信息失败', { manufacturesNode, error });
      return {
        isNull: true,
        current: 0,
        max: 0,
        remainSecs: -1,
        completeTime: -1,
        manufactures: []
      };
    }
  };

  const calculateLaborInfo = (labor: any): LaborInfo => {
    try {
      if (!labor) {
        return { current: 0, max: 0, remainSecs: -1, recoverTime: -1 };
      }

      const currentTs = getCurrentTimestamp();
      const max = labor.maxValue || labor.max || 0;
      const laborRemain = Math.max(0, labor.remainSecs - (currentTs - labor.lastUpdateTime));

      let current = 0;
      if (labor.remainSecs === 0) {
        current = labor.value || labor.current || 0;
      } else {
        current = Math.min(
          max,
          Math.floor(
            ((currentTs - labor.lastUpdateTime) * (max - (labor.value || labor.current || 0)) /
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

  const calculateDormitoriesInfo = (dormitoriesNode: any[] = []): DormitoriesInfo => {
    try {
      if (!dormitoriesNode || !Array.isArray(dormitoriesNode)) {
        return { isNull: true, current: 0, max: 0 };
      }

      const currentTs = getCurrentTimestamp();
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
            const ap = ((currentTs - (chr.lastApAddTime || currentTs)) * speed * 100 + (chr.ap || 0));
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

  const calculateTiredInfo = (building: any): TiredInfo => {
    try {
      if (!building) {
        return { current: 0, remainSecs: -1 };
      }

      const currentTs = getCurrentTimestamp();
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
          // 防止除零和负数工作时间
          const safeWorkTime = Math.max(1, char.workTime);
          const speed = (8640000 - (char.ap || 0)) / safeWorkTime;
          
          // 防止除零和负数速度
          const safeSpeed = Math.max(0.01, speed);
          const restTime = (char.ap || 0) / safeSpeed;

          if ((currentTs - (char.lastApAddTime || currentTs)) > restTime) {
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

  // ========== 复制功能（使用统一工具）==========
  // copyToClipboard 已从 @utils/copy 导入

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

  // ========== 计算属性 ==========

  const gameUid = computed((): string => {
    try {
      if (!authStore.isLogin || !authStore.bindingRoles?.length) {
        return '未获取';
      }
      const defaultRole = authStore.bindingRoles.find((role: any) => role.isDefault) || authStore.bindingRoles[0];
      return defaultRole?.uid || '未获取';
    } catch (error) {
      logger.error('获取游戏UID失败', error);
      return '未获取';
    }
  });

  const userLevel = computed((): string => {
    try {
      if (!authStore.isLogin || !playerData.value?.status) {
        return '未获取';
      }
      return playerData.value.status.level?.toString() || '未获取';
    } catch (error) {
      logger.error('获取用户等级失败', error);
      return '未获取';
    }
  });

  const getCharCount = computed((): number => {
    try {
      if (!playerData.value?.chars) return 0;
      return Math.max(0, playerData.value.chars.length - 2);
    } catch (error) {
      logger.error('获取干员数量失败', error);
      return 0;
    }
  });

//主线作战进度
  const getMainStageProgress = computed((): string => {
    try {
      const status = playerData.value?.status;
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
  });

  // ========== 公开招募相关计算属性 ==========

  const getRecruitInfo = computed((): RecruitInfo => {
    try {
      const recruitData = playerData.value?.recruit;
      return calculateRecruitInfo(recruitData || []);
    } catch (error) {
      logger.error('获取公开招募信息失败', error);
      return { isNull: true, max: 0, complete: 0, remainSecs: -1, completeTime: -1 };
    }
  });

  const getHireInfo = computed((): HireInfo => {
    try {
      const hireData = playerData.value?.building?.hire;
      return calculateHireInfo(hireData);
    } catch (error) {
      logger.error('获取公招刷新信息失败', error);
      return { isNull: true, count: 0, max: 3, remainSecs: -1, completeTime: -1 };
    }
  });

  const getHireSlotCount = computed((): string => {
    try {
      const recruitInfo = getRecruitInfo.value;
      if (recruitInfo.isNull) return '0/4';
      return `${recruitInfo.complete}/${recruitInfo.max}`;
    } catch (error) {
      logger.error('获取公招槽位数量失败', error);
      return '0/4';
    }
  });

  const getHireRefreshCount = computed((): string => {
    try {
      const hireInfo = getHireInfo.value;
      return `${hireInfo.count}/${hireInfo.max}`;
    } catch (error) {
      logger.error('获取公招刷新次数失败', error);
      return '0/3';
    }
  });

  const getCompletedRecruitCount = computed((): string => {
    try {
      const recruitInfo = getRecruitInfo.value;
      return recruitInfo.isNull ? '0' : `${recruitInfo.complete}`;
    } catch (error) {
      logger.error('获取完成招募数量失败', error);
      return '0';
    }
  });

  const getRecruitRemainingTime = computed((): string => {
    try {
      const recruitInfo = getRecruitInfo.value;
      if (recruitInfo.isNull || recruitInfo.remainSecs <= 0) {
        return '已完成';
      }
      return formatRecoveryTimeFromSeconds(recruitInfo.remainSecs);
    } catch (error) {
      logger.error('获取招募剩余时间失败', error);
      return '计算中';
    }
  });

  const getRecruitDetails = computed((): RecruitSlotDetail[] => {
    try {
      const recruitData = playerData.value?.recruit;
      if (!recruitData || !Array.isArray(recruitData)) return [];

      return recruitData.map((slot, index): RecruitSlot => {
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
  });

  // ========== 贸易站相关计算属性 ==========

  const getTradingsInfo = computed((): TradingsInfo => {
    try {
      const tradingsData = playerData.value?.building?.tradings;
      return calculateTradingsInfo(tradingsData || []);
    } catch (error) {
      logger.error('获取贸易站信息失败', error);
      return {
        isNull: true,
        current: 0,
        max: 0,
        remainSecs: -1,
        completeTime: -1,
        tradings: []
      };
    }
  });

  const getTradingOrderCount = computed((): string => {
    try {
      const tradingsInfo = getTradingsInfo.value;
      if (tradingsInfo.isNull) return '0/0';
      return `${tradingsInfo.current < 0 ? 0 : tradingsInfo.current}/${tradingsInfo.max}`;
    } catch (error) {
      logger.error('获取贸易站订单数量失败', error);
      return '0/0';
    }
  });

  const getTradingRemainingTime = computed((): string => {
    try {
      const tradingsInfo = getTradingsInfo.value;
      if (tradingsInfo.isNull || tradingsInfo.remainSecs <= 0) {
        return '已完成';
      }
      return formatRecoveryTimeFromSeconds(tradingsInfo.remainSecs);
    } catch (error) {
      logger.error('获取贸易站剩余时间失败', error);
      return '计算中';
    }
  });

  const getTradingDetails = computed((): TradingDetail[] => {
    try {
      const tradingsInfo = getTradingsInfo.value;
      if (tradingsInfo.isNull) return [];

      return tradingsInfo.tradings.map((trading: TradingStation, index: number): TradingDetail => ({
        stationIndex: index + 1,
        strategy: trading.strategy,
        strategyName: trading.strategy === 'O_GOLD' ? '龙门币订单' : '其他订单',
        current: trading.current,
        max: trading.max,
        progress: trading.max > 0 ? Math.floor((trading.current / trading.max) * 100) : 0,
        remainSecs: trading.remainSecs,
        remainingTime: trading.remainSecs > 0 ? formatRecoveryTimeFromSeconds(trading.remainSecs) : '已完成',
        completeTime: trading.completeTime > 0 ? formatTimestamp(trading.completeTime) : '已完成'
      }));
    } catch (error) {
      logger.error('获取贸易站详情失败', error);
      return [];
    }
  });

  // ========== 制造站相关计算属性 ==========

  const getManufacturesInfo = computed((): ManufacturesInfo => {
    try {
      const manufacturesData = playerData.value?.building?.manufactures;
      const formulaMap = playerData.value?.manufactureFormulaInfoMap || {};
      return calculateManufacturesInfo(manufacturesData || [], formulaMap);
    } catch (error) {
      logger.error('获取制造站信息失败', error);
      return {
        isNull: true,
        current: 0,
        max: 0,
        remainSecs: -1,
        completeTime: -1,
        manufactures: []
      };
    }
  });

  const getManufactureStatus = computed((): string => {
    try {
      const manufacturesInfo = getManufacturesInfo.value;
      if (manufacturesInfo.isNull) return '0/0';

      return `${manufacturesInfo.current}/${manufacturesInfo.max} `;
    } catch (error) {
      logger.error('获取制造站状态失败', error);
      return '0/0';
    }
  });

  const getManufactureRemainingTime = computed((): string => {
    try {
      const manufacturesInfo = getManufacturesInfo.value;
      if (manufacturesInfo.isNull || manufacturesInfo.remainSecs <= 0) {
        return '已完成';
      }
      return formatRecoveryTimeFromSeconds(manufacturesInfo.remainSecs);
    } catch (error) {
      logger.error('获取制造站剩余时间失败', error);
      return '计算中';
    }
  });

  const getManufactureDetails = computed((): ManufactureDetail[] => {
    try {
      const manufacturesInfo = getManufacturesInfo.value;
      if (manufacturesInfo.isNull) return [];

      return manufacturesInfo.manufactures.map((manufacture: ManufactureStation, index: number): ManufactureDetail => ({
        stationIndex: index + 1,
        formula: manufacture.formula,
        current: manufacture.current,
        max: manufacture.max,
        progress: manufacture.max > 0 ? Math.floor((manufacture.current / manufacture.max) * 100) : 0,
        remainSecs: manufacture.remainSecs,
        remainingTime: manufacture.remainSecs > 0 ? formatRecoveryTimeFromSeconds(manufacture.remainSecs) : '已完成',
        completeTime: manufacture.completeTime > 0 ? formatTimestamp(manufacture.completeTime) : '已完成'
      }));
    } catch (error) {
      logger.error('获取制造站详情失败', error);
      return [];
    }
  });

  // ========== 训练室相关计算属性 ==========

  const getTrainingInfo = computed((): TrainingInfo => {
    try {
      const trainingData = playerData.value?.building?.training;
      const charInfoMap = playerData.value?.charInfoMap || {};
      return calculateTrainingInfo(trainingData, charInfoMap);
    } catch (error) {
      logger.error('获取训练室信息失败', error);
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
  });

  const getTrainingStatus = computed((): string => {
    try {
      const trainingInfo = getTrainingInfo.value;
      if (trainingInfo.isNull) return '未配置训练室';
      if (trainingInfo.status === -1) return '训练室空闲';
      if (trainingInfo.status === 0) return '专精训练完成';
      if (trainingInfo.status === 1) return `训练中 - 剩余${formatRecoveryTimeFromSeconds(trainingInfo.remainSecs)}`;
      return '训练室状态未知';
    } catch (error) {
      logger.error('获取训练室状态失败', error);
      return '状态未知';
    }
  });

  const getTrainingDetails = computed(() => {
    try {
      const trainingInfo = getTrainingInfo.value;
      if (trainingInfo.isNull) return null;
      
      // 获取原始训练数据以获取charId
      const trainingData = playerData.value?.building?.training;
      
      return {
        trainee: trainingInfo.trainee,
        trainer: trainingInfo.trainer,
        traineeCharId: trainingData?.trainee?.charId || '',
        trainerCharId: trainingData?.trainer?.charId || '',
        profession: trainingInfo.profession,
        targetSkill: trainingInfo.targetSkill,
        status: trainingInfo.status,
        remainSecs: trainingInfo.remainSecs,
        completeTime: trainingInfo.completeTime,
        totalPoint: trainingInfo.totalPoint,
        remainPoint: trainingInfo.remainPoint,
        changeRemainSecsIrene: trainingInfo.changeRemainSecsIrene,
        changeTimeIrene: trainingInfo.changeTimeIrene,
        changeRemainSecsLogos: trainingInfo.changeRemainSecsLogos,
        changeTimeLogos: trainingInfo.changeTimeLogos
      };
    } catch (error) {
      logger.error('获取训练室详情失败', error);
      return null;
    }
  });

  const getTrainingSimpleStatus = computed((): string => {
    try {
      const trainingInfo = getTrainingInfo.value;
      if (trainingInfo.isNull) return '训练室空闲';
      const traineeName = trainingInfo.trainee || '无';
      const trainerName = trainingInfo.trainer || '无';
      return `训练干员：${traineeName}\n协助干员：${trainerName}`;
    } catch (error) {
      logger.error('获取训练室简版状态失败', error);
      return '训练室空闲';
    }
  });

  const isTrainingActive = computed((): boolean => {
    try {
      const trainingInfo = getTrainingInfo.value;
      return !trainingInfo.isNull && trainingInfo.status === 1;
    } catch (error) {
      logger.error('检查训练室活跃状态失败', error);
      return false;
    }
  });

  // ========== 助战干员相关计算属性 ==========

  const getAssistCharDetails = computed((): AssistCharDetail[] => {
    try {
      const assistChars = playerData.value?.assistChars;
      if (!Array.isArray(assistChars) || assistChars.length === 0) {
        return [];
      }

      const charInfoMap = playerData.value?.charInfoMap || {};

      return assistChars.map((char: any): AssistCharDetail => {
        const charInfo = charInfoMap[char.charId];
        const charName = charInfo?.name || char.charId;

        let evolvePhaseText = '';
        if (char.evolvePhase === 1) {
          evolvePhaseText = '精一';
        } else if (char.evolvePhase === 2) {
          evolvePhaseText = '精二';
        }

        let skillText = '';
        let skillNumber = '1';
        if (char.skillId) {
          const skillMatch = char.skillId.match(/_(\d+)$/);
          skillNumber = skillMatch ? skillMatch[1] : '1';
          skillText = `${skillNumber}技能 ${char.mainSkillLvl || 1}级`;
        } else {
          skillText = `1技能 ${char.mainSkillLvl || 1}级`;
        }

        const potentialText = char.potentialRank > 0 ? `潜${char.potentialRank}` : '';

        let moduleText = '';
        if (char.specializeLevel > 0) {
          moduleText = `模组${char.specializeLevel}级`;
        }

        const portraitUrl = getOperatorPortraitUrl(char.charId, char.evolvePhase || 0);
        const avatarUrl = getOperatorAvatarUrl(char.charId);
        const subProfessionId = charInfo?.subProfessionId || '';
        const profession = charInfo?.profession || '';

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
          subProfessionId,
          profession,
          portraitUrl,
          avatarUrl,
          originalData: char
        };
      });
    } catch (error) {
      logger.error('获取助战干员详情失败', error);
      return [];
    }
  });

  const getAssistCharArrayStatus = computed((): AssistCharStatus[] => {
    try {
      const details = getAssistCharDetails.value;
      if (details.length === 0) return [{
        name: '无助战干员',
        level: '',
        skill: '',
        portraitUrl: '',
        avatarUrl: ''
      }];

      return details.map(char => {
        const levelText = char.evolvePhaseText ? `${char.level}级` : `${char.level}级`;
        const potentialText = char.potentialText ? ` ${char.potentialText}` : '';
        const moduleText = char.moduleText ? ` ${char.moduleText}` : '';

        // 获取技能图标URL - 使用GitHub CDN
        const getSkillIconUrl = (skillId: string): string => {
          if (!skillId) return ''
          return `https://raw.githubusercontent.com/yuanyan3060/ArknightsGameResource/main/skill/skill_icon_${skillId}.png`
        }

        return {
          name: char.name,
          level: char.level,
          skill: char.skillId,
          skillNumber: char.skillNumber,
          skillIconUrl: getSkillIconUrl(char.skillId),
          fullInfo: `${char.name} ${levelText}${potentialText} ${char.skillText}${moduleText}`,
          portraitUrl: char.portraitUrl,
          avatarUrl: char.avatarUrl,
          charId: char.charId,
          evolvePhase: char.evolvePhase,
          subProfessionId: char.subProfessionId,
          profession: char.profession,
          rawData: char,
          potentialRank: char.potentialRank,
          specializeLevel: char.specializeLevel,
          skinId: char.skinId,
          mainSkillLvl: char.mainSkillLvl
        };
      });
    } catch (error) {
      logger.error('获取助战干员数组状态失败', error);
      return [{ name: '获取失败', level: '', skill: '', portraitUrl: '', avatarUrl: '' }];
    }
  });

  const getAssistCharCount = computed((): number => {
    try {
      return playerData.value?.assistChars?.length || 0;
    } catch (error) {
      logger.error('获取助战干员数量失败', error);
      return 0;
    }
  });

  const getRelicCount = computed((): number => {
    try {
      return playerData.value?.rogue?.relicCnt || 0;
    } catch (error) {
      logger.error('获取收藏品数量失败', error);
      return 0;
    }
  });

  // ========== 其他基建相关计算属性 ==========

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
      const recoveryTime = formatRecoveryTimeFromSeconds(laborInfo.remainSecs);

      return {
        count: `${laborInfo.current}/${laborInfo.max}`,
        recovery: laborInfo.remainSecs > 0 ? recoveryTime : '已回满',
        remainSecs: laborInfo.remainSecs,
        recoverTime: laborInfo.recoverTime
      };
    } catch (error) {
      logger.error('获取无人机数量失败', error);
      return {
        count: '0/0',
        recovery: '计算中',
        remainSecs: -1,
        recoverTime: -1
      };
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
      const dormitoriesInfo = calculateDormitoriesInfo(playerData.value?.building?.dormitories || []);
      return `${dormitoriesInfo.current}/${dormitoriesInfo.max}`;
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
    try {
      const apData = playerData.value?.status?.ap;
      return calculateActualAp(apData);
    } catch (error) {
      logger.error('获取实际理智信息失败', error);
      return { current: 0, max: 0, remainSecs: -1, recoverTime: -1 };
    }
  });

  const getCampaignReward = computed((): string => {
    try {
      const reward = playerData.value?.campaign?.reward;
      return `${reward?.current || 0}/${reward?.total || 0}`;
    } catch (error) {
      logger.error('获取剿灭作战奖励失败', error);
      return '0/0';
    }
  });

  const getDailyTaskProgress = computed((): string => {
    try {
      const daily = playerData.value?.routine?.daily;
      const completed = daily?.current || 0;
      const total = daily?.total || 0;
      return `${completed}/${total}`;
    } catch (error) {
      logger.error('获取每日任务进度失败', error);
      return '0/0';
    }
  });

  const getWeeklyTaskProgress = computed((): string => {
    try {
      const weekly = playerData.value?.routine?.weekly;
      const completed = weekly?.current || 0;
      const total = weekly?.total || 0;
      return `${completed}/${total}`;
    } catch (error) {
      logger.error('获取每周任务进度失败', error);
      return '0/0';
    }
  });

  const getTowerLowerItem = computed((): string => {
    try {
      const lowerItem = playerData.value?.tower?.reward?.lowerItem;
      return `${lowerItem?.current || 0}/${lowerItem?.total || 0}`;
    } catch (error) {
      logger.error('获取数据增补仪进度失败', error);
      return '0/0';
    }
  });

  const getTowerHigherItem = computed((): string => {
    try {
      const higherItem = playerData.value?.tower?.reward?.higherItem;
      return `${higherItem?.current || 0}/${higherItem?.total || 0}`;
    } catch (error) {
      logger.error('获取数据增补条进度失败', error);
      return '0/0';
    }
  });

  // ========== 周常倒计时计算 ==========

  /**
   * 计算距离下周一凌晨4点的剩余时间
   */
  const getWeeklyCountdown = computed((): string => {
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
      if (!refresh && isValidCache(dataCache.value)) {
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

      logger.debug('检查用户登录状态');
      if (!authStore.isLogin) {
        errorMsg.value = '请先登录账号';
        logger.warn('未登录状态下尝试获取游戏数据');
        return;
      }

      logger.debug('检查绑定角色列表');
      if (!authStore.bindingRoles || authStore.bindingRoles.length === 0) {
        try {
          // fetchBindingRoles 内部已有日志
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

      dataCache.value = {
        data: data,
        timestamp: Date.now()
      };

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
  };

  const refreshData = async (): Promise<void> => {
    logger.info('用户手动刷新游戏数据');
    await fetchGameData(true);
  };

  const startTimeUpdate = (): void => {
    if (timeUpdateInterval) {
      logger.debug('时间更新定时器已在运行');
      return;
    }

    timeUpdateInterval = setInterval(() => {
      currentTime.value = Math.floor(Date.now() / 1000);

      // 检查理智是否达到上限
      checkApFull();

      // 检查周常刷新提醒
      checkWeeklyReminder();
    }, 1000);

    logger.info('时间更新定时器已启动');
  };

  /**
   * 检查理智是否达到上限并发送通知
   */
  const checkApFull = (): void => {
    try {
      const apInfo = getActualApInfo.value;

      // 只有在理智数据有效时才检查
      if (apInfo.max <= 0) {
        return;
      }

      // 当前理智值
      const currentAp = apInfo.current;

      // 检测理智达到上限（current >= max 且 remainSecs <= 0）
      const isApFull = currentAp >= apInfo.max && apInfo.remainSecs <= 0;

      if (isApFull) {
        // 理智已达上限但还未发送通知
        if (!apFullNotified.value) {
          // 检查是否刚从不满状态变满（通过比较上一次的理智值）
          if (prevApValue.value < apInfo.max) {
            // 发送 Windows 通知
            sendApFullNotification();
            apFullNotified.value = true;
            logger.info('理智已达到上限，已发送通知', {
              current: currentAp,
              max: apInfo.max
            });
          }
        }
      } else {
        // 理智未满，重置通知标志
        if (apFullNotified.value) {
          apFullNotified.value = false;
          logger.debug('理智未满，重置通知标志');
        }
      }

      // 更新上一次的理智值
      prevApValue.value = currentAp;
    } catch (error) {
      logger.error('检查理智上限状态失败', error);
    }
  };

  /**
   * 发送理智上限 Windows 通知
   */
  const sendApFullNotification = async (): Promise<void> => {
    try {
      const apInfo = getActualApInfo.value;
      const message = `理智已回满！当前理智: ${apInfo.current}/${apInfo.max}`;

      // 使用 preload 暴露的通知 API
      if (window.api?.showNotification) {
        await window.api.showNotification('理智回满提醒', message);
        logger.info('理智上限通知已发送');
      }
    } catch (error) {
      logger.error('发送理智上限通知失败', error);
    }
  };

  /**
   * 检查是否需要发送周常刷新提醒
   */
  const checkWeeklyReminder = (): void => {
    try {
      // 检查周常任务是否已完成
      const weekly = playerData.value?.routine?.weekly;
      const weeklyCompleted = weekly?.current || 0;
      const weeklyTotal = weekly?.total || 0;

      // 如果周常已完成，不需要提醒
      if (weeklyTotal > 0 && weeklyCompleted >= weeklyTotal) {
        if (weeklyReminderNotified.value) {
          weeklyReminderNotified.value = false;
          logger.debug('周常已完成，重置提醒标志');
        }
        return;
      }

      // 如果没有周常任务数据，不提醒
      if (weeklyTotal <= 0) {
        return;
      }

      // 计算距离下周一凌晨4点的时间
      const now = new Date();
      const nextMonday = new Date(now);
      const dayOfWeek = now.getDay();
      const daysUntilMonday = dayOfWeek === 1 ? 7 : (8 - dayOfWeek) % 7;
      nextMonday.setDate(now.getDate() + daysUntilMonday);
      nextMonday.setHours(4, 0, 0, 0);

      const diffMs = nextMonday.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      // 只有在24小时内且还未发送提醒时才发送
      if (diffHours > 0 && diffHours <= 24 && !weeklyReminderNotified.value) {
        // 计算具体的小时和分钟
        const hours = Math.floor(diffHours);
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        // 发送提醒
        sendWeeklyReminderNotification(hours, minutes);
        weeklyReminderNotified.value = true;
        logger.info('周常刷新提醒已发送', { hours, minutes });
      }

      // 如果距离刷新超过24小时，重置提醒标志（以便下次进入24小时窗口时再次提醒）
      if (diffHours > 24 && weeklyReminderNotified.value) {
        weeklyReminderNotified.value = false;
        logger.debug('距离周常刷新超过24小时，重置提醒标志');
      }
    } catch (error) {
      logger.error('检查周常刷新提醒失败', error);
    }
  };

  /**
   * 发送周常刷新 Windows 通知
   */
  const sendWeeklyReminderNotification = async (hours: number, minutes: number): Promise<void> => {
    try {
      const message = `还剩下${hours}小时${minutes}分剿灭刷新，请记得完成剿灭！`;

      // 使用 preload 暴露的通知 API
      if (window.api?.showNotification) {
        await window.api.showNotification('周常刷新提醒', message);
        logger.info('周常刷新提醒通知已发送', { hours, minutes });
      }
    } catch (error) {
      logger.error('发送周常刷新提醒通知失败', error);
    }
  };

  const stopTimeUpdate = (): void => {
    if (timeUpdateInterval) {
      clearInterval(timeUpdateInterval);
      timeUpdateInterval = null;
      // 重置理智通知标志
      apFullNotified.value = false;
      prevApValue.value = 0;
      // 重置周常提醒标志
      weeklyReminderNotified.value = false;
      logger.info('时间更新定时器已停止');
    } else {
      logger.debug('时间更新定时器未运行，无需停止');
    }
  };

  const clearCache = (): void => {
    dataCache.value = null;
    efficiencyCache.clear();
    // 重置理智通知标志
    apFullNotified.value = false;
    prevApValue.value = 0;
    // 重置周常提醒标志
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
    formatTimestamp,
    formatRecoveryTime,
    formatRecoveryTimeFromSeconds,
    formatTimeFromSeconds,
    getBuildingBuff,
    debugData,
    startTimeUpdate,
    stopTimeUpdate,
    clearCache,

    // 基建效率计算
    calculateOperatorBuff,
    calculateBuildingEfficiency,

    // 头像相关方法
    processImageUrl,
    getAvatarPlaceholder,
    handleAvatarError,
    handleAvatarLoad,
    fetchUserAvatar,

    // 干员图片相关方法（统一使用 utils/image）
    getOperatorPortraitUrl,
    getOperatorAvatarUrl,
    handleImageError,
    handleImageLoad,

    // 剪贴板相关方法
    copyUid,
    copyNickname
  };
});

/**
 * 日期时间工具函数
 * 提供日期格式化和时间转换功能
 */

// 日志记录器（避免循环依赖）
type Logger = {
  debug: (message: string, data?: unknown) => void;
  warn: (message: string, data?: unknown) => void;
  error: (message: string, data?: unknown) => void;
};

let logger: Logger = {
  debug: () => {},
  warn: () => {},
  error: console.error
};

/**
 * 设置日志记录器
 * @param log 外部日志实例
 */
export function setDateLogger(log: Logger): void {
  logger = log;
}

/**
 * 格式化配置选项
 */
export interface FormatTimestampOptions {
  /** 空值时返回的文本，默认 '--' */
  emptyValue?: string;
  /** 是否包含秒数，默认 false */
  includeSeconds?: boolean;
  /** 输入单位是否为毫秒，默认 false（秒级） */
  inputIsMilliseconds?: boolean;
  /** 是否启用时间戳验证，默认 true */
  enableValidation?: boolean;
}

/**
 * 默认配置
 */
const defaultOptions: Required<FormatTimestampOptions> = {
  emptyValue: '--',
  includeSeconds: false,
  inputIsMilliseconds: false,
  enableValidation: true
};

/**
 * 将时间戳转换为可读日期时间字符串
 * @param timestamp 时间戳（秒或毫秒，自动检测）
 * @param options 格式化选项
 * @returns 格式化的日期时间字符串
 */
export function formatTimestamp(
  timestamp: number | string | undefined | null,
  options: FormatTimestampOptions = {}
): string {
  const config = { ...defaultOptions, ...options };

  // 空值处理
  if (timestamp === undefined || timestamp === null || timestamp === '') {
    return config.emptyValue;
  }

  // 类型转换
  let ts: number;
  if (typeof timestamp === 'string') {
    ts = parseFloat(timestamp);
  } else {
    ts = timestamp;
  }

  // 无效数字检测
  if (isNaN(ts)) {
    logger.warn('无效的时间戳格式', { timestamp });
    return config.emptyValue;
  }

  // 时间戳范围验证
  if (config.enableValidation) {
    // 秒级时间戳合理范围: 2020-01-01 到 当前+1天
    const minSeconds = 1577836800; // 2020-01-01 00:00:00
    const maxSeconds = Math.floor(Date.now() / 1000) + 86400;

    // 判断是否为毫秒级
    const isMilliseconds = ts > 1000000000000;

    if (isMilliseconds) {
      // 毫秒级验证
      if (ts < minSeconds * 1000 || ts > maxSeconds * 1000) {
        logger.warn('时间戳超出合理范围', { timestamp, ts });
        return config.emptyValue;
      }
    } else {
      // 秒级验证
      if (ts < minSeconds || ts > maxSeconds) {
        logger.warn('时间戳超出合理范围', { timestamp, ts });
        return config.emptyValue;
      }
    }
  }

  // 转换为 Date 对象
  let date: Date;
  if (ts > 1000000000000) {
    // 毫秒级时间戳
    date = new Date(ts);
  } else {
    // 秒级时间戳，转换为毫秒
    date = new Date(ts * 1000);
  }

  // 日期有效性检测
  if (isNaN(date.getTime())) {
    logger.error('日期对象无效', { timestamp });
    return config.emptyValue;
  }

  // 格式化输出
  const formatOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  };

  if (config.includeSeconds) {
    formatOptions.second = '2-digit';
  }

  return date.toLocaleString('zh-CN', formatOptions);
}

/**
 * 格式化恢复时间
 * @param timestamp 目标时间戳（秒）
 * @returns 格式化的剩余时间字符串
 */
export function formatRecoveryTime(timestamp: number | undefined | null): string {
  if (!timestamp) return '--';

  try {
    const now = Math.floor(Date.now() / 1000);
    const target = timestamp;
    const diff = target - now;

    if (diff <= 0) return '已回满';

    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;

    if (hours > 0) {
      return `${hours}时${minutes}分`;
    } else if (minutes > 0) {
      return `${minutes}分${seconds}秒`;
    } else {
      return `${seconds}秒`;
    }
  } catch (error) {
    console.error('格式化恢复时间失败:', error);
    return '--';
  }
}

/**
 * 从秒数格式化时间
 * @param seconds 秒数
 * @returns 格式化的时间字符串
 */
export function formatSeconds(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * @deprecated 请使用 formatTimestamp
 * 兼容旧接口，与 formatTimestamp 完全兼容
 */
export const formatTime = formatTimestamp;

/**
 * 格式化时间（自然语言格式）
 * @param seconds 秒数
 * @returns 格式化的时间字符串，如 "1小时30分钟" 或 "30分钟"
 */
export function formatTimeFromSeconds(seconds: number): string {
  if (seconds <= 0) return '已完成';
  try {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}小时${minutes}分钟`;
    return `${minutes}分钟`;
  } catch (error) {
    console.error('格式化时间失败:', error);
    return '计算中';
  }
}

/**
 * @deprecated 请使用 formatTimeFromSeconds
 * 兼容旧接口
 */
export const formatRecoveryTimeFromSeconds = formatTimeFromSeconds;

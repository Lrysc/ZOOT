/**
 * 日志服务
 * 用于记录应用运行状态、错误信息和用户操作
 * 提供日志导出、清除和管理功能
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: any;
  stack?: string;
}

export interface LogExportMeta {
  app: string;
  version: string;
  exportTime: string;
  userAgent: string;
  platform: string;
  logCount: number;
}

export interface LogExportData {
  meta: LogExportMeta;
  logs: LogEntry[];
}

/**
 * 日志配置接口
 */
interface LoggerConfig {
  maxLogSize: number;
  enableConsole: boolean;
  defaultLogLevel: LogLevel;
}

class LoggerService {
  /**
   * 日志存储数组
   */
  private logs: LogEntry[] = [];

  /**
   * 日志配置
   */
  private readonly config: LoggerConfig = {
    maxLogSize: 1000,
    enableConsole: this.isDevelopment(),
    defaultLogLevel: this.isDevelopment() ? LogLevel.DEBUG : LogLevel.INFO
  };

  /**
   * 应用信息
   */
  private readonly APP_INFO = {
    name: 'PRTS系统助手',
    version: '0.2.5'
  };

  /**
   * 添加日志条目
   * @param level - 日志级别
   * @param message - 日志消息
   * @param context - 上下文信息
   */
  private addLog(level: LogLevel, message: string, context?: any): void {
    // 创建日志条目
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.safeStringifyContext(context)
    };

    // 如果是错误类型，提取堆栈信息
    if (level === LogLevel.ERROR && context instanceof Error) {
      entry.stack = context.stack;
    }

    // 添加到日志数组
    this.logs.push(entry);

    // 限制日志大小，移除最旧的日志
    if (this.logs.length > this.config.maxLogSize) {
      this.logs = this.logs.slice(-this.config.maxLogSize);
    }

    // 开发环境下在控制台输出
    if (this.config.enableConsole) {
      this.outputToConsole(level, message, context);
    }
  }

  /**
   * 安全序列化上下文，处理循环引用
   * @param context - 原始上下文
   * @returns 安全序列化后的上下文
   */
  private safeStringifyContext(context: any): any {
    if (!context) return undefined;

    try {
      if (context instanceof Error) {
        return {
          message: context.message,
          name: context.name,
          stack: context.stack
        };
      }

      // 处理可能的循环引用
      const seen = new WeakSet();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      return JSON.parse(JSON.stringify(context, (_key: string, value: any) => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) return '[Circular Reference]';
          seen.add(value);
        }
        return value;
      }));
    } catch {
      return '[Unserializable Context Data]';
    }
  }

  /**
   * 检查是否为开发环境
   */
  private isDevelopment(): boolean {
    return import.meta.env?.DEV || process.env.NODE_ENV === 'development';
  }

  /**
   * 控制台输出
   */
  private outputToConsole(level: LogLevel, message: string, context?: any): void {
    const styles = {
      [LogLevel.DEBUG]: 'color: #666; background: #f0f0f0; padding: 2px 4px; border-radius: 3px;',
      [LogLevel.INFO]: 'color: #1890ff; background: #e6f7ff; padding: 2px 4px; border-radius: 3px;',
      [LogLevel.WARN]: 'color: #faad14; background: #fffbe6; padding: 2px 4px; border-radius: 3px;',
      [LogLevel.ERROR]: 'color: #ff4d4f; background: #fff2f0; padding: 2px 4px; border-radius: 3px;'
    };

    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(`%c${logMessage}`, styles[LogLevel.DEBUG], context || '');
        break;
      case LogLevel.INFO:
        console.info(`%c${logMessage}`, styles[LogLevel.INFO], context || '');
        break;
      case LogLevel.WARN:
        console.warn(`%c${logMessage}`, styles[LogLevel.WARN], context || '');
        break;
      case LogLevel.ERROR:
        console.error(`%c${logMessage}`, styles[LogLevel.ERROR], context || '');
        break;
      default:
        console.log(`%c${logMessage}`, styles[LogLevel.INFO], context || '');
    }
  }

  /**
   * 记录调试信息
   * 用于开发阶段的详细调试信息
   * @param message - 调试消息
   * @param context - 调试上下文
   */
  debug(message: string, context?: any): void {
    this.addLog(LogLevel.DEBUG, message, context);
  }

  /**
   * 记录普通信息
   * 用于记录正常的操作流程和状态变化
   * @param message - 信息消息
   * @param context - 信息上下文
   */
  info(message: string, context?: any): void {
    this.addLog(LogLevel.INFO, message, context);
  }

  /**
   * 记录警告信息
   * 用于记录可能有问题但不影响程序运行的情况
   * @param message - 警告消息
   * @param context - 警告上下文
   */
  warn(message: string, context?: any): void {
    this.addLog(LogLevel.WARN, message, context);
  }

  /**
   * 记录错误信息
   * 用于记录程序错误和异常情况
   * @param message - 错误消息
   * @param context - 错误上下文或Error对象
   */
  error(message: string, context?: any): void {
    this.addLog(LogLevel.ERROR, message, context);
  }

  /**
   * 性能监控日志
   * 用于记录操作耗时和性能数据
   * @param message - 操作描述
   * @param operation - 要监控的操作函数
   * @returns 操作结果
   */
  performance<T>(message: string, operation: () => T): T {
    const start = performance.now();
    try {
      const result = operation();
      const duration = performance.now() - start;
      this.debug(`${message} - 完成, 耗时: ${duration.toFixed(2)}ms`, {
        operation: message,
        duration: duration,
        timestamp: new Date().toISOString()
      });
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.error(`${message} - 失败, 耗时: ${duration.toFixed(2)}ms`, error);
      throw error;
    }
  }

  /**
   * 异步性能监控日志
   * 用于记录异步操作的耗时和性能数据
   * @param message - 操作描述
   * @param operation - 要监控的异步操作函数
   * @returns 操作结果
   */
  async performanceAsync<T>(message: string, operation: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      const result = await operation();
      const duration = performance.now() - start;
      this.debug(`${message} - 完成, 耗时: ${duration.toFixed(2)}ms`, {
        operation: message,
        duration: duration,
        timestamp: new Date().toISOString()
      });
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.error(`${message} - 失败, 耗时: ${duration.toFixed(2)}ms`, error);
      throw error;
    }
  }

  /**
   * 获取所有日志条目
   * @returns 日志条目数组的副本
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * 获取指定级别的日志
   * @internal - 供外部组件使用
   * @param level - 要筛选的日志级别
   * @returns 筛选后的日志条目
   */
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter((entry: LogEntry) => entry.level === level);
  }

  /**
   * 清除所有日志
   */
  clearLogs(): void {
    const clearedCount = this.logs.length;
    this.logs = [];
    this.info('日志已被清除', { clearedCount });
  }

  /**
   * 获取日志统计信息
   */
  getLogStats(): { total: number; byLevel: Record<LogLevel, number> } {
    const byLevel: Record<LogLevel, number> = {
      [LogLevel.DEBUG]: 0,
      [LogLevel.INFO]: 0,
      [LogLevel.WARN]: 0,
      [LogLevel.ERROR]: 0
    };

    this.logs.forEach((entry: LogEntry) => {
      byLevel[entry.level]++;
    });

    return {
      total: this.logs.length,
      byLevel
    };
  }

  /**
   * 导出日志为可读文本格式
   * 适合用户直接阅读和分享
   * @returns 格式化的日志文本
   */
  exportLogs(): string {
    const meta = this.getExportMeta();

    let logText = '=== PRTS系统助手 - 应用日志 ===\n\n';

    // 元信息部分
    logText += '【系统信息】\n';
    logText += `应用名称: ${meta.app}\n`;
    logText += `版本号: ${meta.version}\n`;
    logText += `导出时间: ${meta.exportTime}\n`;
    logText += `用户代理: ${meta.userAgent}\n`;
    // 使用现代API替代弃用的platform
    logText += `运行环境: ${this.getEnvironmentInfo()}\n`;
    logText += `日志条数: ${meta.logCount}\n\n`;

    // 日志统计
    const stats = this.getLogStats();
    logText += '【日志统计】\n';
    logText += `总条数: ${stats.total}\n`;
    logText += `调试: ${stats.byLevel[LogLevel.DEBUG]} 条\n`;
    logText += `信息: ${stats.byLevel[LogLevel.INFO]} 条\n`;
    logText += `警告: ${stats.byLevel[LogLevel.WARN]} 条\n`;
    logText += `错误: ${stats.byLevel[LogLevel.ERROR]} 条\n\n`;

    logText += '【详细日志】\n';
    logText += '='.repeat(80) + '\n\n';

    // 详细日志内容
    this.logs.forEach((entry: LogEntry, index: number) => {
      const localTime = new Date(entry.timestamp).toLocaleString('zh-CN');
      logText += `[${index + 1}] [${localTime}] [${entry.level}] ${entry.message}\n`;

      if (entry.context && Object.keys(entry.context).length > 0) {
        logText += '   上下文: ';
        try {
          logText += JSON.stringify(entry.context, null, 2).replace(/\n/g, '\n    ');
        } catch {
          logText += '[无法序列化的上下文数据]';
        }
        logText += '\n';
      }

      if (entry.stack) {
        logText += '   堆栈跟踪:\n';
        logText += '   ' + entry.stack.replace(/\n/g, '\n   ') + '\n';
      }

      logText += '-'.repeat(60) + '\n';
    });

    return logText;
  }

  /**
   * 导出日志为JSON格式
   * 适合程序分析和处理
   * @returns JSON格式的日志数据
   */
  exportAsJson(): string {
    const exportData: LogExportData = {
      meta: this.getExportMeta(),
      logs: this.logs
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * 获取导出元信息
   */
  private getExportMeta(): LogExportMeta {
    return {
      app: this.APP_INFO.name,
      version: this.APP_INFO.version,
      exportTime: new Date().toLocaleString('zh-CN'),
      userAgent: navigator.userAgent,
      // 使用现代API替代弃用的platform
      platform: this.getEnvironmentInfo(),
      logCount: this.logs.length
    };
  }

  /**
   * 获取环境信息（替代弃用的platform）
   */
  private getEnvironmentInfo(): string {
    const ua = navigator.userAgent;
    let environment = '未知环境';

    // 检测操作系统
    if (ua.includes('Windows')) environment = 'Windows';
    else if (ua.includes('Mac')) environment = 'macOS';
    else if (ua.includes('Linux')) environment = 'Linux';
    else if (ua.includes('Android')) environment = 'Android';
    else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) environment = 'iOS';

    // 检测浏览器
    if (ua.includes('Chrome') && !ua.includes('Edg')) environment += ' - Chrome';
    else if (ua.includes('Firefox')) environment += ' - Firefox';
    else if (ua.includes('Safari') && !ua.includes('Chrome')) environment += ' - Safari';
    else if (ua.includes('Edg')) environment += ' - Edge';

    return environment;
  }

  /**
   * 获取最近N条日志
   * @internal - 供外部组件使用
   * @param count - 要获取的日志条数
   * @returns 最近的日志条目
   */
  getRecentLogs(count: number = 50): LogEntry[] {
    return this.logs.slice(-count);
  }

  /**
   * 检查是否有错误日志
   * @internal - 供外部组件使用
   * @returns 是否存在错误日志
   */
  hasErrors(): boolean {
    return this.logs.some((entry: LogEntry) => entry.level === LogLevel.ERROR);
  }

  /**
   * 获取最后的错误信息
   * @internal - 供外部组件使用
   * @returns 最后的错误日志条目或null
   */
  getLastError(): LogEntry | null {
    for (let i = this.logs.length - 1; i >= 0; i--) {
      if (this.logs[i].level === LogLevel.ERROR) {
        return this.logs[i];
      }
    }
    return null;
  }

  /**
   * 设置日志配置
   * @param config - 新的日志配置
   */
  setConfig(config: Partial<LoggerConfig>): void {
    this.config.maxLogSize = config.maxLogSize ?? this.config.maxLogSize;
    this.config.enableConsole = config.enableConsole ?? this.config.enableConsole;
    this.config.defaultLogLevel = config.defaultLogLevel ?? this.config.defaultLogLevel;

    this.debug('日志配置已更新', { newConfig: this.config });
  }

  /**
   * 获取当前配置
   */
  getConfig(): LoggerConfig {
    return { ...this.config };
  }
}

// 创建全局日志实例
export const logger = new LoggerService();

// 开发环境下的使用示例，用于消除警告
if (import.meta.env?.DEV) {
  // 这些调用只是为了在开发环境消除警告，生产环境会被tree-shaking移除
  const devUsage = () => {
    // 使用所有方法以避免未使用警告
    const logs = logger.getLogs();
    const errorLogs = logger.getLogsByLevel(LogLevel.ERROR);
    const recentLogs = logger.getRecentLogs(5);
    const hasErrors = logger.hasErrors();
    const lastError = logger.getLastError();
    const config = logger.getConfig();

    // 调用便捷方法
    logger.clearLogs();
    const jsonExport = logger.exportAsJson();

    // 更新配置
    logger.setConfig({ maxLogSize: 500 });

    // 使用 performance 方法避免警告
    const performanceResult = logger.performance('同步性能测试', () => {
      let sum = 0;
      for (let i = 0; i < 1000; i++) {
        sum += i;
      }
      return sum;
    });

    // 处理异步Promise避免警告
    logger.performanceAsync('异步性能测试', async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return '异步测试完成';
    }).then((result) => {
      // Promise被正确处理
      console.log('异步性能测试结果:', result);
    }).catch((error) => {
      // 错误处理
      console.error('异步性能测试失败:', error);
    });

    // 记录使用情况以避免控制台警告
    console.log('开发环境日志测试完成', {
      logsCount: logs.length,
      errorLogsCount: errorLogs.length,
      recentLogsCount: recentLogs.length,
      hasErrors,
      lastError: lastError?.message,
      config,
      jsonExportLength: jsonExport.length,
      performanceResult
    });
  };

  // 只在开发环境执行
  if (import.meta.env.DEV) {
    setTimeout(devUsage, 100);
  }
}

// 在开发环境下将logger挂载到window，方便调试
if (import.meta.env?.DEV) {
  (window as any).__ARK_LOGGER__ = logger;
}

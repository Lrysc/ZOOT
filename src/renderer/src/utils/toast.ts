/**
 * 浮窗提示服务
 * 统一管理应用中的所有浮窗提示
 * 支持成功、错误等不同类型的提示
 * 提供状态管理和事件通知机制
 */

// ==================== 类型定义 ====================

/**
 * 浮窗提示类型
 */
export type ToastType = 'success' | 'error' | 'warning' | 'info';

/**
 * 浮窗配置选项
 */
export interface ToastOptions {
  /** 提示类型 */
  type?: ToastType;
  /** 显示时长（毫秒） */
  duration?: number;
  /** 位置（保留参数，为未来扩展准备） */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

/**
 * 浮窗状态接口
 */
export interface ToastState {
  /** 是否可见 */
  visible: boolean;
  /** 消息内容 */
  message: string;
  /** 提示类型 */
  type: ToastType;
  /** 是否正在退出动画 */
  leaving: boolean;
}

// ==================== 状态管理 ====================

/** 浮窗可见性状态 */
let toastVisible = false;

/** 浮窗消息内容 */
let toastMessage = '';

/** 浮窗类型 */
let toastType: ToastType = 'success';

/** 浮窗退出动画状态 */
let toastLeaving = false;

/** 自动隐藏定时器 */
let autoHideTimer: NodeJS.Timeout | null = null;

// ==================== 事件监听器管理 ====================

/** 状态变化监听器列表 */
const listeners: Array<(visible: boolean, message: string, type: ToastType, leaving: boolean) => void> = [];

/**
 * 添加状态变化监听器
 * @param listener 监听器函数
 */
export const addToastListener = (listener: (visible: boolean, message: string, type: ToastType, leaving: boolean) => void): void => {
  listeners.push(listener);
};

/**
 * 移除状态变化监听器
 * @param listener 监听器函数
 */
export const removeToastListener = (listener: (visible: boolean, message: string, type: ToastType, leaving: boolean) => void): void => {
  const index = listeners.indexOf(listener);
  if (index > -1) {
    listeners.splice(index, 1);
  }
};

/**
 * 通知所有监听器状态变化
 */
const notifyListeners = (): void => {
  // 使用切片复制数组，避免在迭代过程中修改数组导致的异常
  const currentListeners = listeners.slice();
  currentListeners.forEach(listener => {
    try {
      listener(toastVisible, toastMessage, toastType, toastLeaving);
    } catch (error) {
      console.error('Toast listener error:', error);
    }
  });
};

// ==================== 核心功能 ====================

/**
 * 显示浮窗提示
 * @param message 提示消息内容
 * @param options 配置选项
 */
export const showToast = (message: string, options: ToastOptions = {}): void => {
  const {
    type = 'success',
    duration = 3000,
    // position 参数保留用于未来可能的布局扩展
  } = options;

  // 验证输入参数
  if (!message || typeof message !== 'string') {
    console.warn('Toast message must be a non-empty string');
    return;
  }

  if (duration < 0) {
    console.warn('Toast duration must be a positive number');
    return;
  }

  // 如果已经有浮窗在显示，先隐藏它
  if (toastVisible) {
    hideToastImmediately();

    // 短暂延迟后显示新浮窗，确保动画完成
    setTimeout(() => {
      showNewToast(message, type, duration);
    }, 300);
  } else {
    showNewToast(message, type, duration);
  }
};

/**
 * 显示新浮窗的内部方法
 * @param message 提示消息
 * @param type 提示类型
 * @param duration 显示时长
 */
const showNewToast = (message: string, type: ToastType, duration: number): void => {
  // 清除之前的定时器
  clearAutoHideTimer();

  // 更新状态
  toastMessage = message;
  toastType = type;
  toastLeaving = false;
  toastVisible = true;

  // 通知监听器
  notifyListeners();

  // 设置自动隐藏定时器（仅在duration大于0时）
  if (duration > 0) {
    autoHideTimer = setTimeout(() => {
      hideToast();
    }, duration);
  }
};

/**
 * 隐藏浮窗（带动画效果）
 */
export const hideToast = (): void => {
  if (!toastVisible || toastLeaving) return;

  // 清除自动隐藏定时器
  clearAutoHideTimer();

  // 设置退出状态，触发退出动画
  toastLeaving = true;
  notifyListeners();

  // 等待动画完成后再完全隐藏元素
  setTimeout(() => {
    toastVisible = false;
    toastLeaving = false;
    notifyListeners();
  }, 300);
};

/**
 * 立即隐藏浮窗（无动画）
 */
const hideToastImmediately = (): void => {
  clearAutoHideTimer();
  toastVisible = false;
  toastLeaving = false;
  notifyListeners();
};

/**
 * 清除自动隐藏定时器
 */
const clearAutoHideTimer = (): void => {
  if (autoHideTimer) {
    clearTimeout(autoHideTimer);
    autoHideTimer = null;
  }
};

// ==================== 快捷方法 ====================

/**
 * 快速显示成功提示
 * @param message 成功消息
 */
export const showSuccess = (message: string): void => {
  showToast(message, { type: 'success' });
};

/**
 * 快速显示错误提示
 * @param message 错误消息
 */
export const showError = (message: string): void => {
  showToast(message, { type: 'error' });
};

/**
 * 快速显示警告提示
 * @param message 警告消息
 */
export const showWarning = (message: string): void => {
  showToast(message, { type: 'warning' });
};

/**
 * 快速显示信息提示
 * @param message 信息消息
 */
export const showInfo = (message: string): void => {
  showToast(message, { type: 'info' });
};

// ==================== 状态查询方法 ====================

/**
 * 获取当前浮窗状态
 * @returns 当前浮窗状态对象
 */
export const getToastState = (): ToastState => {
  return {
    visible: toastVisible,
    message: toastMessage,
    type: toastType,
    leaving: toastLeaving
  };
};

/**
 * 检查当前是否有浮窗显示
 * @returns 是否可见
 */
export const isToastVisible = (): boolean => {
  return toastVisible;
};

/**
 * 获取当前浮窗消息
 * @returns 当前消息
 */
export const getCurrentMessage = (): string => {
  return toastMessage;
};

/**
 * 获取当前浮窗类型
 * @returns 当前类型
 */
export const getCurrentType = (): ToastType => {
  return toastType;
};

// ==================== 工具方法 ====================

/**
 * 更新当前显示的浮窗消息
 * @param newMessage 新消息内容
 */
export const updateToastMessage = (newMessage: string): void => {
  if (!toastVisible) {
    console.warn('Cannot update message when toast is not visible');
    return;
  }

  if (!newMessage || typeof newMessage !== 'string') {
    console.warn('New message must be a non-empty string');
    return;
  }

  toastMessage = newMessage;
  notifyListeners();
};

/**
 * 延长当前浮窗显示时间
 * @param extraDuration 延长时间（毫秒）
 */
export const extendToastDuration = (extraDuration: number): void => {
  if (!toastVisible || !autoHideTimer) {
    console.warn('Cannot extend duration when toast is not visible or has no auto-hide timer');
    return;
  }

  if (extraDuration <= 0) {
    console.warn('Extra duration must be a positive number');
    return;
  }

  // 清除现有定时器
  clearAutoHideTimer();

  // 设置新的定时器
  autoHideTimer = setTimeout(() => {
    hideToast();
  }, extraDuration);
};

// ==================== 资源管理 ====================

/**
 * 清理所有资源和监听器
 * 用于应用卸载或重置时调用
 */
export const cleanupToastService = (): void => {
  // 清除定时器
  clearAutoHideTimer();

  // 重置状态
  toastVisible = false;
  toastMessage = '';
  toastType = 'success';
  toastLeaving = false;

  // 清空监听器列表
  listeners.length = 0;

  console.log('Toast service cleaned up successfully');
};

/**
 * 重置浮窗服务到初始状态
 * 保留监听器，只重置显示状态
 */
export const resetToast = (): void => {
  hideToastImmediately();
  toastMessage = '';
  toastType = 'success';
};

// ==================== 演示和测试方法 ====================

/**
 * 演示所有类型的提示（用于测试）
 */
export const demoAllToastTypes = (): void => {
  showSuccess('这是一个成功提示！');
  setTimeout(() => {
    showError('这是一个错误提示！');
  }, 1000);
  setTimeout(() => {
    showWarning('这是一个警告提示！');
  }, 2000);
  setTimeout(() => {
    showInfo('这是一个信息提示！');
  }, 3000);
};

/**
 * 测试动态更新功能
 */
export const testDynamicUpdate = (): void => {
  showInfo('这条消息将会被更新...');
  setTimeout(() => {
    updateToastMessage('消息已成功更新！');
  }, 1500);
};

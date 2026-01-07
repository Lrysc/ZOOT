<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import {
  addToastListener,
  removeToastListener,
  hideToast,
  type ToastType
} from '@services/toastService';

// ==================== 组件状态 ====================

/** 浮窗可见性 */
const toastVisible = ref(false);

/** 浮窗消息 */
const toastMessage = ref('');

/** 浮窗类型 */
const toastType = ref<ToastType>('success');

/** 退出动画状态 */
const toastLeaving = ref(false);

// ==================== 事件处理 ====================

/**
 * 处理状态变化
 */
const handleStateChange = (
  visible: boolean,
  message: string,
  type: ToastType,
  leaving: boolean
) => {
  toastVisible.value = visible;
  toastMessage.value = message;
  toastType.value = type;
  toastLeaving.value = leaving;
};

/**
 * 手动关闭浮窗
 */
const handleClose = () => {
  hideToast();
};

// ==================== 生命周期 ====================

onMounted(() => {
  // 注册状态监听器
  addToastListener(handleStateChange);
});

onUnmounted(() => {
  // 移除状态监听器
  removeToastListener(handleStateChange);
});
</script>

<template>
  <!-- 浮窗提示组件 -->
  <div
    v-if="toastVisible"
    class="toast-notification"
    :class="[toastType, { leaving: toastLeaving }]"
  >
    <div class="toast-content">
      <p class="toast-message">{{ toastMessage }}</p>
    </div>
    <button class="toast-close" @click="handleClose">×</button>
  </div>
</template>

<style scoped>
/* ==================== 浮窗基础样式 ==================== */
.toast-notification {
  position: fixed;
  top: 80px;
  left: 20px;
  background: #2d2d2d;
  border: 1px solid #404040;

  padding: 16px 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  z-index: 10001;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-width: 300px;
  max-width: 450px;
  animation: toastSlideInLeft 0.3s ease-out forwards;
  backdrop-filter: blur(10px);
}

/* 浮窗退出状态 */
.toast-notification.leaving {
  animation: toastSlideOutLeft 0.3s ease-in forwards;
}

/* ==================== 浮窗类型样式 ==================== */
.toast-notification.success {
  border-left: 4px solid #4caf50;
  background: linear-gradient(90deg, rgba(76, 175, 80, 0.1) 0%, #2d2d2d 100%);
}

.toast-notification.error {
  border-left: 4px solid #f44336;
  background: linear-gradient(90deg, rgba(244, 67, 54, 0.1) 0%, #2d2d2d 100%);
}

.toast-notification.warning {
  border-left: 4px solid #ff9800;
  background: linear-gradient(90deg, rgba(255, 152, 0, 0.1) 0%, #2d2d2d 100%);
}

.toast-notification.info {
  border-left: 4px solid #2196f3;
  background: linear-gradient(90deg, rgba(33, 150, 243, 0.1) 0%, #2d2d2d 100%);
}

/* ==================== 浮窗内容样式 ==================== */
.toast-content {
  flex: 1;
}

.toast-message {
  margin: 0;
  color: #fff;
  font-size: 14px;
  line-height: 1.4;
  font-weight: 500;
}

.toast-close {
  background: none;
  border: none;
  color: #999;
  font-size: 20px;
  cursor: pointer;
  padding: 4px 8px;

  transition: all 0.2s ease;
  flex-shrink: 0;
  line-height: 1;
}

.toast-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

/* ==================== 浮窗动画 ==================== */
@keyframes toastSlideInLeft {
  from {
    opacity: 0;
    transform: translateX(-100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes toastSlideOutLeft {
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(-100%);
  }
}

/* ==================== 响应式设计 ==================== */
@media (max-width: 768px) {
  .toast-notification {
    top: 60px;
    left: 10px;
    right: 10px;
    max-width: none;
  }
}
</style>

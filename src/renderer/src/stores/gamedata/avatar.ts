// ============================================================================
// 头像模块
// ============================================================================

import { ref } from 'vue';
import { logger } from '@services/logger';
import { processImageUrl } from '@utils/image';

// 头像加载超时定时器
let avatarLoadTimeout: NodeJS.Timeout | null = null;

/**
 * 创建头像相关状态和方法
 */
export const createAvatarModule = (authStore: any) => {
  const userAvatar = ref('');
  const avatarLoadError = ref(false);

  const getAvatarPlaceholder = (): string => {
    return authStore.userName ? authStore.userName.charAt(0) || '👤' : '👤';
  };

  const handleAvatarError = (): void => {
    logger.warn('头像加载失败，使用默认占位符');
    if (userAvatar.value) {
      avatarLoadError.value = true;
    }
  };

  const handleAvatarLoad = (): void => {
    logger.debug('头像加载成功');
    avatarLoadError.value = false;
  };

  const fetchUserAvatar = (playerData: any): void => {
    if (!authStore.isLogin) {
      userAvatar.value = '';
      avatarLoadError.value = true;
      logger.debug('无法获取用户头像：用户未登录');
      return;
    }

    try {
      const avatarData = playerData?.status?.avatar;
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

  return {
    userAvatar,
    avatarLoadError,
    getAvatarPlaceholder,
    handleAvatarError,
    handleAvatarLoad,
    fetchUserAvatar
  };
};

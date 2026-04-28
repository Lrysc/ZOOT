<template>
  <div class="assist-char-card" @click="handleClick" :title="`${name} - ${skillName}`">
    <!-- 头像 -->
    <img
      :src="portraitUrl"
      :alt="name"
      class="char-avatar"
      @error="handlePortraitError"
      @load="handlePortraitLoad"
    />

    <!-- 干员信息 -->
    <div class="char-details">
      <div class="char-name">{{ name }}</div>
      <div class="char-stats">
        <span class="stat-item">
          <span class="stat-label">等级</span>
          <span class="stat-value">{{ level }}</span>
        </span>
        <span class="stat-item">
          <span class="stat-label">技能</span>
          <span class="stat-value">{{ mainSkillLvl || 1 }}级</span>
        </span>
        <span class="stat-item">
          <span class="stat-label">潜能</span>
          <span class="stat-value">{{ potentialRank === 6 ? '满' : potentialRank }}</span>
        </span>
        <span class="stat-item">
          <span class="stat-label">模组</span>
          <span class="stat-value">{{ specializeLevel > 0 ? `${specializeLevel}级` : '-' }}</span>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { handleImageError, handleImageLoad } from '@utils/image';

// Props
interface Props {
  name: string;
  level: number;
  portraitUrl: string;
  professionIcon?: string;
  profession?: string;
  skillIconUrl?: string;
  skillName?: string;
  skillId?: string;
  mainSkillLvl?: number;
  evolvePhase: number;
  potentialRank: number;
  specializeLevel: number;
  onClick?: () => void;
}

const props = withDefaults(defineProps<Props>(), {
  skillIconUrl: '',
  skillName: '',
  skillId: '',
  mainSkillLvl: 1,
  onClick: undefined
});

// Emits
const emit = defineEmits<{
  click: [];
}>();

// Refs
const portraitLoadError = ref(false);

/**
 * 处理卡片点击
 */
const handleClick = () => {
  if (props.onClick) {
    props.onClick();
  } else {
    emit('click');
  }
};

/**
 * 处理半身像加载错误
 */
const handlePortraitError = (event: Event) => {
  handleImageError(props.name, 'portrait', event);
  portraitLoadError.value = true;
};

/**
 * 处理半身像加载成功
 */
const handlePortraitLoad = () => {
  handleImageLoad();
};

/**
 * 处理技能图标加载错误
 */
const handleSkillError = (event: Event) => {
  const target = event.target as HTMLImageElement;
  target.style.display = 'none';
};
</script>

<style scoped>
.assist-char-card {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  margin-bottom: 6px;
  border: 1px solid #404040;
  background: #2d2d2d;
  transition: all 0.3s ease;
  cursor: pointer;
  border-radius: 6px;
}

.assist-char-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  border-color: #4a4a4a;
}

.char-avatar {
  width: 50px;
  height: 50px;
  object-fit: cover;
  object-position: top center;
  border: 2px solid #404040;
  flex-shrink: 0;
  border-radius: 6px;
}

.char-details {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 16px;
  margin-left: 12px;
  flex-wrap: wrap;
}

.char-name {
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
  flex-shrink: 0;
  min-width: 60px;
}

.char-stats {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.stat-label {
  font-size: 11px;
  color: #888;
}

.stat-value {
  font-size: 12px;
  font-weight: 600;
  color: #ccc;
}
</style>

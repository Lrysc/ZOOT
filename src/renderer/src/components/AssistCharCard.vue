<template>
  <div class="assist-char-card" @click="handleClick" :title="`${name} - ${skillName}`">
    <!-- 半身像容器 -->
    <div class="char-portrait-container">
      <!-- 等级标签 -->
      <div class="char-level-badge">{{ level }}</div>

      <!-- 技能图标 -->
      <div v-if="skillIconUrl" class="skill-icon-container">
        <img
          :src="skillIconUrl"
          :alt="skillName"
          class="skill-icon"
          @error="handleSkillError"
        />
        <!-- 专精图标 -->
        <div v-if="specializeLevel > 0" class="specialize-dots">
          <div class="dots-background">
            <div class="dot dot-top" :class="{ 'dot-active': specializeLevel >= 1 }"></div>
            <div class="dot dot-bottom-left" :class="{ 'dot-active': specializeLevel >= 2 }"></div>
            <div class="dot dot-bottom-right" :class="{ 'dot-active': specializeLevel >= 3 }"></div>
          </div>
        </div>
      </div>

      <!-- 半身像 -->
      <img
        :src="portraitUrl"
        :alt="name"
        class="char-portrait"
        @error="handlePortraitError"
        @load="handlePortraitLoad"
      />

      <!-- 遮罩 -->
      <div class="portrait-fade-mask"></div>
    </div>

    <!-- 干员信息 -->
    <div class="char-details">
      <div class="char-name">
        <img v-if="professionIcon" :src="professionIcon" :alt="profession" class="profession-icon" />
        {{ name }}
      </div>
      <div class="char-stats">
        <span v-if="evolvePhase > 0" class="char-elite">精{{ evolvePhase === 1 ? '一' : '二' }}</span>
        <span class="char-potential">{{ potentialRank === 5 ? '满' : potentialRank }}潜能</span>
      </div>
      <div class="char-module">
        {{ specializeLevel > 0 ? `模组${specializeLevel}级` : '未开启模组' }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useImage } from '../composables/useImage';

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

// Composables
const { handleImageError, handleImageLoad } = useImage();

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
  handleImageLoad(props.name, 'portrait');
};

/**
 * 处理技能图标加载错误
 */
const handleSkillError = (event: Event) => {
  const target = event.target as HTMLImageElement;
  console.log('Skill icon load error:', props.skillId, target.src);
  target.style.display = 'none';
};
</script>

<style scoped>
.assist-char-card {
  background: #333333;
  border: 1px solid #404040;
  padding: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}

.assist-char-card:hover {
  background: #2d2d2d;
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
}

.char-portrait-container {
  position: relative;
  width: 100px;
  height: 120px;
  display: flex;
  justify-content: center;
  overflow: hidden;
}

.char-level-badge {
  position: absolute;
  top: 4px;
  left: 4px;
  width: 26px;
  height: 26px;
  background: rgba(0, 0, 0, 0.7);
  color: #ffffff;
  border: 3px solid rgba(255, 255, 255, 1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 900;
  z-index: 10;
}

.skill-icon-container {
  position: absolute;
  bottom: -5px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 5;
  transition: all 0.3s ease;
}

.skill-icon {
  width: 48px;
  height: 48px;
  background: rgba(0, 0, 0, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 8px;
}

.char-portrait {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
}

.portrait-fade-mask {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 40px;
  background: linear-gradient(to bottom, transparent 0%, rgba(51, 51, 51, 0.8) 50%, rgba(51, 51, 51, 1) 100%);
  pointer-events: none;
}

.char-details {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: center;
}

.char-name {
  font-size: 16px;
  font-weight: 600;
  color: #9feaf9;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
  gap: 6px;
  justify-content: center;
}

.profession-icon {
  width: 18px;
  height: 18px;
  filter: brightness(0) saturate(100%) invert(100%);
}

.char-stats {
  display: flex;
  justify-content: center;
  gap: 8px;
  font-size: 14px;
}

.char-elite {
  color: #ffa726;
  font-weight: 500;
}

.char-potential {
  color: #ff6b6b;
  font-weight: 500;
}

.char-module {
  font-size: 12px;
  color: #ba68c8;
  background: rgba(186, 104, 200, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
}

/* 专精三个白点图标 */
.specialize-dots {
  position: absolute;
  top: 0;
  left: 0;
  width: 20px;
  height: 20px;
  z-index: 11;
}

.dots-background {
  width: 100%;
  height: 100%;
  background-color: #808080;
  border-radius: 4px;
  position: relative;
}

.dot {
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #666;
  transition: all 0.3s ease;
}

.dot-top {
  top: 4px;
  left: 50%;
  transform: translateX(-50%);
}

.dot-bottom-left {
  top: 10px;
  left: 4px;
}

.dot-bottom-right {
  top: 10px;
  right: 4px;
}

.dot-active {
  background-color: white;
  box-shadow: 0 0 4px rgba(255, 255, 255, 0.8);
}
</style>

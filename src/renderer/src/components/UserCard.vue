<template>
  <div class="user-card">
    <div class="user-avatar">
      <img
        v-if="userAvatar && !avatarLoadError"
        :src="userAvatar"
        :alt="userName"
        class="avatar-img"
        @error="handleAvatarError"
        @load="handleAvatarLoad"
      />
      <img
        v-else
        src="@assets/avatar/Avatar_def_01.png"
        alt="默认头像"
        class="avatar-img default-avatar"
      />
    </div>
    <div class="user-details">
      <p class="user-name clickable" @click="handleCopyName" :title="`点击复制昵称`">
        {{ userName }}
      </p>
      <p class="user-level">Lv: {{ userLevel }}</p>
      <p class="user-uid">
        UID:
        <span class="uid-value clickable" @click="handleCopyUid" :title="`点击复制UID`">
          {{ uid }}
        </span>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useCopy } from '../composables/useCopy';
import { useImage } from '../composables/useImage';

// Props
interface Props {
  userName: string;
  userLevel: number;
  uid: string;
  userAvatar?: string;
  registerTs?: number;
}

const props = withDefaults(defineProps<Props>(), {
  userAvatar: '',
  registerTs: 0
});

// Composables
const { copyWithToast } = useCopy();
const { handleImageError, handleImageLoad } = useImage();

// Refs
const avatarLoadError = ref(false);

/**
 * 处理头像加载错误
 */
const handleAvatarError = (event: Event) => {
  handleImageError(props.uid, 'avatar', event);
  avatarLoadError.value = true;
};

/**
 * 处理头像加载成功
 */
const handleAvatarLoad = () => {
  handleImageLoad(props.uid, 'avatar');
  avatarLoadError.value = false;
};

/**
 * 复制昵称
 */
const handleCopyName = async () => {
  await copyWithToast(props.userName, '昵称');
};

/**
 * 复制 UID
 */
const handleCopyUid = async () => {
  await copyWithToast(props.uid, 'UID');
};
</script>

<style scoped>
.user-card {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px;
  background: #3a3a3a;
  border: 1px solid #4a4a4a;
  border-radius: 8px;
}

.user-avatar {
  width: 100px;
  height: 100px;
  flex-shrink: 0;
  overflow: hidden;
  border: 2px solid #4a4a4a;
  border-radius: 8px;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.default-avatar {
  background: #2d2d2d;
}

.user-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.user-name,
.user-level,
.user-uid {
  margin: 0;
  font-size: 14px;
  line-height: 1.4;
}

.user-name {
  font-weight: 600;
  color: #fff;
}

.user-level,
.user-uid {
  color: #ccc;
}

.uid-value {
  color: #4a90e2;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 2px 6px;
  border-radius: 4px;
}

.uid-value:hover {
  background: rgba(74, 144, 226, 0.1);
}

.clickable {
  cursor: pointer;
  user-select: none;
}

.clickable:hover {
  opacity: 0.8;
}
</style>

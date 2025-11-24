<template>
  <div class="headhunting-record">
    <div class="header">
      <h2>寻访记录</h2>
      <div class="actions">
        <button @click="refreshData" :disabled="loading" class="refresh-btn">
          <span v-if="loading">刷新中...</span>
          <span v-else>刷新</span>
        </button>
      </div>
    </div>

    <div v-if="loading && !gachaPools.length" class="loading">
      <div class="loading-spinner"></div>
      <p>加载寻访记录中...</p>
    </div>

    <div v-else-if="error" class="error">
      <p>{{ error }}</p>
      <button @click="refreshData" class="retry-btn">重试</button>
    </div>

    <div v-else-if="!gachaPools.length" class="empty">
      <p>暂无寻访记录</p>
    </div>

    <div v-else class="pools-container">
      <div 
        v-for="pool in gachaPools" 
        :key="pool.id" 
        class="pool-card"
      >
        <div class="pool-header">
          <div class="pool-badge">
            <span class="badge-text">{{ getPoolBadge(pool.name) }}</span>
          </div>
          <h3 class="pool-name">{{ pool.name }}</h3>
          <div class="pool-stats">
            <span class="total-pulls">总抽数: {{ pool.totalPulls }}</span>
            <span class="six-star-count">6星: {{ pool.sixStarCount }}</span>
          </div>
        </div>

        <div class="pool-content">
          <div v-if="pool.sixStars.length === 0" class="no-six-star">
            <p>暂未获得6星干员</p>
          </div>
          
          <div v-else class="six-stars-list">
            <div 
              v-for="(star, index) in pool.sixStars" 
              :key="index"
              class="six-star-item"
            >
              <div class="character-info">
                <img 
                  :src="getCharacterAvatar(star.name)"
                  :alt="star.name"
                  class="character-avatar"
                  @error="handleImageError"
                  @load="handleImageLoad"
                />
                <div class="character-details">
                  <h4 class="character-name">{{ star.name }}</h4>
                  <p class="pull-info">第 {{ star.pullCount }} 抽获得</p>
                </div>
              </div>
              
              <div class="progress-container">
                <div class="progress-bar">
                  <div 
                    class="progress-fill"
                    :style="{ width: getProgressWidth(star.pullCount) }"
                  ></div>
                </div>
                <span class="progress-text">{{ star.pullCount }}抽</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useAuthStore } from '@stores/auth';
import { GachaAPI, type GachaCategory, type GachaRecord } from '@services/api';
import { useGameDataStore } from '@stores/gameData';
import { logger } from '@services/logger';

interface SixStarRecord {
  name: string;
  pullCount: number;
  timestamp: number;
}

interface GachaPool {
  id: string;
  name: string;
  totalPulls: number;
  sixStarCount: number;
  sixStars: SixStarRecord[];
  isLimited: boolean;
}

const authStore = useAuthStore();
const gameDataStore = useGameDataStore();

const loading = ref(false);
const error = ref<string | null>(null);
const gachaCategories = ref<GachaCategory[]>([]);
const gachaRecords = ref<GachaRecord[]>([]);

// 判断是否为限定卡池
const isLimitedPool = (poolName: string): boolean => {
  const limitedKeywords = ['限定', '联合', '跨年', '周年', '庆典', '纪念'];
  return limitedKeywords.some(keyword => poolName.includes(keyword));
};

// 获取卡池标记
const getPoolBadge = (poolName: string): string => {
  if (isLimitedPool(poolName)) {
    return '【限定】';
  }
  return '【常规】';
};

// 获取角色头像URL
const getCharacterAvatar = (characterName: string): string => {
  const charInfoMap = gameDataStore.playerData?.charInfoMap || {};
  
  // 通过角色名称查找charId
  let charId = '';
  for (const [id, info] of Object.entries(charInfoMap)) {
    if (info.name === characterName) {
      charId = id;
      break;
    }
  }
  
  // 如果找到了charId，使用头像获取函数
  if (charId) {
    return gameDataStore.getOperatorAvatarUrl(charId);
  }
  
  // 如果没找到，返回空字符串或默认头像
  return '';
};

// 处理图片加载错误
const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement;
  img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik0yMCAyMEMyMi43NjE0IDIwIDI1IDIyLjIzODYgMjUgMjVDMjUgMjcuNzYxNCAyMi43NjE0IDMwIDIwIDMwQzE3LjIzODYgMzAgMTUgMjcuNzYxNCAxNSAyNUMxNSAyMi4yMzg2IDE3LjIzODYgMjAgMjAgMjBaIiBmaWxsPSIjOUNBM0FGIi8+Cjwvc3ZnPgo=';
};

// 处理图片加载成功
const handleImageLoad = () => {
  // 可以在这里添加加载成功的逻辑
};

// 计算进度条宽度（最大100抽显示为满条）
const getProgressWidth = (pullCount: number): string => {
  const maxPulls = 100;
  const percentage = Math.min((pullCount / maxPulls) * 100, 100);
  return `${percentage}%`;
};

// 处理抽卡记录，按卡池分组
const gachaPools = computed((): GachaPool[] => {
  const poolMap = new Map<string, GachaPool>();
  
  // 初始化所有卡池
  gachaCategories.value.forEach(category => {
    poolMap.set(category.id, {
      id: category.id,
      name: category.name,
      totalPulls: 0,
      sixStarCount: 0,
      sixStars: [],
      isLimited: isLimitedPool(category.name)
    });
  });
  
  // 处理抽卡记录
  gachaRecords.value.forEach(record => {
    const pool = poolMap.get(record.pool);
    if (!pool) return;
    
    // 增加总抽数
    pool.totalPulls += record.chars.length;
    
    // 检查6星干员
    record.chars.forEach(char => {
      if (char.rarity === 6) {
        pool.sixStarCount++;
        
        // 查找这是第几抽获得的6星
        const pullIndex = record.chars.indexOf(char) + 1;
        const totalPullsForThis6Star = pool.totalPulls - record.chars.length + pullIndex;
        
        pool.sixStars.push({
          name: char.name,
          pullCount: totalPullsForThis6Star,
          timestamp: record.ts
        });
      }
    });
  });
  
  // 按时间排序6星记录
  poolMap.forEach(pool => {
    pool.sixStars.sort((a, b) => a.timestamp - b.timestamp);
  });
  
  return Array.from(poolMap.values()).filter(pool => pool.totalPulls > 0);
});

// 获取卡池分类
const fetchGachaCategories = async (): Promise<void> => {
  try {
    const uid = authStore.mainUid;
    if (!uid) {
      throw new Error('未找到用户UID');
    }
    
    // 获取认证凭证
    const { cred, token: signToken } = await authStore.ensureSklandCred();
    
    logger.debug('获取卡池分类', { uid });
    gachaCategories.value = await GachaAPI.getGachaCategories(cred, signToken, uid);
    logger.info('成功获取卡池分类', { count: gachaCategories.value.length });
  } catch (err) {
    logger.error('获取卡池分类失败', err);
    throw err;
  }
};

// 获取抽卡记录
const fetchGachaRecords = async (): Promise<void> => {
  try {
    const uid = authStore.mainUid;
    if (!uid) {
      throw new Error('未找到用户UID');
    }
    
    // 获取认证凭证
    const { cred, token: signToken } = await authStore.ensureSklandCred();
    
    const allRecords: GachaRecord[] = [];
    
    // 为每个卡池获取记录
    for (const category of gachaCategories.value) {
      try {
        logger.debug('获取卡池记录', { categoryId: category.id, poolName: category.name });
        
        const response = await GachaAPI.getGachaRecords(cred, signToken, uid, category.id, 100);
        allRecords.push(...response.list);
        
        // 如果还有更多记录，继续获取
        let currentResponse = response;
        while (currentResponse.hasMore && currentResponse.nextGachaTs) {
          currentResponse = await GachaAPI.getMoreGachaRecords(
            cred,
            signToken,
            uid,
            category.id,
            currentResponse.nextGachaTs,
            currentResponse.nextPos,
            100
          );
          allRecords.push(...currentResponse.list);
        }
        
        logger.debug('成功获取卡池记录', { 
          categoryId: category.id, 
          recordCount: response.list.length 
        });
      } catch (err) {
        logger.warn('获取单个卡池记录失败', { categoryId: category.id, error: err });
        // 继续处理其他卡池
      }
    }
    
    // 按时间排序记录（最新的在前）
    gachaRecords.value = allRecords.sort((a, b) => b.ts - a.ts);
    logger.info('成功获取所有抽卡记录', { totalCount: gachaRecords.value.length });
  } catch (err) {
    logger.error('获取抽卡记录失败', err);
    throw err;
  }
};

// 刷新数据
const refreshData = async (): Promise<void> => {
  loading.value = true;
  error.value = null;
  
  try {
    await fetchGachaCategories();
    await fetchGachaRecords();
    logger.info('寻访记录刷新成功');
  } catch (err) {
    logger.error('刷新寻访记录失败', err);
    error.value = err instanceof Error ? err.message : '刷新失败，请重试';
  } finally {
    loading.value = false;
  }
};

// 组件挂载时加载数据
onMounted(() => {
  if (authStore.isLogin && authStore.mainUid) {
    refreshData();
  }
});
</script>

<style scoped>
.headhunting-record {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header h2 {
  margin: 0;
  color: #333;
  font-size: 24px;
  font-weight: 600;
}

.actions {
  display: flex;
  gap: 12px;
}

.refresh-btn, .retry-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  background-color: #1890ff;
  color: white;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.refresh-btn:hover, .retry-btn:hover {
  background-color: #40a9ff;
}

.refresh-btn:disabled {
  background-color: #d9d9d9;
  cursor: not-allowed;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #1890ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error, .empty {
  text-align: center;
  padding: 60px 20px;
  color: #666;
}

.error {
  color: #ff4d4f;
}

.pools-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
}

.pool-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
}

.pool-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.pool-header {
  padding: 16px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.pool-badge {
  display: inline-block;
  background: rgba(255, 255, 255, 0.2);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  margin-bottom: 8px;
}

.badge-text {
  color: #fff;
}

.pool-name {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
}

.pool-stats {
  display: flex;
  gap: 16px;
  font-size: 14px;
  opacity: 0.9;
}

.pool-content {
  padding: 20px;
}

.no-six-star {
  text-align: center;
  padding: 40px 20px;
  color: #999;
}

.six-stars-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.six-star-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #ffd700;
}

.character-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.character-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.character-details {
  flex: 1;
}

.character-name {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.pull-info {
  margin: 0;
  font-size: 12px;
  color: #666;
}

.progress-container {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 120px;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: #e9ecef;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #ffd700, #ffed4e);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 12px;
  color: #666;
  font-weight: 500;
  min-width: 40px;
  text-align: right;
}

@media (max-width: 768px) {
  .pools-container {
    grid-template-columns: 1fr;
  }
  
  .six-star-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .progress-container {
    width: 100%;
  }
}
</style>
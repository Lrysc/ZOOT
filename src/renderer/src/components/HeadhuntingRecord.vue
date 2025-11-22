<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useAuthStore } from '@stores/auth';
import { GachaAPI } from '@services/api';
import { showSuccess, showError, showWarning, showInfo } from '@services/toastService';

// ==================== Store实例 ====================
const authStore = useAuthStore();

// ==================== 数据类型定义 ====================
interface GachaCategory {
  cateName: string;
  category: string;
  count: number;
}

interface GachaRecord {
  ts: number;
  pool: string;
  chars: Array<{
    name: string;
    rarity: number;
    isNew: boolean;
  }>;
}

interface PoolRecords {
  [poolName: string]: GachaRecord[];
}

// ==================== 响应式状态 ====================
const gachaCategories = ref<GachaCategory[]>([]);
const selectedCategory = ref<string>('');
const poolRecords = ref<PoolRecords>({});
const isLoading = ref(false);
const isRefreshing = ref(false);
const errorMsg = ref('');

// 分页状态
const currentPages = ref<{ [poolName: string]: number }>({});
const recordsPerPage = 20;
const hasMoreRecords = ref<{ [poolName: string]: boolean }>({});

// ==================== 计算属性 ====================
const mainUid = computed(() => {
  return authStore.bindingRoles.find(role => role.isDefault)?.uid || authStore.bindingRoles[0]?.uid || '';
});

const hasValidCredentials = computed(() => {
  return authStore.isLogin && authStore.isCredentialsReady;
});

const sortedCategories = computed(() => {
  return [...gachaCategories.value].sort((a, b) => b.count - a.count);
});

const hasData = computed(() => {
  return Object.keys(poolRecords.value).length > 0;
});

// ==================== 方法定义 ====================

/**
 * 加载卡池分类
 */
const loadGachaCategories = async () => {
  if (!hasValidCredentials.value || !mainUid.value) {
    showWarning('请先登录并选择角色');
    return;
  }

  isLoading.value = true;
  errorMsg.value = '';

  try {
    const categories = await GachaAPI.getGachaCategories(
      authStore.sklandCred,
      authStore.sklandSignToken,
      mainUid.value
    );

    gachaCategories.value = categories;

    if (categories.length > 0 && !selectedCategory.value) {
      selectedCategory.value = categories[0].category;
    }

    showSuccess('卡池分类加载成功');
  } catch (error: any) {
    const errorMessage = error?.message || '加载卡池分类失败';
    console.error('加载卡池分类失败:', error);
    errorMsg.value = errorMessage;
    showError(errorMessage);
  } finally {
    isLoading.value = false;
  }
};

/**
 * 加载抽卡记录
 */
const loadGachaRecords = async (category: string, loadMore: boolean = false) => {
  if (!hasValidCredentials.value || !mainUid.value) {
    showWarning('请先登录并选择角色');
    return;
  }

  if (!loadMore) {
    isRefreshing.value = true;
  }
  errorMsg.value = '';

  try {
    let records;
    const poolName = getPoolNameByCategory(category);

    if (loadMore && poolRecords.value[poolName]?.length) {
      const lastRecord = poolRecords.value[poolName][poolRecords.value[poolName].length - 1];
      records = await GachaAPI.getMoreGachaRecords(
        authStore.sklandCred,
        authStore.sklandSignToken,
        mainUid.value,
        category,
        lastRecord.ts,
        1,
        recordsPerPage
      );
    } else {
      records = await GachaAPI.getGachaRecords(
        authStore.sklandCred,
        authStore.sklandSignToken,
        mainUid.value,
        category,
        recordsPerPage
      );
    }

    if (!poolRecords.value[poolName]) {
      poolRecords.value[poolName] = [];
    }

    if (loadMore) {
      poolRecords.value[poolName].push(...records.list);
    } else {
      poolRecords.value[poolName] = records.list;
    }

    // 更新分页状态
    if (!currentPages.value[poolName]) {
      currentPages.value[poolName] = 1;
    }

    // 检查是否还有更多记录
    hasMoreRecords.value[poolName] = records.list.length === recordsPerPage;

    if (loadMore) {
      showSuccess(`加载了 ${records.list.length} 条抽卡记录`);
    } else {
      showSuccess(`抽卡记录加载成功，共 ${records.list.length} 条记录`);
    }
  } catch (error: any) {
    const errorMessage = error?.message || '加载抽卡记录失败';
    console.error('加载抽卡记录失败:', error);
    errorMsg.value = errorMessage;
    showError(errorMessage);
  } finally {
    isRefreshing.value = false;
  }
};

/**
 * 根据分类获取卡池名称
 */
const getPoolNameByCategory = (category: string): string => {
  const categoryObj = gachaCategories.value.find(cat => cat.category === category);
  return categoryObj?.cateName || category;
};

/**
 * 处理分类选择变化
 */
const handleCategoryChange = () => {
  if (selectedCategory.value) {
    const poolName = getPoolNameByCategory(selectedCategory.value);
    if (!poolRecords.value[poolName]) {
      loadGachaRecords(selectedCategory.value);
    }
  }
};

/**
 * 加载更多记录
 */
const loadMoreRecords = (poolName: string) => {
  const category = gachaCategories.value.find(cat => cat.cateName === poolName)?.category;
  if (category) {
    currentPages.value[poolName] = (currentPages.value[poolName] || 0) + 1;
    loadGachaRecords(category, true);
  }
};

/**
 * 格式化时间戳
 */
const formatTimestamp = (timestamp: number): string => {
  return new Date(timestamp * 1000).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * 获取星级显示
 */
const getRarityStars = (rarity: number): string => {
  return '★'.repeat(rarity);
};

/**
 * 获取星级颜色
 */
const getRarityColor = (rarity: number): string => {
  const colors = {
    1: '#8c8c8c', // 1星 - 灰色
    2: '#4caf50', // 2星 - 绿色
    3: '#2196f3', // 3星 - 蓝色
    4: '#9c27b0', // 4星 - 紫色
    5: '#ff9800', // 5星 - 橙色
    6: '#ff0000'  // 6星 - 红色
  };
  return colors[rarity as keyof typeof colors] || '#8c8c8c';
};

/**
 * 刷新数据
 */
const refreshData = async () => {
  if (selectedCategory.value) {
    await loadGachaRecords(selectedCategory.value);
  } else if (gachaCategories.value.length > 0) {
    selectedCategory.value = gachaCategories.value[0].category;
  }
};

// ==================== 生命周期 ====================
onMounted(async () => {
  if (hasValidCredentials.value && mainUid.value) {
    await loadGachaCategories();
  }
});

// 监听登录状态变化
watch(() => authStore.isLogin, async (newVal) => {
  if (newVal && hasValidCredentials.value && mainUid.value) {
    await loadGachaCategories();
  } else {
    // 重置状态
    gachaCategories.value = [];
    selectedCategory.value = '';
    poolRecords.value = {};
    currentPages.value = {};
    hasMoreRecords.value = {};
  }
});

// 监听选中的分类变化
watch(selectedCategory, (newCategory) => {
  if (newCategory) {
    handleCategoryChange();
  }
});
</script>

<template>
  <div class="gacha-history-container">
    <!-- 头部操作栏 -->
    <div class="gacha-header">
      <h2 class="title">抽卡记录查询</h2>
      <div class="header-actions">
        <button
          class="refresh-btn"
          @click="refreshData"
          :disabled="isRefreshing || !selectedCategory"
        >
          {{ isRefreshing ? '刷新中...' : '刷新数据' }}
        </button>
      </div>
    </div>

    <!-- 错误提示 -->
    <div v-if="errorMsg" class="error-message">
      {{ errorMsg }}
    </div>

    <!-- 未登录提示 -->
    <div v-if="!authStore.isLogin" class="login-prompt">
      <div class="prompt-content">
        <h3>请先登录</h3>
        <p>登录后即可查看抽卡记录</p>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-else-if="isLoading" class="loading-container">
      <div class="spinner"></div>
      <p>加载卡池分类中...</p>
    </div>

    <!-- 主内容区域 -->
    <div v-else class="gacha-content">
      <!-- 卡池分类选择 -->
      <div class="category-selector">
        <label for="category-select">选择卡池分类：</label>
        <select
          id="category-select"
          v-model="selectedCategory"
          class="category-select"
          :disabled="gachaCategories.length === 0"
        >
          <option value="" disabled>请选择卡池分类</option>
          <option
            v-for="category in sortedCategories"
            :key="category.category"
            :value="category.category"
          >
            {{ category.cateName }} ({{ category.count }} 次)
          </option>
        </select>
      </div>

      <!-- 抽卡记录展示 -->
      <div v-if="hasData" class="gacha-records">
        <div
          v-for="(records, poolName) in poolRecords"
          :key="poolName"
          class="pool-section"
        >
          <h3 class="pool-title">{{ poolName }}</h3>

          <!-- 抽卡记录表格 -->
          <div class="records-table-container">
            <table class="records-table">
              <thead>
              <tr>
                <th width="80">序号</th>
                <th width="120">时间</th>
                <th>干员</th>
                <th width="100">星级</th>
                <th width="80">状态</th>
              </tr>
              </thead>
              <tbody>
              <tr
                v-for="(record, index) in records"
                :key="`${record.ts}-${index}`"
                class="record-row"
              >
                <td class="index-cell">{{ records.length - index }}</td>
                <td class="time-cell">{{ formatTimestamp(record.ts) }}</td>
                <td class="char-cell">
                  <span class="char-name">{{ record.chars[0]?.name || '未知' }}</span>
                </td>
                <td class="rarity-cell">
                    <span
                      class="rarity-stars"
                      :style="{ color: getRarityColor(record.chars[0]?.rarity || 3) }"
                    >
                      {{ getRarityStars(record.chars[0]?.rarity || 3) }}
                    </span>
                </td>
                <td class="status-cell">
                    <span
                      v-if="record.chars[0]?.isNew"
                      class="new-badge"
                    >
                      新获得
                    </span>
                  <span v-else class="duplicate-text">重复</span>
                </td>
              </tr>
              </tbody>
            </table>
          </div>

          <!-- 加载更多按钮 -->
          <div v-if="hasMoreRecords[poolName]" class="load-more-section">
            <button
              class="load-more-btn"
              @click="loadMoreRecords(poolName)"
              :disabled="isRefreshing"
            >
              {{ isRefreshing ? '加载中...' : '加载更多记录' }}
            </button>
          </div>

          <!-- 没有更多记录的提示 -->
          <div v-else-if="records.length > 0" class="no-more-records">
            <p>已显示所有记录</p>
          </div>
        </div>
      </div>

      <!-- 无数据提示 -->
      <div v-else-if="selectedCategory && !isRefreshing" class="no-data">
        <p>暂无抽卡记录数据</p>
      </div>

      <!-- 等待选择分类提示 -->
      <div v-else-if="!selectedCategory && gachaCategories.length > 0" class="select-prompt">
        <p>请选择上方的卡池分类来查看抽卡记录</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gacha-history-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  min-height: 100vh;
}

/* 头部样式 */
.gacha-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #404040;
}

.title {
  color: #9feaf9;
  font-size: 24px;
  font-weight: 600;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.refresh-btn {
  padding: 8px 16px;
  background: #646cff;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s ease;
}

.refresh-btn:hover:not(:disabled) {
  background: #535bf2;
  transform: translateY(-1px);
}

.refresh-btn:disabled {
  background: #666;
  cursor: not-allowed;
  opacity: 0.6;
}

/* 错误提示 */
.error-message {
  background: #ff4757;
  color: white;
  padding: 12px 16px;
  border-radius: 6px;
  margin-bottom: 20px;
  text-align: center;
}

/* 登录提示 */
.login-prompt {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 300px;
  background: #2d2d2d;
  border-radius: 8px;
  border: 1px solid #404040;
}

.prompt-content {
  text-align: center;
}

.prompt-content h3 {
  color: #9feaf9;
  margin-bottom: 8px;
}

.prompt-content p {
  color: #999;
}

/* 加载状态 */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  gap: 16px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(100, 108, 255, 0.2);
  border-top: 4px solid #646cff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* 分类选择器 */
.category-selector {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  padding: 16px;
  background: #2d2d2d;
  border-radius: 8px;
  border: 1px solid #404040;
}

.category-selector label {
  color: #ccc;
  font-weight: 500;
}

.category-select {
  padding: 8px 12px;
  background: #333;
  color: #ccc;
  border: 1px solid #555;
  border-radius: 4px;
  min-width: 200px;
}

.category-select:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 卡池区域 */
.pool-section {
  background: #2d2d2d;
  border-radius: 8px;
  border: 1px solid #404040;
  margin-bottom: 24px;
  overflow: hidden;
}

.pool-title {
  background: #333;
  color: #9feaf9;
  font-size: 18px;
  font-weight: 600;
  padding: 16px 20px;
  margin: 0;
  border-bottom: 1px solid #404040;
}

/* 表格容器 */
.records-table-container {
  overflow-x: auto;
}

.records-table {
  width: 100%;
  border-collapse: collapse;
  background: #2d2d2d;
}

.records-table th {
  background: #333;
  color: #9feaf9;
  padding: 12px 8px;
  text-align: left;
  font-weight: 600;
  border-bottom: 1px solid #404040;
}

.records-table td {
  padding: 12px 8px;
  border-bottom: 1px solid #404040;
  color: #ccc;
}

.record-row:hover {
  background: #3a3a3a;
}

/* 表格单元格特定样式 */
.index-cell {
  text-align: center;
  color: #999;
  font-size: 14px;
}

.time-cell {
  font-size: 13px;
  color: #aaa;
}

.char-cell {
  font-weight: 500;
}

.char-name {
  color: #fad000;
}

.rarity-cell {
  text-align: center;
}

.rarity-stars {
  font-weight: bold;
  font-size: 16px;
}

.status-cell {
  text-align: center;
}

.new-badge {
  background: #4caf50;
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.duplicate-text {
  color: #999;
  font-size: 12px;
}

/* 加载更多区域 */
.load-more-section {
  padding: 20px;
  text-align: center;
  border-top: 1px solid #404040;
}

.load-more-btn {
  padding: 10px 20px;
  background: #646cff;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s ease;
}

.load-more-btn:hover:not(:disabled) {
  background: #535bf2;
  transform: translateY(-1px);
}

.load-more-btn:disabled {
  background: #666;
  cursor: not-allowed;
  opacity: 0.6;
}

/* 无更多记录提示 */
.no-more-records {
  padding: 16px;
  text-align: center;
  color: #999;
  border-top: 1px solid #404040;
}

/* 无数据提示 */
.no-data, .select-prompt {
  text-align: center;
  padding: 40px 20px;
  color: #999;
  background: #2d2d2d;
  border-radius: 8px;
  border: 1px solid #404040;
}

/* 动画 */
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .gacha-history-container {
    padding: 16px;
  }

  .gacha-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }

  .category-selector {
    flex-direction: column;
    align-items: flex-start;
  }

  .category-select {
    min-width: 100%;
  }

  .records-table {
    font-size: 14px;
  }

  .records-table th,
  .records-table td {
    padding: 8px 4px;
  }
}
</style>

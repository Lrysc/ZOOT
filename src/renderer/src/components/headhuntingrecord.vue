<template>
  <div class="headhunting-record">
    <div class="header">
      <h2>寻访记录</h2>
      <div class="actions">
        <!-- 统一的格式选择 -->
        <div class="format-select-wrapper" ref="formatSelectWrapper">
          <button
            class="format-select-button"
            @click="toggleFormatDropdown"
            :class="{ 'active': showFormatDropdown }"
          >
            {{ exportFormat === 'native' ? '原始格式' : '通用格式' }}
            <span class="dropdown-arrow" :class="{ 'rotated': showFormatDropdown }">▼</span>
          </button>
          <div class="format-dropdown" :class="{ 'show': showFormatDropdown }">
            <div
              class="format-option"
              :class="{ 'selected': exportFormat === 'native' }"
              @click="selectFormat('native')"
            >
              原始格式
            </div>
            <div
              class="format-option"
              :class="{ 'selected': exportFormat === 'official' }"
              @click="selectFormat('official')"
            >
              通用格式
            </div>
          </div>
        </div>

        <!-- 导出按钮组 -->
        <div class="export-buttons">
          <button @click="exportGachaData" class="export-btn" title="导出当前账号记录" :disabled="exportLoading">
            {{ exportLoading ? '导出中...' : '导出记录' }}
          </button>
          <button
            v-if="importedData.length > 0 || categories.length > 0"
            @click="exportMergedAllData"
            class="export-merged-btn"
            title="导出合并后的所有数据"
            :disabled="exportLoading"
          >
            合并导出
          </button>
        </div>

        <!-- 导入按钮 -->
        <button @click="importGachaData" class="import-btn" title="导入寻访记录">
          导入记录
        </button>
      </div>
    </div>

    <!-- 合成玉花费统计 -->
    <div v-if="!authStore.isLogin || (categories.length > 0 && !selectedCategory)" class="cost-statistics">
      <div class="statistics-card">
        <div class="statistics-info">
          <h4>总抽数</h4>
          <p class="total-pulls">{{ getTotalPulls() }} 抽</p>
        </div>
        <div class="statistics-divider"></div>
        <div class="statistics-cost">
          <h4>大约消耗</h4>
          <p class="total-cost">
            {{ getTotalOrundumCost() }}
            <img src="@assets/item/DIAMOND_SHD.png" alt="合成玉" class="DIAMOND_SHD" />
          </p>
        </div>
      </div>
    </div>

    <!-- 导出加载显示 -->
    <div v-if="exportLoading" class="export-loading-overlay">
      <div class="export-loading-content">
        <div class="export-loading-spinner"></div>
        <p>正在导出寻访记录，请稍候...</p>
        <p class="export-progress">{{ exportProgress }}</p>
      </div>
    </div>

    <!-- 登录提示 -->
    <div v-if="!authStore.isLogin" class="login-prompt">
      <div class="prompt-content">
        <img src="@assets/icon_user.svg" alt="用户图标" class="prompt-icon" />
        <h3>需要登录</h3>
        <p>请先登录鹰角网络通行证以查看寻访记录</p>
        <button @click="handleShowLogin" class="login-btn">立即登录</button>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-else-if="loading" class="loading">
      <div class="loading-spinner"></div>
      <p>{{ loadingText }}</p>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="error">
      <div class="error-content">
        <h3>加载失败</h3>
        <p>{{ error }}</p>
        <button @click="refreshGachaData" class="retry-btn">重试</button>
      </div>
    </div>

    <!-- 卡池列表 -->
    <div v-else-if="!selectedCategory && categories.length > 0" class="categories-list">
      <h3>当期卡池</h3>
      <div class="categories-horizontal">
        <div
          v-for="category in categories"
          :key="category.id"
          class="category-card-horizontal"
        >
          <div class="category-info" @click="toggleCategory(category)">
            <div class="category-type-name">
              <h4>{{ getPoolNameForCategory(category.id) }}</h4>
              <p class="category-poolname">{{ category.name.replace('\n', ' ') }}</p>
            </div>
            <div class="category-count">
              <span class="count-number">{{ getRecordCountForCategory(category.id) }}</span>
              <span class="count-label">抽</span>
            </div>
          </div>

          <!-- 展开的记录显示 -->
          <div v-if="isCategoryExpanded(category.id)" class="category-records">
            <!-- 高光记录显示 -->
            <div class="highlights-container">
              <div
                v-for="(processedRecord, index) in getProcessedRecords(category.id)"
                :key="index"
                class="highlight-record"
                :class="{ 'six-star': processedRecord.record.rarity === 5, 'five-star': processedRecord.record.rarity === 4 }"
              >
                <div class="record-info">
                  <img
                    :src="processedRecord.avatarUrl"
                    :alt="processedRecord.record.charName"
                    class="operator-avatar"
                  />
                  <div class="record-details">
                    <h4 class="operator-name">{{ processedRecord.record.charName }}</h4>

                    <div class="rarity-info">
                      <span class="rarity-badge" :class="`rarity-${processedRecord.record.rarity}`">
                        {{ getRarityText(processedRecord.record.rarity) }}
                      </span>
                    </div>
                    <div class="pull-count">
                      <span class="count-number">{{ processedRecord.pullCount }}</span>
                      <span class="count-text">抽</span>
                    </div>
                    <div class="pool-name-info" v-if="processedRecord.poolName">
                      {{ processedRecord.poolName }}
                    </div>
                    <div class="time-info">
                      {{ formatTime(processedRecord.record.gachaTs) }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- 无高光记录提示 -->
              <div v-if="getProcessedRecords(category.id).length === 0" class="no-highlights">
                <p>{{ selectedPoolName ? '该卡池暂无数据' : '该卡池暂无数据' }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>






    <!-- 卡池详情 -->
    <div v-else-if="selectedCategory && gachaRecords.length > 0" class="pool-details">
      <div class="table-container">
        <table class="gacha-table">
          <thead>
          <tr>
            <th>序号</th>
            <th>干员名称</th>
            <th>星级</th>
            <th>获取时间</th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="(record, index) in currentPageRecords" :key="index">
            <td>{{ getRecordIndex(index) }}</td>
            <td>{{ record.charName }}</td>
            <td>
                <span class="rarity-badge" :class="`rarity-${record.rarity}`">
                  {{ getRarityText(record.rarity) }}
                </span>
            </td>
            <td>{{ formatTime(record.gachaTs) }}</td>
          </tr>
          </tbody>
        </table>
      </div>

      <!-- 分页控件 -->
      <div class="pagination">
        <button
          @click="prevPage"
          :disabled="currentPage === 1 || loading"
          class="page-btn"
        >
          上一页
        </button>

        <span class="page-info">
          第{{ currentPage }}页
        </span>

        <button
          @click="nextPage"
          :disabled="!hasNextPage || loading"
          class="page-btn"
        >
          下一页
        </button>
      </div>
    </div>

    <!-- 无数据状态 -->
    <div v-else-if="selectedCategory && gachaRecords.length === 0" class="no-data">


      <div class="no-data-content">
        <h3>暂无数据</h3>
        <p>该卡池暂无抽卡记录</p>
      </div>
    </div>

    <!-- 无卡池状态 -->
    <div v-else class="no-data">
      <div class="no-data-content">
        <h3>暂无卡池</h3>
        <p>当前账号暂无可用卡池</p>
      </div>
    </div>

    <!-- 已导入的寻访记录 -->
    <div v-if="importedData.length > 0" class="imported-records">
      <div class="imported-header">
        <div>
          <h3>已导入寻访记录</h3>
          <p class="imported-summary">
            共{{ importedData.length }} 个文件，{{ getTotalImportedRecords() }} 条记录
          </p>
        </div>
        <div class="imported-actions">
          <button @click="expandAllImportedFiles" class="expand-btn" title="展开全部">
            全部展开
          </button>
          <button @click="collapseAllImportedFiles" class="expand-btn" title="折叠全部">
            全部折叠
          </button>
          <button @click="clearAllImportedData" class="clear-btn" title="清除导入数据">
            清除数据
          </button>
        </div>
      </div>

      <div class="imported-files">
        <div
          v-for="(file, fileIndex) in importedData"
          :key="fileIndex"
          class="imported-file"
        >
          <div class="file-header" @click="toggleImportedFile(fileIndex)">
            <h4>
              {{ file.fileName }}
              <span class="file-info">
                ({{ file.categories.length }}个卡池，{{ getFileTotalRecords(fileIndex) }}条记录)
              </span>
            </h4>
            <div class="file-meta">
              <span class="file-size">{{ formatFileSize(file.fileSize) }}</span>
              <span class="import-time">{{ new Date(file.importTime).toLocaleString('zh-CN') }}</span>
              <span class="toggle-icon">{{ expandedImportedFiles[fileIndex] ? '▲' : '▼' }}</span>
            </div>
          </div>

          <div v-if="expandedImportedFiles[fileIndex]" class="file-categories">
            <div
              v-for="(category, categoryIndex) in file.categories"
              :key="categoryIndex"
              class="imported-category"
            >
              <h5 @click="toggleImportedCategory(fileIndex, categoryIndex)">
                {{ category.categoryName }}
                <span class="category-info">({{ category.records.length }} 条记录)</span>
                <span class="toggle-icon">{{ expandedImportedCategories[`${fileIndex}-${categoryIndex}`] ? '▲' : '▼' }}</span>
              </h5>

              <div v-if="expandedImportedCategories[`${fileIndex}-${categoryIndex}`]" class="imported-records-display">
                <!-- 高光记录显示 -->
                <div v-if="getProcessedImportedRecords(category.records).length > 0" class="imported-highlights-container">
                  <div
                    v-for="(processedRecord, index) in getProcessedImportedRecords(category.records)"
                    :key="index"
                    class="imported-highlight-record"
                    :class="{ 'six-star': processedRecord.record.rarity === 5, 'five-star': processedRecord.record.rarity === 4 }"
                  >
                    <div class="record-info">
                      <img
                        :src="processedRecord.avatarUrl"
                        :alt="processedRecord.record.charName"
                        class="operator-avatar"
                        @error="handleImageError"
                      />
                      <div class="record-details">
                        <h4 class="operator-name">{{ processedRecord.record.charName }}</h4>
                        <div class="pull-info">
                          <span class="pull-count">{{ processedRecord.pullCount }}</span>
                          <span class="count-label">抽</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 如果没有高光记录，显示提示 -->
                <div v-else class="no-highlights-notice">
                  <p>该卡池暂无五星或六星记录</p>
                </div>
              </div>
            </div>
          </div>

          <div class="file-actions">
            <button @click="clearImportedFile(fileIndex)" class="clear-file-btn" title="清除此文件">
              清除此文件
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 往期卡池 -->
    <div v-if="categories.length > 0" class="categories-list">
      <h3>往期卡池</h3>
      <div class="categories-horizontal">
        <div
          v-for="pastPool in getAllPastPools()"
          :key="pastPool.poolName"
          class="category-card-horizontal"
        >
          <div class="category-info" @click="togglePastPoolExpand(pastPool.poolName)">
            <div class="category-type-name">
              <h4>{{ pastPool.poolName }}</h4>
              <p class="category-poolname">{{ pastPool.categoryName }}</p>
            </div>
            <div class="category-count">
              <span class="count-number">{{ pastPool.records.length }}</span>
              <span class="count-label">抽</span>
            </div>
          </div>

          <!-- 展开的记录显示 -->
          <div v-if="isPastPoolExpanded(pastPool.poolName)" class="category-records">
            <!-- 高光记录显示 -->
            <div class="highlights-container">
              <div
                v-for="(processedRecord, index) in processSinglePoolGroup(pastPool)"
                :key="index"
                class="highlight-record"
                :class="{ 'six-star': processedRecord.record.rarity === 5, 'five-star': processedRecord.record.rarity === 4 }"
              >
                <div class="record-info">
                  <img
                    :src="processedRecord.avatarUrl"
                    :alt="processedRecord.record.charName"
                    class="operator-avatar"
                  />
                  <div class="record-details">
                    <h4 class="operator-name">{{ processedRecord.record.charName }}</h4>

                    <div class="rarity-info">
                      <span class="rarity-badge" :class="`rarity-${processedRecord.record.rarity}`">
                        {{ getRarityText(processedRecord.record.rarity) }}
                      </span>
                    </div>
                    <div class="pull-count">
                      <span class="count-number">{{ processedRecord.pullCount }}</span>
                      <span class="count-text">抽</span>
                    </div>
                    <div class="time-info">
                      {{ formatTime(processedRecord.record.gachaTs) }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- 无高光记录提示 -->
              <div v-if="processSinglePoolGroup(pastPool).length === 0" class="no-highlights">
                <p>该卡池暂无高光记录</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="getAllPastPools().length === 0" class="no-data">
        <p>暂无往期卡池数据</p>
      </div>
    </div>

    <!-- 回到顶部按钮 -->
    <button
      @click="scrollToTop"
      class="back-to-top-btn"
      title="回到顶部"
      v-show="showBackToTop"
    >
      ↑
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useAuthStore } from '@stores/auth';
import {
  getOAuth2Grant,
  getU8TokenByUid,
  roleLogin,
  getGachaCategories,
  getGachaHistory,
  type GachaCategory,
  type GachaRecord,
  type GachaHistoryResponse
} from '@services/Gacha';
import { showToast } from '@services/toastService';
import { logger } from '@services/logger';

// 状态管理
const authStore = useAuthStore();

// 加载状态变量
const loading = ref(false);
const loadingText = ref('');
const error = ref<string | null>(null);

// 导出加载状态
const exportLoading = ref(false);
const exportProgress = ref('');
const exportFormat = ref<'native' | 'official'>('native');
const showFormatDropdown = ref(false);
const formatSelectWrapper = ref<HTMLElement | null>(null);

// 数据状态变量
const categories = ref<GachaCategory[]>([]);
const selectedCategory = ref<GachaCategory | null>(null);
const gachaRecords = ref<GachaRecord[]>([]);
const expandedPastPools = ref<Set<string>>(new Set()); // 展开的往期卡池
const categoryPoolNames = ref<Map<string, string>>(new Map());
const categoryRecordCounts = ref<Map<string, number>>(new Map());
const categoryRecords = ref<Map<string, GachaRecord[]>>(new Map());
const expandedCategories = ref<Set<string>>(new Set());

// 导入数据状态变量 - 重构为支持多文件
const importedData = ref<Array<{
  fileName: string;
  importTime: string;
  fileSize: number;
  categories: Array<{
    categoryName: string;
    categoryId?: string;
    records: GachaRecord[];
  }>;
}>>([]);
const expandedImportedCategories = ref<Record<string, boolean>>({});
const expandedImportedFiles = ref<Record<number, boolean>>({});

// 回到顶部按钮状态
const showBackToTop = ref(false);

// 分页状态变量
const currentPage = ref(1);
const pageSize = 10;
const hasNextPage = ref(false);
const lastRecordPos = ref<number | null>(null);
const lastRecordTs = ref<string | null>(null);

// 计算属性 - 在模板中使用
const currentPageRecords = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  const end = start + pageSize;
  return gachaRecords.value.slice(start, end);
});

// 登录处理 - 在模板中使用
const handleShowLogin = () => {
  logger.info('用户点击登录按钮');
  showToast('请先登录鹰角网络通行证');
};

// 刷新
const refreshGachaData = async () => {
  logger.gacha('开始刷新寻访记录数据', {
    hasMainUid: !!authStore.mainUid,
    uid: authStore.mainUid?.substring(0, 8) + '...'
  });

  if (!authStore.mainUid) {
    const errorMsg = '未找到游戏UID';
    logger.gachaError('刷新寻访记录失败: 未找到游戏UID', {
      hasMainUid: !!authStore.mainUid,
      isLogin: authStore.isLogin
    });

    error.value = errorMsg;
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    logger.gachaDebug('重置寻访记录状态');
    // 重置状态
    categories.value = [];
    selectedCategory.value = null;
    gachaRecords.value = [];
    currentPage.value = 1;
    lastRecordPos.value = null;
    lastRecordTs.value = null;

    // 执行完整的抽卡API流程
    await logger.gachaPerformanceAsync('执行完整寻访记录API流程', async () => {
      await executeGachaFlow();
    });

    logger.gacha('寻访记录数据刷新成功', {
      categoriesCount: categories.value.length,
      firstCategory: categories.value[0]?.name
    });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : '获取抽卡数据失败';
    logger.gachaError('获取抽卡数据失败', {
      error: errorMessage,
      stack: err instanceof Error ? err.stack : undefined,
      uid: authStore.mainUid?.substring(0, 8) + '...'
    });

    console.error('获取抽卡数据失败:', err);
    error.value = errorMessage;
  } finally {
    loading.value = false;
    logger.gachaDebug('寻访记录数据加载状态已更新', { loading: false });
  }
};

const executeGachaFlow = async () => {
  logger.gacha('开始执行寻访记录验证流程', {
    hasHgToken: !!authStore.hgToken,
    hasMainUid: !!authStore.mainUid,
    uid: authStore.mainUid?.substring(0, 8) + '...'
  });

  if (!authStore.hgToken || !authStore.mainUid) {
    const errorMsg = '缺少必要的验证信息';
    logger.gachaError('寻访记录验证失败', {
      hasHgToken: !!authStore.hgToken,
      hasMainUid: !!authStore.mainUid,
      isLogin: authStore.isLogin
    });

    error.value = errorMsg;
    return;
  }

  const uid = authStore.mainUid;

  // 步骤1-4：获取验证凭证
  loadingText.value = '正在获取验证凭证...';
  logger.gachaDebug('开始获取验证凭证流程', { step: 1, uid: uid.substring(0, 8) + '...' });

  // 步骤1：获取token（使用现有的hgToken）
  const token = authStore.hgToken;
  logger.gachaDebug('使用现有hgToken', {
    tokenLength: token.length,
    tokenPrefix: token.substring(0, 20) + '...'
  });

  console.log('使用hgToken:', token.substring(0, 20) + '...');
  console.log('使用UID:', uid);

  // 步骤2：OAuth2授权
  logger.gachaDebug('开始OAuth2授权流程', { step: 2 });
  const oauthData = await logger.gachaPerformanceAsync('OAuth2授权', async () => {
    return await getOAuth2Grant(token);
  });

  logger.gachaDebug('OAuth2授权成功', {
    tokenLength: oauthData.token?.length,
    tokenPrefix: oauthData.token?.substring(0, 20) + '...'
  });

  // 步骤3：获取x-role-token
  logger.gachaDebug('开始获取x-role-token', { step: 3 });
  const roleToken = await logger.gachaPerformanceAsync('获取x-role-token', async () => {
    return await getU8TokenByUid(oauthData.token, uid);
  });

  logger.gachaDebug('x-role-token获取成功', {
    tokenLength: roleToken?.length,
    tokenPrefix: roleToken?.substring(0, 20) + '...'
  });

  // 步骤4：角色登录获取cookie
  logger.gachaDebug('开始角色登录获取cookie', { step: 4 });
  const cookie = await logger.gachaPerformanceAsync('角色登录获取cookie', async () => {
    return await roleLogin(roleToken);
  });

  logger.gachaDebug('角色登录成功', {
    cookieLength: cookie?.length,
    cookiePrefix: cookie?.substring(0, 30) + '...'
  });

  // 步骤5：获取卡池分类列表
  loadingText.value = '正在获取卡池分类列表...';
  logger.gachaDebug('开始获取卡池分类列表', { step: 5 });
  const categoryList = await logger.gachaPerformanceAsync('获取卡池分类列表', async () => {
    return await getGachaCategories(uid, cookie, roleToken, token);
  });

  categories.value = categoryList;
  logger.gacha('卡池分类获取成功', {
    categoriesCount: categoryList.length,
    categories: categoryList.map(cat => ({ id: cat.id, name: cat.name }))
  });

  // 预获取所有卡池的poolName
  loadingText.value = '正在获取卡池详细信息...';
  logger.gachaDebug('开始预获取所有卡池详细信息');
  await logger.gachaPerformanceAsync('预获取卡池详细信息', async () => {
    await loadAllPoolNames(uid, cookie, roleToken, token, categoryList);
  });

  logger.gacha('卡池详细信息预获取完成', {
    poolNamesCount: categoryPoolNames.value.size,
    recordCountsCount: categoryRecordCounts.value.size
  });

  // 将验证信息临时存储，供后续使用
  const authData = {
    uid,
    cookie,
    roleToken,
    accountToken: token
  };
  localStorage.setItem('gacha_auth', JSON.stringify(authData));
  logger.gachaDebug('寻访记录验证信息已保存到本地存储', {
    uid: uid.substring(0, 8) + '...',
    hasAllTokens: !!(cookie && roleToken && token)
  });

  logger.gacha('寻访记录验证流程执行完成');
};



const loadGachaRecords = async () => {
  logger.info('开始加载抽卡记录', {
    hasSelectedCategory: !!selectedCategory.value,
    categoryId: selectedCategory.value?.id,
    categoryName: selectedCategory.value?.name,
    currentPage: currentPage.value,
    pageSize: pageSize,
    hasLastRecordPos: lastRecordPos.value !== null,
    hasLastRecordTs: lastRecordTs.value !== null
  });

  if (!selectedCategory.value || !authStore.mainUid) {
    logger.warn('加载抽卡记录失败: 缺少必要参数', {
      hasSelectedCategory: !!selectedCategory.value,
      hasMainUid: !!authStore.mainUid
    });

    return;
  }

  loading.value = true;
  error.value = null;
  loadingText.value = '正在加载抽卡记录...';

  try {
    // 获取临时验证信息
    const authData = localStorage.getItem('gacha_auth');
    if (!authData) {
      const errorMsg = '验证信息已过期，请重新登录';
      logger.error('加载抽卡记录失败: 验证信息已过期', {
        hasAuthData: false,
        categoryId: selectedCategory.value.id
      });

      error.value = errorMsg;
      return;
    }

    const { uid, cookie, roleToken, accountToken } = JSON.parse(authData);
    logger.debug('从本地存储获取验证凭证信息成功', {
      uid: uid.substring(0, 8) + '...',
      hasCookie: !!cookie,
      hasRoleToken: !!roleToken,
      hasAccountToken: !!accountToken
    });

    // 加载当前页数据
    const response = await logger.performanceAsync('获取抽卡记录API调用', async () => {
      return await getGachaHistory(
        uid,
        cookie,
        roleToken,
        accountToken,
        selectedCategory.value!.id,
        pageSize,
        lastRecordPos.value || undefined,
        lastRecordTs.value || undefined
      );
    });

    logger.debug('抽卡记录API响应', {
      responseListLength: response.list?.length || 0,
      hasMore: response.hasMore,
      currentPage: currentPage.value,
      pageSize: pageSize
    });

    if (currentPage.value === 1) {
      // 第一页直接替换数据
      gachaRecords.value = response.list;
      logger.debug('第一页数据直接替换', {
        recordsCount: response.list.length,
        categoryId: selectedCategory.value.id
      });
    } else {
      // 后续页追加数据
      const previousCount = gachaRecords.value.length;
      gachaRecords.value.push(...response.list);
      logger.debug('后续页数据追加', {
        previousCount: previousCount,
        addedCount: response.list.length,
        totalCount: gachaRecords.value.length,
        currentPage: currentPage.value
      });
    }

    hasNextPage.value = response.hasMore;

    // 更新分页信息
    if (response.list.length > 0) {
      const lastRecord = response.list[response.list.length - 1];
      lastRecordPos.value = lastRecord.pos;
      lastRecordTs.value = lastRecord.gachaTs;
      logger.debug('分页信息已更新', {
        lastRecordPos: lastRecord.pos,
        lastRecordTs: lastRecord.gachaTs,
        hasNextPage: response.hasMore
      });
    } else {
      logger.debug('当前页无数据', {
        currentPage: currentPage.value,
        categoryId: selectedCategory.value.id
      });
    }

    logger.info('抽卡记录加载完成', {
      totalRecords: gachaRecords.value.length,
      currentPage: currentPage.value,
      hasNextPage: response.hasMore,
      categoryId: selectedCategory.value.id
    });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : '加载抽卡记录失败';
    logger.error('加载抽卡记录失败', {
      error: errorMessage,
      stack: err instanceof Error ? err.stack : undefined,
      categoryId: selectedCategory.value?.id,
      currentPage: currentPage.value,
      hasAuthData: !!localStorage.getItem('gacha_auth')
    });

    console.error('加载抽卡记录失败:', err);
    error.value = errorMessage;
  } finally {
    loading.value = false;
    logger.debug('抽卡记录加载状态已更新', { loading: false });
  }
};

// 上一页 - 在模板中使用
const prevPage = () => {
  const oldPage = currentPage.value;
  if (currentPage.value > 1) {
    currentPage.value--;
    logger.debug('用户点击上一页', {
      oldPage: oldPage,
      newPage: currentPage.value
    });
  } else {
    logger.debug('无法切换到上一页', {
      currentPage: currentPage.value,
      isFirstPage: currentPage.value === 1
    });
  }
};

// 下一页 - 在模板中使用
const nextPage = async () => {
  logger.info('用户点击下一页', {
    hasNextPage: hasNextPage.value,
    isLoading: loading.value,
    currentPage: currentPage.value
  });

  if (hasNextPage.value && !loading.value) {
    currentPage.value++;
    logger.debug('切换到下一页', { newPage: currentPage.value });
    await loadGachaRecords();
  } else if (!hasNextPage.value && !loading.value) {
    logger.info('没有更多数据了', {
      currentPage: currentPage.value,
      totalRecords: gachaRecords.value.length
    });
    showToast('没有更多数据了');
  } else {
    logger.debug('无法切换到下一页或正在加载', {
      hasNextPage: hasNextPage.value,
      isLoading: loading.value
    });
  }
};



const getRecordIndex = (index: number) => {
  return (currentPage.value - 1) * pageSize + index + 1;
};

// 获取星级文本 - 在模板中使用
const getRarityText = (rarity: number) => {
  const rarityMap: { [key: number]: string } = {
    1: '二星',
    2: '三星',
    3: '四星',
    4: '五星',
    5: '六星'
  };
  return rarityMap[rarity] || `${rarity}星`;
};

// 格式化时间 - 在模板中使用
const formatTime = (timestamp: string | number) => {
  // 调试信息
  logger.debug('格式化时间戳', {
    timestamp: timestamp,
    type: typeof timestamp
  });

  // 处理不同格式的时间戳
  let date: Date;
  let ts: number;

  // 统一转换为数字
  if (typeof timestamp === 'string') {
    ts = parseFloat(timestamp);
  } else {
    ts = timestamp;
  }

  // 检查是否为有效数字
  if (isNaN(ts)) {
    logger.warn('无效的时间戳格式', { timestamp });
    return '时间格式错误';
  }

  // 判断是毫秒还是秒时间戳
  // 10位数 = 秒级（约1973-2286年）
  // 13位数 = 毫秒级（约1970-2286年）
  if (ts > 1000000000000) {
    // 毫秒级时间戳
    date = new Date(ts);
    logger.debug('使用毫秒级时间戳', { timestamp, parsedDate: date.toISOString() });
  } else if (ts > 1000000000) {
    // 秒级时间戳，转换为毫秒
    date = new Date(ts * 1000);
    logger.debug('使用秒级时间戳', { timestamp, parsedDate: date.toISOString() });
  } else {
    logger.warn('时间戳超出合理范围', { timestamp });
    return '时间戳异常';
  }

  // 检查日期是否有效
  if (isNaN(date.getTime())) {
    logger.warn('无效的日期', { timestamp, date });
    return '日期无效';
  }

  // 检查日期是否合理（不能是未来时间，不能太早）
  const now = Date.now();
  const minDate = new Date('2020-01-01').getTime();

  if (date.getTime() > now) {
    logger.warn('时间戳是未来时间', { timestamp, date: date.toISOString() });
  } else if (date.getTime() < minDate) {
    logger.warn('时间戳过早', { timestamp, date: date.toISOString() });
  }

  const formatted = date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  logger.debug('时间戳格式化完成', { timestamp, formatted });
  return formatted;
};

// 格式化文件大小
const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getPoolNameForCategory = (categoryId: string) => {
  return categoryPoolNames.value.get(categoryId) || '';
};

const getRecordCountForCategory = (categoryId: string) => {
  // 只计算当期卡池的抽数
  const poolGroups = poolGroupsForCategory.value.get(categoryId);
  if (!poolGroups) return 0;

  const currentPoolName = getCurrentPoolName(categoryId);
  if (!currentPoolName) return 0;

  const group = poolGroups.get(currentPoolName);
  if (!group) return 0;

  return group.records.length;
};

// 计算总抽数
const getTotalPulls = () => {
  let total = 0;
  categoryRecordCounts.value.forEach((count) => {
    total += count;
  });
  return total.toLocaleString();
};

// 计算总合成玉花费（每抽600合成玉）
const getTotalOrundumCost = () => {
  let total = 0;
  categoryRecordCounts.value.forEach((count) => {
    total += count;
  });
  return (total * 600).toLocaleString();
};

// 切换卡池展开状态
const toggleCategory = async (category: GachaCategory) => {
  const categoryId = category.id;

  logger.info('toggleCategory 被调用', { categoryId, categoryName: category.name });

  if (expandedCategories.value.has(categoryId)) {
    // 如果已展开，则折叠
    expandedCategories.value.delete(categoryId);
    logger.info('折叠卡池', { categoryId, categoryName: category.name });
  } else {
    // 如果未展开，则展开并加载数据
    expandedCategories.value.add(categoryId);
    logger.info('展开卡池', { categoryId, categoryName: category.name });

    // 如果还没有加载过该卡池的记录，则加载
    if (!categoryRecords.value.has(categoryId)) {
      await loadCategoryRecords(category);
    }
  }

  // 重置选中的 poolName
  selectedPoolName.value = null;
};

// 按 poolName 分组的记录（在卡池记录加载后）- 按 categoryId 索引
const poolGroupsForCategory = ref<Map<string, Map<string, { poolName: string; records: GachaRecord[] }>>>(new Map());

// 加载单个卡池的记录
const loadCategoryRecords = async (category: GachaCategory) => {
  logger.info('开始加载卡池记录', {
    categoryId: category.id,
    categoryName: category.name
  });

  try {
    // 获取临时验证信息
    const authData = localStorage.getItem('gacha_auth');
    if (!authData) {
      logger.error('加载卡池记录失败: 验证信息已过期');
      showToast('验证信息已过期，请重新登录');
      return;
    }

    const { uid, cookie, roleToken, accountToken } = JSON.parse(authData);

    // 获取该卡池的所有记录
    const allRecords: GachaRecord[] = [];
    let currentPos: number | undefined = 0;
    let currentTs: string | undefined;
    let hasMore = true;
    let pageCount = 0;

    while (hasMore) {
      pageCount++;
      const response = await logger.performanceAsync(`加载卡池${category.name}第${pageCount}页`, async () => {
        return await getGachaHistory(
          uid,
          cookie,
          roleToken,
          accountToken,
          category.id,
          20, // 每页20条记录
          currentPos,
          currentTs
        );
      });

      if (response && response.list && Array.isArray(response.list)) {
        allRecords.push(...response.list);
        hasMore = response.hasMore;

        if (response.list.length > 0) {
          const lastRecord = response.list[response.list.length - 1];
          currentPos = lastRecord.pos;
          currentTs = lastRecord.gachaTs;
        } else {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }

      // 防止请求过多，最多加载200条
      if (allRecords.length >= 200) {
        hasMore = false;
        logger.warn(`卡池${category.name}记录过多，限制加载200条`, {
          totalRecords: allRecords.length
        });
      }
    }

    // 按时间戳和位置排序记录（从早到晚，相同时间戳内按pos从小到大）
    allRecords.sort((a, b) => {
      // 先按时间戳排序
      const timeA = parseFloat(a.gachaTs);
      const timeB = parseFloat(b.gachaTs);
      if (timeA !== timeB) {
        return timeA - timeB; // 升序排列，最早的在前
      }
      // 相同时间戳内按pos排序（十连抽的顺序）
      return a.pos - b.pos;
    });

    // 保存排序后的记录到Map中
    categoryRecords.value.set(category.id, allRecords);

    // 按 poolName 分组记录（相同 poolName 的记录合并）
    const poolGroups = new Map<string, { poolName: string; records: GachaRecord[] }>();
    allRecords.forEach((record) => {
      const poolName = record.poolName || '未知卡池';
      if (!poolGroups.has(poolName)) {
        poolGroups.set(poolName, { poolName, records: [] });
      }
      poolGroups.get(poolName)!.records.push(record);
    });
    // 将分组的记录按 categoryId 存储
    poolGroupsForCategory.value.set(category.id, poolGroups);

    logger.info('卡池记录加载完成', {
      categoryId: category.id,
      categoryName: category.name,
      recordCount: allRecords.length,
      poolGroupsCount: poolGroups.size,
      pageCount: pageCount
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    logger.error('加载卡池记录失败', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      categoryId: category.id,
      categoryName: category.name
    });

    showToast(`加载卡池 ${category.name} 的记录失败: ${errorMessage}`);

    // 加载失败时移除展开状态
    expandedCategories.value.delete(category.id);
  }
};

// 获取卡池的记录
const getCategoryRecords = (categoryId: string) => {
  return categoryRecords.value.get(categoryId) || [];
};

// 检查卡池是否展开
const isCategoryExpanded = (categoryId: string) => {
  return expandedCategories.value.has(categoryId);
};

// 获取当期卡池名字（最新的 poolName）
const getCurrentPoolName = (categoryId: string) => {
  const poolGroups = poolGroupsForCategory.value.get(categoryId);
  if (!poolGroups || poolGroups.size === 0) return '';

  // 按最后一条记录的时间戳排序，最新的为当期卡池
  const pools = Array.from(poolGroups.values());
  pools.sort((a, b) => {
    const lastRecordA = a.records[a.records.length - 1];
    const lastRecordB = b.records[b.records.length - 1];
    const timeA = parseFloat(lastRecordA?.gachaTs || '0');
    const timeB = parseFloat(lastRecordB?.gachaTs || '0');
    return timeB - timeA; // 降序，最新的在前
  });

  return pools[0]?.poolName || '';
};

// 获取所有往期卡池
const getAllPastPools = () => {
  const allPastPools: Array<{
    poolName: string;
    categoryName: string;
    categoryId: string;
    records: GachaRecord[];
  }> = [];

  categories.value.forEach((category) => {
    const poolGroups = poolGroupsForCategory.value.get(category.id);
    if (!poolGroups) return;

    const currentPoolName = getCurrentPoolName(category.id);

    poolGroups.forEach((group) => {
      // 排除当期卡池
      if (group.poolName !== currentPoolName) {
        allPastPools.push({
          poolName: group.poolName,
          categoryName: category.name.replace('\n', ' '),
          categoryId: category.id,
          records: group.records
        });
      }
    });
  });

  // 按最后一条记录的时间戳降序排序（最新的在前）
  allPastPools.sort((a, b) => {
    const lastRecordA = a.records[a.records.length - 1];
    const lastRecordB = b.records[b.records.length - 1];
    const timeA = parseFloat(lastRecordA?.gachaTs || '0');
    const timeB = parseFloat(lastRecordB?.gachaTs || '0');
    return timeB - timeA;
  });

  return allPastPools;
};

// 切换往期卡池的展开状态
const togglePastPoolExpand = (poolName: string) => {
  if (expandedPastPools.value.has(poolName)) {
    expandedPastPools.value.delete(poolName);
  } else {
    expandedPastPools.value.add(poolName);
  }
};

// 检查往期卡池是否展开
const isPastPoolExpanded = (poolName: string) => {
  return expandedPastPools.value.has(poolName);
};

// 处理单个 poolName 分组的记录
const processSinglePoolGroup = (group: { poolName: string; records: GachaRecord[] }) => {
  const { poolName, records } = group;
  const processedRecords: Array<{
    record: GachaRecord;
    pullCount: number;
    avatarUrl: string;
    isHighlight: boolean;
    poolName: string;
  }> = [];

  let pullCount = 0;

  // 按时间顺序遍历记录（从早到晚）
  records.forEach((record) => {
    pullCount++;

    // 如果是六星，添加记录并重置计数
    if (record.rarity === 5) {
      processedRecords.push({
        record,
        pullCount,
        avatarUrl: getAvatarUrl(record.charId),
        isHighlight: true,
        poolName
      });
      pullCount = 0; // 六星重置计数，开始新的计数周期
    }
    // 如果是五星，添加记录但不重置计数
    else if (record.rarity === 4) {
      processedRecords.push({
        record,
        pullCount,
        avatarUrl: getAvatarUrl(record.charId),
        isHighlight: true,
        poolName
      });
      // 五星不重置计数，继续累计到下一个六星
    }
    // 三星和二星不显示，只累计计数
  });

  return processedRecords;
};

// 计算抽数并处理五星/六星显示（按 poolName 分组后）
const getProcessedRecords = (categoryId: string) => {
  const poolGroups = poolGroupsForCategory.value.get(categoryId);
  if (!poolGroups) return [];

  // 只显示当期卡池（最新的 poolName）的记录
  const currentPoolName = getCurrentPoolName(categoryId);
  if (!currentPoolName) return [];

  const group = poolGroups.get(currentPoolName);
  if (!group) return [];

  return processSinglePoolGroup(group);
};

// 处理导入数据的高光显示
const getProcessedImportedRecords = (records: GachaRecord[]) => {
  const processedRecords: Array<{
    record: GachaRecord;
    pullCount: number;
    avatarUrl: string;
    isHighlight: boolean;
  }> = [];

  let pullCount = 0;

  // 按时间戳和位置排序记录（从早到晚，相同时间戳内按pos从小到大）
  const sortedRecords = [...records].sort((a, b) => {
    const timeA = parseFloat(a.gachaTs);
    const timeB = parseFloat(b.gachaTs);
    if (timeA !== timeB) {
      return timeA - timeB;
    }
    return a.pos - b.pos;
  });

  sortedRecords.forEach((record) => {
    pullCount++;

    // 如果是六星，添加记录并重置计数
    if (record.rarity === 5) {
      processedRecords.push({
        record,
        pullCount,
        avatarUrl: getAvatarUrl(record.charId),
        isHighlight: true
      });
      pullCount = 0; // 六星重置计数，开始新的计数周期
    }
    // 如果是五星，添加记录但不重置计数
    else if (record.rarity === 4) {
      processedRecords.push({
        record,
        pullCount,
        avatarUrl: getAvatarUrl(record.charId),
        isHighlight: true
      });
      // 五星不重置计数，继续累计到下一个六星
    }
    // 三星和二星不显示，只累计计数
  });

  return processedRecords;
};

// 处理图片加载错误
const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement;
  if (img) {
    // 设置默认头像或隐藏图片
    img.style.display = 'none';
    logger.warn('干员头像加载失败', {
      src: img.src,
      alt: img.alt
    });
  }
};

// 获取干员头像URL
const getAvatarUrl = (charId: string): string => {
  if (!charId) return '';

  // 使用GitHub ArknightsGameResource项目的CDN来获取头像
  // 明日方舟干员头像CDN格式
  return `https://raw.githubusercontent.com/yuanyan3060/ArknightsGameResource/main/avatar/${charId}.png`;
};



// 根据poolId映射到ci字段
const mapPoolIdToCi = (poolId: string): string => {
  if (!poolId) return '';

  if (poolId.startsWith('LINKAGE_')) {
    return 'mujica';
  } else if (poolId.startsWith('SINGLE_') || poolId.startsWith('NORM_') || poolId.startsWith('SPECIAL_')) {
    return 'normal';
  } else if (poolId.startsWith('LIMITED_')) {
    return 'anniver_fest';
  } else if (poolId.startsWith('CLASSIC_') || poolId.startsWith('FESCLASSIC_')) {
    return 'classic';
  } else if (poolId.startsWith('CLASSIC_DOUBLE_')) {
    return 'classic';
  }

  // 默认返回poolId的前6个字符，或者直接返回poolId
  return poolId.length > 6 ? poolId.substring(0, 6) : poolId;
};

// 转换为官方兼容格式
const convertToOfficialFormat = (rawDataExport: any) => {
  const officialData: any = {};

  // 生成与官方格式完全一致的数据
  rawDataExport.categories.forEach((category: any) => {
    if (category.mergedData && category.mergedData.data && category.mergedData.data.list) {
      // 按时间戳分组，将同一时间戳的记录合并为一次抽卡
      const recordsByTimestamp = new Map<string, any[]>();

      category.mergedData.data.list.forEach((record: any) => {
        const timestamp = record.gachaTs;
        if (!recordsByTimestamp.has(timestamp)) {
          recordsByTimestamp.set(timestamp, []);
        }
        recordsByTimestamp.get(timestamp)!.push(record);
      });

      // 为每个时间戳创建官方格式的记录
      recordsByTimestamp.forEach((records, timestamp) => {
        let ts = parseFloat(timestamp);

        // 如果时间戳是毫秒级，转换为秒级
        if (ts > 1000000000000) {
          ts = ts / 1000;
        }

        // 转换回字符串以保持与官方格式一致，保留小数部分
        const timestampStr = ts.toString();

        // 保持原始的换行符，与官方格式一致
        const poolName = category.categoryInfo.name;

        // 构建角色数组
        const characters: any[][] = [];
        records.forEach(record => {
          if (record.charName) {
            characters.push([record.charName, record.rarity, record.isNew ? 1 : 0]);
          }
        });

        // 创建官方格式记录
        // 按官方顺序创建记录对象：p, pi, c, cn, ci, pos
        const record: any = {};
        record.p = records[0]?.poolName || poolName.replace('\\n', ''); // p字段使用实际的poolName
        record.pi = records[0]?.poolId || category.categoryInfo.id || ''; // pi字段使用实际的poolId
        record.c = characters; // 包含所有角色的数组
        record.cn = poolName; // cn字段保持原始换行符
        // ci字段可能需要特殊映射，暂时使用categoryInfo.id
        record.ci = mapPoolIdToCi(records[0]?.poolId || category.categoryInfo.id || '');
        record.pos = records[0]?.pos || 0;

        officialData[timestampStr] = record;
      });
    }
  });

  return officialData;
};

const exportGachaData = async () => {
  logger.info('开始导出寻访记录', {
    categoriesCount: categories.value.length,
    hasAuthData: !!localStorage.getItem('gacha_auth')
  });

  if (categories.value.length === 0) {
    logger.warn('没有可导出的记录数据', { categoriesCount: 0 });
    showToast('没有可导出的记录数据');
    return;
  }

  exportLoading.value = true;
  exportProgress.value = '准备导出...';
  const exportStartTime = Date.now();

  try {
    // 获取临时验证信息
    const authData = localStorage.getItem('gacha_auth');
    if (!authData) {
      logger.error('导出失败: 验证信息已过期');
      showToast('验证信息已过期，无法导出数据');
      return;
    }

    const { uid, cookie, roleToken, accountToken } = JSON.parse(authData);
    logger.debug('导出验证信息获取成功', {
      uid: uid.substring(0, 8) + '...'
    });

    // 构建原始数据格式的导出对象
    const rawDataExport = {
      exportTime: new Date().toISOString(),
      uid: uid,
      categories: [] as any[]
    };

    const totalCategories = categories.value.length;
    let totalExportedRecords = 0;
    let successfulCategories = 0;

    for (let i = 0; i < totalCategories; i++) {
      const category = categories.value[i];
      const categoryStartTime = Date.now();

      try {
        exportProgress.value = `正在导出卡池 ${i + 1}/${totalCategories}: ${category.name.replace('\n', ' ')}`;
        logger.debug(`开始导出卡池 ${i + 1}/${totalCategories}`, {
          categoryId: category.id,
          categoryName: category.name
        });

        // 使用现有的 getGachaHistory 函数来获取数据
        const allApiResponses: Array<{
          code: number;
          data: GachaHistoryResponse;
          msg: string;
        }> = [];
        const allRecords: GachaRecord[] = [];
        let currentPos: number | undefined = 0; // 第一次请求 pos=0
        let currentTs: string | undefined;
        let hasMore = true;
        let pageCount = 0;

        while (hasMore) {
          pageCount++;
          exportProgress.value = `正在导出卡池 ${i + 1}/${totalCategories}: ${category.name.replace('\n', ' ')} (第${pageCount}页)`;

          const response = await logger.performanceAsync(`导出卡池${category.name}第${pageCount}页`, async () => {
            return await getGachaHistory(
              uid,
              cookie,
              roleToken,
              accountToken,
              category.id,
              10, // 使用较小的分页大小
              currentPos,
              currentTs
            );
          });

          console.log(`导出卡池 ${category.name} 响应:`, response);
          logger.debug(`导出${category.name}第${pageCount}页响应`, {
            listLength: response.list?.length || 0,
            hasMore: response.hasMore
          });

          // 模拟原始API响应格式
          const mockRawData = {
            code: 0,
            data: response,
            msg: ''
          };
          allApiResponses.push(mockRawData);

          // 根据响应结构更新分页参数
          if (response && response.list && Array.isArray(response.list)) {
            hasMore = response.hasMore;
            allRecords.push(...response.list);

            if (response.list.length > 0) {
              // 使用最后一条记录的 pos 和 gachaTs 作为下一页的参数
              const lastRecord = response.list[response.list.length - 1];
              currentPos = lastRecord.pos;
              currentTs = lastRecord.gachaTs;
            } else {
              hasMore = false;
            }
          } else {
            logger.warn(`卡池${category.name}响应格式异常`, { response });
            hasMore = false;
          }
        }

        const categoryDuration = Date.now() - categoryStartTime;
        logger.info(`卡池${category.name}导出完成`, {
          categoryId: category.id,
          categoryName: category.name,
          pageCount: pageCount,
          recordsCount: allRecords.length,
          duration: categoryDuration
        });

        // 构建合并数据，同时保留原始响应
        if (allRecords.length > 0) {
          rawDataExport.categories.push({
            categoryInfo: category,
            apiResponses: allApiResponses,
            mergedData: {
              code: 0,
              data: {
                list: allRecords,
                hasMore: false
              },
              msg: ''
            }
          });
          totalExportedRecords += allRecords.length;
          successfulCategories++;
        } else {
          logger.warn(`卡池${category.name}无记录数据`, {
            categoryId: category.id,
            pageCount: pageCount
          });
        }

      } catch (err: unknown) {
        const categoryDuration = Date.now() - categoryStartTime;
        const errorMessage = err instanceof Error ? err.message : '未知错误';
        logger.error(`导出卡池${category.name}时发生错误`, {
          error: errorMessage,
          stack: err instanceof Error ? err.stack : undefined,
          categoryId: category.id,
          categoryName: category.name,
          duration: categoryDuration
        });
        console.error(`导出卡池 ${category.name} 时出错:`, err);
        showToast(`导出卡池 ${category.name} 时出错: ${errorMessage}`);
      }
    }

    const totalDuration = Date.now() - exportStartTime;
    logger.info('寻访记录导出成功统计', {
      totalCategories: totalCategories,
      successfulCategories: successfulCategories,
      totalExportedRecords: totalExportedRecords,
      totalDuration: totalDuration,
      categoriesWithRecords: rawDataExport.categories.length
    });

    if (rawDataExport.categories.length === 0) {
      logger.warn('没有可导出的记录数据', {
        totalCategories: totalCategories,
        successfulCategories: successfulCategories
      });
      showToast('没有可导出的记录数据');
      return;
    }

    exportProgress.value = '正在生成下载文件...';

    let finalData: any;
    let fileName: string;
    let formatDescription: string;

    if (exportFormat.value === 'official') {
      // 通用格式导出
      finalData = convertToOfficialFormat(rawDataExport);
      // 使用与官方文件完全一致的命名格式：时间戳_official_UID前8位_gacha.json
      fileName = `${new Date().getTime()}_official_${uid.substring(0, 8)}_gacha.json`;
      formatDescription = '通用格式';

      logger.debug('生成通用格式文件', {
        fileName: fileName,
        dataKeysCount: Object.keys(finalData).length,
        uid: uid.substring(0, 8) + '...'
      });
    } else {
      // 原始格式导出
      finalData = rawDataExport;
      fileName = `寻访记录_原始格式_${new Date().toISOString().split('T')[0]}.json`;
      formatDescription = '原始格式';

      logger.debug('生成原始格式文件', {
        fileName: fileName,
        categoriesCount: rawDataExport.categories.length
      });
    }

    // 创建并下载JSON文件
    // 通用格式使用紧凑JSON，其他格式使用格式化JSON
    const dataStr = exportFormat.value === 'official'
      ? JSON.stringify(finalData)
      : JSON.stringify(finalData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    logger.debug('创建下载文件', {
      fileName: fileName,
      fileSize: dataStr.length,
      format: formatDescription
    });

    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    logger.info('寻访记录导出成功', {
      fileName: fileName,
      format: formatDescription,
      totalDuration: totalDuration,
      totalCategories: successfulCategories,
      totalRecords: totalExportedRecords
    });

    showToast(`寻访记录${formatDescription}导出成功`);
  } catch (err: unknown) {
    const totalDuration = Date.now() - exportStartTime;
    const errorMessage = err instanceof Error ? err.message : '未知错误';
    logger.error('导出失败', {
      error: errorMessage,
      stack: err instanceof Error ? err.stack : undefined,
      totalDuration: totalDuration
    });

    console.error('导出失败:', err);
    showToast('导出失败，请重试');
  } finally {
    exportLoading.value = false;
    exportProgress.value = '';
    logger.debug('导出状态已重置', { exportLoading: false });
  }
};

// 导入寻访记录 - 增强版，支持多文件格式和本地存储
const importGachaData = () => {
  logger.info('开始导入寻访记录');

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.multiple = true; // 支持多文件选择

  input.onchange = (event) => {
    const files = (event.target as HTMLInputElement).files;
    if (!files || files.length === 0) {
      logger.warn('用户未选择文件');
      return;
    }

    logger.info('用户选择文件进行导入', {
      fileCount: files.length,
      fileNames: Array.from(files).map(f => f.name)
    });

    // 处理多个文件
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const fileContent = e.target?.result as string;
          logger.debug('开始解析导入文件', {
            fileName: file.name,
            contentLength: fileContent.length
          });

          const data = JSON.parse(fileContent);

          // 解析文件数据
          const importedCategories = parseGachaFileData(data, file.name);

          if (importedCategories.length > 0) {
            // 添加到导入数据列表
            importedData.value.push({
              fileName: file.name,
              importTime: new Date().toISOString(),
              fileSize: file.size,
              categories: importedCategories
            });

            // 保存到本地存储
            saveImportedDataToLocalStorage();

            const totalRecords = importedCategories.reduce((sum, cat) => sum + cat.records.length, 0);
            logger.info('文件导入成功', {
              fileName: file.name,
              importedCategories: importedCategories.length,
              totalRecords: totalRecords
            });
            showToast(`文件 ${file.name} 导入成功，共${importedCategories.length}个分类，${totalRecords}条记录`);
          } else {
            logger.warn('文件没有有效数据', { fileName: file.name });
            showToast(`文件 ${file.name} 没有有效的寻访记录数据`);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '未知错误';
          logger.error('导入文件解析失败', {
            error: errorMessage,
            stack: error instanceof Error ? error.stack : undefined,
            fileName: file.name,
            fileSize: file.size
          });
          console.error('导入失败:', error);
          showToast(`文件 ${file.name} 解析失败，请检查文件格式`);
        }
      };

      reader.onerror = (error) => {
        logger.error('文件读取失败', {
          fileName: file.name,
          error: error
        });
        showToast(`文件 ${file.name} 读取失败`);
      };

      reader.readAsText(file);
    });
  };

  input.click();
};

// 解析寻访记录文件数据的通用函数
const parseGachaFileData = (data: any, fileName: string) => {
  const importedCategories: Array<{
    categoryName: string;
    categoryId?: string;
    records: any[];
  }> = [];

  // 调试：输出文件结构信息
  logger.debug('解析的文件结构', {
    fileName: fileName,
    dataType: typeof data,
    hasInfo: !!(data && typeof data === 'object' && data.info),
    hasData: !!(data && typeof data === 'object' && data.data),
    hasCategories: !!(data && typeof data === 'object' && data.categories),
    hasExportType: !!(data && typeof data === 'object' && data.exportType),
    exportType: data && typeof data === 'object' ? data.exportType : undefined,
    isArray: Array.isArray(data),
    dataKeys: data && typeof data === 'object' ? Object.keys(data) : [],
    infoKeys: data && typeof data === 'object' && data.info ? Object.keys(data.info) : [],
    dataKeysCount: data && typeof data === 'object' && data.data ? Object.keys(data.data).length : 0
  });

  // 检测并处理官方格式（时间戳为键的对象）- 第一个文件格式
  if (data && typeof data === 'object' && !data.info && !data.categories && !Array.isArray(data)) {
    // 官方兼容格式，直接处理数据对象
    logger.debug('检测到官方兼容格式的导出文件', {
      fileName: fileName,
      dataKeysCount: Object.keys(data).length
    });

    // 将官方兼容格式转换为内部格式
    const categoryMap = new Map<string, { categoryName: string; categoryId?: string; records: any[] }>();

    Object.entries(data).forEach(([timestamp, recordInfo]: [string, any]) => {
      if (recordInfo && recordInfo.c && recordInfo.p) {
        const poolName = recordInfo.p;
        const poolId = recordInfo.pi || '';
        const categoryName = recordInfo.cn || poolName;

        // 使用poolId作为分类ID，如果没有poolId则使用poolName
        const categoryKey = poolId || poolName;

        if (!categoryMap.has(categoryKey)) {
          categoryMap.set(categoryKey, {
            categoryName: categoryName,
            categoryId: poolId,
            records: []
          });
        }

        // 转换每条记录 - 处理单抽和十连
        const characterRecords = recordInfo.c;
        if (Array.isArray(characterRecords)) {
          characterRecords.forEach((charInfo: any[], index: number) => {
            if (Array.isArray(charInfo) && charInfo.length >= 2) {
              const [charName, rarity, isNew = 0] = charInfo;
              categoryMap.get(categoryKey)!.records.push({
                charName: charName,
                rarity: rarity,
                isNew: isNew === 1,
                gachaTs: timestamp, // 保持字符串格式，与API一致
                poolId: poolId,
                poolName: poolName,
                pos: recordInfo.pos || index
              });
            }
          });
        }
      }
    });

    importedCategories.push(...Array.from(categoryMap.values()));
  }
  // 检测并处理第二个文件格式（包含info和data字段）
  else if (data && typeof data === 'object' && data.info && data.data) {
    logger.debug('检测到第二种格式的导出文件', {
      fileName: fileName,
      hasInfo: true,
      hasData: true,
      dataKeysCount: Object.keys(data.data).length
    });

    // 处理第二种格式：包含info和data字段
    const categoryMap = new Map<string, { categoryName: string; categoryId?: string; records: any[] }>();

    Object.entries(data.data).forEach(([timestamp, recordInfo]: [string, any]) => {
      if (recordInfo && recordInfo.c && Array.isArray(recordInfo.c)) {
        const poolName = recordInfo.p || '未知卡池';
        const poolId = recordInfo.pi || '';
        const categoryName = recordInfo.cn || poolName;

        // 使用poolId作为分类ID，如果没有poolId则使用poolName
        const categoryKey = poolId || poolName;

        if (!categoryMap.has(categoryKey)) {
          categoryMap.set(categoryKey, {
            categoryName: categoryName,
            categoryId: poolId,
            records: []
          });
        }

        // 转换每条记录
        recordInfo.c.forEach((charInfo: any[], index: number) => {
          if (Array.isArray(charInfo) && charInfo.length >= 2) {
            const [charName, rarity, isNew = 0] = charInfo;
            categoryMap.get(categoryKey)!.records.push({
              charName: charName,
              rarity: rarity,
              isNew: isNew === 1,
              gachaTs: timestamp,
              poolId: poolId,
              poolName: poolName,
              pos: recordInfo.pos || index
            });
          }
        });
      }
    });

    importedCategories.push(...Array.from(categoryMap.values()));
  }
  // 检测并处理合并格式（包含exportType为merged_all_data）
  else if (data && typeof data === 'object' && data.exportType === 'merged_all_data') {
    // 合并格式，处理accountData和importedData
    logger.debug('检测到合并格式的导出文件', {
      fileName: fileName,
      exportType: data.exportType,
      hasAccountData: !!data.accountData,
      hasImportedData: !!(data.importedData && data.importedData.length > 0)
    });

    // 处理账号数据
    if (data.accountData && data.accountData.categories && Array.isArray(data.accountData.categories)) {
      data.accountData.categories.forEach((category: any) => {
        if (category.categoryInfo && category.records && Array.isArray(category.records)) {
          importedCategories.push({
            categoryName: category.categoryInfo.name?.replace('\
', ' ') || '未知分类',
            categoryId: category.categoryInfo.id,
            records: category.records
          });
        }
      });
    }

    // 处理导入数据
    if (data.importedData && Array.isArray(data.importedData)) {
      data.importedData.forEach((fileData: any) => {
        if (fileData.categories && Array.isArray(fileData.categories)) {
          fileData.categories.forEach((category: any) => {
            if (category.records && Array.isArray(category.records)) {
              importedCategories.push({
                categoryName: category.categoryName || '未知分类',
                categoryId: category.categoryId,
                records: category.records
              });
            }
          });
        }
      });
    }
  }
  // 检测并处理新格式（包含categories数组）
  else if (data && typeof data === 'object' && data.categories && Array.isArray(data.categories)) {
    // 新格式，直接提取categories数组
    logger.debug('检测到新格式的导出文件', {
      fileName: fileName,
      categoriesCount: data.categories.length,
      hasExportTime: !!data.exportTime,
      uid: data.uid?.substring(0, 8) + '...'
    });

    data.categories.forEach((category: any) => {
      if (category.mergedData?.data?.list || category.records) {
        importedCategories.push({
          categoryName: category.categoryInfo?.name?.replace('\n', ' ') || category.categoryName || '未知分类',
          categoryId: category.categoryInfo?.id || category.categoryId,
          records: category.mergedData ? category.mergedData.data.list : (category.records || [])
        });
      }
    });
  }
  // 检测并处理旧格式（直接是数组）
  else if (Array.isArray(data)) {
    // 旧格式，直接使用数组
    logger.debug('检测到旧格式的导出文件', {
      fileName: fileName,
      arrayLength: data.length
    });

    importedCategories.push(...data);
  } else {
    logger.error('文件格式错误', {
      fileName: fileName,
      dataType: typeof data,
      hasCategories: !!(data && typeof data === 'object' && data.categories),
      isArray: Array.isArray(data)
    });
  }

  // 过滤掉没有记录的分类
  return importedCategories.filter(category => category.records && category.records.length > 0);
};

// 保存导入数据到本地存储
const saveImportedDataToLocalStorage = () => {
  try {
    const dataToSave = {
      importedData: importedData.value,
      saveTime: new Date().toISOString()
    };
    localStorage.setItem('gacha_imported_data', JSON.stringify(dataToSave));
    logger.debug('导入数据已保存到本地存储', {
      fileCount: importedData.value.length,
      totalRecords: getTotalImportedRecords()
    });
  } catch (error) {
    logger.error('保存导入数据到本地存储失败', { error });
    console.error('保存导入数据失败:', error);
  }
};

// 从本地存储加载导入数据
const loadImportedDataFromLocalStorage = () => {
  try {
    const savedData = localStorage.getItem('gacha_imported_data');
    if (savedData) {
      const parsedData = JSON.parse(savedData);
      if (parsedData.importedData && Array.isArray(parsedData.importedData)) {
        importedData.value = parsedData.importedData;
        logger.info('从本地存储加载导入数据成功', {
          fileCount: importedData.value.length,
          totalRecords: getTotalImportedRecords(),
          saveTime: parsedData.saveTime
        });
      }
    }
  } catch (error) {
    logger.error('从本地存储加载导入数据失败', { error });
    console.error('加载导入数据失败:', error);
  }
};

// 切换导入文件的展开/折叠状态 - 在模板中使用
const toggleImportedFile = (index: number) => {
  expandedImportedFiles.value[index] = !expandedImportedFiles.value[index];
};

// 切换导入卡池的展开/折叠状态 - 在模板中使用
const toggleImportedCategory = (fileIndex: number, categoryIndex: number) => {
  const key = `${fileIndex}-${categoryIndex}`;
  expandedImportedCategories.value[key] = !expandedImportedCategories.value[key];
};

// 展开所有的导入文件 - 在模板中使用
const expandAllImportedFiles = () => {
  importedData.value.forEach((_, index) => {
    expandedImportedFiles.value[index] = true;
  });

  logger.debug('用户展开所有的导入文件', {
    totalFiles: importedData.value.length
  });
};

// 折叠所有的导入文件
const collapseAllImportedFiles = () => {
  expandedImportedFiles.value = {};
  expandedImportedCategories.value = {};
  logger.debug('用户折叠所有的导入文件', {
    totalFiles: importedData.value.length
  });
};

// 获取导入记录总数
const getTotalImportedRecords = () => {
  return importedData.value.reduce((sum, file) =>
    sum + file.categories.reduce((catSum, category) => catSum + category.records.length, 0), 0);
};

// 获取单个文件的记录总数
const getFileTotalRecords = (fileIndex: number) => {
  if (importedData.value[fileIndex]) {
    return importedData.value[fileIndex].categories.reduce((sum, category) => sum + category.records.length, 0);
  }
  return 0;
};

// 清除单个导入文件
const clearImportedFile = (fileIndex: number) => {
  if (importedData.value[fileIndex]) {
    const removedFile = importedData.value.splice(fileIndex, 1)[0];
    saveImportedDataToLocalStorage();

    logger.info('用户清除单个导入文件', {
      fileName: removedFile.fileName,
      fileCategories: removedFile.categories.length,
      fileRecords: removedFile.categories.reduce((sum, cat) => sum + cat.records.length, 0)
    });

    showToast(`文件 ${removedFile.fileName} 已清除`);
  }
};

// 清除所有导入数据
const clearAllImportedData = () => {
  const previousFileCount = importedData.value.length;
  const previousRecordsCount = getTotalImportedRecords();

  logger.info('用户清除所有导入数据', {
    previousFiles: previousFileCount,
    previousRecords: previousRecordsCount
  });

  importedData.value = [];
  expandedImportedFiles.value = {};
  expandedImportedCategories.value = {};
  saveImportedDataToLocalStorage();
  showToast('所有导入数据已清除');
};

// 导出合并后的所有数据（包括账号数据和导入数据）
const exportMergedAllData = async () => {
  logger.info('开始导出合并所有数据', {
    hasAccountData: categories.value.length > 0,
    hasImportedData: importedData.value.length > 0
  });

  if (categories.value.length === 0 && importedData.value.length === 0) {
    showToast('没有可导出的记录数据');
    return;
  }

  exportLoading.value = true;
  exportProgress.value = '准备导出合并数据...';
  const exportStartTime = Date.now();

  try {
    const mergedData = {
      exportTime: new Date().toISOString(),
      exportType: 'merged_all_data',
      accountData: null as any,
      importedData: [] as any[],
      summary: {
        totalFiles: importedData.value.length,
        totalCategories: 0,
        totalRecords: 0
      }
    };

    // 导出账号数据（如果已登录且有数据）
    if (categories.value.length > 0 && authStore.mainUid) {
      exportProgress.value = '正在导出账号数据...';

      const authData = localStorage.getItem('gacha_auth');
      if (authData) {
        const { uid, cookie, roleToken, accountToken } = JSON.parse(authData);

        const accountCategories: Array<{
          categoryInfo: GachaCategory;
          records: GachaRecord[];
        }> = [];
        for (const category of categories.value) {
          exportProgress.value = `正在导出账号卡池: ${category.name.replace('\n', ' ')}`;

          const allRecords: GachaRecord[] = [];
          let currentPos: number | undefined = 0;
          let currentTs: string | undefined;
          let hasMore = true;

          while (hasMore) {
            const response = await getGachaHistory(
              uid,
              cookie,
              roleToken,
              accountToken,
              category.id,
              10,
              currentPos,
              currentTs
            );

            if (response && response.list && Array.isArray(response.list)) {
              hasMore = response.hasMore;
              allRecords.push(...response.list);

              if (response.list.length > 0) {
                const lastRecord = response.list[response.list.length - 1];
                currentPos = lastRecord.pos;
                currentTs = lastRecord.gachaTs;
              } else {
                hasMore = false;
              }
            } else {
              hasMore = false;
            }
          }

          if (allRecords.length > 0) {
            accountCategories.push({
              categoryInfo: category,
              records: allRecords
            });
          }
        }

        mergedData.accountData = {
          uid: uid,
          categories: accountCategories
        };
        mergedData.summary.totalCategories += accountCategories.length;
        mergedData.summary.totalRecords += accountCategories.reduce((sum, cat) => sum + cat.records.length, 0);
      }
    }

    // 导出导入数据
    exportProgress.value = '正在整理导入数据...';
    mergedData.importedData = importedData.value;
    mergedData.summary.totalCategories += importedData.value.reduce((sum, file) => sum + file.categories.length, 0);
    mergedData.summary.totalRecords += getTotalImportedRecords();

    exportProgress.value = '正在生成下载文件...';

    let finalData: any;
    let fileName: string;
    let formatDescription: string;

    if (exportFormat.value === 'official') {
      // 合并通用格式导出 - 需要将所有数据转换为官方格式
      finalData = {};

      // 处理账号数据
      if (mergedData.accountData && mergedData.accountData.categories) {
        mergedData.accountData.categories.forEach((category: any) => {
          if (category.categoryInfo && category.records) {
            const categoryForExport = {
              categoryInfo: category.categoryInfo,
              mergedData: {
                data: {
                  list: category.records,
                  hasMore: false
                },
                msg: ''
              }
            };
            const officialCategoryData = convertToOfficialFormat({ categories: [categoryForExport] });
            Object.assign(finalData, officialCategoryData);
          }
        });
      }

      // 处理导入数据
      mergedData.importedData.forEach((fileData: any) => {
        if (fileData.categories) {
          fileData.categories.forEach((category: any) => {
            if (category.categoryName && category.records) {
              const categoryForExport = {
                categoryInfo: {
                  id: category.categoryId || '',
                  name: category.categoryName
                },
                mergedData: {
                  data: {
                    list: category.records,
                    hasMore: false
                  },
                  msg: ''
                }
              };
              const officialCategoryData = convertToOfficialFormat({ categories: [categoryForExport] });
              Object.assign(finalData, officialCategoryData);
            }
          });
        }
      });

      fileName = `${new Date().getTime()}_merged_official_${authStore.mainUid?.substring(0, 8) || 'unknown'}_gacha.json`;
      formatDescription = '合并通用格式';
    } else {
      // 合并原始格式导出
      finalData = mergedData;
      fileName = `合并所有寻访记录_${new Date().toISOString().split('T')[0]}.json`;
      formatDescription = '合并原始格式';
    }

    // 创建并下载JSON文件
    const dataStr = exportFormat.value === 'official'
      ? JSON.stringify(finalData)
      : JSON.stringify(finalData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    const totalDuration = Date.now() - exportStartTime;
    logger.info('合并所有数据导出成功', {
      totalDuration: totalDuration,
      format: formatDescription,
      accountCategories: mergedData.accountData?.categories?.length || 0,
      importedFiles: mergedData.importedData.length,
      totalRecords: mergedData.summary.totalRecords
    });

    showToast(`合并${formatDescription}导出成功，共${mergedData.summary.totalRecords}条记录`);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : '未知错误';
    logger.error('合并导出失败', {
      error: errorMessage,
      stack: err instanceof Error ? err.stack : undefined
    });
    console.error('合并导出失败:', err);
    showToast('合并导出失败，请重试');
  } finally {
    exportLoading.value = false;
    exportProgress.value = '';
  }
};

const loadAllPoolNames = async (
  uid: string,
  cookie: string,
  roleToken: string,
  accountToken: string,
  categoryList: GachaCategory[]
) => {
  logger.info('开始预获取所有卡池的poolName和记录数', {
    categoriesCount: categoryList.length
  });

  const promises = categoryList.map(async (category, index) => {
    try {
      logger.debug(`获取卡池${index + 1}/${categoryList.length}的详细信息`, {
        categoryId: category.id,
        categoryName: category.name
      });

      // 先获取记录总数
      let recordCount = 0;
      try {
        const countResponse = await logger.performanceAsync(`获取卡池${category.id}的记录数`, async () => {
          return await getGachaHistory(
            uid,
            cookie,
            roleToken,
            accountToken,
            category.id,
            1, // 先获取1条看看是否有数据
            undefined,
            undefined
          );
        });

        if (countResponse.list.length > 0) {
          // 如果有数据，再获取更多数据来计算总数
          let allRecords: any[] = [...countResponse.list];
          let currentPos = countResponse.list[countResponse.list.length - 1]?.pos;
          let currentTs = countResponse.list[countResponse.list.length - 1]?.gachaTs;
          let hasMore = countResponse.hasMore;

          // 继续获取所有数据来计算总数
          while (hasMore && allRecords.length < 100) { // 限制最多获取100条来计算总数，避免请求过多
            const moreResponse = await getGachaHistory(
              uid,
              cookie,
              roleToken,
              accountToken,
              category.id,
              10,
              currentPos,
              currentTs
            );

            if (moreResponse.list && moreResponse.list.length > 0) {
              allRecords.push(...moreResponse.list);
              hasMore = moreResponse.hasMore;
              currentPos = moreResponse.list[moreResponse.list.length - 1]?.pos;
              currentTs = moreResponse.list[moreResponse.list.length - 1]?.gachaTs;
            } else {
              hasMore = false;
            }
          }

          // 按时间戳和位置排序记录（从早到晚）
          allRecords.sort((a: any, b: any) => {
            const timeA = parseFloat(a.gachaTs);
            const timeB = parseFloat(b.gachaTs);
            if (timeA !== timeB) {
              return timeA - timeB;
            }
            return a.pos - b.pos;
          });

          // 按 poolName 分组记录
          const poolGroups = new Map<string, { poolName: string; records: any[] }>();
          allRecords.forEach((record) => {
            const poolName = record.poolName || '未知卡池';
            if (!poolGroups.has(poolName)) {
              poolGroups.set(poolName, { poolName, records: [] });
            }
            poolGroups.get(poolName)!.records.push(record);
          });

          // 保存 poolGroups 到全局变量
          poolGroupsForCategory.value.set(category.id, poolGroups);

          // 找到当期卡池（最新的 poolName）
          const pools = Array.from(poolGroups.values());
          pools.sort((a, b) => {
            const lastRecordA = a.records[a.records.length - 1];
            const lastRecordB = b.records[b.records.length - 1];
            const timeA = parseFloat(lastRecordA?.gachaTs || '0');
            const timeB = parseFloat(lastRecordB?.gachaTs || '0');
            return timeB - timeA; // 降序，最新的在前
          });

          // 只计算当期卡池的抽数
          recordCount = pools[0]?.records.length || 0;

          // 设置poolName为当期卡池名称
          const currentPoolName = pools[0]?.poolName || '';
          categoryPoolNames.value.set(category.id, currentPoolName);
        } else {
          // 没有记录
          recordCount = 0;
        }
      } catch (countError) {
        logger.warn(`获取卡池${category.id}的记录数失败`, {
          error: countError instanceof Error ? countError.message : '未知错误',
          categoryId: category.id
        });
        recordCount = 0;
      }

      // 设置记录数
      categoryRecordCounts.value.set(category.id, recordCount);

      logger.debug(`卡池${category.id}的详细信息获取成功`, {
        categoryId: category.id,
        recordCount: recordCount,
        poolName: categoryPoolNames.value.get(category.id)
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      logger.error(`获取卡池 ${category.id} 的详细信息失败`, {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        categoryId: category.id,
        categoryName: category.name
      });

      console.warn(`获取卡池 ${category.id} 的详细信息失败:`, error);
      // 设置默认值
      categoryRecordCounts.value.set(category.id, 0);
    }
  });

  const results = await Promise.allSettled(promises);
  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  logger.info('卡池详细信息预获取完成', {
    totalCategories: categoryList.length,
    successful: successful,
    failed: failed,
    successRate: `${((successful / categoryList.length) * 100).toFixed(1)}%`,
    poolNamesCount: categoryPoolNames.value.size,
    recordCountsCount: categoryRecordCounts.value.size
  });
};

// 回到顶部功能
const scrollToTop = () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });

  logger.debug('用户点击回到顶部按钮');
};

// 滚动事件监听器
const handleScroll = () => {
  showBackToTop.value = window.scrollY > 300;
};

// 格式选择下拉框控制
const toggleFormatDropdown = () => {
  showFormatDropdown.value = !showFormatDropdown.value;
};

const selectFormat = (format: 'native' | 'official') => {
  exportFormat.value = format;
  showFormatDropdown.value = false;
};

// 点击外部关闭下拉框
const handleClickOutside = (event: MouseEvent) => {
  if (formatSelectWrapper.value && !formatSelectWrapper.value.contains(event.target as Node)) {
    showFormatDropdown.value = false;
  }
};

// 组件挂载
onMounted(() => {
  logger.gacha('寻访记录组件已挂载', {
    isLogin: authStore.isLogin,
    hasMainUid: !!authStore.mainUid,
    hasHgToken: !!authStore.hgToken
  });

  // 从本地存储加载导入数据
  loadImportedDataFromLocalStorage();

  if (authStore.isLogin) {
    refreshGachaData();
  } else {
    logger.gacha('用户未登录，不加载寻访记录数据');
  }

  // 添加滚动监听器
  window.addEventListener('scroll', handleScroll);

  // 添加点击外部关闭下拉框监听器
  document.addEventListener('click', handleClickOutside);

  // 组件卸载时移除监听器
  onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll);
    document.removeEventListener('click', handleClickOutside);
  });
});
</script>

<style scoped>
/* 样式部分保持不变，但需要添加新的样式类 */
.headhunting-record {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  color: white;
  min-height: calc(100vh - 120px);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  background: #2d2d2d;
  padding: 20px;

  border: 1px solid #404040;
}

.header h2 {
  margin: 0;
  color: #ffffff;
  font-size: 24px;
  font-weight: 600;
}

.actions {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.refresh-btn {
  padding: 10px 20px;
  border: 1px solid #404040;

  background: #3a3a3a;
  color: #ccc;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.refresh-btn:hover:not(:disabled) {
  background: #4a4a4a;
  color: #ffffff;
  border-color: #646cff;
}

.refresh-btn:disabled {
  background: #2d2d2d;
  color: #666;
  cursor: not-allowed;
  border-color: #404040;
}

/* 导出加载显示样式 */
.export-loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.export-loading-content {
  background: #2d2d2d;
  border: 1px solid #404040;

  padding: 30px;
  text-align: center;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.export-loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #404040;
  border-top: 4px solid #646cff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

.export-loading-content p {
  margin: 8px 0;
  color: #ccc;
  font-size: 16px;
  line-height: 1.5;
}

.export-progress {
  color: #646cff !important;
  font-weight: 500;
  font-size: 14px !important;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 登录提示样式 */
.login-prompt {
  background: #2d2d2d;

  padding: 40px;
  text-align: center;
  border: 1px solid #404040;
}

.prompt-content {
  max-width: 400px;
  margin: 0 auto;
}

.prompt-icon {
  width: 64px;
  height: 64px;
  margin-bottom: 20px;
  opacity: 0.6;
  filter: brightness(0) invert(0.6);
}

.login-prompt h3 {
  margin: 0 0 12px 0;
  color: #ffffff;
  font-size: 20px;
  font-weight: 600;
}

.login-prompt p {
  margin: 0 0 24px 0;
  color: #ccc;
  font-size: 14px;
  line-height: 1.5;
}

.login-btn {
  padding: 12px 24px;
  border: 1px solid #404040;

  background: #3a3a3a;
  color: #ccc;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.login-btn:hover {
  background: #4a4a4a;
  color: #ffffff;
  border-color: #646cff;
}

/* 加载和错误状态 */
.loading, .error {
  background: #2d2d2d;

  padding: 40px;
  text-align: center;
  border: 1px solid #404040;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #404040;
  border-top: 4px solid #646cff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

.loading p, .error h3, .error p {
  margin: 8px 0;
  color: #ccc;
  font-size: 14px;
}

.error h3 {
  color: #ff6b6b;
  font-weight: 600;
}

.retry-btn {
  padding: 10px 20px;
  border: 1px solid #404040;

  background: #3a3a3a;
  color: #ccc;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
  margin-top: 16px;
}

.retry-btn:hover {
  background: #4a4a4a;
  color: #ffffff;
  border-color: #646cff;
}

/* 合成玉花费统计样式 */
.cost-statistics {
  margin: 24px 0;
}

.statistics-card {
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, #2d2d2d 0%, #3a3a3a 100%);

  padding: 20px 24px;
  border: 1px solid #404040;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
}

.statistics-info {
  flex: 1;
  margin-right: 20px;
}

.statistics-info h4 {
  margin: 0 0 4px 0;
  font-size: 14px;
  color: #999;
  font-weight: 500;
}

.total-pulls {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #646cff;
}

.statistics-divider {
  width: 1px;
  height: 40px;
  background: linear-gradient(180deg, transparent, #404040, transparent);
  margin: 0 20px;
}

.statistics-cost h4 {
  margin: 0 0 4px 0;
  font-size: 14px;
  color: #999;
  font-weight: 500;
}

.total-cost {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #ffa500;
  display: flex;
  align-items: center;
  gap: 8px;
}

.DIAMOND_SHD {
  width: 64px;
  height: 64px;
  object-fit: contain;
}

/* 卡池列表样式 */
.categories-list {
  background: #2d2d2d;

  padding: 24px;
  border: 1px solid #404040;
}

.categories-list h3 {
  margin: 0 0 20px 0;
  color: #ffffff;
  font-size: 18px;
  font-weight: 600;
}

.categories-horizontal {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.category-card {
  background: #3a3a3a;
  border: 1px solid #404040;

  padding: 20px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

.category-card:hover {
  border-color: #646cff;
  background: #4a4a4a;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(100, 108, 255, 0.15);
}

.category-card-horizontal {
  background: #3a3a3a;
  border: 1px solid #404040;

  padding: 16px 20px;
  cursor: pointer;
  transition: all 0.2s;
}

.category-card-horizontal:hover {
  border-color: #646cff;
  background: #4a4a4a;
}

.category-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.category-type-name {
  flex: 1;
  text-align: left;
}

.category-type-name h4 {
  margin: 0 0 4px 0;
  color: #ffffff;
  font-size: 16px;
  font-weight: 600;
}

.category-type-name p {
  margin: 0;
  color: #ccc;
  font-size: 14px;
}

.category-count {
  display: flex;
  align-items: center;
  gap: 4px;
  text-align: right;
}

.count-number {
  font-size: 18px;
  font-weight: 600;
  color: #646cff;
}

.count-label {
  font-size: 12px;
  color: #999;
}

.expand-icon {
  font-size: 14px;
  color: #ccc;
  margin-left: 4px;
  transition: transform 0.2s;
}

.category-records {
  border-top: 1px solid #404040;
  margin-top: 12px;
  padding-top: 12px;
}

.pool-section {
  margin-bottom: 16px;
}

.pool-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.pool-section-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #999;
}

.past-pools-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 0;
}

.pool-name-tag {
  display: inline-block;
  padding: 6px 12px;
  background: #3a3a3a;
  border: 1px solid #404040;
  color: #ccc;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  border-radius: 4px;
}

.pool-name-tag:hover {
  background: #4a4a4a;
  border-color: #646cff;
  color: #ffffff;
}

.pool-name-tag.active {
  background: #646cff;
  border-color: #646cff;
  color: #ffffff;
}

/* 往期卡池区域样式 */
.past-pools-section {
  background: #2d2d2d;
  padding: 24px;
  border: 1px solid #404040;
  margin-top: 24px;
}

.past-pools-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #404040;
}

.past-pools-header h3 {
  margin: 0;
  color: #ffffff;
  font-size: 18px;
  font-weight: 600;
}

.category-select {
  padding: 8px 12px;
  border: 1px solid #404040;
  background: #3a3a3a;
  color: #ccc;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 200px;
}

.category-select:hover {
  border-color: #646cff;
  background: #4a4a4a;
}

.category-select:focus {
  outline: none;
  border-color: #646cff;
  box-shadow: 0 0 0 2px rgba(100, 108, 255, 0.2);
}

.past-pools-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.records-table-container {
  max-height: 300px;
  overflow-y: auto;

  border: 1px solid #404040;
}

/* 自定义滚动条样式 - 记录表格容器 */
.records-table-container::-webkit-scrollbar {
  width: 6px;
}

.records-table-container::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);

}

.records-table-container::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);

  transition: background 0.2s ease;
}

.records-table-container::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}

.records-table-container .gacha-table {
  margin: 0;
  font-size: 12px;
}

.records-table-container .gacha-table th,
.records-table-container .gacha-table td {
  padding: 8px 12px;
  border-bottom: 1px solid #404040;
}

.records-table-container .gacha-table th {
  background: #2d2d2d;
  position: sticky;
  top: 0;
  z-index: 1;
}

/* 高光记录显示样式 */
.highlights-container {
  max-height: 300px;
  overflow-y: auto;
  padding: 6px;
}

/* 自定义滚动条样式 - 高光记录容器 */
.highlights-container::-webkit-scrollbar {
  width: 6px;
}

.highlights-container::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);

}

.highlights-container::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);

  transition: background 0.2s ease;
}

.highlights-container::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}

.highlight-record {
  display: flex;
  align-items: center;
  padding: 8px;
  margin-bottom: 4px;

  border: 1px solid #404040;
  background: #2d2d2d;
  transition: all 0.3s ease;
  min-height: 66px; /* 头像50px + padding16px */
}

.highlight-record:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.highlight-record.six-star {
  border-color: #ff6b6b;
  background: linear-gradient(135deg, #2d2d2d 0%, #3d1a1a 100%);
}

.highlight-record.five-star {
  border-color: #ffd93d;
  background: linear-gradient(135deg, #2d2d2d 0%, #3d2d1a 100%);
}

.record-info {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 12px;
}

.operator-avatar {
  width: 50px;
  height: 50px;

  object-fit: cover;
  border: 2px solid #404040;
  flex-shrink: 0;
}

.record-details {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.operator-name {
  margin: 0;
  font-size: 14px;
  font-weight: bold;
  color: #ffffff;
  flex-shrink: 0;
  min-width: 80px;
}

.pull-count {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.count-number {
  font-size: 16px;
  font-weight: bold;
  color: #4ecdc4;
}

.count-text {
  font-size: 12px;
  color: #b0b0b0;
}

.rarity-info {
  flex-shrink: 0;
}

.time-info {
  font-size: 11px;
  color: #888;
  flex-shrink: 0;
  margin-left: 8px;
}

.pool-name-info {
  font-size: 11px;
  color: #646cff;
  flex-shrink: 0;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.no-highlights {
  text-align: center;
  padding: 40px 20px;
  color: #888;
}

.no-highlights p {
  margin: 0;
  font-size: 14px;
}

.no-records {
  padding: 20px;
  text-align: center;
  color: #999;
  font-size: 14px;
}

.category-card h4 {
  margin: 0 0 8px 0;
  color: #ffffff;
  font-size: 16px;
  font-weight: 600;
}

.category-id {
  margin: 0;
  color: #ccc;
  font-size: 12px;
  font-family: monospace;
}

.category-poolname {
  margin: 0;
  color: #999;
  font-size: 12px;
  font-style: italic;
}

/* 记录详情样式 */
.records-container {
  background: #2d2d2d;

  padding: 24px;
  border: 1px solid #404040;
  position: relative;
}

.records-header {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 20px;
  text-align: center;
}

.records-header h3 {
  margin: 0;
  color: #ffffff;
  font-size: 18px;
  font-weight: 600;
}

.table-container {
  overflow-x: auto;
  margin-bottom: 20px;
  border: 1px solid #404040;

}

/* 自定义滚动条样式 - 表格容器 */
.table-container::-webkit-scrollbar {
  height: 6px;
  width: 6px;
}

.table-container::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);

}

.table-container::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);

  transition: background 0.2s ease;
}

.table-container::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}

.gacha-table {
  width: 100%;
  border-collapse: collapse;
  background: #2d2d2d;
}

.gacha-table th {
  background: #3a3a3a;
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  color: #ffffff;
  border-bottom: 2px solid #404040;
  font-size: 14px;
}

.gacha-table td {
  padding: 12px 16px;
  border-bottom: 1px solid #404040;
  font-size: 14px;
  color: #ccc;
}

.gacha-table tr:hover {
  background: #3a3a3a;
}

.rarity-badge {
  padding: 4px 8px;

  font-size: 12px;
  font-weight: 500;
  display: inline-block;
}

.rarity-1 { background: rgba(155, 250, 100, 0.2); color: #85ff47; }
.rarity-2 { background: rgba(39, 167, 226, 0.2); color: #419ce2; }
.rarity-3 { background: rgba(162, 40, 238, 0.2); color: #8d7cff; }
.rarity-4 { background: rgba(243, 229, 30, 0.2); color: #fffb18; }
.rarity-5 { background: rgba(255, 150, 30, 0.2); color: #ff6b6b; }

/* 分页控件 */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  padding: 16px 0;
}

.page-btn {
  padding: 8px 16px;
  border: 1px solid #404040;

  background: #3a3a3a;
  color: #ccc;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.page-btn:hover:not(:disabled) {
  border-color: #646cff;
  color: #ffffff;
  background: #4a4a4a;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  color: #ccc;
  font-size: 14px;
  font-weight: 500;
}

/* 无数据状态 */
.no-data {
  background: #2d2d2d;

  padding: 40px;
  text-align: center;
  border: 1px solid #404040;
}

.no-data-content h3 {
  margin: 0 0 12px 0;
  color: #ccc;
  font-size: 18px;
  font-weight: 500;
}

.no-data-content p {
  margin: 0 0 20px 0;
  color: #999;
  font-size: 14px;
}

/* 返回图标样式 */
.back-icon-btn {
  position: absolute;
  top: 20px;
  left: 20px;
  width: 40px;
  height: 40px;
  border: 1px solid #404040;

  background: #3a3a3a;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  z-index: 10;
}

.back-icon-btn:hover {
  border-color: #646cff;
  background: #4a4a4a;
}

.back-icon-img {
  width: 20px;
  height: 20px;
  /* 水平反转 (transform: scaleX(-1)) + 颜色滤镜 */
  transform: scaleX(-1);
  filter: brightness(0) invert(1);
  transition: all 0.2s;
}

.back-icon-btn:hover .back-icon-img {
  /* hover时变为蓝色 */
  filter: brightness(0) saturate(100%) invert(42%) sepia(91%) saturate(1352%) hue-rotate(202deg) brightness(97%) contrast(89%);
}

/* 导出导入按钮样式 */
.export-buttons {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* 自定义格式选择器 */
.format-select-wrapper {
  position: relative;
}

.format-select-button {
  padding: 10px 30px 10px 12px;
  border: 1px solid #404040;
  background: #3a3a3a;
  color: #ccc;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
}

.format-select-button:hover {
  border-color: #646cff;
  background: #4a4a4a;
  color: #ffffff;
}

.format-select-button.active {
  border-color: #646cff;
  background: #4a4a4a;
}

.dropdown-arrow {
  position: absolute;
  right: 10px;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 10px;
  color: #999;
}

.dropdown-arrow.rotated {
  transform: rotate(180deg);
  color: #ffffff;
}

.format-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: #3a3a3a;
  border: 1px solid #404040;
  overflow: hidden;
  opacity: 0;
  transform: translateY(-10px);
  visibility: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 100;
}

.format-dropdown.show {
  opacity: 1;
  transform: translateY(0);
  visibility: visible;
}

.format-option {
  padding: 10px 12px;
  color: #ccc;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.format-option:hover {
  background: #4a4a4a;
  color: #ffffff;
}

.format-option.selected {
  background: #646cff;
  color: #ffffff;
  font-weight: 500;
}

.export-btn, .import-btn, .clear-btn {
  padding: 10px 20px;
  border: 1px solid #404040;

  background: #3a3a3a;
  color: #ccc;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.export-btn:hover:not(:disabled), .import-btn:hover, .export-merged-btn:hover {
  background: #4a4a4a;
  color: #ffffff;
  border-color: #646cff;
}

.export-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: #2d2d2d;
}

.export-merged-btn {
  padding: 10px 20px;
  border: 1px solid #404040;

  background: #2a5a2a;
  color: #ccc;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.clear-btn:hover {
  background: #4a4a4a;
  color: #ff6b6b;
  border-color: #ff6b6b;
}

/* 导入记录样式 */
.imported-records {
  background: #2d2d2d;

  padding: 24px;
  border: 1px solid #404040;
  margin-top: 24px;
}

.imported-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #404040;
}

.imported-header h3 {
  margin: 0;
  color: #ffffff;
  font-size: 18px;
  font-weight: 600;
}

.imported-files {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.imported-file {
  background: #3a3a3a;
  border: 1px solid #404040;

  overflow: hidden;
}

.file-header {
  padding: 16px 20px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: background 0.2s;
}

.file-header:hover {
  background: #4a4a4a;
}

.file-header h4 {
  margin: 0;
  color: #ffffff;
  font-size: 16px;
  font-weight: 600;
}

.file-meta {
  display: flex;
  gap: 12px;
  align-items: center;
  font-size: 12px;
  color: #999;
}

.file-size, .import-time {
  font-size: 12px;
  color: #999;
}

.file-info {
  font-size: 12px;
  color: #999;
  font-weight: normal;
  margin-left: 8px;
}

.file-categories {
  border-top: 1px solid #404040;
}

.imported-category {
  border-bottom: 1px solid #404040;
}

.imported-category:last-child {
  border-bottom: none;
}

.imported-category h5 {
  margin: 0;
  padding: 12px 20px;
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: background 0.2s;
}

.imported-category h5:hover {
  background: #4a4a4a;
}

.toggle-icon {
  font-size: 12px;
  color: #999;
  transition: transform 0.2s;
}

.imported-records-table {
  border-top: 1px solid #404040;
  overflow-x: auto;
}

/* 自定义滚动条样式 - 导入记录表格 */
.imported-records-table::-webkit-scrollbar {
  height: 6px;
  width: 6px;
}

.imported-records-table::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);

}

.imported-records-table::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);

  transition: background 0.2s ease;
}

.imported-records-table::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}

.imported-records-table .gacha-table {
  margin: 0;
}

/* 导入数据高光显示样式 */
.imported-records-display {
  border-top: 1px solid #404040;
  padding: 12px;
}

.imported-highlights-container {
  max-height: 300px;
  overflow-y: auto;
  padding: 6px;
}

/* 自定义滚动条样式 - 导入高光记录容器 */
.imported-highlights-container::-webkit-scrollbar {
  width: 6px;
}

.imported-highlights-container::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);

}

.imported-highlights-container::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);

  transition: background 0.2s ease;
}

.imported-highlights-container::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}

.imported-highlight-record {
  display: flex;
  align-items: center;
  padding: 8px;
  margin-bottom: 4px;

  border: 1px solid #404040;
  background: #2d2d2d;
  transition: all 0.3s ease;
  min-height: 66px; /* 头像50px + padding16px */
}

.imported-highlight-record:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.imported-highlight-record.six-star {
  border-color: #ff6b6b;
  background: linear-gradient(135deg, #2d2d2d 0%, #3d1a1a 100%);
}

.imported-highlight-record.five-star {
  border-color: #ffd93d;
  background: linear-gradient(135deg, #2d2d2d 0%, #3d2d1a 100%);
}

.imported-highlight-record .record-info {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 12px;
}

.imported-highlight-record .operator-avatar {
  width: 50px;
  height: 50px;

  object-fit: cover;
  background: #1a1a1a;
  border: 2px solid #404040;
  flex-shrink: 0;
}

.imported-highlight-record.six-star .operator-avatar {
  border-color: #ff6b6b;
}

.imported-highlight-record.five-star .operator-avatar {
  border-color: #ffd93d;
}

.imported-highlight-record .record-details {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.imported-highlight-record .operator-name {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
}

.imported-highlight-record .pull-info {
  display: flex;
  align-items: baseline;
  gap: 2px;
}

.imported-highlight-record .pull-count {
  font-size: 18px;
  font-weight: 700;
  color: #ffffff;
}

.imported-highlight-record .count-label {
  font-size: 12px;
  color: #cccccc;
}

.no-highlights-notice {
  text-align: center;
  padding: 20px;
  color: #999999;
}

.no-highlights-notice p {
  margin: 0;
  font-size: 14px;
}

.file-actions {
  padding: 12px 20px;
  border-top: 1px solid #404040;
  text-align: right;
}

.clear-file-btn {
  padding: 6px 12px;
  border: 1px solid #404040;

  background: #3a3a3a;
  color: #ff6b6b;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s;
}

.clear-file-btn:hover {
  background: #4a4a4a;
  color: #ff6b6b;
  border-color: #ff6b6b;
}

/* 回到顶部按钮样式 */
.back-to-top-btn {
  position: fixed;
  bottom: 30px;
  right: 30px;
  width: 50px;
  height: 50px;
  border: 1px solid #404040;

  background: #3a3a3a;
  color: #ccc;
  font-size: 20px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.back-to-top-btn:hover {
  background: #4a4a4a;
  color: #646cff;
  border-color: #646cff;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(100, 108, 255, 0.2);
}

/* 导入记录增强样式 */
.imported-summary {
  margin: 4px 0 0 0;
  color: #999;
  font-size: 14px;
  font-weight: normal;
}

.imported-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.expand-btn {
  padding: 6px 12px;
  border: 1px solid #404040;

  background: #3a3a3a;
  color: #ccc;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s;
}

.expand-btn:hover {
  background: #4a4a4a;
  color: #ffffff;
  border-color: #646cff;
}

.category-info {
  font-size: 12px;
  color: #999;
  font-weight: normal;
  margin-left: 8px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .headhunting-record {
    padding: 16px;
  }

  .header {
    flex-direction: column;
    gap: 16px;
    padding: 16px;
  }

  .actions {
    flex-direction: column;
    width: 100%;
  }

  .export-btn, .import-btn {
    width: 100%;
  }

  .categories-horizontal {
    gap: 8px;
  }

  .category-card-horizontal {
    padding: 12px 16px;
  }

  .category-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .category-type-name {
    width: 100%;
  }

  .category-count {
    align-self: flex-end;
  }

  .category-records {
    margin-top: 8px;
    padding-top: 8px;
  }

  .records-table-container {
    max-height: 200px;
  }

  .records-table-container .gacha-table {
    font-size: 11px;
  }

  .records-table-container .gacha-table th,
  .records-table-container .gacha-table td {
    padding: 6px 8px;
  }

  .records-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .table-container {
    font-size: 12px;
  }

  .gacha-table th,
  .gacha-table td {
    padding: 8px 12px;
  }

  .pagination {
    flex-direction: column;
    gap: 12px;
  }

  .imported-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .file-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .file-meta {
    width: 100%;
    justify-content: space-between;
  }
}
</style>

<template>
  <div class="headhunting-record">
    <div class="header">
      <h2>寻访记录</h2>
      <div class="actions">
        <div class="export-group">
          <select v-model="exportFormat" class="format-select" title="选择导出格式">
            <option value="native">原生格式</option>
            <option value="universal">通用格式</option>
          </select>
          <button @click="exportGachaData" class="export-btn" title="导出寻访记录" :disabled="exportLoading">
            {{ exportLoading ? '导出中...' : '导出记录' }}
          </button>
        </div>
        <button @click="importGachaData" class="import-btn" title="导入寻访记录">
          导入记录
        </button>
        <button 
          v-if="importedData.length > 0" 
          @click="exportMergedImportedData" 
          class="export-merged-btn" 
          title="导出合并后的导入数据"
        >
          导出合并
        </button>
      </div>
    </div>

    <!-- 导出加载提示 -->
    <div v-if="exportLoading" class="export-loading-overlay">
      <div class="export-loading-content">
        <div class="export-loading-spinner"></div>
        <p>正在导出寻访记录，请稍候...</p>
        <p class="export-progress">{{ exportProgress }}</p>
      </div>
    </div>

    <!-- 未登录提示 -->
    <div v-if="!authStore.isLogin" class="login-prompt">
      <div class="prompt-content">
        <img src="@assets/icon_user.svg" alt="用户图标" class="prompt-icon" />
        <h3>需要登录</h3>
        <p>请先登录鹰角网络通行证以查看寻访记录</p>
        <button @click="$emit('showLogin')" class="login-btn">立即登录</button>
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
      <h3>选择卡池类型</h3>
      <div class="categories-grid">
        <div
          v-for="category in categories"
          :key="category.id"
          class="category-card"
          @click="selectCategory(category)"
        >
          <h4>{{ category.name.replace('\\n', ' ') }}</h4>
          <p class="category-poolname">{{ getPoolNameForCategory(category.id) }}</p>
        </div>
      </div>
    </div>

    <!-- 抽卡记录表格 -->
    <div v-else-if="selectedCategory && gachaRecords.length > 0" class="records-container">
      <!-- 回退图标按钮 -->
      <button @click="backToCategories" class="back-icon-btn" title="返回卡池列表">
        <img src="@assets/exit.png" alt="返回" class="back-icon-img" />
      </button>
      
      <div class="records-header">
        <h3>{{ selectedCategory.name.replace('\\n', ' ') }}</h3>
      </div>

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
          第 {{ currentPage }} 页
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
      <!-- 回退图标按钮 -->
      <button @click="backToCategories" class="back-icon-btn" title="返回卡池列表">
        <img src="@assets/exit.png" alt="返回" class="back-icon-img" />
      </button>
      
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
        <h3>已导入的寻访记录</h3>
        <button @click="clearImportedData" class="clear-btn" title="清除导入数据">
          清除数据
        </button>
      </div>
      
      <div class="imported-categories">
        <div
          v-for="(category, index) in importedData"
          :key="index"
          class="imported-category"
        >
          <h4 @click="toggleImportedCategory(index)">
            {{ category.categoryName }}
            <span class="toggle-icon">{{ expandedImportedCategories[index] ? '▼' : '▶' }}</span>
          </h4>
          
          <div v-if="expandedImportedCategories[index]" class="imported-records-table">
            <table class="gacha-table">
              <thead>
                <tr>
                  <th>序号</th>
                  <th>卡池名称</th>
                  <th>干员名称</th>
                  <th>星级</th>
                  <th>获取时间</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(record, recordIndex) in category.records" :key="recordIndex">
                  <td>{{ recordIndex + 1 }}</td>
                  <td>{{ record.poolName }}</td>
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
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
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

// 定义组件事件
const emit = defineEmits<{
  showLogin: []
}>();

// 状态管理
const authStore = useAuthStore();

// 组件状态
const loading = ref(false);
const loadingText = ref('');
const error = ref<string | null>(null);

// 导出相关状态
const exportLoading = ref(false);
const exportProgress = ref('');
const exportFormat = ref<'native' | 'universal'>('native');

// 卡池相关状态
const categories = ref<GachaCategory[]>([]);
const selectedCategory = ref<GachaCategory | null>(null);
const gachaRecords = ref<GachaRecord[]>([]);
const categoryPoolNames = ref<Map<string, string>>(new Map());

// 导入数据相关状态
const importedData = ref<Array<{
  categoryName: string;
  categoryId?: string;
  records: GachaRecord[];
}>>([]);
const expandedImportedCategories = ref<Record<number, boolean>>({});

// 分页相关状态
const currentPage = ref(1);
const pageSize = 10;
const hasNextPage = ref(false);
const lastRecordPos = ref<number | null>(null);
const lastRecordTs = ref<string | null>(null);

// 计算属性
const currentPageRecords = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  const end = start + pageSize;
  return gachaRecords.value.slice(start, end);
});

// 方法
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
    logger.gachaDebug('重置寻访记录组件状态');
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
  logger.gacha('开始执行寻访记录认证流程', {
    hasHgToken: !!authStore.hgToken,
    hasMainUid: !!authStore.mainUid,
    uid: authStore.mainUid?.substring(0, 8) + '...'
  });
  
  if (!authStore.hgToken || !authStore.mainUid) {
    const errorMsg = '缺少必要的认证信息';
    logger.gachaError('寻访记录认证失败', {
      hasHgToken: !!authStore.hgToken,
      hasMainUid: !!authStore.mainUid,
      isLogin: authStore.isLogin
    });
    throw new Error(errorMsg);
  }

  const uid = authStore.mainUid;

  // 流程1-4：获取认证凭证
  loadingText.value = '正在获取认证凭证...';
  logger.gachaDebug('开始获取认证凭证', { step: 1, uid: uid.substring(0, 8) + '...' });
  
  // 流程1：获取token（使用已有的hgToken）
  const token = authStore.hgToken;
  logger.gachaDebug('使用现有hgToken', { 
    tokenLength: token.length,
    tokenPrefix: token.substring(0, 20) + '...'
  });
  console.log('使用hgToken:', token.substring(0, 20) + '...');
  console.log('使用UID:', uid);
  
  // 流程2：OAuth2授权
  logger.gachaDebug('开始OAuth2授权流程', { step: 2 });
  const oauthData = await logger.gachaPerformanceAsync('OAuth2授权', async () => {
    return await getOAuth2Grant(token);
  });
  logger.gachaDebug('OAuth2授权成功', { 
    tokenLength: oauthData.token?.length,
    tokenPrefix: oauthData.token?.substring(0, 20) + '...'
  });
  
  // 流程3：获取x-role-token
  logger.gachaDebug('开始获取x-role-token', { step: 3 });
  const roleToken = await logger.gachaPerformanceAsync('获取x-role-token', async () => {
    return await getU8TokenByUid(oauthData.token, uid);
  });
  logger.gachaDebug('x-role-token获取成功', { 
    tokenLength: roleToken?.length,
    tokenPrefix: roleToken?.substring(0, 20) + '...'
  });
  
  // 流程4：角色登录获取cookie
  logger.gachaDebug('开始角色登录获取cookie', { step: 4 });
  const cookie = await logger.gachaPerformanceAsync('角色登录获取cookie', async () => {
    return await roleLogin(roleToken);
  });
  logger.gachaDebug('角色登录成功', { 
    cookieLength: cookie?.length,
    cookiePrefix: cookie?.substring(0, 30) + '...'
  });
  
  // 流程5：获取卡池分类
  loadingText.value = '正在获取卡池列表...';
  logger.gachaDebug('开始获取卡池分类', { step: 5 });
  const categoryList = await logger.gachaPerformanceAsync('获取卡池分类', async () => {
    return await getGachaCategories(uid, cookie, roleToken, token);
  });
  categories.value = categoryList;
  logger.gacha('卡池分类获取成功', { 
    categoriesCount: categoryList.length,
    categories: categoryList.map(cat => ({ id: cat.id, name: cat.name }))
  });
  
  // 预先获取所有卡池的poolName
  loadingText.value = '正在获取卡池详细信息...';
  logger.gachaDebug('开始预加载所有卡池详细信息');
  await logger.gachaPerformanceAsync('预加载卡池详细信息', async () => {
    await loadAllPoolNames(uid, cookie, roleToken, token, categoryList);
  });
  logger.gacha('卡池详细信息预加载完成', {
    poolNamesCount: categoryPoolNames.value.size
  });
  
  // 保存认证信息到本地存储，供后续使用
  const authData = {
    uid,
    cookie,
    roleToken,
    accountToken: token
  };
  localStorage.setItem('gacha_auth', JSON.stringify(authData));
  logger.gachaDebug('寻访记录认证信息已保存到本地存储', {
    uid: uid.substring(0, 8) + '...',
    hasAllTokens: !!(cookie && roleToken && token)
  });
  
  logger.gacha('寻访记录认证流程执行完成');
};

const selectCategory = async (category: GachaCategory) => {
  logger.info('选择卡池', {
    categoryId: category.id,
    categoryName: category.name
  });
  
  selectedCategory.value = category;
  currentPage.value = 1;
  lastRecordPos.value = null;
  lastRecordTs.value = null;
  
  await loadGachaRecords();
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
    // 获取保存的认证信息
    const authData = localStorage.getItem('gacha_auth');
    if (!authData) {
      const errorMsg = '认证信息已过期，请重新登录';
      logger.error('加载抽卡记录失败: 认证信息已过期', {
        hasAuthData: false,
        categoryId: selectedCategory.value.id
      });
      throw new Error(errorMsg);
    }

    const { uid, cookie, roleToken, accountToken } = JSON.parse(authData);
    logger.debug('从本地存储获取认证信息成功', {
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
      // 第一页，直接替换数据
      gachaRecords.value = response.list;
      logger.debug('第一页数据已替换', {
        recordsCount: response.list.length,
        categoryId: selectedCategory.value.id
      });
    } else {
      // 后续页，追加数据
      const previousCount = gachaRecords.value.length;
      gachaRecords.value.push(...response.list);
      logger.debug('后续页数据已追加', {
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
    logger.info('没有更多内容了', {
      currentPage: currentPage.value,
      totalRecords: gachaRecords.value.length
    });
    showToast('没有更多内容了');
  } else {
    logger.debug('无法切换到下一页', {
      hasNextPage: hasNextPage.value,
      isLoading: loading.value
    });
  }
};

const backToCategories = () => {
  logger.info('返回卡池列表', {
    hadSelectedCategory: !!selectedCategory.value,
    previousCategoryId: selectedCategory.value?.id,
    previousRecordsCount: gachaRecords.value.length
  });
  
  selectedCategory.value = null;
  gachaRecords.value = [];
  currentPage.value = 1;
  lastRecordPos.value = null;
  lastRecordTs.value = null;
};

const getRecordIndex = (index: number) => {
  return (currentPage.value - 1) * pageSize + index + 1;
};

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

const formatTime = (timestamp: string) => {
  const date = new Date(parseInt(timestamp));
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getPoolNameForCategory = (categoryId: string) => {
  return categoryPoolNames.value.get(categoryId) || '';
};

// 转换为通用格式
const convertToUniversalFormat = (rawDataExport: any, uid: string) => {
  const universalData: any = {
    info: {
      uid: parseInt(uid),
      lang: "zh-cn",
      export_time: Math.floor(Date.now() / 1000),
      export_timestamp: Math.floor(Date.now() / 1000),
      export_app: "小黑盒"
    },
    data: {}
  };

  // 遍历所有卡池分类
  rawDataExport.categories.forEach((category: any) => {
    if (category.mergedData && category.mergedData.data && category.mergedData.data.list) {
      category.mergedData.data.list.forEach((record: any) => {
        const timestamp = record.gachaTs;
        if (timestamp && !universalData.data[timestamp]) {
          universalData.data[timestamp] = {
            c: record.charName ? [[record.charName, record.rarity, record.isNew ? 1 : 0]] : [],
            p: category.categoryInfo.name.replace('\
', '')
          };
        }
      });
    }
  });

  return universalData;
};

// 导出寻访记录
const exportGachaData = async () => {
  logger.info('开始导出寻访记录', {
    categoriesCount: categories.value.length,
    hasAuthData: !!localStorage.getItem('gacha_auth')
  });
  
  if (categories.value.length === 0) {
    logger.warn('没有可导出的数据', { categoriesCount: 0 });
    showToast('没有可导出的数据');
    return;
  }

  exportLoading.value = true;
  exportProgress.value = '准备导出...';
  const exportStartTime = Date.now();

  try {
    // 获取保存的认证信息
    const authData = localStorage.getItem('gacha_auth');
    if (!authData) {
      logger.error('导出失败: 认证信息已过期');
      showToast('认证信息已过期，无法导出数据');
      return;
    }
    
    const { uid, cookie, roleToken, accountToken } = JSON.parse(authData);
    logger.debug('导出认证信息获取成功', {
      uid: uid.substring(0, 8) + '...'
    });
    
    // 创建原始数据格式的导出对象
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
        exportProgress.value = `正在导出卡池 ${i + 1}/${totalCategories}: ${category.name.replace('\\n', ' ')}`;
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
          exportProgress.value = `正在导出卡池 ${i + 1}/${totalCategories}: ${category.name.replace('\\n', ' ')} (第${pageCount}页)`;
          
          const response = await logger.performanceAsync(`导出卡池${category.name}第${pageCount}页`, async () => {
            return await getGachaHistory(
              uid,
              cookie,
              roleToken,
              accountToken,
              category.id,
              10, // 使用正常的分页大小
              currentPos,
              currentTs
            );
          });
          
          console.log(`导出卡池 ${category.name} 的响应:`, response);
          logger.debug(`卡池${category.name}第${pageCount}页响应`, {
            listLength: response.list?.length || 0,
            hasMore: response.hasMore
          });
          
          // 创建模拟的原始API响应格式
          const mockRawData = {
            code: 0,
            data: response,
            msg: ''
          };
          allApiResponses.push(mockRawData);
          
          // 检查响应结构并更新分页参数
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
        
        // 保存合并后的数据，同时保留原始响应
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
        console.error(`导出卡池 ${category.name} 时发生错误:`, err);
        showToast(`导出卡池 ${category.name} 时发生错误: ${errorMessage}`);
      }
    }
    
    const totalDuration = Date.now() - exportStartTime;
    logger.info('寻访记录导出统计', {
      totalCategories: totalCategories,
      successfulCategories: successfulCategories,
      totalExportedRecords: totalExportedRecords,
      totalDuration: totalDuration,
      categoriesWithRecords: rawDataExport.categories.length
    });
    
    if (rawDataExport.categories.length === 0) {
      logger.warn('没有可导出的记录', {
        totalCategories: totalCategories,
        successfulCategories: successfulCategories
      });
      showToast('没有可导出的记录');
      return;
    }
    
    exportProgress.value = '正在生成文件...';
    
    let finalData: any;
    let fileName: string;
    let formatDescription: string;
    
    if (exportFormat.value === 'universal') {
      // 通用格式导出
      finalData = convertToUniversalFormat(rawDataExport, uid);
      fileName = `寻访记录_通用格式_${new Date().toISOString().split('T')[0]}.json`;
      formatDescription = '通用格式';
      
      logger.debug('生成通用格式文件', {
        fileName: fileName,
        dataKeysCount: Object.keys(finalData.data).length,
        uid: finalData.info.uid
      });
    } else {
      // 原生格式导出
      finalData = rawDataExport;
      fileName = `寻访记录_原生格式_${new Date().toISOString().split('T')[0]}.json`;
      formatDescription = '原生格式';
      
      logger.debug('生成原生格式文件', {
        fileName: fileName,
        categoriesCount: rawDataExport.categories.length
      });
    }
    
    // 创建并下载JSON文件
    const dataStr = JSON.stringify(finalData, null, 2);
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
    showToast(`寻访记录（${formatDescription}）导出成功`);
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

// 导入寻访记录
const importGachaData = () => {
  logger.info('开始导入寻访记录');
  
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  
  input.onchange = (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) {
      logger.warn('用户未选择文件');
      return;
    }
    
    logger.info('用户选择文件进行导入', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const fileContent = e.target?.result as string;
        logger.debug('开始解析导入文件', {
          fileName: file.name,
          contentLength: fileContent.length
        });
        
        const data = JSON.parse(fileContent);
        
        // 检查是否是通用格式（包含info和data字段的对象）
        if (data && typeof data === 'object' && data.info && data.data && typeof data.data === 'object') {
          // 通用格式：转换data字段为导入格式
          logger.debug('检测到通用格式导出文件', {
            uid: data.info.uid,
            lang: data.info.lang,
            exportTime: data.info.export_time,
            dataKeysCount: Object.keys(data.data).length
          });
          
          // 将通用格式转换为内部格式
          const categoryMap = new Map<string, { categoryName: string; categoryId?: string; records: any[] }>();
          
          Object.entries(data.data).forEach(([timestamp, recordInfo]: [string, any]) => {
            if (recordInfo && recordInfo.c && recordInfo.p) {
              const poolName = recordInfo.p;
              if (!categoryMap.has(poolName)) {
                categoryMap.set(poolName, {
                  categoryName: poolName,
                  categoryId: `imported_${poolName}`,
                  records: []
                });
              }
              
              // 转换每条记录
              recordInfo.c.forEach((charInfo: any[]) => {
                const [charName, rarity, isNew] = charInfo;
                categoryMap.get(poolName)!.records.push({
                  charName: charName,
                  rarity: rarity,
                  isNew: isNew === 1,
                  gachaTs: timestamp,
                  poolId: '',
                  poolName: poolName,
                  pos: 0
                });
              });
            }
          });
          
          importedData.value = Array.from(categoryMap.values());
          
          const totalImportedRecords = importedData.value.reduce((sum, cat) => sum + cat.records.length, 0);
          logger.info('通用格式文件解析成功', {
            importedCategories: importedData.value.length,
            totalImportedRecords: totalImportedRecords
          });
        } else if (data && typeof data === 'object' && data.categories && Array.isArray(data.categories)) {
          // 新格式：提取categories数组
          logger.debug('检测到新格式导出文件', {
            categoriesCount: data.categories.length,
            hasExportTime: !!data.exportTime,
            uid: data.uid?.substring(0, 8) + '...'
          });
          
          importedData.value = data.categories.map((category: any) => ({
            categoryName: category.categoryInfo.name.replace('\\n', ' '),
            categoryId: category.categoryInfo.id,
            records: category.mergedData ? category.mergedData.data.list : []
          }));
          
          const totalImportedRecords = importedData.value.reduce((sum, cat) => sum + cat.records.length, 0);
          logger.info('新格式文件解析成功', {
            importedCategories: importedData.value.length,
            totalImportedRecords: totalImportedRecords
          });
        } else if (Array.isArray(data)) {
          // 旧格式：直接使用数组
          logger.debug('检测到旧格式导出文件', {
            arrayLength: data.length
          });
          
          importedData.value = data;
          
          const totalImportedRecords = importedData.value.reduce((sum, cat) => sum + cat.records.length, 0);
          logger.info('旧格式文件解析成功', {
            importedCategories: importedData.value.length,
            totalImportedRecords: totalImportedRecords
          });
        } else {
          logger.error('文件格式错误', {
            dataType: typeof data,
            hasCategories: !!(data && typeof data === 'object' && data.categories),
            isArray: Array.isArray(data)
          });
          showToast('文件格式错误');
          return;
        }
        expandedImportedCategories.value = {};
        
        logger.info('寻访记录导入成功', {
          fileName: file.name,
          importedCategories: importedData.value.length,
          totalRecords: importedData.value.reduce((sum, cat) => sum + cat.records.length, 0)
        });
        showToast('寻访记录导入成功');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '未知错误';
        logger.error('导入文件解析失败', {
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
          fileName: file.name,
          fileSize: file.size
        });
        console.error('导入失败:', error);
        showToast('文件解析失败，请检查文件格式');
      }
    };
    
    reader.onerror = (error) => {
      logger.error('文件读取失败', {
        fileName: file.name,
        error: error
      });
      showToast('文件读取失败');
    };
    
    reader.readAsText(file);
  };
  
  input.click();
};

// 切换导入卡池的展开/收起状态
const toggleImportedCategory = (index: number) => {
  expandedImportedCategories.value[index] = !expandedImportedCategories.value[index];
};

// 清除导入数据
const clearImportedData = () => {
  const previousDataCount = importedData.value.length;
  const previousRecordsCount = importedData.value.reduce((sum, cat) => sum + cat.records.length, 0);
  
  logger.info('用户清除导入数据', {
    previousCategories: previousDataCount,
    previousRecords: previousRecordsCount
  });
  
  importedData.value = [];
  expandedImportedCategories.value = {};
  showToast('导入数据已清除');
};

// 导出合并后的导入数据
const exportMergedImportedData = () => {
  if (importedData.value.length === 0) {
    showToast('没有可导出的导入数据');
    return;
  }

  try {
    // 按卡池ID合并数据
    const mergedCategories = new Map();
    
    for (const category of importedData.value) {
      const categoryId = category.categoryId || category.categoryName;
      
      if (!mergedCategories.has(categoryId)) {
        // 如果这个卡池还没有数据，创建新的条目
        mergedCategories.set(categoryId, {
          categoryName: category.categoryName,
          categoryId: category.categoryId || categoryId,
          records: []
        });
      }
      
      // 合并记录
      const existingCategory = mergedCategories.get(categoryId);
      existingCategory.records.push(...category.records);
    }
    
    // 去重并排序记录（按时间戳）
    for (const category of mergedCategories.values()) {
      // 按gachaTs去重（保留最新的记录）
      const uniqueRecords = new Map();
      for (const record of category.records) {
        const key = `${record.charId}_${record.gachaTs}`;
        if (!uniqueRecords.has(key) || record.gachaTs > uniqueRecords.get(key).gachaTs) {
          uniqueRecords.set(key, record);
        }
      }
      
      // 转换为数组并按时间戳排序（最新的在前）
      category.records = Array.from(uniqueRecords.values())
        .sort((a, b) => new Date(b.gachaTs).getTime() - new Date(a.gachaTs).getTime());
    }
    
    // 创建导出数据
    const mergedData = Array.from(mergedCategories.values());
    
    // 创建并下载JSON文件
    const dataStr = JSON.stringify({
      exportTime: new Date().toISOString(),
      exportType: 'merged_imported_data',
      totalCategories: mergedData.length,
      categories: mergedData
    }, null, 2);
    
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `合并寻访记录_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showToast(`合并寻访记录导出成功，共${mergedData.length}个卡池`);
  } catch (err: unknown) {
    console.error('导出合并数据失败:', err);
    showToast('导出合并数据失败，请重试');
  }
};

const loadAllPoolNames = async (
  uid: string,
  cookie: string,
  roleToken: string,
  accountToken: string,
  categoryList: GachaCategory[]
) => {
  logger.info('开始预加载所有卡池的poolName', {
    categoriesCount: categoryList.length
  });
  
  const promises = categoryList.map(async (category, index) => {
    try {
      logger.debug(`获取卡池${index + 1}/${categoryList.length}的poolName`, {
        categoryId: category.id,
        categoryName: category.name
      });
      
      const response = await logger.performanceAsync(`获取卡池${category.id}的poolName`, async () => {
        return await getGachaHistory(
          uid,
          cookie,
          roleToken,
          accountToken,
          category.id,
          1, // 只获取1条记录来获取poolName
          undefined,
          undefined
        );
      });
      
      if (response.list.length > 0) {
        const firstRecord = response.list[0];
        categoryPoolNames.value.set(category.id, firstRecord.poolName);
        logger.debug(`卡池${category.id}的poolName获取成功`, {
          poolName: firstRecord.poolName,
          categoryId: category.id
        });
      } else {
        logger.warn(`卡池${category.id}无记录，无法获取poolName`, {
          categoryId: category.id,
          categoryName: category.name
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      logger.error(`获取卡池 ${category.id} 的poolName失败`, {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        categoryId: category.id,
        categoryName: category.name
      });
      console.warn(`获取卡池 ${category.id} 的poolName失败:`, error);
    }
  });
  
  const results = await Promise.allSettled(promises);
  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  
  logger.info('卡池poolName预加载完成', {
    totalCategories: categoryList.length,
    successful: successful,
    failed: failed,
    successRate: `${((successful / categoryList.length) * 100).toFixed(1)}%`
  });
};

// 生命周期
onMounted(() => {
  logger.gacha('寻访记录组件已挂载', {
    isLogin: authStore.isLogin,
    hasMainUid: !!authStore.mainUid,
    hasHgToken: !!authStore.hgToken
  });
  
  if (authStore.isLogin) {
    refreshGachaData();
  } else {
    logger.gacha('用户未登录，跳过寻访记录数据加载');
  }
});
</script>

<style scoped>
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
  border-radius: 8px;
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
}

.refresh-btn {
  padding: 10px 20px;
  border: 1px solid #404040;
  border-radius: 6px;
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

/* 导出加载提示样式 */
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
  border-radius: 12px;
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
  border-radius: 8px;
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
  border-radius: 6px;
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
  border-radius: 8px;
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
  border-radius: 6px;
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



/* 卡池列表样式 */
.categories-list {
  background: #2d2d2d;
  border-radius: 8px;
  padding: 24px;
  border: 1px solid #404040;
}

.categories-list h3 {
  margin: 0 0 20px 0;
  color: #ffffff;
  font-size: 18px;
  font-weight: 600;
}

.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
}

.category-card {
  background: #3a3a3a;
  border: 1px solid #404040;
  border-radius: 8px;
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

/* 记录表格样式 */
.records-container {
  background: #2d2d2d;
  border-radius: 8px;
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
  border-radius: 8px;
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
  border-radius: 4px;
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
  border-radius: 6px;
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
  border-radius: 8px;
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

/* 回退图标样式 */
.back-icon-btn {
  position: absolute;
  top: 20px;
  left: 20px;
  width: 40px;
  height: 40px;
  border: 1px solid #404040;
  border-radius: 6px;
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
  /* 镜面反转 (transform: scaleX(-1)) + 白色滤镜 */
  transform: scaleX(-1);
  filter: brightness(0) invert(1);
  transition: all 0.2s;
}

.back-icon-btn:hover .back-icon-img {
  /* hover时变为蓝色 */
  filter: brightness(0) saturate(100%) invert(42%) sepia(91%) saturate(1352%) hue-rotate(202deg) brightness(97%) contrast(89%);
}

/* 导出导入按钮样式 */
.export-group {
  display: flex;
  gap: 8px;
  align-items: center;
}

.format-select {
  padding: 10px 12px;
  border: 1px solid #404040;
  border-radius: 6px;
  background: #3a3a3a;
  color: #ccc;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.format-select:hover {
  border-color: #646cff;
  background: #4a4a4a;
}

.format-select:focus {
  outline: none;
  border-color: #646cff;
  box-shadow: 0 0 0 2px rgba(100, 108, 255, 0.2);
}

.export-btn, .import-btn, .clear-btn {
  padding: 10px 20px;
  border: 1px solid #404040;
  border-radius: 6px;
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
  border-radius: 6px;
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
  border-radius: 8px;
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

.imported-categories {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.imported-category {
  background: #3a3a3a;
  border: 1px solid #404040;
  border-radius: 8px;
  overflow: hidden;
}

.imported-category h4 {
  margin: 0;
  padding: 16px 20px;
  color: #ffffff;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: background 0.2s;
}

.imported-category h4:hover {
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

.imported-records-table .gacha-table {
  margin: 0;
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
  
  .categories-grid {
    grid-template-columns: 1fr;
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
}
</style>
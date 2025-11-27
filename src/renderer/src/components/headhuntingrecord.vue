<template>
  <div class="headhunting-record">
    <div class="header">
      <h2>寻访记录</h2>
      <div class="actions">
        <button @click="refreshGachaData" class="refresh-btn" :disabled="loading" title="刷新数据">
          <span v-if="!loading">刷新</span>
          <span v-else>刷新中...</span>
        </button>
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
          <p class="category-id">{{ category.id }}</p>
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
          第 {{ currentPage }} 页，共 {{ totalPages }} 页
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
  type GachaRecord
} from '@services/Gacha';

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

// 卡池相关状态
const categories = ref<GachaCategory[]>([]);
const selectedCategory = ref<GachaCategory | null>(null);
const gachaRecords = ref<GachaRecord[]>([]);

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

const totalPages = computed(() => {
  return Math.ceil(gachaRecords.value.length / pageSize);
});

// 方法
const refreshGachaData = async () => {
  if (!authStore.mainUid) {
    error.value = '未找到游戏UID';
    return;
  }

  loading.value = true;
  error.value = null;
  
  try {
    // 重置状态
    categories.value = [];
    selectedCategory.value = null;
    gachaRecords.value = [];
    currentPage.value = 1;
    lastRecordPos.value = null;
    lastRecordTs.value = null;

    // 执行完整的抽卡API流程
    await executeGachaFlow();
  } catch (err: unknown) {
    console.error('获取抽卡数据失败:', err);
    error.value = err instanceof Error ? err.message : '获取抽卡数据失败';
  } finally {
    loading.value = false;
  }
};

const executeGachaFlow = async () => {
  if (!authStore.hgToken || !authStore.mainUid) {
    throw new Error('缺少必要的认证信息');
  }

  const uid = authStore.mainUid;

  // 流程1-4：获取认证凭证
  loadingText.value = '正在获取认证凭证...';
  
  // 流程1：获取token（使用已有的hgToken）
  const token = authStore.hgToken;
  console.log('使用hgToken:', token.substring(0, 20) + '...');
  console.log('使用UID:', uid);
  
  // 流程2：OAuth2授权
  const oauthData = await getOAuth2Grant(token);
  
  // 流程3：获取x-role-token
  const roleToken = await getU8TokenByUid(oauthData.token, uid);
  
  // 流程4：角色登录获取cookie
  const cookie = await roleLogin(roleToken);
  
  // 流程5：获取卡池分类
  loadingText.value = '正在获取卡池列表...';
  const categoryList = await getGachaCategories(uid, cookie, roleToken, token);
  categories.value = categoryList;
  
  // 保存认证信息到本地存储，供后续使用
  localStorage.setItem('gacha_auth', JSON.stringify({
    uid,
    cookie,
    roleToken,
    accountToken: token
  }));
};

const selectCategory = async (category: GachaCategory) => {
  selectedCategory.value = category;
  currentPage.value = 1;
  lastRecordPos.value = null;
  lastRecordTs.value = null;
  
  await loadGachaRecords();
};

const loadGachaRecords = async () => {
  if (!selectedCategory.value || !authStore.mainUid) {
    return;
  }

  loading.value = true;
  error.value = null;
  loadingText.value = '正在加载抽卡记录...';

  try {
    // 获取保存的认证信息
    const authData = localStorage.getItem('gacha_auth');
    if (!authData) {
      throw new Error('认证信息已过期，请重新登录');
    }

    const { uid, cookie, roleToken, accountToken } = JSON.parse(authData);

    // 加载当前页数据
    const response = await getGachaHistory(
      uid,
      cookie,
      roleToken,
      accountToken,
      selectedCategory.value.id,
      pageSize,
      lastRecordPos.value || undefined,
      lastRecordTs.value || undefined
    );

    if (currentPage.value === 1) {
      // 第一页，直接替换数据
      gachaRecords.value = response.list;
    } else {
      // 后续页，追加数据
      gachaRecords.value.push(...response.list);
    }

    hasNextPage.value = response.hasMore;
    
    // 更新分页信息
    if (response.list.length > 0) {
      const lastRecord = response.list[response.list.length - 1];
      lastRecordPos.value = lastRecord.pos;
      lastRecordTs.value = lastRecord.gachaTs;
    }

  } catch (err: unknown) {
    console.error('加载抽卡记录失败:', err);
    error.value = err instanceof Error ? err.message : '加载抽卡记录失败';
  } finally {
    loading.value = false;
  }
};

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
  }
};

const nextPage = async () => {
  if (hasNextPage.value && !loading.value) {
    currentPage.value++;
    await loadGachaRecords();
  }
};

const backToCategories = () => {
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
    2: '二星',
    3: '三星', 
    4: '四星',
    5: '五星',
    6: '六星'
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

// 生命周期
onMounted(() => {
  if (authStore.isLogin) {
    refreshGachaData();
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

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
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

.rarity-2 { background: rgba(30, 64, 175, 0.2); color: #6495ed; }
.rarity-3 { background: rgba(6, 95, 70, 0.2); color: #4caf50; }
.rarity-4 { background: rgba(146, 64, 14, 0.2); color: #ffa726; }
.rarity-5 { background: rgba(107, 33, 168, 0.2); color: #ba68c8; }
.rarity-6 { background: rgba(153, 27, 27, 0.2); color: #ff6b6b; }

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
}
</style>
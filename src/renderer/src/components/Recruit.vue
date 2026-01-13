<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'

// 定义干员类型
interface Operator {
  name: string
  star: number
  tag: string[]
  skin: string
}

// 定义JSON数据结构
interface RecruitData {
  update: {
    version: string
    date: string
  }
  new_ope: {
    name: string[]
  }
  operator_list: Operator[]
  operator_high_list: Operator[]
  operator_low_list: Operator[]
  operator_robot_list: Operator[]
}

// 响应式数据
const recruitData = ref<RecruitData | null>(null)
const selectedTags = ref<string[]>([])
const calculationResults = ref<Operator[]>([])
const isLoading = ref(true)
const loadError = ref<string | null>(null)

// 所有可选的标签
const allTags = ref([
  '新手', '资深干员', '高级资深干员',
  '近战位', '远程位',
  '先锋干员', '狙击干员', '医疗干员', '术师干员', '重装干员', '辅助干员', '特种干员',
  '治疗', '支援', '输出', '群攻', '减速', '生存', '防护', '削弱',
  '位移', '控场', '爆发', '召唤', '快速复活', '费用回复',
  '支援机械'
])

// 在Vue中，使用import导入assets下的JSON文件
const loadRecruitData = async () => {
  isLoading.value = true
  loadError.value = null

  try {
    console.log('开始加载公招数据...')

    // 方法1: 直接import（推荐）
    try {
      // 注意：这里需要使用相对路径，根据你的文件结构调整
      const data = await import('@assets/json/recruit.json')
      recruitData.value = data.default
      console.log('通过import加载成功:', recruitData.value)
    } catch (importError) {
      console.log('import方式失败，尝试fetch方式:', importError)

      // 方法2: 使用fetch
      const response = await fetch('/src/assets/json/recruit.json')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const jsonData = await response.json()
      recruitData.value = jsonData
      console.log('通过fetch加载成功:', recruitData.value)
    }

    // 验证数据
    if (recruitData.value) {
      console.log('数据验证:')
      console.log('- operator_list数量:', recruitData.value.operator_list?.length)
      console.log('- operator_high_list数量:', recruitData.value.operator_high_list?.length)
      console.log('- operator_low_list数量:', recruitData.value.operator_low_list?.length)
      console.log('- operator_robot_list数量:', recruitData.value.operator_robot_list?.length)

      // 检查前几个干员的数据
      if (recruitData.value.operator_list && recruitData.value.operator_list.length > 0) {
        console.log('前3个干员:', recruitData.value.operator_list.slice(0, 3))
      }
    }

  } catch (error) {
    console.error('加载公招数据失败:', error)
    loadError.value = `加载失败: ${error instanceof Error ? error.message : '未知错误'}`

    // 使用一个最小的示例数据确保界面能工作
    recruitData.value = {
      update: { version: "1.0.0", date: "2024-01-01" },
      new_ope: { name: [] },
      operator_list: [
        {
          name: "示例干员",
          star: 4,
          tag: ["近战位", "输出"],
          skin: "char_1001_amiya2_1"
        }
      ],
      operator_high_list: [],
      operator_low_list: [],
      operator_robot_list: []
    }
  } finally {
    isLoading.value = false
  }
}

// 获取干员头像URL
const getOperatorAvatarUrl = (skin: string): string => {
  if (!skin) return ''
  const baseUrl = 'https://raw.githubusercontent.com/yuanyan3060/ArknightsGameResource/main/avatar'
  return `${baseUrl}/${skin}.png`
}

// 处理头像加载错误
const handleAvatarError = (event: Event) => {
  const img = event.target as HTMLImageElement
  img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiByeD0iOCIgZmlsbD0iIzNBM0EzQSIvPgo8dGV4dCB4PSIzMCIgeT0iMzUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iI0NDQyIgdGV4dC1hbmNob3I9Im1pZGRsZSI+5aS05p2hPC90ZXh0Pgo8L3N2Zz4K'
}

// 切换标签选择
const toggleTag = (tag: string) => {
  const index = selectedTags.value.indexOf(tag)
  if (index > -1) {
    selectedTags.value.splice(index, 1)
  } else if (selectedTags.value.length < 5) {
    selectedTags.value.push(tag)
  }
  console.log('当前选中标签:', selectedTags.value)
}

// 清空所有标签
const clearAllTags = () => {
  selectedTags.value = []
  console.log('已清空所有标签')
}

// 计算可能出现的干员
const calculateResults = () => {
  console.log('=== 开始计算 ===')
  console.log('选中标签:', selectedTags.value)

  if (!recruitData.value) {
    console.log('数据未加载')
    calculationResults.value = []
    return
  }

  if (selectedTags.value.length === 0) {
    console.log('未选择标签')
    calculationResults.value = []
    return
  }

  // 获取所有干员
  const allOperators = [
    ...(recruitData.value.operator_high_list || []),
    ...(recruitData.value.operator_list || []),
    ...(recruitData.value.operator_low_list || []),
    ...(recruitData.value.operator_robot_list || [])
  ]

  console.log('总干员数量:', allOperators.length)

  let results: Operator[] = []

  const hasSenior = selectedTags.value.includes('资深干员')
  const hasHighSenior = selectedTags.value.includes('高级资深干员')
  const hasNewbie = selectedTags.value.includes('新手')

  const normalTags = selectedTags.value.filter(tag =>
    !['资深干员', '高级资深干员', '新手'].includes(tag)
  )

  console.log('特殊标签:', { hasHighSenior, hasSenior, hasNewbie })
  console.log('普通标签:', normalTags)

  // 筛选逻辑
  if (hasHighSenior) {
    console.log('使用高资干员列表筛选')
    const sourceList = recruitData.value.operator_high_list || []
    results = sourceList.filter(operator => {
      const hasAllNormalTags = normalTags.length === 0 ||
        normalTags.every(tag => operator.tag && operator.tag.includes(tag))
      console.log(`高资干员 ${operator.name}: 标签${operator.tag}, 匹配${hasAllNormalTags}`)
      return hasAllNormalTags
    })
  } else if (hasSenior) {
    console.log('使用资深干员列表筛选 - 只显示5星干员')
    // 只选择5星干员，不包括6星
    const seniorOperators = [
      ...(recruitData.value.operator_list || []).filter(op => op.star === 5)
    ]
    results = seniorOperators.filter(operator => {
      const hasAllNormalTags = normalTags.length === 0 ||
        normalTags.every(tag => operator.tag && operator.tag.includes(tag))
      console.log(`资深干员 ${operator.name}: 星级${operator.star}, 标签${operator.tag}, 匹配${hasAllNormalTags}`)
      return hasAllNormalTags
    })
  } else if (hasNewbie) {
    console.log('使用新手干员列表筛选')
    const newbieOperators = [
      ...(recruitData.value.operator_low_list || []),
      ...(recruitData.value.operator_robot_list || [])
    ]
    results = newbieOperators.filter(operator => {
      const hasAllNormalTags = normalTags.length === 0 ||
        normalTags.every(tag => operator.tag && operator.tag.includes(tag))
      return hasAllNormalTags
    })
  } else if (normalTags.length > 0) {
    console.log('使用普通标签筛选')
    results = allOperators.filter(operator => {
      const hasAllNormalTags = normalTags.every(tag => operator.tag && operator.tag.includes(tag))
      if (hasAllNormalTags) {
        console.log(`干员 ${operator.name} 匹配, 标签: ${operator.tag}`)
      }
      return hasAllNormalTags
    })
  } else {
    console.log('无有效标签，显示所有干员')
    results = allOperators
  }

  console.log('筛选后结果数量:', results.length)

  // 去重和排序
  calculationResults.value = results
    .filter((operator, index, self) =>
      index === self.findIndex(op => op.name === operator.name)
    )
    .sort((a, b) => {
      if (b.star !== a.star) {
        return b.star - a.star
      }
      return a.name.localeCompare(b.name, 'zh-CN')
    })

  console.log('最终结果数量:', calculationResults.value.length)
  console.log('最终结果:', calculationResults.value.map(op => ({ name: op.name, star: op.star, tags: op.tag })))
  console.log('=== 计算结束 ===')
}

// 重新加载数据
const reloadData = () => {
  loadRecruitData()
}

// 获取星级显示
const getStarDisplay = (star: number): string => {
  return '★'.repeat(star)
}

// 获取稀有度颜色
const getRarityColor = (star: number): string => {
  switch (star) {
    case 6: return '#ffa500' // 橙色 - 高级资深干员
    case 5: return '#ffd700' // 金色 - 资深干员
    case 4: return '#9feaf9'
    case 3: return '#6cc24a'
    case 2: return '#cccccc'
    case 1: return '#aaaaaa'
    default: return '#cccccc'
  }
}

// 监听标签选择变化，自动计算
watch(selectedTags, calculateResults, { deep: true })

// 监听数据加载完成
watch(recruitData, (newData) => {
  if (newData) {
    console.log('数据已加载，重新计算')
    calculateResults()
  }
})

// 组件挂载时加载数据
onMounted(() => {
  console.log('组件挂载')
  loadRecruitData()
})
</script>

<template>
  <div class="recruit-container">
    <h2>公开招募计算</h2>

    <!-- 加载状态和错误提示 -->
    <div v-if="isLoading" class="loading-state">
      <div class="spinner"></div>
      <p>正在加载公招数据...</p>
    </div>

    <div v-if="loadError" class="error-tip">
      <span class="error-icon">✖</span>
      {{ loadError }}
      <button @click="reloadData" class="retry-btn">重试</button>
    </div>

    <div v-if="recruitData && !isLoading">
      <div class="tags-section">
        <div class="tags-header">
          <h3>选择标签 ({{ selectedTags.length }}/5)</h3>
          <div class="tags-controls">
            <div class="important-tip-inline">
              <span class="warning-icon">!</span>
              高资及资深干员切记拉满九小时！！
            </div>
            <button
              @click="clearAllTags"
              class="clear-btn"
              :disabled="selectedTags.length === 0"
            >
              清空标签
            </button>
          </div>
        </div>
        <div class="tags-grid">
          <div
            v-for="tag in allTags"
            :key="tag"
            :class="['tag-item', {
              'selected': selectedTags.includes(tag),
              'senior-tag': tag === '资深干员',
              'high-senior-tag': tag === '高级资深干员',
              'newbie-tag': tag === '新手'
            }]"
            @click="toggleTag(tag)"
          >
            {{ tag }}
          </div>
        </div>
      </div>

      <div class="results-section" v-if="calculationResults.length > 0">
        <h3>可能出现的干员 ({{ calculationResults.length }}个)</h3>
        <div class="results-grid">
          <div
            v-for="operator in calculationResults"
            :key="operator.name"
            class="operator-card"
          >
            <div class="operator-avatar">
              <img
                :src="getOperatorAvatarUrl(operator.skin)"
                :alt="operator.name"
                class="avatar-img"
                @error="handleAvatarError"
              />
              <div class="star-display" :style="{ color: getRarityColor(operator.star) }">
                {{ getStarDisplay(operator.star) }}
              </div>
            </div>
            <div class="operator-info">
              <div class="operator-name" :style="{ color: getRarityColor(operator.star) }">
                {{ operator.name }}
              </div>
              <div class="operator-tags">
                <span
                  v-for="tag in operator.tag"
                  :key="tag"
                  class="operator-tag"
                >
                  {{ tag }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="no-results" v-else-if="selectedTags.length > 0">
        <p>没有找到匹配的干员，请尝试其他标签组合</p>
      </div>

      <div class="tips">
        <h4>使用说明：</h4>
        <ul>
          <li>点击标签即可查看可能出现的干员</li>
          <li>最多可以选择5个标签</li>
          <li><span class="high-senior-text">高级资深干员</span>必须拉满九小时才能保证不被划掉tag！！！</li>
          <li><span class="senior-text">资深干员</span>必须拉满九小时才能保证不被划掉tag！！！</li>
          <li>组合特定标签可以精确筛选目标干员</li>
        </ul>
      </div>

      <div class="version-info">
        <span>数据版本: {{ recruitData.update.version }} ({{ recruitData.update.date }})</span>
        <span>数据来源：blueskybone</span>
        <span class="new-operators" v-if="recruitData.new_ope.name.length > 0">
          新增干员: {{ recruitData.new_ope.name.join('、') }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.recruit-container {
  color: white;
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.recruit-container h2 {
  margin-bottom: 20px;
  color: #fad000;
  text-align: center;
  font-size: 2rem;
}

.loading-state {
  text-align: center;
  padding: 40px;
  color: #ccc;
  font-size: 16px;
}

.spinner {
  border: 4px solid #3a3a3a;
  border-left: 4px solid #646cff;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-tip {
  background: linear-gradient(135deg, #ff4444, #ff6b6b);
  color: white;
  padding: 15px 20px;

  margin-bottom: 20px;
  text-align: center;
  font-size: 16px;
  border: 2px solid #ff8e8e;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
}

.retry-btn, .refresh-btn {
  padding: 6px 12px;
  background: white;
  color: #ff4444;
  border: none;

  cursor: pointer;
  font-weight: bold;
  transition: all 0.2s;
}

.retry-btn:hover, .refresh-btn:hover {
  background: #f0f0f0;
  transform: translateY(-1px);
}

.version-info {
  display: flex;
  justify-content: space-between;
  background: #2d2d2d;
  padding: 10px 15px;

  margin-bottom: 10px;
  font-size: 12px;
  color: #ccc;
  border: 1px solid #404040;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.new-operators {
  color: #6cc24a;
  font-weight: 500;
}

.important-tip {
  background: linear-gradient(135deg, #ff4444, #ff6b6b);
  color: white;
  padding: 15px 20px;

  margin-bottom: 25px;
  text-align: center;
  font-size: 18px;
  font-weight: bold;
  border: 2px solid #ff8e8e;
  animation: pulse 2s infinite;
}

.warning-icon {
  margin-right: 10px;
  font-size: 20px;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.8; }
  100% { opacity: 1; }
}

.tags-section {
  margin-bottom: 30px;
  background: #2d2d2d;

  border: 1px solid #404040;
  padding: 20px;
}

.tags-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.tags-section h3 {
  margin-bottom: 0;
  color: #9feaf9;
  font-size: 1.3rem;
}

.tags-controls {
  display: flex;
  align-items: center;
  gap: 15px;
}

.important-tip-inline {
  background: linear-gradient(135deg, #ff4444, #ff6b6b);
  color: white;
  padding: 8px 15px;
  font-size: 14px;
  font-weight: bold;
  border: 2px solid #ff8e8e;
  animation: pulse 2s infinite;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.important-tip-inline .warning-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  font-weight: bold;
  font-size: 14px;
}

.clear-btn {
  padding: 8px 16px;
  background: #6c757d;
  color: white;
  border: none;

  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.clear-btn:hover:not(:disabled) {
  background: #5a6268;
}

.clear-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tags-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 10px;
}

.tag-item {
  padding: 12px 8px;
  background: #3a3a3a;
  border: 2px solid #404040;

  text-align: center;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s ease;
  user-select: none;
}

.tag-item:hover {
  background: #4a4a4a;
  border-color: #646cff;
  transform: translateY(-2px);
}

.tag-item.selected {
  background: #646cff;
  border-color: #646cff;
  color: white;
  transform: translateY(-2px);
}

.tag-item.senior-tag {
  border-color: #ffd700; /* 金色 - 资深干员 */
}

.tag-item.senior-tag.selected {
  background: #ffd700;
  border-color: #ffd700;
  color: #333;
  font-weight: bold;
}

.tag-item.high-senior-tag {
  border-color: #ffa500; /* 橙色 - 高级资深干员 */
}

.tag-item.high-senior-tag.selected {
  background: #ffa500;
  border-color: #ffa500;
  color: white;
  font-weight: bold;
}

.tag-item.newbie-tag {
  border-color: #6cc24a;
}

.tag-item.newbie-tag.selected {
  background: #6cc24a;
  border-color: #6cc24a;
  color: white;
}

.results-section {
  margin-bottom: 30px;
}

.results-section h3 {
  margin-bottom: 20px;
  color: #9feaf9;
  font-size: 1.3rem;
}

.results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 15px;
}

.operator-card {
  display: flex;
  align-items: flex-start;
  padding: 15px;
  background: #2d2d2d;

  border: 1px solid #404040;
  gap: 20px;
  transition: all 0.2s ease;
}

.operator-card:hover {
  background: #3a3a3a;
  border-color: #646cff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.operator-avatar {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.avatar-img {
  width: 70px;
  height: 70px;

  background: #3a3a3a;
  border: 2px solid #404040;
  object-fit: cover;
}

.star-display {
  font-size: 14px;
  font-weight: bold;
  text-align: center;
  width: 100%;
}

.operator-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  text-align: right;
  gap: 12px;
}

.operator-name {
  font-size: 18px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
  text-align: right;
}

.operator-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: flex-end;
  width: 100%;
}

.operator-tag {
  padding: 4px 8px;
  background: #3a3a3a;

  font-size: 11px;
  color: #ccc;
  border: 1px solid #404040;
  white-space: nowrap;
}

.no-results {
  text-align: center;
  padding: 40px;
  color: #ccc;
  font-size: 16px;
  background: #2d2d2d;

  border: 1px solid #404040;
  margin-bottom: 20px;
}

.tips {
  padding: 25px;
  background: #2d2d2d;

  border: 1px solid #404040;
  margin-top: 30px;
}

.tips h4 {
  margin-bottom: 15px;
  color: #fad000;
  font-size: 1.2rem;
}

.tips ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.tips li {
  padding: 8px 0;
  color: #ccc;
  padding-left: 20px;
  line-height: 1.6;
  position: relative;
}

.tips li:before {
  content: '•';
  color: #646cff;
  position: absolute;
  left: 0;
  font-size: 18px;
}

.high-senior-text {
  color: #ffa500; /* 橙色 */
  font-weight: 600;
}

.senior-text {
  color: #ffd700; /* 金色 */
  font-weight: 600;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .recruit-container {
    padding: 15px;
  }

  .tags-grid {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  }

  .results-grid {
    grid-template-columns: 1fr;
  }

  .version-info {
    flex-direction: column;
    align-items: flex-start;
  }

  .operator-card {
    padding: 12px;
    gap: 15px;
  }

  .operator-avatar {
    gap: 6px;
  }

  .avatar-img {
    width: 60px;
    height: 60px;
  }

  .operator-info {
    gap: 10px;
  }

  .operator-name {
    font-size: 16px;
  }

  .error-tip {
    flex-direction: column;
    gap: 15px;
  }
}

@media (max-width: 480px) {
  .operator-card {
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 12px;
  }

  .operator-info {
    align-items: center;
    text-align: center;
    width: 100%;
  }

  .operator-name {
    text-align: center;
  }

  .operator-tags {
    justify-content: center;
  }
}
</style>

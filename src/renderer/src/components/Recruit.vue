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

// 所有可选的标签
const allTags = ref([
  '新手', '资深干员', '高级资深干员',
  '近战位', '远程位',
  '先锋干员', '狙击干员', '医疗干员', '术师干员', '重装干员', '辅助干员', '特种干员',
  '治疗', '支援', '输出', '群攻', '减速', '生存', '防护', '削弱',
  '位移', '控场', '爆发', '召唤', '快速复活', '费用回复',
  '支援机械'
])

// 加载JSON数据
const loadRecruitData = async () => {
  try {
    const response = await fetch('@assets/json/recruit.json')
    if (response.ok) {
      recruitData.value = await response.json()
      console.log('公招数据加载成功')
    } else {
      console.error('加载公招数据失败: HTTP状态', response.status)
    }
  } catch (error) {
    console.error('加载公招数据失败:', error)
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
}

// 移除标签
const removeTag = (tag: string) => {
  const index = selectedTags.value.indexOf(tag)
  if (index > -1) {
    selectedTags.value.splice(index, 1)
  }
}

// 清空所有标签
const clearAllTags = () => {
  selectedTags.value = []
}

// 计算可能出现的干员
const calculateResults = () => {
  if (!recruitData.value || selectedTags.value.length === 0) {
    calculationResults.value = []
    return
  }

  const allOperators = [
    ...recruitData.value.operator_high_list,
    ...recruitData.value.operator_list,
    ...recruitData.value.operator_low_list,
    ...recruitData.value.operator_robot_list
  ]

  let results: Operator[] = []

  const hasSenior = selectedTags.value.includes('资深干员')
  const hasHighSenior = selectedTags.value.includes('高级资深干员')
  const hasNewbie = selectedTags.value.includes('新手')

  const normalTags = selectedTags.value.filter(tag =>
    !['资深干员', '高级资深干员', '新手'].includes(tag)
  )

  if (hasHighSenior) {
    results = recruitData.value.operator_high_list.filter(operator =>
      normalTags.length === 0 || normalTags.some(tag => operator.tag.includes(tag))
    )
  } else if (hasSenior) {
    const seniorOperators = [
      ...recruitData.value.operator_high_list,
      ...recruitData.value.operator_list.filter(op => op.star === 5)
    ]
    results = seniorOperators.filter(operator =>
      normalTags.length === 0 || normalTags.some(tag => operator.tag.includes(tag))
    )
  } else if (hasNewbie) {
    const newbieOperators = [
      ...recruitData.value.operator_low_list,
      ...recruitData.value.operator_robot_list
    ]
    results = newbieOperators.filter(operator =>
      normalTags.length === 0 || normalTags.some(tag => operator.tag.includes(tag))
    )
  } else if (normalTags.length > 0) {
    results = allOperators.filter(operator =>
      normalTags.some(tag => operator.tag.includes(tag))
    )
  } else {
    results = allOperators
  }

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
}

// 获取星级显示
const getStarDisplay = (star: number): string => {
  return '★'.repeat(star)
}

// 获取稀有度颜色
const getRarityColor = (star: number): string => {
  switch (star) {
    case 6: return '#ffd700'
    case 5: return '#ffa500'
    case 4: return '#9feaf9'
    case 3: return '#6cc24a'
    case 2: return '#cccccc'
    case 1: return '#aaaaaa'
    default: return '#cccccc'
  }
}

// 监听标签选择变化，自动计算
watch(selectedTags, calculateResults)

// 组件挂载时加载数据
onMounted(() => {
  loadRecruitData()
})
</script>

<template>
  <div class="recruit-container">
    <h2>公开招募计算</h2>

    <div class="version-info" v-if="recruitData">
      <span>数据版本: {{ recruitData.update.version }} ({{ recruitData.update.date }})</span>
      <span class="new-operators" v-if="recruitData.new_ope.name.length > 0">
        新增干员: {{ recruitData.new_ope.name.join('、') }}
      </span>
    </div>

    <div class="important-tip">
      <span class="warning-icon">⚠️</span>
      高资及资深干员切记拉满九小时！！
    </div>

    <div class="tags-section">
      <h3>选择标签 ({{ selectedTags.length }}/5)</h3>
      <div class="tags-controls">
        <button
          @click="clearAllTags"
          class="clear-btn"
          :disabled="selectedTags.length === 0"
        >
          清空标签
        </button>
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

    <div class="selected-tags" v-if="selectedTags.length > 0">
      <h4>已选标签</h4>
      <div class="selected-tags-list">
        <span
          v-for="tag in selectedTags"
          :key="tag"
          class="selected-tag"
          :class="{
            'senior-tag': tag === '资深干员',
            'high-senior-tag': tag === '高级资深干员',
            'newbie-tag': tag === '新手'
          }"
        >
          {{ tag }}
          <span class="remove-tag" @click="removeTag(tag)">×</span>
        </span>
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
            <div class="rarity-badge" :style="{ color: getRarityColor(operator.star) }">
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

    <div class="no-results" v-else-if="selectedTags.length > 0 && recruitData">
      <p>没有找到匹配的干员，请尝试其他标签组合</p>
    </div>

    <div class="loading-tip" v-else-if="!recruitData">
      <p>正在加载公招数据...</p>
    </div>

    <div class="tips">
      <h4>使用说明：</h4>
      <ul>
        <li>点击标签即可查看可能出现的干员</li>
        <li>最多可以选择5个标签</li>
        <li><span class="high-senior-text">高级资深干员</span>标签必定出现6星干员</li>
        <li><span class="senior-text">资深干员</span>标签必定出现5星及以上干员</li>
        <li><span class="newbie-text">新手</span>标签只会出现1-3星干员</li>
        <li>组合特定标签可以精确筛选目标干员</li>
      </ul>
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

.version-info {
  display: flex;
  justify-content: space-between;
  background: #2d2d2d;
  padding: 10px 15px;
  border-radius: 6px;
  margin-bottom: 20px;
  font-size: 12px;
  color: #ccc;
  border: 1px solid #404040;
  flex-wrap: wrap;
  gap: 10px;
}

.new-operators {
  color: #6cc24a;
  font-weight: 500;
}

.important-tip {
  background: linear-gradient(135deg, #ff4444, #ff6b6b);
  color: white;
  padding: 15px 20px;
  border-radius: 8px;
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
  border-radius: 8px;
  border: 1px solid #404040;
  padding: 20px;
}

.tags-section h3 {
  margin-bottom: 15px;
  color: #9feaf9;
  font-size: 1.3rem;
}

.tags-controls {
  display: flex;
  justify-content: space-between;
  margin-bottom: 15px;
}

.clear-btn {
  padding: 8px 16px;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
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
  border-radius: 6px;
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
  border-color: #ffa500;
}

.tag-item.senior-tag.selected {
  background: #ffa500;
  border-color: #ffa500;
  color: white;
}

.tag-item.high-senior-tag {
  border-color: #ffd700;
}

.tag-item.high-senior-tag.selected {
  background: #ffd700;
  border-color: #ffd700;
  color: #333;
}

.tag-item.newbie-tag {
  border-color: #6cc24a;
}

.tag-item.newbie-tag.selected {
  background: #6cc24a;
  border-color: #6cc24a;
  color: white;
}

.selected-tags {
  margin-bottom: 30px;
  padding: 20px;
  background: #2d2d2d;
  border-radius: 8px;
  border: 1px solid #404040;
}

.selected-tags h4 {
  margin-bottom: 15px;
  color: #6cc24a;
  font-size: 1.2rem;
}

.selected-tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.selected-tag {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  background: #3a3a3a;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  border: 2px solid #404040;
  transition: all 0.2s ease;
}

.selected-tag.senior-tag {
  background: rgba(255, 165, 0, 0.2);
  border-color: #ffa500;
  color: #ffa500;
}

.selected-tag.high-senior-tag {
  background: rgba(255, 215, 0, 0.2);
  border-color: #ffd700;
  color: #ffd700;
}

.selected-tag.newbie-tag {
  background: rgba(108, 194, 74, 0.2);
  border-color: #6cc24a;
  color: #6cc24a;
}

.remove-tag {
  cursor: pointer;
  color: #ff6b6b;
  font-weight: bold;
  margin-left: 8px;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 107, 107, 0.1);
  transition: all 0.2s ease;
}

.remove-tag:hover {
  color: #ff5252;
  background: rgba(255, 107, 107, 0.2);
  transform: scale(1.1);
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
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 15px;
}

.operator-card {
  display: flex;
  align-items: center;
  padding: 15px;
  background: #2d2d2d;
  border-radius: 8px;
  border: 1px solid #404040;
  gap: 15px;
  transition: all 0.2s ease;
}

.operator-card:hover {
  background: #3a3a3a;
  border-color: #646cff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.operator-avatar {
  position: relative;
  width: 70px;
  height: 70px;
  flex-shrink: 0;
}

.avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 8px;
  background: #3a3a3a;
  border: 2px solid #404040;
  object-fit: cover;
}

.rarity-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  background: rgba(0, 0, 0, 0.9);
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
  border: 2px solid currentColor;
  backdrop-filter: blur(4px);
}

.operator-info {
  flex: 1;
  min-width: 0;
}

.operator-name {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.operator-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.operator-tag {
  padding: 4px 8px;
  background: #3a3a3a;
  border-radius: 4px;
  font-size: 11px;
  color: #ccc;
  border: 1px solid #404040;
}

.no-results,
.loading-tip {
  text-align: center;
  padding: 40px;
  color: #ccc;
  font-size: 16px;
  background: #2d2d2d;
  border-radius: 8px;
  border: 1px solid #404040;
  margin-bottom: 20px;
}

.tips {
  padding: 25px;
  background: #2d2d2d;
  border-radius: 8px;
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
  color: #ffd700;
  font-weight: 600;
}

.senior-text {
  color: #ffa500;
  font-weight: 600;
}

.newbie-text {
  color: #6cc24a;
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
  }

  .operator-avatar {
    width: 60px;
    height: 60px;
  }
}
</style>

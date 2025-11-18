<script setup lang="ts">
import { ref, watch } from 'vue'

// 定义干员类型
interface Operator {
  name: string
  rarity: number
  tags: string[]
}

// 所有可选的标签
const allTags = ref([
  '新手', '资深干员', '高级资深干员', '近战位', '远程位', '先锋', '狙击',
  '医疗', '术师', '重装', '辅助', '特种', '治疗', '支援', '输出', '群攻',
  '减速', '生存', '防护', '削弱', '位移', '控场', '爆发', '召唤', '快速复活',
  '费用回复'
])

// 选择的标签
const selectedTags = ref<string[]>([])

// 模拟的干员数据
const operatorsData = ref<Operator[]>([
  // 6星干员（匹配高级资深干员）
  { name: '能天使', rarity: 6, tags: ['狙击', '输出', '远程位'] },
  { name: '银灰', rarity: 6, tags: ['近卫', '输出', '支援', '近战位'] },
  { name: '艾雅法拉', rarity: 6, tags: ['术师', '输出', '群攻', '远程位'] },
  { name: '推进之王', rarity: 6, tags: ['先锋', '费用回复', '近战位'] },
  { name: '星熊', rarity: 6, tags: ['重装', '防护', '输出', '近战位'] },
  { name: '塞雷娅', rarity: 6, tags: ['重装', '治疗', '支援', '近战位'] },
  { name: '安洁莉娜', rarity: 6, tags: ['辅助', '减速', '输出', '远程位'] },
  { name: '闪灵', rarity: 6, tags: ['医疗', '治疗', '支援', '远程位'] },
  { name: '夜莺', rarity: 6, tags: ['医疗', '治疗', '远程位'] },

  // 5星干员（匹配资深干员）
  { name: '德克萨斯', rarity: 5, tags: ['先锋', '控场', '近战位'] },
  { name: '拉普兰德', rarity: 5, tags: ['近卫', '输出', '削弱', '近战位'] },
  { name: '白金', rarity: 5, tags: ['狙击', '输出', '远程位'] },
  { name: '蓝毒', rarity: 5, tags: ['狙击', '输出', '远程位'] },
  { name: '赫默', rarity: 5, tags: ['医疗', '治疗', '远程位'] },
  { name: '雷蛇', rarity: 5, tags: ['重装', '防护', '输出', '近战位'] },
  { name: '红', rarity: 5, tags: ['特种', '快速复活', '控场', '近战位'] },
  { name: '临光', rarity: 5, tags: ['重装', '治疗', '近战位'] },
  { name: '芙兰莎', rarity: 5, tags: ['近卫', '输出', '近战位'] },
  { name: '凛冬', rarity: 5, tags: ['先锋', '费用回复', '近战位'] },

  // 4星干员
  { name: '讯使', rarity: 4, tags: ['先锋', '费用回复', '近战位'] },
  { name: '嘉维尔', rarity: 4, tags: ['医疗', '治疗', '远程位'] },
  { name: '蛇屠箱', rarity: 4, tags: ['重装', '防护', '近战位'] },
  { name: '角峰', rarity: 4, tags: ['重装', '防护', '近战位'] },

  // 3星干员（匹配新手）
  { name: '玫兰莎', rarity: 3, tags: ['近卫', '输出', '近战位'] },
  { name: '芬', rarity: 3, tags: ['先锋', '费用回复', '近战位'] },
  { name: '炎熔', rarity: 3, tags: ['术师', '群攻', '远程位'] },
  { name: '安赛尔', rarity: 3, tags: ['医疗', '治疗', '远程位'] },
  { name: '克洛丝', rarity: 3, tags: ['狙击', '输出', '远程位'] },
  { name: '米格鲁', rarity: 3, tags: ['重装', '防护', '近战位'] },
  { name: '芙蓉', rarity: 3, tags: ['医疗', '治疗', '远程位'] }
])

// 计算结果
const calculationResults = ref<Operator[]>([])

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

// 计算可能出现的干员
const calculateResults = () => {
  if (selectedTags.value.length === 0) {
    calculationResults.value = []
    return
  }

  // 先过滤掉特殊标签，只保留普通标签用于匹配
  const normalTags = selectedTags.value.filter(tag =>
    !['新手', '资深干员', '高级资深干员'].includes(tag)
  )

  let results: Operator[] = []

  // 如果有普通标签，先按普通标签匹配
  if (normalTags.length > 0) {
    results = operatorsData.value.filter(operator => {
      return operator.tags.some(tag => normalTags.includes(tag))
    })
  } else {
    // 如果没有普通标签，显示所有干员
    results = [...operatorsData.value]
  }

  // 特殊标签处理（基于稀有度过滤）
  if (selectedTags.value.includes('高级资深干员')) {
    results = results.filter(op => op.rarity === 6)
  }
  else if (selectedTags.value.includes('资深干员')) {
    results = results.filter(op => op.rarity === 5) // 只显示5星
  }
  else if (selectedTags.value.includes('新手')) {
    results = results.filter(op => op.rarity <= 3)
  }

  // 按稀有度排序
  calculationResults.value = results.sort((a, b) => b.rarity - a.rarity)
}

// 监听标签选择变化，自动计算
watch(selectedTags, () => {
  calculateResults()
}, { deep: true })
</script>

<template>
  <div class="recruit-container">
    <h2>公开招募计算</h2>

    <!-- 重要提示 -->
    <div class="important-tip">
      <span class="warning-icon">⚠️</span>
      高资及资深干员切记拉满九小时！！
    </div>

    <!-- 标签选择区域 -->
    <div class="tags-section">
      <h3>选择标签</h3>
      <div class="tags-grid">
        <div
          v-for="tag in allTags"
          :key="tag"
          :class="['tag-item', { active: selectedTags.includes(tag) }]"
          @click="toggleTag(tag)"
        >
          {{ tag }}
        </div>
      </div>
    </div>

    <!-- 选择的标签显示 -->
    <div class="selected-tags" v-if="selectedTags.length > 0">
      <h4>已选标签 ({{ selectedTags.length }}/5)</h4>
      <div class="selected-tags-list">
        <span
          v-for="tag in selectedTags"
          :key="tag"
          class="selected-tag"
        >
          {{ tag }}
          <span class="remove-tag" @click="removeTag(tag)">×</span>
        </span>
      </div>
    </div>

    <!-- 计算结果 -->
    <div class="results-section" v-if="calculationResults.length > 0">
      <h3>可能出现的干员</h3>
      <div class="results-grid">
        <div
          v-for="result in calculationResults"
          :key="result.name"
          :class="['operator-card', `rarity-${result.rarity}`]"
        >
          <div class="operator-name">{{ result.name }}</div>
          <div class="operator-tags">
            <span
              v-for="tag in result.tags"
              :key="tag"
              class="operator-tag"
            >
              {{ tag }}
            </span>
          </div>
          <div class="operator-rarity">★{{ result.rarity }}</div>
        </div>
      </div>
    </div>

    <!-- 无结果提示 -->
    <div class="no-results" v-else-if="selectedTags.length > 0">
      <p>没有找到匹配的干员，请尝试其他标签组合</p>
    </div>

    <!-- 使用提示 -->
    <div class="tips">
      <h4>使用说明：</h4>
      <ul>
        <li>点击标签即可查看可能出现的干员</li>
        <li>最多可以选择5个标签</li>
        <li>选择稀有标签可以锁定高星干员</li>
        <li>组合特定标签可以精确筛选目标干员</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.recruit-container {
  color: white;
  max-width: 100%;
}

.recruit-container h2 {
  margin-bottom: 20px;
  color: #fad000;
  text-align: center;
}

/* 重要提示 */
.important-tip {
  background: #ff4444;
  color: white;
  padding: 15px 20px;
  border-radius: 8px;
  margin-bottom: 25px;
  text-align: center;
  font-size: 18px;
  font-weight: bold;
  border: 2px solid #ff6b6b;
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

/* 标签选择区域 */
.tags-section {
  margin-bottom: 30px;
}

.tags-section h3 {
  margin-bottom: 15px;
  color: #9feaf9;
}

.tags-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 10px;
  margin-bottom: 20px;
}

.tag-item {
  padding: 10px 12px;
  background: #2d2d2d;
  border: 1px solid #404040;
  border-radius: 6px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 13px;
}

.tag-item:hover {
  background: #3a3a3a;
  border-color: #646cff;
}

.tag-item.active {
  background: #646cff;
  border-color: #646cff;
  color: white;
}

/* 已选标签 */
.selected-tags {
  margin-bottom: 30px;
  padding: 15px;
  background: #2d2d2d;
  border-radius: 8px;
  border: 1px solid #404040;
}

.selected-tags h4 {
  margin-bottom: 10px;
  color: #6cc24a;
}

.selected-tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.selected-tag {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 8px 12px;
  background: #3a3a3a;
  border-radius: 20px;
  font-size: 13px;
}

.remove-tag {
  cursor: pointer;
  color: #ff6b6b;
  font-weight: bold;
  margin-left: 5px;
}

.remove-tag:hover {
  color: #ff5252;
}

/* 计算结果 */
.results-section {
  margin-bottom: 30px;
}

.results-section h3 {
  margin-bottom: 15px;
  color: #9feaf9;
}

.results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 15px;
}

.operator-card {
  padding: 15px;
  background: #2d2d2d;
  border-radius: 8px;
  border: 1px solid #404040;
  /* 移除了 transform 和 box-shadow 动画 */
}

.operator-name {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
}

.operator-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-bottom: 8px;
}

.operator-tag {
  padding: 2px 6px;
  background: #3a3a3a;
  border-radius: 4px;
  font-size: 11px;
  color: #ccc;
}

.operator-rarity {
  font-size: 14px;
  font-weight: 600;
}

/* 稀有度颜色 */
.rarity-6 .operator-name { color: #ffd700; }
.rarity-6 .operator-rarity { color: #ffd700; }

.rarity-5 .operator-name { color: #ffa500; }
.rarity-5 .operator-rarity { color: #ffa500; }

.rarity-4 .operator-name { color: #9feaf9; }
.rarity-4 .operator-rarity { color: #9feaf9; }

.rarity-3 .operator-name { color: #6cc24a; }
.rarity-3 .operator-rarity { color: #6cc24a; }

/* 无结果提示 */
.no-results {
  text-align: center;
  padding: 40px;
  color: #ccc;
  font-size: 16px;
}

/* 使用提示 */
.tips {
  padding: 20px;
  background: #2d2d2d;
  border-radius: 8px;
  border: 1px solid #404040;
  margin-top: 30px;
}

.tips h4 {
  margin-bottom: 10px;
  color: #fad000;
}

.tips ul {
  list-style: none;
  padding: 0;
}

.tips li {
  padding: 5px 0;
  color: #ccc;
  position: relative;
  padding-left: 15px;
}

.tips li:before {
  content: '•';
  color: #646cff;
  position: absolute;
  left: 0;
}
</style>

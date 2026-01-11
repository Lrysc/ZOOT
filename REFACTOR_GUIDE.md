# 项目重构指南

## 📁 新增目录结构

```
src/renderer/src/
├── composables/          # Vue 组合式函数（新增）
│   ├── useCopy.ts        # 复制功能
│   ├── useToast.ts       # Toast 提示
│   └── useImage.ts      # 图片处理
│
├── styles/              # 通用样式文件（新增）
│   └── common.css       # 可复用的 CSS 类
│
├── types/              # 类型定义（新增）
│   └── components.ts    # 组件通用类型
│
└── utils/              # 工具函数（优化）
    ├── copy.ts         # 复制功能（新增）
    ├── date.ts         # 日期时间格式化（新增）
    └── validator.ts    # 数据验证（新增）
```

## 🎯 重构原则

### 1. **组件拆分原则**
- 单个组件文件不超过 500 行
- 相关的 UI 拆分为独立组件
- 业务逻辑移至 composables

### 2. **代码复用**
- 提取通用功能到 composables
- 提取通用工具函数到 utils
- 提取通用样式到 styles

### 3. **类型安全**
- 所有 Props、Emits、Ref 都要有类型定义
- 使用 TypeScript 的类型推导
- 在 types 目录统一定义公共类型

## 📦 新增工具函数说明

### @utils/copy.ts
高可靠性的复制到剪贴板功能，支持三种复制方法：
1. Clipboard API（现代浏览器）
2. execCommand（兼容方案）
3. contenteditable（备选方案）

**使用示例：**
```typescript
import { copyToClipboard } from '@utils/copy';

const success = await copyToClipboard('要复制的文本', 'UID');
```

### @utils/date.ts
日期时间格式化工具：
- `formatTimestamp()` - 时间戳转日期字符串
- `formatRecoveryTime()` - 格式化恢复时间
- `formatSeconds()` - 秒数转时间格式

**使用示例：**
```typescript
import { formatTimestamp, formatRecoveryTime } from '@utils/date';

const dateStr = formatTimestamp(1234567890);
const timeLeft = formatRecoveryTime(1234567890);
```

### @utils/validator.ts
数据验证工具：
- `isValidUrl()` - URL 验证
- `isValidEmail()` - 邮箱验证
- `isValidPhone()` - 手机号验证
- `isEmptyString()` - 空字符串检查

**使用示例：**
```typescript
import { isValidEmail, isEmptyString } from '@utils/validator';

if (!isValidEmail(email)) {
  showError('邮箱格式不正确');
}
```

## 🧩 新增 Composables

### @composables/useCopy.ts
复制功能封装，自动显示 toast 提示：
```typescript
const { copyWithToast } = useCopy();
await copyWithToast('文本', '描述');
```

### @composables/useToast.ts
Toast 提示封装：
```typescript
const { success, error, warning, info } = useToast();
success('操作成功');
error('操作失败');
```

### @composables/useImage.ts
图片处理工具：
- `handleImageError()` - 统一的图片错误处理
- `handleImageLoad()` - 统一的图片加载处理
- `processImageUrl()` - 图片 URL 处理

## 🧩 新增组件

### UserCard.vue
用户信息卡片组件，可复用于多个场景。

**Props：**
```typescript
{
  userName: string;
  userLevel: number;
  uid: string;
  userAvatar?: string;
  registerTs?: number;
}
```

**使用示例：**
```vue
<UserCard
  :user-name="authStore.userName"
  :user-level="gameDataStore.userLevel"
  :uid="gameDataStore.gameUid"
  :user-avatar="gameDataStore.userAvatar"
  :register-ts="gameDataStore.playerData?.status?.registerTs"
/>
```

### AssistCharCard.vue
助战干员卡片组件，可复用于助战展示。

**Props：**
```typescript
{
  name: string;
  level: number;
  portraitUrl: string;
  professionIcon?: string;
  skillIconUrl?: string;
  evolvePhase: number;
  potentialRank: number;
  specializeLevel: number;
}
```

## 📋 重构建议

### 高优先级

1. **Setting.vue (71.96 KB)**
   - 提取用户信息为 UserCard 组件 ✅
   - 提取助战干员为 AssistCharCard 组件 ✅
   - 提取复制功能使用 useCopy composable

2. **GameData.vue (36.85 KB)**
   - 拆分数据卡片为独立组件
   - 使用新的工具函数和 composables
   - 提取样式到 common.css

3. **App.vue**
   - 提取右键菜单为独立组件
   - 使用 composables 管理状态

### 中优先级

4. **Recruit.vue (20.26 KB)**
   - 提取公招计算为独立 composable
   - 使用通用样式

5. **headhuntingrecord.vue (96.92 KB)**
   - 拆分抽卡记录卡片为独立组件
   - 提取分页逻辑为 composable

### 低优先级

6. **LoginWindow.vue (28.67 KB)**
   - 提取表单验证逻辑
   - 使用 validator 工具函数

## 🎨 通用样式使用

在 `main.ts` 中引入通用样式：
```typescript
import './styles/common.css';
```

在组件中使用通用类：
```vue
<div class="card">
  <button class="btn">按钮</button>
  <input class="input" />
  <div class="flex-center gap-md">内容</div>
</div>
```

## 📝 代码规范

### 1. 文件命名
- 组件：PascalCase (如 `UserCard.vue`)
- 工具函数：camelCase (如 `copyToClipboard`)
- Composable：use + PascalCase (如 `useCopy`)
- 样式：kebab-case (如 `user-card`)

### 2. 导入顺序
```typescript
// 1. Vue 相关
import { ref, computed, onMounted } from 'vue';

// 2. 第三方库
import { useRouter } from 'vue-router';

// 3. Store
import { useAuthStore } from '@stores/auth';

// 4. Composables
import { useCopy } from '@composables/useCopy';

// 5. 工具函数
import { formatTimestamp } from '@utils/date';

// 6. 类型
import type { DataItem } from '@types/components';
```

### 3. 组件结构
```vue
<template>
  <!-- 模板 -->
</template>

<script setup lang="ts">
  // 1. Imports
  // 2. Props & Emits
  // 3. Composables
  // 4. Refs & Computed
  // 5. Methods
</script>

<style scoped>
  /* 组件样式 */
</style>
```

## 🚀 下一步行动

1. 阅读本文档，了解重构目标
2. 查看 `UserCard.vue` 和 `AssistCharCard.vue` 的实现
3. 在 `Setting.vue` 中使用新组件替换现有代码
4. 逐步应用到其他组件
5. 测试所有功能确保正常运行

## ⚠️ 注意事项

1. **向后兼容**
   - 重构时保持 API 不变
   - 逐步替换，不要一次性全部修改

2. **测试覆盖**
   - 每次重构后进行功能测试
   - 确保所有功能正常

3. **代码审查**
   - 重构完成后进行代码审查
   - 确保符合项目规范

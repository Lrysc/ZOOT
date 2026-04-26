/**
 * 抽卡记录相关类型定义
 */

// ============================================================================
// 卡池分类
// ============================================================================

export interface GachaCategory {
  id: string
  name: string
}

// ============================================================================
// 抽卡记录
// ============================================================================

export interface GachaRecord {
  poolId: string
  poolName: string
  charId: string
  charName: string
  rarity: number
  isNew: boolean
  gachaTs: string
  pos: number
}

export interface GachaHistoryResponse {
  list: GachaRecord[]
  hasMore: boolean
}

// ============================================================================
// 抽卡统计
// ============================================================================

export interface GachaStats {
  total: number
  rarity6: number
  rarity5: number
  rarity4: number
  rarity3: number
  pity: number
  isPity: boolean
}

export interface PoolStats {
  poolId: string
  poolName: string
  records: GachaRecord[]
  stats: GachaStats
}

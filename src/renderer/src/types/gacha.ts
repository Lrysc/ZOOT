// ============================================================================
// 抽卡记录相关类型
// ============================================================================

export interface GachaCategory {
  id: string;
  name: string;
}

export interface GachaRecord {
  poolId: string;
  poolName: string;
  charId: string;
  charName: string;
  rarity: number;
  isNew: boolean;
  gachaTs: string;
  pos: number;
}

export interface GachaHistoryResponse {
  list: GachaRecord[];
  hasMore: boolean;
}

// ============================================================================
// 重新导出类型定义（兼容现有导入）
// ============================================================================

// 签名相关
export type { SignHeaders } from '../../types/signature';
export { getDId, generateSignature, getSignedHeaders } from '../../types/signature';

// API 通用
export type { ApiResponse } from '../../types/api';

// 认证相关
export type {
  LoginResult,
  HypergryphAccountResponse,
  SmsCodeResponse,
  GrantCodeResponse,
  SklandCredResponse,
  LoginForm
} from '../../types/auth';

// 角色/绑定相关
export type {
  BindingCharacter,
  BindingList,
  BindingResponse
} from '../../types/character';

// 玩家数据
export type {
  PlayerStatus,
  BuildingData,
  RoutineData,
  CampaignData,
  TowerData,
  RogueData,
  PlayerData,
  AttendanceResponse
} from '../../types/player';

// 抽卡记录
export type {
  GachaCategory,
  GachaRecord,
  GachaHistoryResponse
} from '../../types/gacha';

// 游戏数据相关（供 gameData store 使用）
export type {
  ApInfo,
  TrainingInfo,
  RecruitInfo,
  HireInfo,
  RecruitSlotDetail,
  TradingDetail,
  ManufactureDetail,
  AssistCharDetail,
  AssistCharStatus,
  DataCache
} from '../../types/game';

// 工具函数
export { calculateApInfo, getRoutineProgress } from './types-helpers';

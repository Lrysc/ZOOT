// ============================================================================
// 类型定义统一导出
// ============================================================================

// 签名相关
export type { SignHeaders } from './signature';
export { getDId, generateSignature, getSignedHeaders } from './signature';

// API 通用
export type { ApiResponse } from './api';

// 认证相关
export type {
  LoginResult,
  HypergryphAccountResponse,
  SmsCodeResponse,
  GrantCodeResponse,
  SklandCredResponse,
  LoginForm
} from './auth';

// 角色/绑定相关
export type {
  BindingCharacter,
  BindingList,
  BindingResponse
} from './character';

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
} from './player';

// 抽卡记录
export type {
  GachaCategory,
  GachaRecord,
  GachaHistoryResponse
} from './gacha';

// 游戏数据（供 gameData store 使用）
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
} from './game';

// 基建（供 gameData store 使用）
export type {
  TradingStation,
  TradingsInfo,
  ManufactureStation,
  ManufacturesInfo,
  LaborInfo,
  DormitoriesInfo,
  TiredInfo,
  BuildingEfficiency
} from './building';

// 通用类型
export type {
  DataItem,
  MenuItem,
  PaginationInfo,
  LoadingState,
  ValidationResult,
  UpdateInfo
} from './common';

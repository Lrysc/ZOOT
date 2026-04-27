// ============================================================================
// 绑定角色相关类型
// ============================================================================

export interface BindingCharacter {
  uid: string;
  isOfficial: boolean;
  isDefault: boolean;
  channelMasterId: string;
  channelName: string;
  nickName: string;
  isDelete: boolean;
  roleToken?: string;
}

export interface BindingList {
  appCode: string;
  appName: string;
  bindingList: BindingCharacter[];
  defaultUid: string;
}

export interface BindingResponse {
  list: BindingList[];
}

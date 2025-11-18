// API 响应基础类型
export interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
}

// 登录相关类型
export interface LoginResult {
  success: boolean
  error?: string
  token?: string
  cred?: string
  userId?: string
  grantCode?: string; // 添加这个属性
}

// 绑定角色类型
export interface BindingCharacter {
  uid: string
  isOfficial: boolean
  isDefault: boolean
  channelMasterId: string
  channelName: string
  nickName: string
  isDelete: boolean
}

export interface BindingList {
  appCode: string
  appName: string
  bindingList: BindingCharacter[]
  defaultUid: string
}

export interface BindingResponse {
  list: BindingList[]
}

// 登录表单类型
export interface LoginForm {
  phone: string
  password: string
  verificationCode?: string
}

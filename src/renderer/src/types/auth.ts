// ============================================================================
// 认证相关类型
// ============================================================================

export interface LoginResult {
  success: boolean;
  error?: string;
  token?: string;
  cred?: string;
  userId?: string;
  grantCode?: string;
}

export interface HypergryphAccountResponse {
  code: number;
  data: {
    content: string;
  };
  msg: string;
}

export interface SmsCodeResponse {
  status: number;
  msg: string;
}

export interface GrantCodeResponse {
  code: string;
}

export interface SklandCredResponse {
  cred: string;
  token: string;
  userId: string;
}

export interface LoginForm {
  phone: string;
  password: string;
  verificationCode?: string;
}

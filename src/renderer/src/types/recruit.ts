/**
 * 公开招募计算器相关类型定义
 */

// ============================================================================
// 干员信息
// ============================================================================

export interface RecruitOperator {
  name: string
  star: number
  tag: string[]
  skin: string
}

// ============================================================================
// 招募数据
// ============================================================================

export interface RecruitData {
  update: {
    version: string
    date: string
  }
  new_ope: {
    name: string[]
  }
  operator_list: RecruitOperator[]
  operator_high_list: RecruitOperator[]
  operator_low_list: RecruitOperator[]
  operator_robot_list: RecruitOperator[]
}

// ============================================================================
// 招募结果
// ============================================================================

export interface RecruitResult {
  tags: string[]
  operators: RecruitOperator[]
  maxStar: number
  hasRare: boolean
}

/**
 * 认证调试工具
 * 用于诊断401错误的具体原因
 */

import { AuthAPI } from '@services/api';
import { getSignedHeaders } from './security';

export class AuthDebugger {
  /**
   * 完整的认证流程调试
   */
  static async debugFullAuthFlow(hgToken: string) {
    console.log('=== 开始认证流程调试 ===');
    
    try {
      // 步骤1: 获取授权码
      console.log('\n步骤1: 获取OAuth2授权码');
      const grantCode = await AuthAPI.getGrantCode(hgToken);
      console.log('✓ 授权码获取成功:', grantCode.substring(0, 20) + '...');
      
      // 步骤2: 获取Cred
      console.log('\n步骤2: 获取森空岛Cred');
      const { cred, token: signToken, userId } = await AuthAPI.getSklandCred(grantCode);
      console.log('✓ Cred获取成功:', cred.substring(0, 20) + '...');
      console.log('✓ SignToken获取成功:', signToken.substring(0, 20) + '...');
      console.log('✓ UserId:', userId);
      
      // 步骤3: 验证Cred有效性
      console.log('\n步骤3: 验证Cred有效性');
      const isCredValid = await AuthAPI.checkCred(cred);
      console.log('✓ Cred有效性:', isCredValid);
      
      // 步骤4: 测试签名生成
      console.log('\n步骤4: 测试签名生成');
      const testUrl = 'https://zonai.skland.com/api/v1/game/player/binding';
      const testHeaders = getSignedHeaders(testUrl, 'GET', null, cred, signToken);
      console.log('✓ 测试请求头生成:', {
        cred: testHeaders.cred?.substring(0, 20) + '...',
        sign: testHeaders.sign,
        platform: testHeaders.platform,
        timestamp: testHeaders.timestamp,
        dId: testHeaders.dId?.substring(0, 20) + '...',
        vName: testHeaders.vName
      });
      
      // 步骤5: 测试API调用
      console.log('\n步骤5: 测试绑定角色API调用');
      const bindingRoles = await AuthAPI.getBindingRoles(cred, signToken);
      console.log('✓ 绑定角色获取成功:', bindingRoles.length, '个角色');
      
      // 步骤6: 测试玩家数据API
      if (bindingRoles.length > 0) {
        console.log('\n步骤6: 测试玩家数据API调用');
        const uid = bindingRoles[0].uid;
        const playerData = await AuthAPI.getPlayerData(cred, signToken, uid);
        console.log('✓ 玩家数据获取成功:', playerData.status?.name || '未知用户');
      }
      
      console.log('\n=== 认证流程调试完成，全部成功 ===');
      return { success: true, cred, signToken, userId };
      
    } catch (error) {
      console.error('\n=== 认证流程调试失败 ===');
      console.error('错误详情:', error);
      
      // 分析错误类型
      if (error.message.includes('401') || error.message.includes('认证失败')) {
        console.error('\n🔍 401错误分析:');
        console.error('可能原因:');
        console.error('1. 签名算法错误 - 检查签名字符串拼接顺序');
        console.error('2. Token使用错误 - 确认使用正确的token进行签名');
        console.error('3. 请求头缺失 - 检查必需的请求头是否完整');
        console.error('4. 时间戳问题 - 检查时间戳格式和有效期');
        console.error('5. 设备ID问题 - 检查dId生成逻辑');
      }
      
      return { success: false, error };
    }
  }
  
  /**
   * 手动测试签名算法
   */
  static testSignatureAlgorithm() {
    console.log('=== 测试签名算法 ===');
    
    const token = 'test_token_12345';
    const path = '/api/v1/game/player/binding';
    const bodyOrQuery = '';
    const timestamp = '1640995200';
    const headers = {
      platform: '3',
      timestamp: timestamp,
      dId: 'BLtest123456789',
      vName: '1.0.0'
    };
    
    // 导入签名函数进行测试
    const { generateSignature } = require('./security');
    
    const sign = generateSignature(token, path, bodyOrQuery, timestamp, headers);
    
    console.log('测试参数:');
    console.log('Token:', token);
    console.log('Path:', path);
    console.log('BodyOrQuery:', bodyOrQuery);
    console.log('Timestamp:', timestamp);
    console.log('Headers:', JSON.stringify(headers, null, 2));
    
    console.log('\n生成的签名:', sign);
    
    // 验证签名字符串
    const jsonArgs = JSON.stringify(headers);
    const signString = path + bodyOrQuery + timestamp + jsonArgs;
    console.log('\n签名字符串:', signString);
    
    return sign;
  }
}

// 导出调试函数供控制台使用
declare global {
  interface Window {
    debugAuth: (hgToken: string) => Promise<any>;
    testSignature: () => string;
  }
}

// 在开发环境下挂载到window对象
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  window.debugAuth = AuthDebugger.debugFullAuthFlow;
  window.testSignature = AuthDebugger.testSignatureAlgorithm;
}
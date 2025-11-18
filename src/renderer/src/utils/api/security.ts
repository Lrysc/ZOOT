import CryptoJS from 'crypto-js';

export interface SignHeaders {
  platform: string;
  timestamp: string;
  dId: string;
  vName: string;
}

// 生成更真实的 dId
function generateMockDId(): string {
  const randomBytes = CryptoJS.lib.WordArray.random(32);
  return 'BL' + CryptoJS.enc.Base64.stringify(randomBytes);
}

export const getDId = async (): Promise<string> => {
  return generateMockDId();
};

/**
 * 严格按照文档的签名算法
 * sign = MD5(HMAC-SHA256(token, api + params + timestamp + jsonArgs))
 */
export function generateSignature(
  token: string,
  path: string,
  bodyOrQuery: string,
  timestamp: string,
  headers: SignHeaders
): string {
  // 严格按照文档格式生成jsonArgs
  const jsonArgs = JSON.stringify({
    platform: headers.platform,
    timestamp: headers.timestamp,
    dId: headers.dId,
    vName: headers.vName
  });

  // 严格按照文档顺序：api + params + timestamp + jsonArgs
  // 注意：api应该是完整路径，params是查询参数（不包括问号）
  const api = path;
  const params = bodyOrQuery.startsWith('?') ? bodyOrQuery.substring(1) : bodyOrQuery;
  const signString = api + params + timestamp + jsonArgs;

  console.log('=== 签名调试信息 ===');
  console.log('Token:', token.substring(0, 10) + '...');
  console.log('API:', api);
  console.log('Params:', params);
  console.log('Timestamp:', timestamp);
  console.log('JsonArgs:', jsonArgs);
  console.log('完整签名字符串:', signString);

  // HMAC-SHA256
  const hmac = CryptoJS.HmacSHA256(signString, token);
  const hmacHex = hmac.toString(CryptoJS.enc.Hex);

  // MD5
  const md5 = CryptoJS.MD5(hmacHex).toString();

  console.log('HMAC-SHA256:', hmacHex);
  console.log('最终签名:', md5);
  console.log('==================');

  return md5;
}

export function getSignedHeaders(
  url: string,
  method: string,
  body: any,
  cred: string,
  token: string
): Record<string, string> {
  const urlObj = new URL(url);
  const path = urlObj.pathname;

  let bodyOrQuery = '';
  if (method.toLowerCase() === 'get') {
    bodyOrQuery = urlObj.search || ''; // 查询参数，包括问号
  } else {
    bodyOrQuery = JSON.stringify(body || {});
  }

  const timestamp = String(Math.floor(Date.now() / 1000));
  const dId = generateMockDId();

  const signHeaders: SignHeaders = {
    platform: '3',
    timestamp: timestamp,
    dId: dId,
    vName: '1.0.0'
  };

  const sign = generateSignature(token, path, bodyOrQuery, timestamp, signHeaders);

  return {
    'cred': cred,
    'sign': sign,
    'platform': signHeaders.platform,
    'timestamp': signHeaders.timestamp,
    'dId': signHeaders.dId,
    'vName': signHeaders.vName,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Connection': 'close',
    'Content-Type': 'application/json',
    'Origin': 'https://www.skland.com',
    'Referer': 'https://www.skland.com/'
  };
}

import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@assets': resolve('src/renderer/src/assets'),
        '@components': resolve('src/renderer/src/components'),
        '@router': resolve('src/renderer/src/router'),
        '@api': resolve('src/renderer/src/api'),
        '@utils': resolve('src/renderer/src/utils'),
        '@stores': resolve('src/renderer/src/stores'),
        '@types': resolve('src/renderer/src/types.ts'),
        '@services': resolve('src/renderer/src/services')
      }
    },
    plugins: [vue()],
    server: {
      proxy: {
        '/api/hg': {
          target: 'https://as.hypergryph.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/hg/, ''),
          secure: true,
          configure: (proxy, _options) => {
            proxy.on('proxyReq', (_proxyReq, req) => {
              console.log('HG代理请求:', req.method, req.url);
            });
            proxy.on('proxyRes', (proxyRes) => {
              console.log('HG代理响应:', proxyRes.statusCode, proxyRes.headers);
            });
          }
        },
        '/api/binding': {
          target: 'https://binding-api-account-prod.hypergryph.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/binding/, ''),
          secure: true,
          configure: (proxy, _options) => {
            proxy.on('proxyReq', (_proxyReq, req) => {
              console.log('Binding代理请求:', req.method, req.url);
            });
            proxy.on('proxyRes', (proxyRes) => {
              console.log('Binding代理响应:', proxyRes.statusCode, proxyRes.headers);
            });
          }
        },
        '/api/skland': {
          target: 'https://zonai.skland.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/skland/, ''),
          secure: true
        },
        '/api/web': {
          target: 'https://web-api.hypergryph.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/web/, ''),
          secure: true,
          configure: (proxy, _options) => {
            proxy.on('proxyReq', (proxyReq, req) => {
              console.log('代理请求头 Cookie:', req.headers.cookie);
              // 确保Cookie头被正确转发
              if (req.headers.cookie) {
                proxyReq.setHeader('Cookie', req.headers.cookie);
              }
            });
            proxy.on('proxyRes', (proxyRes) => {
              console.log('代理响应状态:', proxyRes.statusCode);
              console.log('代理响应头:', proxyRes.headers);
            });
          }
        },
        '/api/ak': {
          target: 'https://ak.hypergryph.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/ak/, ''),
          secure: true,
          configure: (proxy, _options) => {
            proxy.on('proxyReq', (_proxyReq, req) => {
              console.log('AK代理请求:', req.method, req.url);
            });
            proxy.on('proxyRes', (proxyRes, req, res) => {
              console.log('AK代理响应:', proxyRes.statusCode, proxyRes.headers);
              
              // 如果是角色登录接口且有Set-Cookie头，直接修改响应体
              if (req.url && req.url.includes('/user/api/role/login') && proxyRes.headers['set-cookie']) {
                const cookies = proxyRes.headers['set-cookie'];
                console.log('AK代理Set-Cookie:', cookies);

                const akUserCenterCookie = Array.isArray(cookies)
                  ? cookies.find(cookie => cookie.includes('ak-user-center='))
                  : cookies;

                if (akUserCenterCookie && typeof akUserCenterCookie === 'string') {
                  const cookieValue = akUserCenterCookie.match(/ak-user-center=([^;]+)/)?.[1];
                  if (cookieValue) {
                    console.log('提取到ak-user-center cookie值:', cookieValue);

                    // 拦截响应并修改
                    const originalWrite = res.write;
                    const originalEnd = res.end;
                    let body = '';

                    res.write = function(data: any) {
                      body += data;
                      return true;
                    };

                    res.end = function(data?: any, encoding?: any, cb?: any) {
                      if (data) {
                        body += data;
                      }

                      try {
                        const parsedBody = JSON.parse(body);
                        parsedBody.data = parsedBody.data || {};
                        parsedBody.data.cookie = cookieValue;
                        const modifiedBody = JSON.stringify(parsedBody);
                        
                        // 设置正确的Content-Length
                        res.setHeader('Content-Length', Buffer.byteLength(modifiedBody));
                        
                        // 发送修改后的响应
                        originalWrite.call(res, modifiedBody, encoding);
                        originalEnd.call(res, encoding, cb);
                      } catch (error) {
                        console.error('修改响应失败:', error);
                        // 发送原始响应
                        originalWrite.call(res, body, encoding);
                        originalEnd.call(res, encoding, cb);
                      }
                      return res;
                    };
                  }
                }
              }
            });
          }
        },
        '/api/hycdn': {
          target: 'https://bbs.hycdn.cn',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/hycdn/, ''),
          secure: true,
          configure: (_proxy) => {
            _proxy.on('proxyReq', (_proxyReq, req) => {
              console.log('HYCDN代理请求:', req.method, req.url);
            });
            _proxy.on('proxyRes', (proxyRes) => {
              console.log('HYCDN代理响应:', proxyRes.statusCode, proxyRes.headers);
            });
          }
        }
      }
    }
  }
})

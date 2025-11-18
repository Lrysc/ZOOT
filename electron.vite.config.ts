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
    plugins: [vue()]
  }
})

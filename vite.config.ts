import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 部署在 http://<host>/ai-pred/ 子路径时需与服务器 location 一致
// https://vite.dev/config/shared-options.html#base
export default defineConfig({
  base: '/ai-pred/',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      '/api/v1': {
        target: process.env.VITE_API_TARGET || 'http://111.229.25.160:8001',
        changeOrigin: true,
      },
    },
  },
})

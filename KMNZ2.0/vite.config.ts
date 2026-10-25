import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Cloudflare Pages 部署在域名根路径；发布到 GitHub Pages 时设置 VITE_BASE_PATH=/KMNZ/
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || '/',
})

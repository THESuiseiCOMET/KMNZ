import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import {createReadStream} from 'node:fs'
import {stat} from 'node:fs/promises'
import {fileURLToPath} from 'node:url'

// Cloudflare Pages 部署在域名根路径；发布到 GitHub Pages 时设置 VITE_BASE_PATH=/KMNZ/
export default defineConfig({
  plugins: [react(), {name:'local-showcase-music',apply:'serve',configureServer(server){
    server.middlewares.use('/__local-showcase/music.mp3',async (_req,res)=>{
      try{const file=fileURLToPath(new URL('./src/assets/audio/Blow Your Socks Off_Goce Jovanoski_95bpm - Full.mp3',import.meta.url)),info=await stat(file);res.writeHead(200,{'Content-Type':'audio/mpeg','Content-Length':info.size,'Cache-Control':'no-store'});const stream=createReadStream(file);stream.on('error',()=>res.destroy());stream.pipe(res)}catch{res.writeHead(404);res.end()}
    })
  }}],
  base: process.env.VITE_BASE_PATH || '/',
})

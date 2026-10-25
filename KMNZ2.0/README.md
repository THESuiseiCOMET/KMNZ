# KMNZ 2.0 — React 页面视觉迁移

当前正在把 KMNZ 1.0 的外观与内容迁移为 React + TypeScript + Vite 组件。

## 已实现

- 保留 1.0 视觉风格：导航栏、海报背景、4 图轮播、成员头像和手写体名字、时间线、相关链接
- 浅色 / 深色主题切换与浏览器主题偏好
- 首页、成员列表、成员详情、历程、关于，以及音乐占位页面
- 1.0 静态资源拷贝到 `src/assets/`，由 Vite 按需打包
- **2.0 没有登录、注册、用户中心和密码重置功能**

## 待实现

- React Router 路由与浏览器前进 / 后退、可分享的页面地址
- YouTube 与 Spotify 官方嵌入播放器、全站连续播放与曲库
- 内容更新、自动化测试、生产构建验证与线上部署

## 本地开发

```bash
npm install
npm run dev
```

如需明确指定本地端口，可执行：

```bash
npm run dev -- --port 5180 --strictPort
```

构建：

```bash
npm run build
```

Cloudflare Pages：根目录 `KMNZ2.0`，构建命令 `npm run build`，输出目录 `dist`。发布到 GitHub Pages 的子路径时配置 `VITE_BASE_PATH=/KMNZ/`。

这是第一阶段迁移，尚未进行浏览器视觉对照验收。旧版仍保留在 `KMNZ1.0/`，根目录旧站不受本次修改影响。

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

## 音乐模块第一阶段（精选目录与播放）

- `src/data/music.ts`：音乐条目数据源，区分 YouTube MV、Spotify 曲目与专辑；新增曲目无需改播放器组件。
- `src/pages/Music.tsx`：YouTube / Spotify 两个独立栏目，展示精简曲目列表；暂不提供搜索和筛选。
- `src/components/PlayerDock.tsx`：真实官方 iframe 嵌入，放在 `App` 根部；切换站内栏目不会卸载。
- YouTube 视频嵌入保持可见且不小于 200 × 200；不使用隐藏播放器或第三方音频提取。
- 关闭播放器会卸载嵌入并停止播放；切换曲目会加载新嵌入。
- 受浏览器自动播放限制，点击卡片后仍可能需要点击播放器内的播放按钮。
- Spotify 播放长度、会员/登录、地区等限制由 Spotify 处理，网站不能保证全曲播放或跨平台无缝续播。

首版收录的是经过人工校核链接的少量官方条目，不代表完整 KMNZ 曲库。歌曲资源全部托管在平台方，本站不存储音频文件。

**下一阶段：** 扩大历史曲目数据、成员筛选、分类、专辑详情、收藏与播放队列；后续再评估 YouTube IFrame API / Spotify iFrame API 的程序化播放控制。

### 音乐页精简调整

- YouTube 与 Spotify 分开显示，条目列表使用紧凑行布局。
- 移除英文横幅、说明文字、数字统计、搜索框、时期筛选与长篇免责声明。
- 保留官方链接、点击播放、可见播放器及跨站内页面持续挂载。

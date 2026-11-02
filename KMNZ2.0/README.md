# KMNZ 2.0

KMNZ 当前网站，基于 **React + TypeScript + Vite**。源代码位于本目录，GitHub Pages 通过 GitHub Actions 构建并发布此项目。

- 线上地址：https://thesuiseicomet.github.io/KMNZ/
- 历史版本：[../KMNZ1.0/](../KMNZ1.0/)
- 文件定位：[filemap.md](filemap.md)

## 已实现的主要功能

- **SHOWCASE / CONSOLE**：双时代拼贴开场海报、ENTER 转场、KMNZ 喷漆揭示动画（SPRAY REVEAL），以及返回展示页的交互。
- **页面与导航**：成员资料、历史、关于、音乐页面及 MV 视图；使用项目内的 Hash 路由，支持分享、浏览器前进/后退与音乐筛选状态。
- **音乐索引**：YouTube MV／原创／翻唱／歌回与 Spotify 曲目、专辑、EP 的展示、搜索和筛选；Bilibili 视频可作为外部链接索引。
- **全站常驻媒体播放器**：以 YouTube / Spotify 官方嵌入播放器为播放来源，提供播放队列和会话恢复等管理逻辑，站内页面切换尽量保持播放器挂载。
- **界面体验**：浅色／深色主题、响应式布局、页面过渡和音频可视化等功能。
- **音乐数据维护**：结构校验、元数据修正、测试，以及需要人工审核的发现候选流程。

当前 2.0 **没有登录、注册、用户中心或密码重置功能**；这些页面仅存在于归档的 1.0。

第三方播放受浏览器自动播放策略、登录/地区/会员条件以及 Spotify、YouTube 平台限制影响。网页不能保证跨平台无缝续播或手机锁屏后始终播放；音视频文件由原平台托管，本站不提供下载或提取。

## 本地开发

建议使用 Node.js **22**（与仓库 GitHub Actions 配置一致）。

```bash
npm ci
npm run dev
```

若需固定本地端口：

```bash
npm run dev -- --port 5180 --strictPort
```

执行生产构建、预览及全部脚本测试：

```bash
npm run build
npm run preview
node --test scripts/*.test.mjs
```

运行音乐数据与候选状态的离线检查：

```bash
node scripts/update-music-metadata.mjs --check
node scripts/discover-music.mjs --check
```

注意：`package.json` 当前没有单独的 `npm test` 命令，测试使用 `node --test`。

## GitHub Pages 部署

工作流：[../.github/workflows/deploy-pages.yml](../.github/workflows/deploy-pages.yml)

- 发布分支：`分支`
- 工作目录：`KMNZ2.0/`
- 环境：Node.js 22；`npm ci` 后执行 `npm run build`
- 构建时设置：`VITE_BASE_PATH=/KMNZ/`
- 发布目录：`KMNZ2.0/dist/`，由 GitHub Actions 上传并部署

`vite.config.ts` 根据 `VITE_BASE_PATH` 设置资源基础路径；未设置时默认 `/`，适合本地开发或根路径部署。路由由 `src/lib/siteRoute.ts` 中的 Hash 路由实现，因此不依赖服务器对应用子路径进行历史路由重写。

## 主要目录与数据结构

| 路径 | 内容 |
| --- | --- |
| `index.html`、`src/main.tsx`、`src/App.tsx` | Vite 页面入口、React 入口、应用状态和页面布局 |
| `src/components/`、`src/pages/` | 展示、喷漆转场、导航、播放器与内容页面 |
| `src/hooks/`、`src/lib/` | 播放、路由、动画及数据处理逻辑 |
| `src/assets/`、`public/` | 由当前网站使用的图像、图标、字体及公共资源 |
| `src/data/music/songs.json` | 歌曲与录音版本的稳定 ID |
| `src/data/music/releases.json` | 专辑／发行版本、曲序与歌曲关联 |
| `src/data/music/sources.json` | YouTube、Spotify 等平台的来源与显示信息 |
| `src/data/music-metadata.json` | 自动收集或保存的元数据 |
| `src/data/music-metadata.overrides.json` | 人工核实的元数据修正 |
| `music-discovery/`、`scripts/` | 候选审查资料、更新工具和测试脚本 |

更新歌曲时应维护 `songs`、`releases`、`sources` 的关联，不要只增加视频链接并绕过验证。音乐发现工作流不会直接把未审核的候选写入正式曲库。

详细工作流参见 [docs/music-discovery.md](docs/music-discovery.md)，日常查找具体组件请用 [filemap.md](filemap.md)。

## 维护提示

- 保留官方 Spotify / YouTube 嵌入及现有播放器生命周期，不用隐藏播放器绕过平台限制。
- `KMNZ1.0/` 是历史归档，不要把旧页面和 `KMNZ2.0/index.html` 混淆。
- 开发前检查现有测试；修改 SHOWCASE 或播放器后验证站内切换和播放连续性。

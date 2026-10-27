# KMNZ 2.0 文件位置速查

本文件只用于查找和修改项目文件，不会显示在网页上。

## 常改的位置

| 想修改什么 | 文件 | 在文件中找什么 |
| --- | --- | --- |
| 顶部导航按钮名称与顺序 | `src/components/Header.tsx` | `const navigation` |
| 顶部 Logo、返回首页按钮 | `src/components/Header.tsx` | `site-logo`、`navigate('home')` |
| 顶部导航排版、Logo 大小 | `src/styles.css` | `.site-header`、`.site-title`、`.site-logo` |
| 深色/浅色切换、圆形辐射动画 | `src/components/Header.tsx`、`src/styles.css` | `handleThemeChange`、`::view-transition` |
| 黑白 Logo 图片 | `src/assets/images/kmnz-logo-black.svg`、`kmnz-logo-white.svg` | 替换对应资源 |
| 首页文字及布局 | `src/pages/Home.tsx` | `Home` |
| 首页轮播图片、顺序、间隔 | `src/components/HeroCarousel.tsx` | `posters`、`4000` |
| 成员头像、介绍、名单 | `src/data/members.ts` | `members` |
| 成员卡片和详情排版 | `src/components/MemberCard.tsx`、`src/pages/Members.tsx`、`src/pages/MemberDetail.tsx` | 对应组件 |
| 历程事件 | `src/data/timeline.ts` | `timeline` |
| 历程页面 | `src/pages/History.tsx` | `History` |
| 关于页文字及外部链接 | `src/pages/About.tsx` | `links` |
| 音乐页面、卡片、搜索和筛选按钮 | `src/pages/Music.tsx` | `music-toolbar`、`music-grid`、`music-card` |
| 音乐封面加载、失败回退与无封面占位 | `src/components/MusicCover.tsx`、`src/lib/musicMetadata.ts` | `coverCandidates`、`validCoverSize`、`mqdefault.jpg` |
| 音乐卡片大小、封面裁剪和间距 | `src/styles.css` | `.music-card`、`.music-art img`、`.music-grid` |
| 音乐卡片播放胶囊与圆形外链按钮 | `src/pages/Music.tsx`、`src/styles.css` | `.music-play`、`.music-external`、`.music-card-icon` |
| 歌曲及独立录音版本 | `src/data/music/songs.json` | 稳定歌曲 ID、`version` |
| 专辑／发行版本和曲目归属 | `src/data/music/releases.json` | 稳定发行 ID、`tracks`、`tracklistStatus` |
| 平台 ID、官方链接及旧卡片显示字段 | `src/data/music/sources.json` | `id`、`platformId`、`target`、`display` |
| 音乐数据类型、关联约束 | `src/types/music.ts` | `Song`、`MusicRelease`、`MusicSource`、`MusicLibrary` |
| 结构校验、来源去重及关联索引 | `src/lib/musicLibrary.ts` | `parseMusicLibrary`、`platformSourceKey`、`parseMusicSourceUrl`、`createMusicLibraryIndex` |
| 新音乐库入口 | `src/data/musicLibrary.ts` | `musicLibrary` |
| 原页面／播放器兼容层 | `src/data/music.ts` | `musicCatalog`、`getEmbedUrl` |
| 已获取的封面、日期、来源和校验状态 | `src/data/music-metadata.json` | 以现有音乐条目 ID 为索引 |
| 人工核实的元数据修正 | `src/data/music-metadata.overrides.json` | `platformId`、`cover`、`publishedAt`、`releaseDate` |
| 页面元数据兼容层 | `src/data/musicMetadata.ts` | `getMusicMetadata`、`sortMusicByDate` |
| 日期校验、日本时间显示和稳定排序 | `src/lib/musicMetadata.ts` | `validPublishedAt`、`validReleaseDate`、`musicDate`、`sortMusicEntries` |
| 全站常驻播放器内容 | `src/components/PlayerDock.tsx` | `PlayerDock` |
| 播放器标题居中、关闭与标题栏拖动 | `src/components/PlayerDock.tsx`、`src/styles.css` | `music-player-heading`、`music-player-drag-handle` |
| YouTube 音量、静音与本地保存 | `src/hooks/useOfficialPlayer.ts` | `kmnzPlayerVolume`、`setVolume`、`toggleMute` |
| 音量弹层、滑条与局部滚轮调节 | `src/components/PlayerDock.tsx`、`src/styles.css` | `music-player-volume`、`changeWithWheel` |
| 官方播放器 API 类型与加载 | `src/lib/playerApi.ts` | `YouTubePlayer`、`loadYouTubeApi`、`loadSpotifyApi` |
| 播放状态、循环与播放器生命周期 | `src/hooks/useOfficialPlayer.ts` | `useOfficialPlayer` |
| 切歌顺序、拖动边界与结束判断 | `src/lib/playerControls.ts` | `adjacentTrack`、`clampPlayerPosition`、`playbackFinished` |
| 播放器位置、尺寸 | `src/styles.css` | `.music-player-panel`、`.youtube-frame`、`.spotify-frame` |
| 页面切换、全局播放器状态、页脚 | `src/App.tsx` | `navigate`、`currentMusic`、`site-footer` |
| 网站名称、浏览器标签、初始主题 | `index.html` | `<title>`、`kmnzTheme` |
| 全站颜色、字体、响应式布局 | `src/styles.css` | `:root`、`html[data-theme="dark"]`、`@media` |

## 图片与字体

- `src/assets/images/`：成员图片、首页海报、Logo 等素材。
- `src/assets/fonts/`：本地字体资源。
- `src/assets/icons/`：平台与播放器 SVG 图标；Lucide 图标许可证见同目录 `LICENSE-lucide.txt`。
- `public/favicon.ico`：浏览器标签图标。
- 首页轮播实际使用的图片文件及排列顺序，以 `src/components/HeroCarousel.tsx` 内的 `posters` 数组为准。
- 成员使用的头像文件，以 `src/data/members.ts` 的 import 为准。

## 其他重要文件

| 文件 | 作用 |
| --- | --- |
| `src/main.tsx` | React 应用入口，加载全局 CSS |
| `src/types.ts` | 页面类型定义 |
| `package.json` | npm 脚本、依赖 |
| `vite.config.ts` | Vite 配置与网站路径 |
| `scripts/update-music-metadata.mjs` | 手动获取官方元数据、校验、缓存与静态索引保存；不会改人工覆盖文件 |
| `scripts/fetch-music-metadata.ps1` | Windows 系统网络请求；优先使用现有 PowerShell 7，遵循现有系统代理与执行策略 |
| `scripts/load-typescript.mjs` | 本地工具及测试加载 TypeScript、相对模块和 JSON；复用已有 TypeScript 依赖 |
| `scripts/music-library.test.mjs` | C1 数据迁移、关系校验、版本隔离、来源去重及播放兼容测试 |
| `scripts/fixtures/music-c1-legacy.json` | C1 迁移前九条目录的兼容性基准，不由前端读取 |
| `scripts/music-metadata.test.mjs` | 日期精度、缓存、人工优先、失败保护及高清占位图回退测试 |
| `../.github/workflows/deploy-pages.yml` | GitHub Pages 自动构建和部署（此路径相对于 `KMNZ2.0/`） |
| `../KMNZ1.0/` | 原 KMNZ 1.0 备份，不是当前 React 网站 |

## 本地预览与上线

在 `D:\2\KMNZ\KMNZ2.0` 运行 `npm.cmd run dev`，保存 `.tsx` / `.css` 文件后，本地预览通常会热更新。

GitHub Pages 不会同步本地未提交修改。确认效果后，在仓库根目录 `D:\2\KMNZ` 提交并推送到 `分支`，部署工作流会自动构建和发布。

> 提醒：`src/styles.css` 同时包含多个页面的样式。修改时先定位目标选择器，避免影响其他组件。

## 音乐元数据维护

在 `KMNZ2.0/` 内执行：

- `node scripts/update-music-metadata.mjs`：预览候选 JSON，不写文件。
- `node scripts/update-music-metadata.mjs --write`：保存有效更新；成功字段缓存 30 天，失败请求缓存 24 小时。
- `node scripts/update-music-metadata.mjs --write --refresh`：主动重新检查，仍保留请求失败前的有效数据。
- `node scripts/update-music-metadata.mjs --check`：离线校验静态索引和人工覆盖文件。
- `node --test scripts/music-metadata.test.mjs`：运行元数据测试。

可选凭据只从本地环境变量 `YOUTUBE_API_KEY`、`SPOTIFY_ACCESS_TOKEN` 读取，不使用 `VITE_` 变量，不写入仓库。没有凭据时 Spotify oEmbed 仍可补全封面；日期缺失不影响构建。Windows 请求通过系统网络设置执行；脚本不会更改代理、证书或 PowerShell 执行策略。

人工覆盖文件以现有条目 ID 为键，并保留对应 `platformId`。字段独立覆盖：`cover` 包含 `url`、`width`、`height`；`publishedAt` 包含完整 ISO 时间 `value`；`releaseDate` 包含日期 `value` 和 `precision`（`year`／`month`／`day`）。每个经核实字段还需 `source: "manual"`、`status: "verified"`、`verifiedAt` 和核实依据 `sourceUrl`。将单个字段设为 `null` 可明确取消该字段，省略则沿用自动数据。未知日期保持缺失，不从旧 `year` 推算。

页面仅请求图片 URL，不请求元数据 API。YouTube 保持 16:9、优先使用已验证高清图并回退 `mqdefault.jpg`；Spotify 保持官方原图 1:1。图片错误或低分辨率占位图会回退，最终显示统一无封面图标。

## B4 已核实元数据

2026-10-27 已逐条核实现有 7 个 YouTube 视频和 2 个 Spotify 条目，并写入 `src/data/music-metadata.overrides.json`；原目录、自动索引与播放器文件保持不变。

YouTube 的 `publishedAt.value` 保留官方观看页 `datePublished` 与微格式 `publishDate` 一致的完整 ISO 时间戳，来源标为 `manual`，显示仍使用 Asia/Tokyo。七张官方 maxres 原图均经 HTTP、实际解码尺寸（1280×720）及视觉检查，保留原有 mqdefault 回退。

Spotify 的 `releaseDate.value` 与 `precision: "day"` 来自对应条目的官方页面 `music:release_date` 和结构化数据交叉核对，记录当前发行版本日期。已有官方封面 URL 不变。这批数据没有冒充 YouTube Data API 或 Spotify Web API 响应，也未从旧 `year` 推算日期。

## C1 音乐库维护

歌曲、发行版本和平台来源分别维护于 `src/data/music/` 的三个 JSON 文件。歌曲 ID 与发行 ID 是本地稳定身份，改名不改 ID；歌曲表示可独立播放的录音版本，Remix、Live、Remaster 等应使用不同歌曲 ID，可通过 `version.relatedSongId` 记录版本关系。`unspecified` 表示尚未核实版本，不推断为原版。

发行记录使用独立 ID，不按标题合并不同发行版本。`tracks` 以 `songId` 关联歌曲，并保存盘号、曲序与可用来源 ID；同一歌曲可属于多个发行版本。Spotify Track 的 `target.releaseId` 仅在核实具体发行后填写，且必须与曲目归属一致。Spotify Album 直接指向发行记录，YouTube MV／Spotify Track 指向歌曲版本。

本次迁移为 8 个歌曲版本、1 个专辑发行和 9 个平台来源。KMNCULTURE 的曲目表保持 `unknown` 和空数组；MIRROR 原有“收录于 DROPS”副标题保留，但未据此猜测发行 ID 或曲目位置。没有补造专辑、曲目或跨平台关系。

原九个条目 ID 保留为来源 ID，`musicCatalog` 由来源顺序生成，旧页面和播放器无需改动。封面、YouTube 发布时间、Spotify 当前发行日期及人工覆盖仍以来源 ID 和平台 ID 绑定，两个元数据 JSON 不迁移、不合并，因此不会把 MV 发布时间当作歌曲首发日期，或把某次 Spotify 发行日期传播到其他版本。`display.year` 仅保留旧搜索／切歌兼容用途，不作为日期依据。

新增数据须先经过 `parseMusicLibrary`：检查类型、稳定 ID、外键、平台 ID／URL、来源唯一性、曲序、版本关系及发行归属。`platformSourceKey` 以平台＋资源类型＋平台 ID 去重，`parseMusicSourceUrl` 可规范化受支持的官方链接（忽略分享参数）；同名作品不会自动合并。跨平台关联仅在确认后显式指向同一歌曲 ID，本阶段没有导入器或新播放队列。

离线检查：`node scripts/update-music-metadata.mjs --check`。完整数据测试：`node --test scripts/music-library.test.mjs scripts/music-metadata.test.mjs`。构建：`npm.cmd run build`。

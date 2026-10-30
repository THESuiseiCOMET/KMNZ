# KMNZ 2.0 文件位置速查

本文件只用于查找和修改项目文件，不会显示在网页上。

## 常改的位置

| 想修改什么 | 文件 | 在文件中找什么 |
| --- | --- | --- |
| 顶部导航按钮名称与顺序 | `src/components/Header.tsx` | `const navigation` |
| 导航涂鸦字体、悬停喷漆描边 | `src/components/Header.tsx`、`src/styles.css` | `.nav-street-label`、`--nav-outline-shift`、`--nav-outline-duration`、`--nav-tag-tilt` |
| 选中导航的间歇描边 | `src/styles.css` | `--nav-selected-cycle`、`nav-spray-idle`，5.8 秒周期中前 86.2% 静止（约 5 秒），剩余约 0.8 秒播放 |
| 点击导航后的粉笔圈选中效果 | `src/components/Header.tsx`、`src/styles.css` | `.nav-chalk-ring`、`--nav-chalk-width`、`--nav-chalk-duration`、`nav-chalk-draw` |
| 导航图标悬停动画 | `src/styles.css` | `.settings-toggle`、`.navigation-toggle` |
| 页面左右滑动与动态模糊 | `src/hooks/usePageTransition.ts`、`src/styles.css` | `page-slide-in`、`page-slide-out`、`--page-enter-x`、`--page-exit-x` |
| 顶部 Logo、返回首页按钮 | `src/components/Header.tsx` | `site-logo`、`navigate('home')` |
| 顶部导航排版、Logo 大小 | `src/styles.css` | `.site-header`、`.site-title`、`.site-logo` |
| 深色/浅色切换、圆形辐射动画 | `src/components/Header.tsx`、`src/styles.css` | `handleThemeChange`、`::view-transition` |
| 黑白 Logo 图片 | `src/assets/images/KMNZLOGOB.webp`、`KMNZLOGOW.webp` | B 黑色用于浅色主题，W 白色用于深色主题；导航与音频可视化共用 |
| 首页背景与可视化布局 | `src/pages/Home.tsx`、`src/styles.css` | `Home`、`.hero` |
| 首页四图轮播 | `src/components/HeroCarousel.tsx` | `posters`、`4000` |
| 成员头像、介绍、名单 | `src/data/members.ts` | `members` |
| 成员卡片和详情排版 | `src/components/MemberCard.tsx`、`src/pages/Members.tsx`、`src/pages/MemberDetail.tsx` | 对应组件 |
| 历程事件 | `src/data/timeline.ts` | `timeline` |
| 历程页面 | `src/pages/History.tsx` | `History` |
| 关于页文字及外部链接 | `src/pages/About.tsx` | `links` |
| Spotify 分区、详情入口、返回时搜索与焦点 | `src/pages/Music.tsx` | `music-spotify-sections`、`releaseSourceId`、`renderCard` |
| Spotify 横向单曲条目 | `src/components/MusicSingleRow.tsx`、`src/styles.css` | `music-single-row`、`music-single-cover`、`music-single-play` |
| 专辑详情、已确认曲目及单曲播放入口 | `src/components/MusicReleaseDetail.tsx` | `MusicReleaseDetail`、`music-release-header`、`music-track-list` |
| Spotify 分组、已确认曲目搜索与播放来源选择 | `src/lib/musicViews.ts` | `createMusicViews`、`spotifySections`、`releaseDetail` |
| Spotify 统一大卡片与可取消的“专辑／EP”分类 | `src/pages/Music.tsx`、`src/lib/musicViews.ts`、`src/styles.css` | `spotifyCategory`、`spotifyCards`、`music-categories` |
| YouTube 原创／翻唱、时期／多成员筛选 | `src/pages/Music.tsx`、`src/lib/musicViews.ts` | `youtubeCards`、`classification`，不选择时显示全部；再次点击取消 |
| 音乐分类 URL、刷新与历史恢复 | `src/lib/siteRoute.ts`、`src/hooks/usePageTransition.ts` | `changeMusicFilter`、`category`、`group`、`member` |
| YouTube 卡片可选 Bilibili 外链 | `src/data/music/sources.json`、`src/lib/musicLibrary.ts`、`src/pages/Music.tsx` | `bilibiliUrl`、`validBilibiliVideoUrl`，仅外部索引，不接管播放 |
| 音乐页面、卡片、搜索和筛选按钮 | `src/pages/Music.tsx` | `music-toolbar`、`music-grid`、`music-card` |
| 音乐平台官方字标、半宽按钮、分类滑块 | `src/pages/Music.tsx`、`src/styles.css` | `platformLogos`、`.music-platform-labels`、`.music-switch-indicator` |
| 平台及分类的内容过渡 | `src/hooks/usePageTransition.ts`、`src/styles.css` | `musicTransition`、`music-slide-in`、`music-slide-out` |
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
| 浮窗视频与控件顺序、圆角及间距 | `src/styles.css` | `.music-player-panel:not(.is-cinema)`、`order`、`border-radius: 10px`、`gap: 8px` |
| 导航栏右侧展开的图标设置 | `src/components/PlaybackControls.tsx`、`src/components/Header.tsx`、`src/styles.css` | `SettingIcon`、`.playback-settings`、`.playback-setting-icon` |
| 观影模式顶部播放控件 | `src/components/PlayerDock.tsx`、`src/styles.css` | `createPortal`、`.header-player-slot`、`.cinema-player-chrome` |
| 播放器标题居中、关闭与标题栏拖动 | `src/components/PlayerDock.tsx`、`src/styles.css` | `music-player-heading`、`music-player-drag-handle` |
| YouTube 音量、静音与本地保存 | `src/hooks/useOfficialPlayer.ts` | `kmnzPlayerVolume`、`setVolume`、`toggleMute` |
| 音量弹层、滑条与局部滚轮调节 | `src/components/PlayerDock.tsx`、`src/styles.css` | `music-player-volume`、`changeWithWheel` |
| 官方播放器 API 类型与加载 | `src/lib/playerApi.ts` | `YouTubePlayer`、`loadYouTubeApi`、`loadSpotifyApi` |
| 播放状态、循环与播放器生命周期 | `src/hooks/useOfficialPlayer.ts` | `useOfficialPlayer` |
| 队列状态、列表快照、专辑曲序和边界 | `src/lib/playbackQueue.ts`、`src/types/playback.ts` | `createQueueSelections`、`queueReducer`、`queueAvailability` |
| 播放器拖动边界 | `src/lib/playerControls.ts` | `clampPlayerPosition` |
| 播放器位置、尺寸 | `src/styles.css` | `.music-player-panel`、`.youtube-frame`、`.spotify-frame` |
| 页面切换、全局队列与常驻播放器 | `src/App.tsx` | `navigate`、`queue`、`currentMusic` |
| 网站名称、浏览器标签、初始主题 | `index.html` | `<title>`、`kmnzTheme` |
| 全站颜色、字体、响应式布局 | `src/styles.css` | `:root`、`html[data-theme="dark"]`、`@media` |

## 图片与字体

- `src/assets/images/`：成员图片、首页海报、Logo 等素材。
- `src/assets/fonts/`：本地字体资源。
- 导航显示 `HOME / MUSIC / MEMBERS / HISTORY / ABOUT`，复用成员页的本地 `PermanentMarker.ttf`，不新增字体资源。标签主体保留当前微调；悬停和键盘焦点时两层断续描边持续循环晃动，当前选中项未悬停时静止约 5 秒、短暂播放约 0.8 秒，移开悬停后重新等待。粉笔圈持续表示选中，主体文字始终清晰；非选中项移开淡出，不改变导航栏高度。文字层来自 `navigation` 配置，新增页面自动套用样式及动画；按钮名称与可见英文一致，装饰层不重复朗读，减少动态效果偏好下不晃动。成员页面及其字体样式保留。
- 导航 Logo 保持静态，深浅主题使用原黑白图片，点击返回首页；不附加悬停动画。
- `src/assets/icons/`：平台与播放器 SVG 图标；Lucide 图标许可证见同目录 `LICENSE-lucide.txt`。
- `src/assets/icons/youtube-logo-light.svg`、`youtube-logo-dark.svg`：YouTube 官方品牌组件的完整 SVG 路径，分别使用黑／白字标和原红色图标；来源为 [YouTube 品牌资源](https://brand.youtube/youtube-logo) 及其公开组件脚本。`spotify-logo-light.svg`、`spotify-logo-dark.svg`：直接取自 [Spotify 官方完整 Logo 下载包](https://developer.spotify.com/images/guidelines/design/2024-spotify-full-logo.zip) 的 Black／White RGB SVG，保留完整图标与字标。
- `public/favicon.ico`：浏览器标签图标。
- 首页恢复原欢迎标题、介绍和四图轮播，图片及排列顺序见 `src/components/HeroCarousel.tsx`。默认背景与轮播第一张统一使用 `src/assets/images/kmnz1.avif`；轮播其余三张使用 `kmnz2.avif`、`kmnz3.avif`、`kmnz4.avif`，保留原图顺序和布局。旧 JPG／PNG 原图保留但不再引用，不进入网页构建。
- 成员使用的头像文件，以 `src/data/members.ts` 的 import 为准。

## 其他重要文件

| 文件 | 作用 |
| --- | --- |
| `src/main.tsx` | React 应用入口，加载全局 CSS |
| `src/types.ts` | 页面类型定义 |
| `package.json` | npm 脚本、依赖 |
| `vite.config.ts` | Vite 配置与网站路径 |
| `scripts/update-music-metadata.mjs` | 手动获取官方元数据、校验、缓存与静态索引保存；不会改人工覆盖文件 |
| `music-discovery/official-sources.json` | D1 官方来源白名单、音乐分类及有界扫描页数 |
| `music-discovery/candidates.json` | D1 待审核来源清单，前端不读取；保留首次发现时间、官方原始字段、证据和人工备注 |
| `scripts/discovery/core.mjs` | D1 YouTube API 发现、白名单／字段校验、平台来源去重与官方封面回退 |
| `scripts/discover-music.mjs` | 本地发现预览、离线校验及候选清单原子保存；不修改五个正式音乐 JSON |
| `scripts/publish-music-review.mjs` | 固定审核分支、草稿 PR 创建／幂等更新、快进更新及失败保护 |
| `scripts/music-discovery.test.mjs`、`scripts/music-review.test.mjs` | D1 发现、重复运行、失败保护、人工编辑与 PR 工作流测试 |
| `../.github/workflows/discover-music.yml` | D1 仅手动触发；先测试构建，再发现候选并更新草稿 PR；不部署、不自动合并 |
| `docs/music-discovery.md` | D1 Secrets、Actions 手动操作、审核流程、能力限制与 D2 边界 |
| `scripts/fetch-music-metadata.ps1` | Windows 系统网络请求；优先使用现有 PowerShell 7，遵循现有系统代理与执行策略 |
| `scripts/load-typescript.mjs` | 本地工具及测试加载 TypeScript、相对模块和 JSON；复用已有 TypeScript 依赖 |
| `scripts/official-player.test.mjs` | 官方控制器复用、真实状态、结束事件去重、切歌竞态、音量、关闭和 API 失败回退测试 |
| `scripts/playback-queue.test.mjs` | 列表／搜索快照、专辑曲序、平台来源、边界、循环、失效事件与拖动边界测试 |
| `scripts/helpers/player-harness.mjs` | 播放器钩子测试环境和官方 API 替身，不进入前端构建 |
| `scripts/music-filter-group.test.mjs` | 筛选底板取消淡出、尺寸更新和换行定位测试 |
| `scripts/music-filters.test.mjs` | 原创／翻唱、时期／多成员、可取消筛选、安全 Bilibili 外链、渲染、日期及筛选队列测试 |
| `scripts/music-views.test.mjs` | C2 分区、去重、曲目搜索、曲序和详情渲染测试；复用现有 Vite／React，不增加依赖 |
| `scripts/music-library.test.mjs` | C1 数据迁移、关系校验、版本隔离、来源去重及播放兼容测试 |
| `scripts/music-catalog.test.mjs` | C4 官方目录覆盖、既有记录保护、日期／封面、版本、关联与扩充后的视图／队列测试 |
| `scripts/fixtures/music-c4-official.json` | C4 最小核实基准：官方发行和曲目身份、顺序、来源 URL、日期、封面尺寸与明确的跨平台依据；不含歌词或音频 |
| `scripts/fixtures/music-c1-library.json` | 原 C1 九条样本的关系测试基准，保持未知曲目分支的覆盖；不由前端读取 |
| `scripts/fixtures/kmnculture-official.json` | KMNCULTURE 官方核实记录：来源、时间、完整曲序、艺术家、平台 ID、当前发行日期；不含音频或预览地址 |
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

C1 初次迁移为 8 个歌曲版本、1 个专辑发行和 9 个平台来源。C1 当时 KMNCULTURE 的曲目表保持 `unknown` 和空数组（后续补录见下文）；MIRROR 原有“收录于 DROPS”副标题保留，但未据此猜测发行 ID 或曲目位置。没有补造专辑、曲目或跨平台关系。

原九个条目 ID 保留为来源 ID，`musicCatalog` 由来源顺序生成，旧页面和播放器无需改动。封面、YouTube 发布时间、Spotify 当前发行日期及人工覆盖仍以来源 ID 和平台 ID 绑定，两个元数据 JSON 不迁移、不合并，因此不会把 MV 发布时间当作歌曲首发日期，或把某次 Spotify 发行日期传播到其他版本。`display.year` 仅保留旧搜索／切歌兼容用途，不作为日期依据。

新增数据须先经过 `parseMusicLibrary`：检查类型、稳定 ID、外键、平台 ID／URL、来源唯一性、曲序、版本关系及发行归属。`platformSourceKey` 以平台＋资源类型＋平台 ID 去重，`parseMusicSourceUrl` 可规范化受支持的官方链接（忽略分享参数）；同名作品不会自动合并。跨平台关联仅在确认后显式指向同一歌曲 ID，本阶段没有导入器或新播放队列。

离线检查：`node scripts/update-music-metadata.mjs --check`。完整数据测试：`node --test scripts/music-library.test.mjs scripts/music-metadata.test.mjs`。构建：`npm.cmd run build`。

## C2 专辑与单曲展示

Spotify 主列表按“专辑”和“单曲 / EP”展示；发行记录的 `kind` 为 `single`／`ep` 时进入后者，独立 Spotify Track 也显示于后者。同一发行只保留一张卡片，已明确归属于该发行的内部曲目不重复铺到主列表；没有对应发行卡片的曲目仍可单独显示。

专辑封面或名称打开站内详情，卡片和详情的播放入口均只调用原 `onSelect`，沿用全站悬浮播放器；详情不创建 iframe、播放器或新队列。返回保留 Spotify 搜索，并恢复卡片焦点；切换平台退出详情。YouTube 卡片外观、封面、搜索和播放入口不变。

详情从 C1 的 `songs`、`releases`、`sources` 及原元数据兼容层读取封面、精确发行日期和曲目。曲目按盘号／曲序显示，只有 `tracks[].sourceIds` 中已确认的官方来源才生成单曲播放入口，优先 Spotify、其次 YouTube；没有来源时仅显示曲名。不会根据标题或副标题猜测关联。

搜索同时匹配主卡片和发行中已确认关联的曲目名称／艺术家／版本标签。日期、封面和人工覆盖文件不变。KMNCULTURE 已按官方页面补录完整九首曲目，详情显示曲序和单曲播放，并保留官方专辑播放和 Spotify 链接。MIRROR 的所属发行已核实为 DROPS，继续作为单曲条目显示。

新增样式只使用 `.music-spotify-*`、`.music-release-*`、`.music-track-*`，沿用已有主题变量；播放器样式及 Street Graphite 颜色不变。完整测试：`node --test scripts/music-library.test.mjs scripts/music-metadata.test.mjs scripts/music-views.test.mjs`，随后执行 `npm.cmd run build`。

## KMNCULTURE 官方曲目补录

2026-10-27 根据 Spotify 官方专辑页的 `music:song`、盘号与曲序，官方嵌入页的九首名称／URI，以及各歌曲官方页的 canonical、所属专辑、曲序、艺术家和发行日期交叉核实。`release-kmnculture` 的 `tracklistStatus` 更新为 `complete`，新增九个专辑录音版本与 Spotify Track 来源，并以 `target.releaseId`／`tracks[].sourceIds` 双向关联。

旧九条来源及其元数据不变。新增曲目的封面沿用该发行已核实的官方封面 URL；各自发行日期为官方当前版本的 2025-01-06，人工覆盖中保存核实来源与时间。主列表仍只有一张专辑卡片，内部曲目仅在详情显示；按曲名搜索可以找到所属专辑。

VERSE、NEW DAYS、META FICTION 与已有 YouTube MV 同名，但未凭名称将其强行合并为同一录音版本。使用独立的 KMNCULTURE 版本 ID，跨平台录音关系待进一步确认。没有修改页面、样式或播放器，也未新增专辑队列、自动导入或网络依赖。

## Spotify 首次播放修复

选择 Spotify 歌曲或专辑后，在官方控制器的 `ready` 事件中发送一次 `play()`，重复就绪不会再次启动，切歌或关闭后的过期事件不触发播放。图标仍以官方播放事件为准，不把发出请求当作已经播放。播放器按钮、外观及其他控制不变。浏览器或 Spotify 限制播放时仍保留原播放按钮。测试：`node --test scripts/official-player.test.mjs`。

## Spotify 横向单曲展示

Spotify 单曲／EP 分区使用横向条目，左侧 72px 方形封面（移动端 64px）、中间名称和已确认所属发行／原精度日期、右侧圆形图标播放键及官方链接。所属发行只从 C1 来源的 `target.releaseId` 读取，缺失时省略，不解析旧副标题猜测。专辑区域与 YouTube 卡片保持原样；EP 发行仍保留详情入口。

已通过 MIRROR 官方歌曲页与 DROPS 官方发行页交叉确认其为第 1 盘第 3 首，补入 `release-drops` 的已确认部分曲目及 `sp-mirror` 的归属；不新增歌曲、其他曲目或发行主卡片。核实记录见 `scripts/fixtures/mirror-release-official.json`。

## 单曲所属发行跳转

`MusicSingleRow` 的所属发行名称在有已核实的 Spotify Album 来源时可点击，复用 `MusicReleaseDetail`；`releaseEntryForSource` 从 C1 显式发行关系查找来源，不根据名称或旧副标题匹配。导航只更新音乐页详情状态，不调用播放，也不会打断常驻播放器。返回保留搜索，并将焦点恢复到所属发行按钮。

DROPS 的 Spotify Album 来源 `sp-drops` 仅供详情及官方播放使用，`listed: false` 表示不额外展示主列表卡片；默认省略该字段的来源仍展示，类型校验仅接受布尔值。主列表继续显示 MIRROR，专辑字段可进入 DROPS。详情显示已核实封面和发行日期，曲目表仍为已确认的第 3 首 MIRROR，不猜测其他曲目。没有增加歌曲、队列或播放器界面。

## Spotify 小窗大封面

`PlayerDock.tsx` 在原控制按钮下增加满宽 1:1 官方封面，复用 `MusicCover` 和静态元数据，完整展示原图，不裁切、拉伸或覆盖图像；缺图沿用占位图。下方官方嵌入播放器使用 152px 紧凑模式，控件和 Spotify 标识继续可见，不遮挡或隐藏官方 iframe。

`useOfficialPlayer.ts` 仅将 Spotify `createController` 的高度由 352 改为 152，播放、循环、切歌和生命周期逻辑不变。原中央按钮、拖动、YouTube 画面与主题不变；新增样式位于 `.music-player-spotify-cover` 和 Spotify frame 的限定选择器。

## C3 统一播放队列

队列保存在 `App.tsx`，以来源 ID 选择实际播放资源，同时独立记录歌曲 ID、发行 ID、盘号和曲序。列表与搜索只保存点击时有效结果的顺序快照；搜索修改、平台标签、专辑导航和跨页不会清空或重排已有队列。`Music.tsx` 只提供选择上下文，`PlayerDock` 保持原按钮、拖动、音量及外观。

YouTube 由官方结束事件推进，使用实际视频 URL、状态和请求序号隔离过期事件；同一平台内切歌复用控制器与 iframe。顺序模式在边界停止，已有循环按钮切换单曲循环，未增加列表循环或随机模式。

专辑曲目队列仅从 C1 已明确的 `tracks[].sourceIds` 生成，按盘号／曲序排序；缺少播放来源的曲目跳过，未知曲目不推断。KMNCULTURE 可从九首任意位置开始手动切歌；DROPS 的三首曲目已在 C4 核实补齐，使用原专辑队列。

Spotify 使用官方 IFrame API 的 `loadEntity`／兼容 `loadUri` 切换明确的 Track 来源，支持手动上一首、下一首及播放／暂停，真实状态由官方事件确认。无远程加载能力时禁用站内切歌，不用新播放器模拟成功。Spotify 没有可可靠区分完整歌曲结束与试听结束的事件，本阶段不实现站内自动下一首或单曲循环；原循环按钮在 Spotify 下禁用。点击专辑播放入口交给原生专辑播放器管理，站内队列将其记录为一个官方集合，记录实际播放 URI，不同时强制推进。官方播放条继续显示。官方试听进度到达返回的片段时长时，中央按钮恢复为播放；此状态不触发队列结束、自动下一首或循环。

API 初始化失败时保留队列和官方回退 iframe，重新选择可重试。平台内切歌和组件重新渲染不会初始化第二个播放器；切换实际播放平台或关闭才销毁旧控制器。

官方能力依据：[YouTube IFrame API](https://developers.google.com/youtube/iframe_api_reference)、[Spotify IFrame API](https://developer.spotify.com/documentation/embeds/references/iframe-api)。Spotify 自动播放仍受浏览器和平台限制。

完整测试：`node --test scripts/music-library.test.mjs scripts/music-metadata.test.mjs scripts/music-views.test.mjs scripts/official-player.test.mjs scripts/playback-queue.test.mjs`。构建：`npm.cmd run build`（设置 `VITE_BASE_PATH=/KMNZ/` 验证 Pages）。没有新增依赖，没有修改音乐库或人工元数据，没有进入 C4 或阶段 D。

## C4 初始音乐资料库扩充

2026-10-27 从本地 17 条歌曲／版本、2 个发行、19 个来源扩充至 146 条歌曲／版本、36 个发行、204 个来源；新增 129 条歌曲／版本、34 个发行、185 个来源（38 个 YouTube 视频、113 个 Spotify Track、34 个 Spotify 发行来源）。这些是录音／发行版本记录，不能当作独立词曲作品数量。

逐条核对 Spotify 官方艺人目录公开的 6 张专辑、18 个单曲／EP，以及 12 个合作发行；曲目身份、艺人、盘号／曲序、发行类型和当前版本日期来自对应发行页，部分数据与页面结构化信息交叉校验。合作合辑只录入明确署名 KMNZ 的曲目，保留原曲序并标记 `partial`，其发行来源 `listed: false`；联合署名的 HARMONICS EP 保留官方完整六首和各自艺人。DROPS 已补齐 DROP IN、GROWL、MIRROR，保留原 MIRROR 和隐藏发行卡片的设置。

YouTube 来源来自官方频道、官方新旧原创歌单及经核实的合作方视频；不重复加入 Topic 自动音轨或仅有摘要的条目。新视频逐条核实公开 ISO 时间戳和 maxres 实际尺寸，沿用 mqdefault 与占位图回退。Spotify 经 oEmbed 获取官方封面 URL 并校验正方形尺寸，不下载或重新托管封面。新数据的来源及核实状态写入原人工覆盖文件；旧覆盖和来源 ID 不变。META FICTION 的 KMNCULTURE 版本合作艺人已复核，与原署名一致，无需更改。

22 组新关联有视频描述链接、发行方跳转及对应发行曲目的明确依据。既有独立 ID 不合并；同名再发行、2025 版本、Remix 和 Live 保持独立，未确认录音关系继续分开。没有凭单曲数量推断 EP，没有用发行日期代替视频发布时间；只有实体 CD 线索、缺少可核实播放来源的作品不建立空记录。

本轮只修改歌曲／发行／来源 JSON、人工元数据、必要测试、核实基准及本文件；页面、播放器、队列实现、主题、依赖和工作流不变，没有新增导入器或后台。

完整测试：`node --test scripts/music-library.test.mjs scripts/music-metadata.test.mjs scripts/music-views.test.mjs scripts/official-player.test.mjs scripts/playback-queue.test.mjs scripts/music-catalog.test.mjs`；元数据校验：`node scripts/update-music-metadata.mjs --check`；构建：`npm.cmd run build`，Pages 验证设置 `VITE_BASE_PATH=/KMNZ/`。

## Spotify 统一卡片与分类

Spotify 主列表统一采用原专辑的 1:1 大封面卡片，标签下提供“全部、专辑、EP”三个分类按钮，默认全部，按已核实日期倒序展示；EP 分类包含此前单曲／EP 区域的内容，不更改官方发行类型。`spotifyCards` 将已有完整单曲／EP 发行的独立曲目入口汇总为发行卡片，因此 DROPS 只出现一次，进入详情仍按 DROP IN、GROWL、MIRROR 播放。搜索任一曲名可找到 DROPS，未知或不完整关联不自动汇总。

未汇总的合作曲目也使用大卡片，卡片内不显示所属发行名称及其文字跳转；歌曲、发行关系保留在数据中。返回详情前的分类、搜索与焦点保持；分类操作不修改正在使用的播放队列。音乐 JSON、元数据、播放器和队列实现保持不变，旧 `MusicSingleRow` 组件保留兼容，但主列表不再使用横向条目。

Spotify 卡片播放入口位于封面中央，仅显示图标；桌面悬停或键盘聚焦时显示，触屏保持可见。封面四角独立圆角，悬停轻微放大且不改变外层卡片尺寸；减少动态效果偏好下关闭缩放。标题旁的 Spotify 图标直接打开对应官方页面，底部不再重复放置按钮。封面详情与播放入口为独立按钮，沿用现有播放选择与队列逻辑。

YouTube 卡片沿用 16:9 封面，复用四角圆角与悬停放大；48px 液态玻璃播放圆钮居中于封面，沿用 Spotify 的悬停／聚焦显示和触屏常显规则。下方标题与贴底日期位于左侧，右侧 YouTube 标识打开官方视频，文字区上下留白为 8px。玻璃材质复用 `music-cover-play`，保留 Spotify 和全站悬浮播放器的现有逻辑。

## 主题角色弹出动画

`src/assets/images/NEROB.png` 和 `TINAW.png` 使用提供的透明 PNG 原图；`src/components/ThemePeek.tsx` 在切换深色／浅色主题后分别显示 NEROB／TINAW。Header 保留原有圆形扩散，结束后自动弹出并停留 1 秒；鼠标进入角色最终显示区域时弹出并保持，移开后收回，点击角色始终平滑返回顶部。悬停和主题切换共用进出动画；键盘聚焦可显示并操作，减少动态效果偏好下角色使用淡入淡出。图片加载后才计时，重复切换拒绝旧计时器，播放器占用角落时调整角色位置，无法避让时置于播放器下层。

`src/lib/themePeek.ts` 管理显示状态、时间常量和避让位置；被动鼠标监听按角色未变换的位置和尺寸计算感应范围，同时覆盖进出动画中的实际图片区域，不放置拦截点击的透明遮罩。回顶使用 650ms 缓动，可被滚轮、触摸、滚动按键或新的点击打断。`scripts/theme-peek.test.mjs` 验证悬停、自动收回、焦点、位置边界与回顶中间帧。横向位置在 `styles.css` 的 `.theme-peek` 中通过 `--nero-offset-x`／`--tina-offset-x` 分别调整，正值向右、负值向左；感应区域跟随偏移、尺寸变化及播放器避让。

## 播放内容磨砂背景

`src/components/PlaybackBackdrop.tsx` 由 App 当前播放条目驱动，YouTube 使用当前视频的官方封面，Spotify 使用当前发行条目的官方封面；复用 `MusicCover` 的元数据、高清验证与失败回退。固定背景采用模糊和主题遮罩，前景表面半透明，小窗保持原有实色与清晰控件。页面切换／暂停保留背景，关闭播放器恢复原主题背景；没有新建视频、音频或 iframe，没有修改播放器、队列或曲库。背景是封面图，不是 YouTube 实时视频帧，也不请求屏幕共享权限。图片缺失时回退主题底色，减少动态效果偏好下关闭淡入动画。

## 播放设置与影院模式

YouTube 浮窗按标题、视频、播放控件、进度条排列；通过 CSS 调整顺序，不移动或重建媒体 host。视频左右各留 12px、四角 10px 圆角，保持 16:9；浮窗控件统一居中、间隔 8px，音量面板向上展开以避开底边。影院导航控件沿用原布局和间距。

`src/components/PlaybackControls.tsx` 直接提供模式、当前模式磨砂与可视化图标开关，不再使用齿轮或设置面板。播放模式、影院视频磨砂与浮窗封面磨砂独立保存在 `src/lib/playbackPreferences.ts`；`scripts/playback-controls.test.mjs` 与偏好测试验证开关状态、直接共享、取消及旧偏好迁移。

影院模式使用 `PlayerDock` 的 Portal 把原控制界面放入 Logo 与右侧导航之间的 `.header-player-slot`，随导航布局，不再依赖固定屏幕坐标；媒体 host 留在原位置，切换模式不重建 iframe。进度线收紧在同一导航高度内，保留播放按钮外观、导航高度、音量及切歌交互。控制区随可用宽度调整，同一个 YouTube 媒体 host 固定在导航下方的背景层，影院 iframe 按 16:9 等比放大、居中裁切以覆盖背景区域，横屏裁切上下、竖屏裁切左右，浮窗尺寸规则保持原样；磨砂玻璃层不拦截点击，主内容层仍可浏览音乐、成员、历程和关于页面；Spotify 沿用官方封面背景与右下角原生播放条。选歌不强制改变滚动位置；只改变布局，不重新创建 iframe／控制器，不修改队列和进度。原浮窗的拖动位置保留。影院有当前播放条目时卸载首页文案与轮播，暂停时保持，关闭播放或返回浮窗后恢复。影院“视频磨砂”使用覆盖在真实 iframe 上方的 `backdrop-filter`，视频本身不复制、不抓帧；玻璃层保持透明，不再叠加灰白／黑色主题蒙层；关闭时移除模糊，视频保留原始色彩和对比度，前景页面和导航控件保持清晰。Spotify 保留平台原生进度控制，页面底部预留空间避免遮挡内容。

## YouTube 小窗进度条

`src/components/PlayerProgress.tsx` 在播放控制按钮下方、YouTube 视频上方显示细进度条，当前时间和总时长置于进度线下方两端。拖动时预览，松开后通过现有 IFrame API `seekTo` 跳转，键盘方向键／Home／End 沿用原生滑条操作；取消拖动不跳转。`useOfficialPlayer.ts` 在原音量轮询中同步真实进度，切歌／重播清除旧时间，以来源 ID 和请求序号拒绝过期跳转；不重新创建播放器，不更改播放／暂停状态或队列结束逻辑。

`playerApi.ts` 增加官方时间读取方法，`playerControls.ts` 提供时间格式化；`scripts/player-progress.test.mjs` 验证拖动、取消、键盘和未知时长，播放器测试补充跳转边界及生命周期。未获取时长或接口不可用时禁用进度条，不伪造总时长。Spotify 官方 `seek` 文档只明确支持播客，现有音乐条目继续使用原生播放条，不新增站内 Spotify 进度控制。没有新增依赖。

## 首页音频可视化

`src/components/PlaybackControls.tsx` 提供独立的“音频可视化”开关，不依赖本站是否正在播放，也不限定浮窗／影院模式；开关开启才请求所选来源，取消、失败则恢复关闭，等待期间可取消。不再提供可视化专属全屏模式或显示位置选择。

`src/lib/audioCapture.ts` 仅将共享音轨送入本地 Web Audio 分析器，不录制、不上传、不连接扬声器而造成重复播放；拒绝整屏／窗口来源，无音轨和初始化失败时释放全部资源。`src/hooks/useAudioVisualizer.ts` 管理单次请求、过期结果、取消、结束共享与卸载清理。浏览器选择器仍要求视频轨；确认标签页来源并建立音频分析后立即停止不用的视频轨，只监听音轨结束，减少无用画面采集，不重建播放器、不模拟全屏。实际 Edge 验收表明仅保留音轨时网页全屏仍可能受限为标签页内全屏；浏览器窗口全屏应由 F11 操作，不能把 document.fullscreenElement 当成浏览器窗口全屏成功的证据。视频轨不会用于抓帧或渲染，停止它不停止音频分析；浏览器和受保护媒体是否提供有效音轨需实际确认，静音不模拟信号。

`src/lib/audioGeometry.ts` 用实际频谱生成最初较平缓的环形线条，低频控制轻微外扩；已移除交替长短尖刺及李萨如／延迟相位曲线的计算与绘制。`src/components/AudioVisualizer.tsx` 用 Canvas 绘制，与导航共用提供的 `KMNZLOGOB.webp`／`KMNZLOGOW.webp` 透明原图，深色 W 白图／浅色 B 黑图，淡入至低透明度，开启可视化后持续慢速旋转。原图直接复制，不裁剪或重新压缩；原 SVG 留存但不再引用。无信号时绘制静态基础圆环，有有效音频信号时才按真实频谱变形；保留当前圆环大小、线宽、透明度与旋转速度，不伪造音频起伏。限制像素密度，减少动态效果偏好下停止旋转并降低线条强度。

`Home.tsx` 保留默认 Hero 背景大图，首页显示欢迎标题、介绍和原四图轮播；开启可视化后整体隐藏这些内容并直接绘制，不使用轮播容器、边框或卡片，关闭后恢复原首页。影院播放继续沿用原视频／封面背景。`AudioVisualizer.tsx` 只负责首页绘图及尺寸变化，不再接管导航、页面焦点、滚动、Esc 或浏览器全屏，不显示等待文字。离开首页只卸载绘图，采集和音乐持续；关闭开关或输入断开才停止采集。未保存自动采集开关，不自动请求共享。

## 音频采集兼容辅助函数

`src/lib/audioCapture.ts` 保留经过测试的底层输入设备辅助函数，但当前 App、导航和 `useAudioVisualizer.ts` 不再调用它们，只开放标签页共享，不读取设备或请求麦克风权限。

`useAudioVisualizer.ts` 直接请求标签页共享，处理授权失败、停止共享、重复点击和过期结果清理。原输入采集辅助函数测试保留，设备断开、无默认回退及权限释放仍有覆盖；它们不构成当前网页的可选音频来源。

`src/lib/audioSignal.ts` 每 120ms 读取实际浮点输入，向设置显示输入电平和等待／接收／无信号／输入静音／分析暂停状态。无信号时提示检查对应声卡路由；分析暂停可通过用户点击恢复，不伪装已经收到声音。监测与采集会话同寿命，离开首页仍检测，停止或卸载释放计时器。`audioGeometry.ts` 去除输入直流偏移并采用浮点采样，避免 8 位量化丢失弱信号或将静音误判为有效声音；无信号基础圆环仅由绘图层显示。保留平缓环形、主题及播放控件。设备输出未改变，官方嵌入播放器仍由原控制器管理。


## 导航网页全屏按钮

`src/components/FullscreenToggle.tsx` 位于主题和设置按钮之间，两个对角直角随悬停／键盘焦点拉开间距，离开后收回；减少动态效果偏好下无过渡。点击只调用浏览器网页全屏／退出接口，不修改影院、可视化、采集或播放状态；监听 fullscreenchange 同步 Esc 与浏览器退出，快速重复点击合并，失败保持真实关闭状态并提供可访问提示。卸载可视化不退出由导航开启的原生全屏。`scripts/fullscreen-toggle.test.mjs` 覆盖进入、退出、Esc、请求拒绝、不支持、重复点击及清理。

## 独立导航隐藏

导航当前项使用 `.nav-chalk-ring` 绘制两条略有偏差的 SVG 椭圆线，噪声蒙版形成粉笔颗粒，沿实际按钮宽高缩放，不占排版空间。点击切换时立即描画并保留，再点当前导航也重画；旧选中项的圈自动移除。页面过渡仅捕获 `#main-content`，导航保持实时显示，让粉笔圈与页面滑动模糊同时进行。移除顶部导航滑块及矩形选中背景，保留音乐页的平台与分类滑块、用户微调后的字体及悬停参数。颜色沿用主题，装饰层不接收点击或重复朗读；减少动态效果偏好下直接显示完整圈。

`src/hooks/useNavigationIndicator.ts` 继续供音乐页的平台与分类滑块使用，按当前按钮实际坐标及宽高定位，尺寸变化和字体加载后重新测量，卸载清理监听；顶部导航不再使用该 Hook。新增顶部导航项沿用 `Header.tsx` 的 `navigation` 配置，自动套用描边和圈选效果。齿轮悬停旋转 24°，收起／展开箭头分别上移／下移 3px，移开归位。键盘焦点沿用反馈，减少动态效果偏好下停止这些动画。`scripts/navigation-indicator.test.mjs` 保留尺寸、新增选项、布局变化与监听清理验证。

`App.tsx` 管理临时导航显隐，`Header.tsx` 在网页全屏与设置按钮之间提供常驻收起箭头；收起时导航滑出并不可聚焦，恢复箭头跟随收起按钮的实际坐标和尺寸，点击或 Esc 恢复，焦点返回收起按钮。展开与收起沿用原箭头方向及共用样式；收起按钮常驻显示，只有展开按钮在鼠标距按钮 48px 内显现、远离淡出，键盘焦点和触屏保持可操作。浏览器原生全屏和设置对话框的 Esc 优先；不改变网页全屏、播放器模式、播放队列或采集会话。影院视频随导航高度铺开，顶部播放控件随导航隐藏；浮窗保持原样。`styles.css` 用同一可见导航高度变量调整首页和影院背景；首页背景采用动态视口高度并随 main 剩余空间伸展，移除已不存在的旧页脚高度预留及重复规则。导航收放时背景与可视化高度同步过渡，保留原图等比铺满和底部定位；减少动态效果偏好下关闭过渡。


`src/hooks/useNavigationControl.ts` 和 `src/lib/navigationControl.ts` 跟踪按钮、导航变换及窗口尺寸，抵消收起时的导航位移，并在窄屏下限制恢复按钮留在可见范围；靠近区域随位置变化，卸载清理鼠标、滚动及尺寸监听。`scripts/navigation-control.test.mjs` 验证坐标、边界、靠近检测与清理。

`src/assets/images/LITACLOSE.png`、`LITAOPEN.png` 使用提供的透明原图。导航收起／展开分别触发对应图片；复用同一个 `ThemePeek.tsx` 和现有动画、1 秒停留、NEROB／TINAW 主题位置偏移及播放器避让，不新增独立动画层。快速切换替换旧图片并清理旧计时器，完成后恢复原主题角色的悬停回顶行为。`scripts/theme-peek-artwork.test.mjs` 核对两张 LITA 与原角色使用相同宿主和位置。


## 地址路由与刷新恢复

音乐页平台按钮左右各占一半，完整品牌标识居中并随主题选择本地 SVG。平台和 Spotify 分类使用 `useNavigationIndicator.ts` 的可配置选择器测量滑块；切换栏文字／标识与滑块分层，文字快照始终置于滑块上方。`useSiteRoute.ts` 把前后 `MusicRoute` 交给同一个 `usePageTransition.ts`：平台切换用 320ms 左右滑动、淡入淡出和 6px 动态模糊，分类筛选用 220ms、18px 位移和 3px 模糊；只有 `.music-results` 参与内容过渡，搜索和切换栏位置保留。方向读取按钮顺序，浏览器前进／后退沿用相同规则；搜索和详情操作不触发分类过渡。重复选中当前平台／分类取消未完成的旧目标，快速连续切换只提交最后一次选择，不改播放队列或重建播放器；主题、降级和减少动态效果偏好沿用原处理。

`src/hooks/usePageTransition.ts` 通过浏览器 View Transitions 为主页面切换及前进／后退添加左右滑动、淡入淡出和动态模糊；方向读取导航按钮实际顺序，成员详情返回反向。导航选中滑块单独参与位置过渡，不移动播放器、不创建额外 iframe；主题切换继续使用原圆形扩散。快速连续操作取消过期动画和更新，失败、安全降级及减少动态效果偏好下直接切换；站内搜索、分类和平台筛选不触发整页动画。`useSiteRoute.ts` 保留原地址与滚动恢复顺序，动画更新回调内提交新页面。`scripts/page-transition.test.mjs` 验证方向、快速切换、失败降级和卸载清理。

`src/lib/siteRoute.ts` 定义 /KMNZ/ 下的 Hash 地址，覆盖主导航、成员详情、YouTube／Spotify、分类、搜索和发行详情；未知成员、无效来源和损坏编码安全回退。`src/hooks/useSiteRoute.ts` 管理初始化、地址规范化、前进／后退及当前标签页内的滚动位置；搜索更新替换当前历史项，页面／平台／专辑切换新增历史项，详情返回优先使用原列表历史。`Music.tsx` 通过可选路由属性接入，单独渲染仍保留兼容行为。页面切换不卸载全站播放器。

`src/lib/playbackSession.ts` 和 `src/hooks/usePlaybackPersistence.ts` 将来源 ID、队列、模式、真实进度及播放意图保存在 sessionStorage；刷新读取时依据当前音乐库重新校验来源和专辑曲序，不信任缓存中的关系字段。关闭播放器清除记录，过期回调不覆盖新曲，损坏数据或存储受限时正常降级。`useOfficialPlayer.ts` 在原轮询／官方事件中发送 `PlayerCheckpoint`；YouTube 使用官方 loadVideoById／cueVideoById 的 startSeconds 恢复播放或暂停，不重建额外 iframe。恢复等待期间不以初始零秒覆盖已保存的进度。Spotify 只恢复当前选择的曲目／专辑入口和队列，不调用仅明确支持播客的 seek；音乐秒数和原生专辑内部曲目位置无法保证恢复。自动播放被拦截时保持暂停，沿用原播放按钮继续。没有持久化或自动重新申请音频可视化采集权限。

`scripts/site-route.test.mjs` 验证路由、查询编码、历史、专辑返回和滚动；`scripts/playback-session.test.mjs` 验证队列／专辑恢复、暂停、无效数据和存储故障；`scripts/playback-persistence.test.mjs` 验证切歌、页面退出保存及关闭后的过期回调。播放器测试覆盖恢复请求、进度、自动播放受阻及同一控制器复用。

## D1 官方来源发现与审核 PR

音乐库仍为既有 146 条歌曲／版本、36 个发行、204 个平台来源。D1 只把通过官方频道、平台 ID、公开／可嵌入状态、完整日期及基础字段校验的来源放入独立候选清单，不生成站内歌曲身份或猜测发行关系。YouTube 从白名单频道的 uploads 播放列表分页读取，已存在来源（包括 listed:false）与待审／dismissed 候选按 C1 platformSourceKey 去重。官方高清封面沿用实际尺寸检查，失败回退 mqdefault 或 null；原元数据和人工覆盖从不写入。

候选初次发现时间和已有人工字段保持，运行报告与稳定清单分离，避免每次刷新时间戳造成无意义 PR。固定 automation/music-discovery 审核分支只写 candidates.json，更新开放的草稿 PR，不强推、不自动合并；重复相同内容不创建新提交或 PR。开放审核分支的人工作品关系／元数据修改保留。上个 PR 未合并而关闭时暂停创建新 PR，等人工处理。

工作流仅 workflow_dispatch、Node.js 22，先校验数据、运行测试和 /KMNZ/ 构建。需要配置 YOUTUBE_API_KEY 及仓库允许 Actions 创建 PR；无 Key 安全跳过，API／权限失败中止，不影响正式资料。Spotify 发现、定时调度和自动资料迁移尚未实现。候选清单不是上线曲库，仅合并清单不会新增网站歌曲；资料上线需人工在审核 PR 中编辑原音乐 JSON 并通过校验后合并，沿用既有 Pages 部署。操作及真实 API／PR 演练的限制见 docs/music-discovery.md。

## 音乐分类与 Bilibili 索引

在 `sources.json` 的 YouTube 来源上填写可选 `classification`。`contentType` 为 `original`／`cover`；原创界面只提供 `lita-liz`、`lita-tina-nero` 两个时期；旧 `special` 数据值仍兼容，但不再提供筛选按钮，旧筛选 URL 恢复全部原创。`performers` 是经核实的 KMNZ 成员数组；翻唱也支持 `coverMembers`（仅限 `cover`）。两字段接受 `LITA`／`lita`、`LIZ`／`liz`、`TINA`／`tina`、`NERO`／`nero`，筛选时合并去重为大写成员，允许多成员，不根据时期播放列表补造全部演唱人员；未知可省略。`evidenceUrls` 保存非空的 HTTPS 依据列表。未分类来源仍显示在默认全部列表。UI 不展示“全部”按钮，重复点击当前分类即可取消。

视频分类以当前 `sources.json` 的人工维护结果为准；Fiction、未来図已由用户归入猫狗时期，Boarding 已归入三人时期，本次只移除特别收录筛选，不改音乐 JSON。Boarding 的官方封面与完整时间戳保持原样。当前导入库为 357 个歌曲记录、36 个发行、440 个来源；YouTube 281 个来源中原创 81 个、翻唱 200 个。LITA／LIZ／TINA／NERO 翻唱结果分别为 65／82／33／25，合作视频只保留一个来源，可跨成员出现；全部 YouTube 来源有完整发布时间，封面沿用实际尺寸校验、mqdefault 与占位回退。

同一来源可选填 `bilibiliUrl`：仅接受 `https://www.bilibili.com/video/` 或 `https://bilibili.com/video/` 下有效格式的 BV／av 视频地址，可带分享参数。拒绝其他域名、短链、非 HTTPS、用户凭据及非视频页面。缺少地址不显示按钮，本次未编造或添加任何转载链接。沿用本地 `brand-bilibili.svg` 品牌小电视路径（Simple Icons 的 Bilibili 图形，与通用电视图标不同），仅标识外链目的地；来源与条件见 [图形](https://github.com/simple-icons/simple-icons/blob/develop/icons/bilibili.svg)、[CC0](https://github.com/simple-icons/simple-icons/blob/develop/LICENSE.md) 和 [品牌免责声明](https://github.com/simple-icons/simple-icons/blob/develop/DISCLAIMER.md)。项目许可证不授予 Bilibili 商标许可，不表示官方授权或合作。

分类分享 URL 示例：`#/music/youtube?category=original&group=lita-liz`、`#/music/youtube?category=cover&member=LITA`。旧 Spotify `?category=ep`／`albums` 继续生效；切换平台清除分类，当前队列继续使用播放时的结果快照。分类、外链安全、渲染、精确日期及队列回归测试见 `scripts/music-filters.test.mjs`；路由历史覆盖见 `scripts/site-route.test.mjs`。


筛选外观与移动底板：`src/components/MusicFilterGroup.tsx`、`src/styles.css` 的 `.music-filter-bar`、`.music-categories`、`.music-category-indicator`；点击已选项会淡出底板并取消筛选。卡片筛选动效：`Music.tsx` 按稳定来源 ID 设置动画身份；CSS 的 `music-card-enter`／`music-card-leave` 控制轻微位移、缩放和模糊，`--music-duration` 为保留卡片重排时长，入场错峰最多 100ms。沿用现有页面过渡生命周期，快速切换取消过期动画，播放器不重挂载。系统减少动态效果偏好下禁用运动，不支持 View Transitions 时立即切换内容。


音乐数据分类兼容：`src/lib/musicLibrary.ts` 的 `normalizeKMNZMember`／`youtubeCoverMembers` 只读取明确分类字段；不根据标题、日期或艺人猜测成员，不改写导入 JSON。`coverMembers` 和 `performers` 的字段类型、成员值、重复大小写成员、内容类型及证据均经严格校验；未知字段继续报错。小写成员 URL（如 `member=lita`）会恢复为标准大写筛选。测试见 `scripts/music-classification-compat.test.mjs`，包含当前整库初始化、多个成员共享同一来源、旧字段兼容、无副作用及播放器队列／缺失日期回退。


## YouTube 导入后的日期补全

LIZ 补录前的 195 条 YouTube 来源全部有有效完整发布时间：猫狗时期原创 55、三人时期原创 26（含 TINA 独立原创）、翻唱 114。本轮按 source ID／platformId 核对后，仅在 src/data/music-metadata.json 中补入 34 条日期；来自仓库根目录已导出的 lita-liz-playlist.json，和既有重叠日期按时间戳对照无冲突。本轮未请求实时 API，原 161 条有效日期、人工覆盖文件和全部封面保持原样。页面仍按 Asia/Tokyo 显示，按原始时间戳降序。

scripts/update-music-metadata.mjs 的校验保留覆盖索引中来源为 youtube-data-api 的已验证 publishedAt，要求证据是与 platformId 匹配的 HTTPS YouTube 观看页且不含 key；其他人工字段规则不变。这样保留导入日期的真实来源，同时不会让自动更新覆盖它。scripts/music-published-at.test.mjs 覆盖全量日期、分组排序、旧值优先、无日期回退及错误来源保护。


## LIZ 翻唱补录

使用本地导出的官方 YouTube Data API v3 资料，按视频 ID 合并 LIZ Covers 播放列表 81 条与个人频道 5 首，重叠 4 首，新增 82 个独立歌曲记录及 YouTube 来源。`songs.json`／`sources.json` 只追加记录，不建立未经核实的 Spotify 或发行关联；LUVORATORRRRRY! 的官方简介确认 LITA 与 LIZ 合唱，单条来源同时进入两人的翻唱筛选，其余 81 条为 LIZ 独唱。简介中的成员社交链接不作为演唱人员依据。

`src/data/music-metadata.json` 保存 82 条 videos.list 原始完整发布时间及官方封面，保留 API 来源、观看页证据和验证时间；80 张 maxresdefault 通过实际尺寸检查，Booo! 与メルティランドナイトメア使用实测有效的 mqdefault。既有自动元数据、人工覆盖、发行记录和播放器文件保持不变。日期仍按 Asia/Tokyo 展示，卡片按实际发布时间降序；保留懒加载、mqdefault 和最终占位回退。

`scripts/fixtures/music-liz-covers.json` 保存精简的官方核对事实，`scripts/music-liz-covers.test.mjs` 验证 82 条唯一来源、合唱多成员筛选、同名作品独立身份、精确日期、封面回退及筛选后播放队列。原始 API 导出与一次性整理脚本不放进项目，不含前端密钥，不新增依赖或自动导入。


## 四条合作翻唱补录

按用户提供的视频 ID 追加《水星》（LITA、YACA）、《さらしもの》（somunia、LITA）、《Stormy》（NERO、VESPERBELL ヨミ）和《come again》（LITA、TINA），保留各自歌曲身份与合作署名，不关联未经核实的发行或 Spotify 来源。成员筛选只写 KMNZ 成员，come again 单条来源进入 LITA、TINA 两个筛选。三条日期与封面依据已有官方 API 导出写入自动元数据；somunia 视频日期来自官方观看页的完整 datePublished／uploadDate，封面经实际尺寸检查后与日期一起新增到人工覆盖，不冒充 API 数据。原有条目、人工字段及播放器保持不变。

`scripts/fixtures/music-extra-covers.json` 保存精简核对事实；`scripts/music-extra-covers.test.mjs` 验证唯一来源、合作成员、日期来源、封面回退、搜索和队列兼容。


## 导航浮层与覆盖式滚动条

导航采用固定定位的半透明纯色浮层。影院 YouTube 视频和视频磨砂层独立覆盖整个视口，不再读取导航高度计算顶部、尺寸或裁切；导航收放只移动导航本身，保留播放控制、主题和恢复箭头。影院 Spotify 保留官方封面背景，YouTube 影院不额外叠加缩略图。浮窗恢复当前曲目的封面背景及独立磨砂值；旧 frosted.floating 偏好可以迁移，影院视频磨砂仍独立保存。

`src/components/PageScrollbar.tsx` 和 `src/lib/pageScrollbar.ts` 提供不占排版宽度的右侧滚动条，原生页面滚动仍负责滚轮、触摸和键盘。浮层同步真实滚动位置与内容高度，支持拖动、轨道点击及键盘，路由和导航收放不因滚动条显隐改变可用宽度。ResizeObserver 与帧回调在卸载时清理。`scripts/page-scrollbar.test.mjs` 覆盖轨道映射、长短页面、边界和键盘操作；直接控制与偏好测试覆盖旧值迁移及两种模式的独立开关。


## 音乐页面切换性能

`src/lib/musicMetadata.ts` 复用 Asia/Tokyo 日期格式器；排序直接比较经校验的原始视频时间戳和发行日期，不生成展示文字，保持日期精度、未知值置后及同日稳定顺序。`src/data/musicMetadata.ts` 按静态条目对象缓存解析元数据和卡片日期，模块重新加载时缓存自然重建，条目 ID 或平台 ID 相同的不同对象不会串用结果。`Music.tsx` 仅筛选、排序当前平台，切回音乐页面复用日期结果；卡片节点按实际列表、路由、选中状态和回调缓存，切换滑块的尺寸测量不会重新构造全部卡片，不减少条目、不改封面和动画，不触碰播放状态或队列。`scripts/music-performance.test.mjs` 验证无格式化排序、时区和精度、缓存身份隔离及非活动平台不执行计算。


## 分类切换动画性能

`src/lib/musicCardTransition.ts` 在分类切换前、更新后只标记与当前视口相交的卡片；先批量读取矩形再设置标记，避免读写交错。`usePageTransition.ts` 沿用既有 View Transitions，只为标记卡片生成独立快照，屏幕外曲目正常保留但不创建动画图层。原有入场、退场、重排和筛选滑块动效保留；完成、快速切换、失败及卸载时清理临时标记，不触碰队列和播放器。测试见 `scripts/music-card-transition.test.mjs` 及原页面过渡测试。


## 导航直接播放控制

`src/components/PlaybackControls.tsx` 取代旧设置面板，直接接入 Header，依次提供模式、当前模式磨砂和可视化开关，后接主题、网页全屏和收起按钮。浮窗背景封面与影院视频分别保存磨砂偏好；Spotify 影院封面使用影院磨砂值。导航继续使用纯色半透明背景，视频仍覆盖整个视口。`useAudioVisualizer.ts` 只请求标签页音频，不再连接输入设备或读取设备列表，允许无播放时开启、再次点击取消、失败后重试，保留过期请求清理。

桌面导航文字与控制区采用独立间距，窄屏缩小按钮横向占位，移动端保持同一行六个控制并保留原导航高度。`scripts/playback-controls.test.mjs`、偏好测试及页面渲染测试覆盖开关顺序、模式独立性、共享状态与旧偏好迁移。


## 全屏背景尺寸稳定

首页背景以视口为参照，采用 fixed 背景、cover 等比铺满和居中裁切，不随 Hero 高度缓动重新定位。注册 `--visible-header-height` 为长度属性，仅在导航收放时插值；首页、可视化及页面留白直接读取同一高度，不再分别对视口驱动的高度执行第二次缓动。网页全屏与 F11 尺寸变化直接适配新视口，长宽比变化仍遵守等比裁切，不拉伸图片。原导航收放、减少动态效果设置和播放器保持不变。


## Spotify 右侧曲目展开

`Music.tsx` 的 Spotify 名称仅作文字展示；封面使用已有 releaseSourceId 路由在音乐主内容区右侧展开 `MusicReleaseDetail.tsx`，列表、搜索与 LP／EP 筛选继续保留，封面中央播放按钮独立播放。侧栏复用 C1 已确认曲目和 C3 专辑顺序队列，不新增播放器或资料。关闭面板恢复封面焦点，深链接和刷新仍使用原路由；`useSiteRoute.ts` 对只变更展开专辑的导航及历史返回保留滚动位置。桌面卡片保持原三列、原宽度；曲目面板在主内容区外侧的右边留白中独立展开，不挤占网格。右侧留白不足时使用右侧浮层，不改变列表原有响应式列数；保留关闭和官方链接，未知关系仍显示原有空状态。


共享选择器取消或拒绝授权（NotAllowedError／AbortError）时，`useAudioVisualizer.ts` 静默回到关闭状态，不生成“未开启音频共享”的文字或提示框，仍可再次点击重试；实际采集故障的错误处理保留。音频可视化回归测试覆盖这两种取消结果与后续重试。


## Spotify 专用悬窗顺序

`resolvePlayerPresentation` 在 App 和 PlayerDock 中统一将 Spotify 固定为浮窗，保留用户保存的 YouTube 观影偏好。Spotify 播放时模式按钮不可切换，磨砂按钮继续控制浮窗背景；不隐藏首页或把控件传送到导航。Spotify 悬窗按封面、官方 Embed、自定义控制行排列，没有重复歌名栏或无效循环按钮；关闭按钮位于下一首右侧。封面按钮承接原指针及键盘拖动、边界限制和触控处理，官方媒体 host 仍为同一节点，模式切换不重建 iframe。YouTube 的标题、循环、音量、进度条、观影布局及控制样式保持原样。

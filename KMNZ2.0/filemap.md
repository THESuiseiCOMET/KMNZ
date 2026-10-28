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
| Spotify 统一大卡片与“全部／专辑／EP”分类 | `src/pages/Music.tsx`、`src/lib/musicViews.ts`、`src/styles.css` | `spotifyCategory`、`spotifyCards`、`music-categories` |
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
| 队列状态、列表快照、专辑曲序和边界 | `src/lib/playbackQueue.ts`、`src/types/playback.ts` | `createQueueSelections`、`queueReducer`、`queueAvailability` |
| 播放器拖动边界 | `src/lib/playerControls.ts` | `clampPlayerPosition` |
| 播放器位置、尺寸 | `src/styles.css` | `.music-player-panel`、`.youtube-frame`、`.spotify-frame` |
| 页面切换、全局队列与常驻播放器 | `src/App.tsx` | `navigate`、`queue`、`currentMusic` |
| 网站名称、浏览器标签、初始主题 | `index.html` | `<title>`、`kmnzTheme` |
| 全站颜色、字体、响应式布局 | `src/styles.css` | `:root`、`html[data-theme="dark"]`、`@media` |

## 图片与字体

- `src/assets/images/`：成员图片、首页海报、Logo 等素材。
- `src/assets/fonts/`：本地字体资源。
- `src/assets/icons/`：平台与播放器 SVG 图标；Lucide 图标许可证见同目录 `LICENSE-lucide.txt`。
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
| `scripts/fetch-music-metadata.ps1` | Windows 系统网络请求；优先使用现有 PowerShell 7，遵循现有系统代理与执行策略 |
| `scripts/load-typescript.mjs` | 本地工具及测试加载 TypeScript、相对模块和 JSON；复用已有 TypeScript 依赖 |
| `scripts/official-player.test.mjs` | 官方控制器复用、真实状态、结束事件去重、切歌竞态、音量、关闭和 API 失败回退测试 |
| `scripts/playback-queue.test.mjs` | 列表／搜索快照、专辑曲序、平台来源、边界、循环、失效事件与拖动边界测试 |
| `scripts/helpers/player-harness.mjs` | 播放器钩子测试环境和官方 API 替身，不进入前端构建 |
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

`src/components/PlaybackSettings.tsx` 提供顶部设置图标打开的原生对话框，可选择浮窗／影院模式及各模式独立的封面背景磨砂开关；影院模式另有“视频磨砂”开关，独立保存，旧设置自动使用默认值。`src/lib/playbackPreferences.ts` 校验并读取本地偏好；默认浮窗＋磨砂，存储不可用时正常降级。`scripts/playback-preferences.test.mjs` 验证解析、独立开关和存储失败。

影院模式通过 `PlayerDock` 布局类把原控制按钮缩小并固定在 Logo 与右侧导航之间的空位，进度线收紧在同一导航高度内；导航保持原高度，设置图标紧邻主题按钮右侧。控制区随可用宽度调整，同一个 YouTube 媒体 host 固定在导航下方的背景层，影院 iframe 按 16:9 等比放大、居中裁切以覆盖背景区域，横屏裁切上下、竖屏裁切左右，浮窗尺寸规则保持原样；磨砂玻璃层不拦截点击，主内容层仍可浏览音乐、成员、历程和关于页面；Spotify 沿用官方封面背景与右下角原生播放条。选歌不强制改变滚动位置；只改变布局，不重新创建 iframe／控制器，不修改队列和进度。原浮窗的拖动位置保留。影院有当前播放条目时卸载首页文案与轮播，暂停时保持，关闭播放或返回浮窗后恢复。影院“视频磨砂”使用覆盖在真实 iframe 上方的 `backdrop-filter`，视频本身不复制、不抓帧；玻璃层保持透明，不再叠加灰白／黑色主题蒙层；关闭时移除模糊，视频保留原始色彩和对比度，前景页面和导航控件保持清晰。Spotify 保留平台原生进度控制，页面底部预留空间避免遮挡内容。

## YouTube 小窗进度条

`src/components/PlayerProgress.tsx` 在播放控制按钮下方、YouTube 视频上方显示细进度条，当前时间和总时长置于进度线下方两端。拖动时预览，松开后通过现有 IFrame API `seekTo` 跳转，键盘方向键／Home／End 沿用原生滑条操作；取消拖动不跳转。`useOfficialPlayer.ts` 在原音量轮询中同步真实进度，切歌／重播清除旧时间，以来源 ID 和请求序号拒绝过期跳转；不重新创建播放器，不更改播放／暂停状态或队列结束逻辑。

`playerApi.ts` 增加官方时间读取方法，`playerControls.ts` 提供时间格式化；`scripts/player-progress.test.mjs` 验证拖动、取消、键盘和未知时长，播放器测试补充跳转边界及生命周期。未获取时长或接口不可用时禁用进度条，不伪造总时长。Spotify 官方 `seek` 文档只明确支持播客，现有音乐条目继续使用原生播放条，不新增站内 Spotify 进度控制。没有新增依赖。

## 首页音频可视化

`src/components/PlaybackSettings.tsx` 提供独立的“音频可视化”开关，不依赖本站是否正在播放，也不限定浮窗／影院模式；开关开启才请求所选来源，取消、失败则恢复关闭，等待期间可取消。不再提供可视化专属全屏模式或显示位置选择。

`src/lib/audioCapture.ts` 仅将共享音轨送入本地 Web Audio 分析器，不录制、不上传、不连接扬声器而造成重复播放；拒绝整屏／窗口来源，无音轨和初始化失败时释放全部资源。`src/hooks/useAudioVisualizer.ts` 管理单次请求、过期结果、取消、结束共享与卸载清理。浏览器可能同时要求共享视频轨，它不用于抓帧或渲染；浏览器和受保护媒体是否提供有效音轨需实际确认，静音不模拟信号。

`src/lib/audioGeometry.ts` 用实际频谱生成最初较平缓的环形线条，低频控制轻微外扩；已移除交替长短尖刺及李萨如／延迟相位曲线的计算与绘制。`src/components/AudioVisualizer.tsx` 用 Canvas 绘制，复用黑白 SVG 图标，深色白图／浅色黑图，淡入至低透明度，收到信号时慢速旋转。静音不绘制假波形；限制像素密度，减少动态效果偏好下停止旋转并降低线条强度。

`Home.tsx` 保留默认 Hero 背景大图，首页显示欢迎标题、介绍和原四图轮播；开启可视化后整体隐藏这些内容并直接绘制，不使用轮播容器、边框或卡片，关闭后恢复原首页。影院播放继续沿用原视频／封面背景。`AudioVisualizer.tsx` 只负责首页绘图及尺寸变化，不再接管导航、页面焦点、滚动、Esc 或浏览器全屏，不显示等待文字。离开首页只卸载绘图，采集和音乐持续；关闭开关或输入断开才停止采集。未保存自动采集开关，不自动请求共享。

## 立体声混音／虚拟音频输入

设置新增“音频来源”和“输入设备”选择，保留标签页共享。用户明确点击“读取输入设备”后枚举音频输入；若尚无设备名称，会请求输入授权，短暂打开默认输入并在读完名称后立即释放。列表去掉默认／通讯别名及重复设备，不自动选择麦克风。用户选择明确的设备后，`audioCapture.ts` 使用 `getUserMedia` 的 exact deviceId 和 video:false；关闭回声消除、降噪及自动增益，不录制、不上传、不回放采集输入。设备缺失、权限拒绝或断开时提示重选，不降级到默认输入。

`useAudioVisualizer.ts` 管理两种采集来源及设备读取的过期结果和清理；App 传递选择，`PlaybackSettings.tsx` 显示读取、选择、连接和错误状态。只在用户操作时请求授权，关闭设置会丢弃待处理结果；播放、停播和页面导航不会主动关闭已开启的采集。输入来源不持久化设备标识。立体声混音需要 Windows 已启用并由浏览器列出；Realtek 立体声混音是否包含当前输出取决于实际声音路由，虚拟输入由对应软件决定。该路线不调用屏幕共享，但浏览器仍可能显示音频输入使用标识。测试覆盖指定设备、无视频、无默认回退、枚举权限释放、断开、重复及过期请求。

`src/lib/audioSignal.ts` 每 120ms 读取实际浮点输入，向设置显示输入电平和等待／接收／无信号／输入静音／分析暂停状态。无信号时提示检查对应声卡路由；分析暂停可通过用户点击恢复，不伪装已经收到声音。监测与采集会话同寿命，离开首页仍检测，停止或卸载释放计时器。`audioGeometry.ts` 去除输入直流偏移并采用浮点采样，避免 8 位量化丢失弱信号或静音时画出固定圆环；保留平缓环形、主题及播放控件。设备输出未改变，官方嵌入播放器仍由原控制器管理。


## 导航网页全屏按钮

`src/components/FullscreenToggle.tsx` 位于主题和设置按钮之间，两个对角直角随悬停／键盘焦点拉开间距，离开后收回；减少动态效果偏好下无过渡。点击只调用浏览器网页全屏／退出接口，不修改影院、可视化、采集或播放状态；监听 fullscreenchange 同步 Esc 与浏览器退出，快速重复点击合并，失败保持真实关闭状态并提供可访问提示。卸载可视化不退出由导航开启的原生全屏。`scripts/fullscreen-toggle.test.mjs` 覆盖进入、退出、Esc、请求拒绝、不支持、重复点击及清理。

## 独立导航隐藏

`App.tsx` 管理临时导航显隐，`Header.tsx` 在设置按钮右侧提供收起箭头；收起时导航滑出并不可聚焦，恢复箭头跟随收起按钮的实际坐标和尺寸，点击或 Esc 恢复，焦点返回收起按钮。展开向上、收起向下，共用按钮样式；鼠标距按钮 48px 内显现，远离淡出，键盘焦点和触屏保持可操作。浏览器原生全屏和设置对话框的 Esc 优先；不改变网页全屏、播放器模式、播放队列或采集会话。影院视频随导航高度铺开，顶部播放控件随导航隐藏；浮窗保持原样。`styles.css` 用同一可见导航高度变量调整首页和影院背景；首页背景采用动态视口高度并随 main 剩余空间伸展，移除已不存在的旧页脚高度预留及重复规则。导航收放时背景与可视化高度同步过渡，保留原图等比铺满和底部定位；减少动态效果偏好下关闭过渡。


`src/hooks/useNavigationControl.ts` 和 `src/lib/navigationControl.ts` 跟踪按钮、导航变换及窗口尺寸，抵消收起时的导航位移，并在窄屏下限制恢复按钮留在可见范围；靠近区域随位置变化，卸载清理鼠标、滚动及尺寸监听。`scripts/navigation-control.test.mjs` 验证坐标、边界、靠近检测与清理。

`src/assets/images/LITACLOSE.png`、`LITAOPEN.png` 使用提供的透明原图。导航收起／展开分别触发对应图片；复用同一个 `ThemePeek.tsx` 和现有动画、1 秒停留、NEROB／TINAW 主题位置偏移及播放器避让，不新增独立动画层。快速切换替换旧图片并清理旧计时器，完成后恢复原主题角色的悬停回顶行为。`scripts/theme-peek-artwork.test.mjs` 核对两张 LITA 与原角色使用相同宿主和位置。


## 地址路由与刷新恢复

`src/lib/siteRoute.ts` 定义 /KMNZ/ 下的 Hash 地址，覆盖主导航、成员详情、YouTube／Spotify、分类、搜索和发行详情；未知成员、无效来源和损坏编码安全回退。`src/hooks/useSiteRoute.ts` 管理初始化、地址规范化、前进／后退及当前标签页内的滚动位置；搜索更新替换当前历史项，页面／平台／专辑切换新增历史项，详情返回优先使用原列表历史。`Music.tsx` 通过可选路由属性接入，单独渲染仍保留兼容行为。页面切换不卸载全站播放器。

`src/lib/playbackSession.ts` 和 `src/hooks/usePlaybackPersistence.ts` 将来源 ID、队列、模式、真实进度及播放意图保存在 sessionStorage；刷新读取时依据当前音乐库重新校验来源和专辑曲序，不信任缓存中的关系字段。关闭播放器清除记录，过期回调不覆盖新曲，损坏数据或存储受限时正常降级。`useOfficialPlayer.ts` 在原轮询／官方事件中发送 `PlayerCheckpoint`；YouTube 使用官方 loadVideoById／cueVideoById 的 startSeconds 恢复播放或暂停，不重建额外 iframe。恢复等待期间不以初始零秒覆盖已保存的进度。Spotify 只恢复当前选择的曲目／专辑入口和队列，不调用仅明确支持播客的 seek；音乐秒数和原生专辑内部曲目位置无法保证恢复。自动播放被拦截时保持暂停，沿用原播放按钮继续。没有持久化或自动重新申请音频可视化采集权限。

`scripts/site-route.test.mjs` 验证路由、查询编码、历史、专辑返回和滚动；`scripts/playback-session.test.mjs` 验证队列／专辑恢复、暂停、无效数据和存储故障；`scripts/playback-persistence.test.mjs` 验证切歌、页面退出保存及关闭后的过期回调。播放器测试覆盖恢复请求、进度、自动播放受阻及同一控制器复用。

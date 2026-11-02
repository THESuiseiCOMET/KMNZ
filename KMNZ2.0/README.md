# KMNZ 2.0

> KMNZ 音乐与资料索引站 · React + TypeScript + Vite

KMNZ 2.0 是本仓库当前开发、构建及发布的网站。项目围绕 KMNZ 的不同时期资料、音乐作品与官方媒体来源进行整理，提供双时代 SHOWCASE 开场、音乐库、播放队列、官方嵌入播放器、歌曲／专辑关联、搜索筛选和部分可视化交互。

**在线网站：** https://thesuiseicomet.github.io/KMNZ/  
**仓库：** https://github.com/THESuiseiCOMET/KMNZ  
**旧版归档：** [KMNZ1.0](../KMNZ1.0/)  
**文件位置速查：** [filemap.md](filemap.md)  
**音乐发现与审核细则：** [docs/music-discovery.md](docs/music-discovery.md)

本站以资料整理和平台索引为目的。歌曲、视频与流媒体内容由其原有平台提供；本站不托管或提取第三方音视频文件。本 README 依据 2026-11-02 的仓库源码编写；网站内容、收录数量及功能可能随提交更新。

## 目录

1. [运行与开发](#运行与开发)
2. [现有功能与限制](#现有功能与限制)
3. [页面入口和路由](#页面入口和路由)
4. [项目结构与核心模块](#项目结构与核心模块)
5. [音乐数据库设计](#音乐数据库设计)
6. [如何添加或修订音乐资料](#如何添加或修订音乐资料)
7. [播放器架构与状态保存](#播放器架构与状态保存)
8. [SHOWCASE 和动画](#showcase-和动画)
9. [元数据、发现与人工审核](#元数据发现与人工审核)
10. [测试与质量检查](#测试与质量检查)
11. [GitHub Pages 部署](#github-pages-部署)
12. [环境变量与安全边界](#环境变量与安全边界)
13. [已知边界和后续维护](#已知边界和后续维护)

## 运行与开发

在仓库的 `KMNZ2.0/` 目录中运行命令。推荐 **Node.js 22**：GitHub Actions 使用 Node 22，项目依赖 Vite 8、React 19 和 TypeScript 6。项目锁定文件为 `package-lock.json`。

~~~bash
cd KMNZ2.0
npm ci
npm run dev
~~~

浏览器打开 Vite 在终端输出的本地地址。需要固定端口时：

~~~bash
npm run dev -- --port 5180 --strictPort
~~~

生产构建与本地预览：

~~~bash
npm run build
npm run preview
~~~

`npm run build` 实际执行 `tsc -b && vite build`，生成 `dist/`。`dist/` 和 `node_modules/` 在 Git 中被忽略，不应提交。`package.json` 当前只定义 `dev`、`build`、`preview` 三个 npm 脚本；**没有 `npm test` 脚本**，测试命令见后文。

Windows PowerShell 使用相同的 npm 命令即可；如果系统执行策略阻止 `npm.ps1`，可使用 `npm.cmd`。

## 现有功能与限制

| 模块 | 已有实现 | 边界 |
| --- | --- | --- |
| SHOWCASE | LITA / LIZ 经典时期与 LITA / NERO / TINA 新时期海报、撕纸、贴纸、ENTER、返回入口 | 视觉效果依赖浏览器对 SVG / CSS 的支持 |
| SPRAY REVEAL | 进入／返回时的喷漆罐、笔触遮罩和转场状态机 | 动画目标时长 2 秒；减少动态效果时使用简短流程 |
| 导航和主题 | MV、PLAYLIST、HISTORY、ABOUT，深浅主题、导航隐藏、全屏、界面过渡 | MV 入口受当前播放内容或音频可视化能力限制 |
| 音乐目录 | YouTube / Spotify 分区，文本搜索，原创／翻唱／歌回、成员与发行分类筛选 | 仅显示已在静态数据中收录且符合展示规则的条目 |
| 媒体播放器 | 官方 YouTube / Spotify 嵌入、全站播放队列、浮窗和部分影院控制、播放状态观察 | 第三方 API／浏览器权限／地区／登录限制可能影响能力 |
| 媒体资料 | 曲目、发行与来源关联，封面、日期、人工修订、Bilibili 外部链接 | Bilibili 目前是**链接索引**，不是内置 Bilibili 播放器 |
| 音频可视化 | 在兼容浏览器中申请标签页音频共享，绘制 Canvas 可视化和节奏估算 | 需要用户授权；不保证手机和所有浏览器支持；不是直接提取嵌入音频 |
| 历程与关于 | 历史时间线、官方／成员相关链接、社区二维码 | 时间线内容更新仍依赖人工核对 |
| 成员资料 | 具备成员数据、列表组件和详情组件；详情 Hash 路由存在 | 当前 `App.tsx` **没有挂载 `Members.tsx` 列表**；`#/members` 主要用于展示 SHOWCASE，而非完整成员列表页 |

**不包含的功能：** KMNZ 2.0 没有旧版的登录、注册、密码重置与用户中心。也没有可保证手机锁屏后台连续播放的原生播放器或 PWA 保活能力。

## 页面入口和路由

网站是 **单入口 React 应用**，不是根目录下的多 HTML 网站。`index.html` 只负责 Vite 入口、`#root` 容器和初始主题；`src/main.tsx` 将 `App.tsx` 渲染到页面。

当前使用 **Hash 路由**（不是 React Router）。实现位置为 `src/lib/siteRoute.ts`、`src/hooks/useSiteRoute.ts`。

| 地址（接在 `/KMNZ/` 后） | 用途 |
| --- | --- |
| `#/` | 首页状态：视会话记录展示 SHOWCASE 或进入音乐控制台 |
| `#/music/youtube` | YouTube 音乐目录 |
| `#/music/spotify` | Spotify 音乐目录 |
| `#/music/youtube?category=cover&member=TINA` | 翻唱分类与成员筛选示例 |
| `#/music/youtube?category=stream&member=TINA` | 歌回分类示例 |
| `#/music/youtube?category=original&group=lita-liz` | 经典时期原创分组示例 |
| `#/music/spotify?category=albums` | Spotify 专辑筛选 |
| `#/music/spotify/release/<来源ID>` | 已核实 Spotify 发行来源的曲目详情 |
| `#/history`、`#/about` | 历程／关于 |
| `#/mv` | MV／可视化视图；没有可用播放或可视化会回到音乐页 |
| `#/members` | 当前触发 SHOWCASE 的历史路由行为 |
| `#/members/1` ～ `#/members/4` | 成员详情页，分别对应当前 `members.ts` 中的四条记录 |

音乐路由还可携带 `q`（搜索词）、`category`、`group`、`member` 等参数。筛选和专辑详情由 `siteRouteHash`、`parseSiteRoute` 统一编码与解析，浏览器前进／后退、滚动位置和部分浏览上下文由 `useSiteRoute` 及 sessionStorage 管理。

注意：`src/pages/Home.tsx` 和 `src/pages/Members.tsx` 虽然存在，当前主流程并未像普通导航页那样直接渲染它们。新增菜单或重构主页时，应先对照 `App.tsx` 的条件渲染、`Header.tsx` 的 navigation 配置及现有路由测试。

## 项目结构与核心模块

~~~text
KMNZ2.0/
├── index.html                Vite 的 HTML 入口（不要删除）
├── package.json              开发依赖及 dev / build / preview
├── package-lock.json         依赖锁定
├── vite.config.ts            Vite 与部署 base 路径
├── tsconfig*.json            严格 TypeScript 设置
├── README.md                 当前说明
├── filemap.md                组件、样式和数据路径详细速查
├── docs/
│   └── music-discovery.md    官方来源发现、审核和边界
├── music-discovery/
│   ├── official-sources.json 官方来源白名单
│   └── candidates.json       待审核候选（不会直接上线）
├── public/                   直接公开的 favicon 等文件
├── scripts/                  数据更新、发现、发布审核及测试
└── src/
    ├── main.tsx              React 启动
    ├── App.tsx               应用顶层状态、路由和播放器
    ├── components/           导航、SHOWCASE、播放器、效果组件
    ├── pages/                音乐、历史、关于、成员相关页面
    ├── hooks/                React 状态与生命周期
    ├── lib/                  纯逻辑、校验、路由与播放器适配
    ├── data/                 资料、音乐库、元数据
    │   └── music/
    │       ├── songs.json
    │       ├── releases.json
    │       └── sources.json
    ├── types/                音乐和播放模型
    ├── assets/               当前页面所需图像、SVG 和字体
    ├── styles.css            全站主样式
    ├── showcase.css          开场拼贴
    └── spray-reveal.css      喷漆转场
~~~

重点文件及职责：

| 功能 | 文件 |
| --- | --- |
| 应用和常驻播放器关系 | `src/App.tsx` |
| 页面路由、筛选链接、音乐浏览恢复 | `src/lib/siteRoute.ts`、`src/hooks/useSiteRoute.ts` |
| 页面间动画与滚动 | `src/hooks/usePageTransition.ts`、`src/components/PageScrollbar.tsx` |
| 导航、主题、全屏 | `src/components/Header.tsx`、`FullscreenToggle.tsx`、`ThemePeek.tsx` |
| SHOWCASE 视觉、状态与转场 | `src/components/Showcase.tsx`、`src/hooks/useShowcase.ts`、`src/lib/showcase.ts` |
| 喷漆罐、轨迹和覆盖遮罩 | `src/components/SprayReveal.tsx`、`src/lib/sprayReveal.ts` |
| 音乐页面、分类和专辑内容 | `src/pages/Music.tsx`、`src/lib/musicViews.ts`、`src/components/MusicReleaseDetail.tsx` |
| 音乐库验证、平台来源映射 | `src/lib/musicLibrary.ts`、`src/types/music.ts` |
| 官方媒体播放器 | `src/components/PlayerDock.tsx`、`src/hooks/useOfficialPlayer.ts`、`src/lib/playerApi.ts` |
| 队列、播放状态、会话存储 | `src/lib/playbackQueue.ts`、`src/lib/playbackSession.ts`、`src/hooks/usePlaybackPersistence.ts` |
| 播放显示模式与控制 | `src/lib/playbackPreferences.ts`、`src/components/PlaybackControls.tsx` |
| 音频捕获与可视化 | `src/lib/audioCapture.ts`、`src/hooks/useAudioVisualizer.ts`、`src/components/AudioVisualizer.tsx` |
| 自动与人工元数据合并 | `src/data/musicMetadata.ts`、`src/lib/musicMetadata.ts` |
| 已播放歌曲在目录中的定位 | `src/lib/musicLocation.ts` |
| 成员、历史事件 | `src/data/members.ts`、`src/data/timeline.ts` |

更精确的样式选择器、改动位置、图片及交互参数请查阅 [filemap.md](filemap.md)，避免把完整开发索引重复维护在 README 中。

### React 数据与状态流

~~~text
songs / releases / sources JSON
               │
               ▼
      parseMusicLibrary（校验）
               │
               ├── toMusicCatalog → Music 页面 / 搜索 / 卡片 / 筛选
               │
               ├── createMusicViews → 专辑曲序和展示模型
               │
               └── createQueueSelections → 播放队列
                                              │
                                              ▼
                                     App（queueReducer）
                                              │
                                              ▼
                                     PlayerDock
                                              │
                                useOfficialPlayer / iframe APIs
                                              │
                                  onObservation / onCheckpoint
                                              │
                                  队列同步 / 会话持久化
~~~

`App.tsx` 是连接页面、播放队列、SHOWCASE、视觉层和导航的顶层编排组件。不要为了添加条目而在此文件里硬编码歌曲，也不要在每个路由下复制播放器。

## 音乐数据库设计

本项目数据模型定义在 `src/types/music.ts`，入口在 `src/data/musicLibrary.ts`。

三个正式数据文件有不同含义：

| 文件 | 记录对象 | 主要关系 |
| --- | --- | --- |
| `songs.json` | 歌曲／录音版本，具有稳定 `songId`、标题、艺人、版本类型 | 被发行曲序及平台来源引用 |
| `releases.json` | 专辑、EP、单曲发行、精选集等 | `tracks[]` 按碟号、曲号引用歌曲和来源 |
| `sources.json` | YouTube 视频、Spotify track／album 等**具体平台条目** | `target` 指向歌曲或发行；包含平台 ID 和展示信息 |

**歌曲 ≠ 平台视频 ≠ 专辑。** 同一首歌曲可能有多个平台来源、多个演出或版本；一个 Spotify 专辑来源可能对应包含多首歌的发行记录。内部 ID 用于稳定关联，不应因为封面、标题或列表顺序变化而随意修改。

2026-11-02 数据快照（后续变动以 JSON 为准）：

| 数据 | 数量 |
| --- | ---: |
| 歌曲／录音版本 | 384 |
| 发行记录 | 36 |
| YouTube `mv` 来源 | 308 |
| Spotify `track` 来源 | 123 |
| Spotify `album` 来源 | 36 |
| 合计平台来源 | 467 |
| YouTube 原创／翻唱／歌回分类 | 81 / 212 / 15 |
| 附有 Bilibili 外部链接的条目 | 16 |
| `listed: false` 的隐藏来源 | 12 |

### 主要字段和校验规则

- `Song.version.kind` 支持 `unspecified`、`original`、`remix`、`live`、`remaster`、`other`，可用 `relatedSongId` 表达录音版本关系。
- `MusicRelease.kind` 支持 `album`、`ep`、`single`、`compilation`、`unknown`；`tracklistStatus` 表示 `unknown`、`partial` 或 `complete`，曲序通过 `discNumber`、`trackNumber` 与 `sourceIds` 关联。
- `MusicSource` 的 `platform` 目前只支持 `youtube`、`spotify`；`kind` 分别为 YouTube `mv`、Spotify `track` 或 `album`。`id` 为项目内部来源 ID；`platformId` 是视频／曲目／专辑在原平台的 ID。
- YouTube 的 `classification.contentType` 为 `original`、`cover`、`stream`；成员、原创组别及 `evidenceUrls` 应基于人工核实的信息填写。
- `listed: false` 表示该来源不在常规列表显示，但仍保留关联与去重约束；不应为了隐藏条目直接删除其 ID。
- YouTube 来源可附 `bilibiliUrl`；系统会验证它是否为符合规则的 HTTPS Bilibili 视频地址。此字段仅用于外链，不参与内部 YouTube 播放。
- 数据必须通过 `parseMusicLibrary` 检查 ID 唯一性、平台 ID 格式、重复来源、发行曲序和关联有效性。不要跳过校验向页面塞入临时数据。

### 一条已收录条目的关联示例

~~~text
songs.json
  song-wave (WAVE)
       ▲
       │ target.songId
       │
sources.json
  yt-wave
    platform: youtube
    kind: mv
    platformId: MehG9Ms8ygU
    externalUrl: https://www.youtube.com/watch?v=MehG9Ms8ygU
~~~

这是现有数据中的实际 ID，仅展示关系；完整对象以 JSON 为准。

## 如何添加或修订音乐资料

推荐采用以下顺序，尤其适合你批量整理 YouTube 歌单、KMNZ 歌回与 Bilibili 镜像链接的场景。

1. **核实链接及原平台身份。** YouTube 取稳定的 11 位视频 ID；Spotify 区分 track 与 album；Bilibili 只写入对应 YouTube 来源的 `bilibiliUrl`。不要按两个列表的行号直接推断作品对应关系。
2. **查重。** 先检查 `sources.json` 是否已有相同平台 ID（包括 `listed: false`）；再检查 `songs.json` 中是否已有同一录音版本。
3. **判断作品身份。** 新录音版本才考虑新增 Song；已有版本优先引用稳定的现有 `songId`。原唱、翻唱、合作、现场演出不能仅凭标题自动推断。
4. **新增或更新 Source。** 填写 `id`、`platform`、`kind`、`platformId`、`externalUrl`、`display` 与 `target`；YouTube 分类有依据时补齐 `classification` 和证据链接。
5. **确认发行关系。** 如果来源属于某张发行记录，在 `releases.json` 中补充曲序及 `sourceIds`。尚未确认完整曲目时不要标为 `complete`。
6. **元数据单独维护。** 自动来源数据放在 `music-metadata.json`；人工确认或纠正的封面、日期放在 `music-metadata.overrides.json`。不得伪造发布时间、发行日期或高清封面。
7. **运行离线校验、相关测试与生产构建。** 检查搜索、分类、重复来源、排序、播放跳转和发行详情。
8. **通过 PR 审核后合并。** 合并到发布分支才会触发正式站点构建；只写候选文件不会新增网站条目。

对大量歌回直播的整理建议先区分“**直播视频本身**”与“**直播中演唱的单独歌曲**”。当前 `sources.json` 的 YouTube `mv` 可以分类为 `stream`，但没有独立的“某场歌回内每首曲目的时间戳”实体结构；如果要做完整歌单／章节索引，需要另行设计数据模型，不应将同一直播 URL 随意复制成多条歌曲来源。

## 播放器架构与状态保存

播放器不是每次打开音乐页面才临时创建的独立页面组件。`App.tsx` 持有队列、当前来源、显示偏好和恢复状态，并在应用根层按当前媒体选择挂载 `PlayerDock`。

### 播放来源和控件

- **YouTube：** 通过官方 IFrame Player API 观察就绪、播放状态、时长和进度；支持在可用范围内的播放／暂停、跳转、音量、上一首／下一首及 `repeat-one`。
- **Spotify：** 通过 Spotify iFrame API 和官方 embed 控制器；播放能力、加载新 URI、实际曲目状态等取决于平台返回的 API 能力。当前显示模式固定为浮窗，不能假定拥有与 YouTube 相同的进度控制或整首连续播放权限。
- **播放队列：** `createQueueSelections` 从列表或发行曲序构建队列；`queueReducer` 维护 `requestId`、状态、循环模式、结束事件和受限的前后切换。只有允许控制的来源才启用相应操作。
- **显示：** 浮窗与影院模式由 `PlaybackPreferences` 决定，配合 `PlaybackBackdrop`、导航栏控件和视频磨砂等效果；Spotify 固定浮窗。关闭播放器会结束当前嵌入会话。

### 状态持久化

| 用途 | 主要机制 |
| --- | --- |
| 播放队列、选中项、模式、部分进度 | `sessionStorage`：`kmnzPlaybackSession` |
| 播放源浏览位置和筛选上下文 | `sessionStorage`：`kmnzPlaylist:v1`、`kmnzPlaybackBrowse:v1` |
| 主题、显示模式、音量偏好 | `localStorage` |
| SHOWCASE 已进入标记 | `sessionStorage`：`kmnzShowcaseEntered:v1` |
| 页面滚动恢复 | `useSiteRoute` 中的 sessionStorage 路由记录 |

`usePlaybackPersistence` 在队列变化及页面生命周期事件中保存播放检查点。恢复逻辑会校验数据和当前曲目；YouTube 可在支持时使用已有秒数恢复，Spotify 不承诺精确进度恢复。浏览器自动播放限制可能要求用户再次点击播放。

**重要：** 这是一套“尽量保留同一页面内播放器与恢复状态”的机制，不是绕过 iOS / Android 后台冻结、Spotify 或 YouTube 付费／播放策略的保活技术。不要使用隐藏 iframe、伪造用户交互或静音循环规避平台限制。

## SHOWCASE 和动画

SHOWCASE 是视觉入口，正式应用内容称为 CONSOLE。当前主要依赖：

- `src/components/Showcase.tsx`：双时代图片、裁切路径、撕纸纹理、Logo 贴纸、ENTER、LITA／NERO／TINA 装饰头像贴纸。
- `src/lib/showcase.ts`：`showcase` → `entering` → `console` → `returning` 状态机、会话规则与动画时长。
- `src/hooks/useShowcase.ts`：转场触发、计时、焦点管理、减少动态效果与重复操作保护。
- `src/components/SprayReveal.tsx`、`src/lib/sprayReveal.ts`：按布局计算喷漆轨迹，驱动喷漆罐、SVG 遮罩和界面揭示。

当前开场素材实际引用为：

- 经典时代：`src/assets/showcase/LITALIZ.jpg`
- 新时代：`src/assets/images/kmnz2.avif`
- Logo：`src/assets/images/KMNZLOGOW.webp` 与 `src/assets/showcase/ink-sticker.svg`
- 贴纸：`src/assets/showcase/LITA-stick.png`、`NERO-stick.png`、`TINA-stick.png`
- 喷漆罐：`src/assets/showcase/spray-can.svg`

当前状态机目标时长 **2000 ms**，`prefers-reduced-motion` 时使用约 **180 ms** 的缩短流程。请区分“设计目标”和“实际不同浏览器的表现”；动画相关修改必须测试进入、返回、深链接、移动视口、媒体播放期间的组件挂载与焦点恢复。

喷漆动画只是原有 UI 的展示效果，**不得为动画复制一套导航或播放器，更不能在进入 CONSOLE 时重建正在播放的第三方 iframe**。

## 元数据、发现与人工审核

### 静态元数据层

- `src/data/music-metadata.json`：自动获取或缓存的平台元数据。
- `src/data/music-metadata.overrides.json`：人工核实的修订，覆盖同字段自动值。
- `src/lib/musicMetadata.ts`：日期有效性、封面来源与大小、校验状态、东京时间显示及排序。
- `src/data/musicMetadata.ts`：将自动值与人工修订合并供页面使用。
- `scripts/update-music-metadata.mjs`：离线校验、预览、按需写入自动元数据；不会覆盖人工 overrides。

离线检查：

~~~bash
node scripts/update-music-metadata.mjs --check
~~~

查看参数和非写入预览：

~~~bash
node scripts/update-music-metadata.mjs --help
node scripts/update-music-metadata.mjs
~~~

需要显式 `--write` 才会写入自动元数据；`--refresh` 可绕过正常缓存策略。联网更新可选使用 `YOUTUBE_API_KEY` 和 `SPOTIFY_ACCESS_TOKEN`，没有权限时不能把失败或缺失信息当作已验证。

**不要把 YouTube 视频的 `publishedAt` 当成音乐发行日期。** Spotify 的 `releaseDate` 也应保留平台提供的精度（年／月／日）。

### D1：音乐候选发现

配置文件 `music-discovery/official-sources.json` 当前只列出 KMNZ 官方 YouTube 频道白名单。发现器调用 YouTube Data API，读取官方 uploads 列表、检查视频来源／状态／可嵌入性并按平台分类筛选。当前默认最多 **2 页／频道**（最多约 100 条最近上传项目），不是全历史扫描。

- Spotify **自动发现尚未实现**。
- 发现结果只进入 `music-discovery/candidates.json`，前端不读取该文件。
- 数据不会自动生成 Song、Release、跨平台关联或歌回曲目时间戳。
- `review.status` 的人工审核状态须保留；未确认条目不能自动写入正式音乐库。
- 审核使用 `automation/music-discovery` 分支，生成草稿 PR；需要人类校验、补齐正式 JSON 后手动合并。

本地离线检查：

~~~bash
node scripts/discover-music.mjs --check
~~~

本地候选预览（需要相应 API 权限才会成功获取新候选）：

~~~bash
node scripts/discover-music.mjs
~~~

`node scripts/discover-music.mjs --write` **只写候选文件**，不改线上音乐库。`scripts/publish-music-review.mjs --publish` 受运行环境校验限制，设计为在指定 GitHub Actions 发布分支执行，不是日常本地发布命令。

完整设置、API 密钥、配额、异常恢复与人工审核方法请阅读 **[docs/music-discovery.md](docs/music-discovery.md)**。

## 测试与质量检查

当前 `scripts/` 下有 **36 个 `*.test.mjs` 测试文件**，覆盖音乐数据模型、元数据、筛选和视图、队列和播放器、路由、SHOWCASE、喷漆动画、主题、可视化、导航等。

在 `KMNZ2.0/` 执行：

~~~bash
node --test scripts/*.test.mjs
node scripts/update-music-metadata.mjs --check
node scripts/discover-music.mjs --check
npm run build
~~~

注意：**36 是测试文件数量，不是通过用例数。** 本 README 的代码审阅不等同于实际执行了这些测试；修改后需要以本机或 Actions 的真实输出为准。涉及 Spotify、YouTube 的真实联网播放、浏览器视觉效果、移动端后台行为仍需单独做手动验收。

推荐重点回归场景：

1. 新增视频后搜索、日期排序、分类和成员过滤正确。
2. Spotify 发行详情、曲序及关联的播放队列正确。
3. SHOWCASE → CONSOLE → SHOWCASE 往返、深链接、浏览器前进／后退正常。
4. Spotify／YouTube 正在播放时切换路由、切换展示模式及执行喷漆转场，不出现无故重载。
5. 桌面和移动视口、深浅主题、键盘焦点与 `prefers-reduced-motion` 下布局正常。

## GitHub Pages 部署

当前线上站点使用仓库的 **GitHub Actions** 发布，不从仓库根目录的 HTML 文件直接部署。

工作流：`../.github/workflows/deploy-pages.yml`。

~~~text
push 到默认发布分支「分支」
   ↓
actions/checkout + setup-node@v4（Node 22）
   ↓
KMNZ2.0/ 中 npm ci
   ↓
VITE_BASE_PATH=/KMNZ/ npm run build
   ↓
上传 KMNZ2.0/dist/
   ↓
actions/deploy-pages → /KMNZ/
~~~

`vite.config.ts` 使用 `process.env.VITE_BASE_PATH || '/'` 选择静态资源基础路径。在其他根域名部署时通常使用 `/`；GitHub Pages 项目路径必须是 `/KMNZ/`。

在 Windows PowerShell 手动检验 GitHub Pages 的构建路径：

~~~powershell
cd KMNZ2.0
$env:VITE_BASE_PATH = '/KMNZ/'
npm.cmd run build
~~~

在 Bash：

~~~bash
cd KMNZ2.0
VITE_BASE_PATH=/KMNZ/ npm run build
~~~

可以在 GitHub 仓库的 **Actions** 中查看 `Deploy KMNZ 2.0 to GitHub Pages` 运行结果。本仓库还有 `Discover KMNZ music (review only)` 手动审核工作流；它不是 Pages 部署的替代品。

**不要把 `KMNZ2.0/index.html` 与仓库根目录旧版 `index.html` 混淆。** 当前 2.0 使用前者；`KMNZ1.0/` 保存完整的旧版 HTML 站点归档。若仍需兼容 `/KMNZ/about.html` 等历史链接，应单独规划跳转页，不能假设新 Hash 路由会自动兼容。

## 环境变量与安全边界

| 变量或 Secret | 使用场景 | 必需性 |
| --- | --- | --- |
| `VITE_BASE_PATH` | Vite 构建静态资源的部署前缀 | GitHub Pages 构建时设为 `/KMNZ/` |
| `YOUTUBE_API_KEY` | YouTube 元数据更新、D1 官方候选发现 | 仅相关联网任务需要 |
| `SPOTIFY_ACCESS_TOKEN` | Spotify Web API 元数据（例如发行日期） | 可选，仅相关联网任务 |
| `GITHUB_TOKEN` | GitHub Actions 审核 PR 发布器 | Actions 提供，不需放入前端 |

日常访问网站和执行普通前端生产构建不需要 YouTube/Spotify 的私人 API Key。**严禁**将秘钥写入 `src/`、任何提交的 JSON、网页 HTML、公开 README，或名称为 `VITE_*` 的客户端变量。`VITE_*` 构建变量可能暴露在前端产物中。

当前项目只包含前端及 GitHub Actions 数据审核工作流，没有独立数据库服务器。`localStorage`、`sessionStorage` 仅用于本地界面设置和会话状态，不是用户账户系统。

## 已知边界和后续维护

以下内容属于依据当前源码观察到的维护点，不等同于已验证的线上故障：

- **成员视图：** `Members.tsx` 与 `Home.tsx` 保留在源码中，但当前 `App.tsx` 的主显示逻辑没有直接渲染它们；若未来增加成员主页，需明确路由意图和 SHOWCASE 的关系。
- **喷漆时间线：** `src/lib/sprayReveal.ts` 仍定义单独的 player 时间段（约 1710–1870 ms）。如果未来再次发现播放器晚于其他 UI 出现，应对照运行画面和代码核对，不要仅根据此前修复说明推断问题已彻底消失。
- **旧素材与备份：** `src/assets/images/` 同时保留若干旧 JPG／PNG 和当前 AVIF 版本；`src/data/music-metadata.overrides.json.backup-1793361772467` 被 Git 跟踪。清理前先检查引用、历史用途和备份必要性。
- **样式规模：** `src/styles.css` 较大；后续可按播放器、导航、音乐页等模块评估分拆，但必须保留样式优先级、动画和响应式行为。
- **平台后台限制：** 手机锁屏播放、Spotify 全曲、YouTube 嵌入可用性、自动播放均不能由网站保证；目前没有 PWA 安装与 Service Worker 后台播放机制。
- **数据完整度：** 现有音乐库属于人工维护的索引，不保证覆盖 KMNZ 全部历史上传、镜像或已失效内容；D1 发现器范围有限且候选必须经过审核。
- **测试边界：** 仓库测试脚本与生产构建不能替代真实浏览器视觉验收和第三方播放器网络测试。

### 维护原则

- 新增音乐：优先更新 **数据文件**，不修改播放器业务逻辑。
- 修改 UI：优先查 [filemap.md](filemap.md)，定位真实渲染组件和样式。
- 修改播放：保持官方 iframe 实例生命周期，检查路由、队列、播放状态和平台权限。
- 修改 SHOWCASE：保留双向状态机、焦点管理、减少动态效果支持及现有素材，不直接重做已完成的静态海报。
- 自动发现：候选与正式音乐数据分离，先人工核实，再提交 PR。
- 发布：测试和构建通过后合并到 `分支`，由 Actions 部署，不手动把 `dist/` 提交进仓库。

---

此文档聚焦 **KMNZ 2.0 的真实实现与维护方法**；涉及某个具体 CSS 选择器、文件修改点或详尽历史行为，请继续参阅 [filemap.md](filemap.md)。
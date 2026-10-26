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
| YouTube 卡片封面地址 | `src/pages/Music.tsx` | `mqdefault.jpg`（修复黑边后使用的格式） |
| 音乐卡片大小、封面裁剪和间距 | `src/styles.css` | `.music-card`、`.music-art img`、`.music-grid` |
| 歌曲名称、平台 ID、链接、年份 | `src/data/music.ts` | `musicCatalog` |
| 全站常驻播放器内容 | `src/components/PlayerDock.tsx` | `PlayerDock` |
| 播放器位置、尺寸 | `src/styles.css` | `.music-player-panel`、`.youtube-frame`、`.spotify-frame` |
| 页面切换、全局播放器状态、页脚 | `src/App.tsx` | `navigate`、`currentMusic`、`site-footer` |
| 网站名称、浏览器标签、初始主题 | `index.html` | `<title>`、`kmnzTheme` |
| 全站颜色、字体、响应式布局 | `src/styles.css` | `:root`、`html[data-theme="dark"]`、`@media` |

## 图片与字体

- `src/assets/images/`：成员图片、首页海报、Logo 等素材。
- `src/assets/fonts/`：本地字体资源。
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
| `../.github/workflows/deploy-pages.yml` | GitHub Pages 自动构建和部署（此路径相对于 `KMNZ2.0/`） |
| `../KMNZ1.0/` | 原 KMNZ 1.0 备份，不是当前 React 网站 |

## 本地预览与上线

在 `D:\2\KMNZ\KMNZ2.0` 运行 `npm.cmd run dev`，保存 `.tsx` / `.css` 文件后，本地预览通常会热更新。

GitHub Pages 不会同步本地未提交修改。确认效果后，在仓库根目录 `D:\2\KMNZ` 提交并推送到 `分支`，部署工作流会自动构建和发布。

> 提醒：`src/styles.css` 同时包含多个页面的样式。修改时先定位目标选择器，避免影响其他组件。

# KMNZ Archive

KMNZ 音乐与成员资料站，正在从原生 HTML/CSS/JavaScript 重构为 React + TypeScript + Vite。

## 版本

| 版本 | 目录 | 状态 |
| --- | --- | --- |
| 1.0 | [KMNZ1.0/](KMNZ1.0/) | 旧版完整归档 |
| 2.0 | [KMNZ2.0/](KMNZ2.0/) | 新版开发中 |
| 当前线上版 | 仓库根目录 | 暂时继续由 GitHub Pages 提供 |

**迁移期间不删除根目录的旧站**，以免破坏现有 GitHub Pages 地址。

线上网站：https://thesuiseicomet.github.io/KMNZ/

## KMNZ 2.0 技术方向

- React + TypeScript + Vite
- 全站常驻的音乐播放器（待开发）
- 通过 YouTube / Spotify **官方嵌入方式**接入音乐（待开发，遵循平台播放限制）
- 成员、历程、音乐资料检索（待开发）
- 无登录、注册、密码重置与用户中心
- 计划同时部署到 GitHub Pages 和 Cloudflare Pages

本次仓库整理只完成目录归档与 2.0 工程初始化，播放器和正式发布尚未完成。

## 本地运行 2.0

安装 Node.js（推荐较新的 LTS，且满足 Vite 要求）：

```bash
cd KMNZ2.0
npm install
npm run dev
```

构建与预览：

```bash
npm run build
npm run preview
```

## Cloudflare Pages（准备就绪后）

- Git 仓库：`THESuiseiCOMET/KMNZ`
- Production branch：`分支`（当前默认分支）
- Root directory：`KMNZ2.0`
- Build command：`npm run build`
- Output directory：`dist`

2.0 构建默认为网站根路径 `/`；将来发布到 GitHub Pages 的 `/KMNZ/` 时，需设置相应 Vite `base` 并处理前端路由。

## 1.0 安全提醒

归档版保留了原有的演示性质账号功能，包括将密码存储在浏览器 localStorage 中的不安全逻辑。**请勿在旧版注册页面使用真实密码，也不要将其作为真实账号系统使用。** 2.0 不迁移这些功能。

## 非官方声明

本项目为非官方粉丝资料站，与 KMNZ 官方无隶属关系。相关音乐、人物与图片内容的权利归其合法权利人所有。
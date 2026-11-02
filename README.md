# KMNZ

KMNZ 资料与音乐索引网站，使用 React + TypeScript + Vite 构建当前站点。

**网站：** https://thesuiseicomet.github.io/KMNZ/

## 项目结构

| 路径 | 用途 |
| --- | --- |
| [KMNZ2.0/](KMNZ2.0/) | **当前开发及 GitHub Pages 部署版本**：SHOWCASE、音乐目录、成员资料和播放器 |
| [KMNZ1.0/](KMNZ1.0/) | 早期 HTML / CSS / JavaScript 网站的完整归档，不参与当前部署 |
| [.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml) | 构建和发布 GitHub Pages |
| [.github/workflows/discover-music.yml](.github/workflows/discover-music.yml) | 音乐候选发现与审核流程（手动触发） |

当前 GitHub Pages 使用 **GitHub Actions**：在 `KMNZ2.0/` 运行构建，设置 `VITE_BASE_PATH=/KMNZ/`，仅发布 `KMNZ2.0/dist/`。仓库根目录不再承担旧版静态页面的发布入口。

旧版网站保存在 `KMNZ1.0/`，供查阅历史实现；旧的 `/KMNZ/about.html` 等 HTML 页面地址不属于当前 2.0 的路由。

## 本地启动

需要 Node.js 22（与部署工作流一致）：

```bash
cd KMNZ2.0
npm ci
npm run dev
```

生产构建与预览：

```bash
npm run build
npm run preview
```

## 文档

- [KMNZ 2.0 说明与开发流程](KMNZ2.0/README.md)
- [代码文件位置速查](KMNZ2.0/filemap.md)
- [音乐发现与审核说明](KMNZ2.0/docs/music-discovery.md)

音乐通过 YouTube、Spotify 官方嵌入及相关平台链接访问，本站的曲目数据用于资料索引，不托管音频文件。

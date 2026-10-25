# KMNZ 2.0 — 开发中

这是一个 React + TypeScript + Vite 的初始工程。目前提供响应式基础界面和全站常驻的 **播放器占位组件**；尚未连接 YouTube 或 Spotify。导航目前仅用于切换内容占位区，后续会添加实际页面路由与资料数据。

## 本地启动

```bash
npm install
npm run dev
```

测试生产构建：

```bash
npm run build
npm run preview
```

## 计划

1. 迁移 1.0 的首页、成员、历程与关于内容
2. React Router 和共享布局，实现切换页面时播放器组件不卸载
3. YouTube IFrame API + Spotify 官方 Embed / iFrame API，分别遵守平台播放与展示规则
4. 统一曲库、搜索和筛选
5. GitHub Pages + Cloudflare Pages 部署

**2.0 不设计账号、登录、注册或密码重置系统。**

### Cloudflare Pages

项目根目录填 `KMNZ2.0`，构建命令为 `npm run build`，输出目录为 `dist`，生产分支使用当前仓库默认分支 `分支`。

### GitHub Pages（后续切换）

GitHub Pages 项目网站在 `/KMNZ/` 子路径下，构建时需要将 `VITE_BASE_PATH` 配置为 `/KMNZ/`。当前仓库根目录仍运行 1.0，**不要直接把新构建产物覆盖根目录**。

import { useState } from 'react'
import PlayerDock from './components/PlayerDock'

type Page = 'home' | 'members' | 'music' | 'history' | 'about'

const pages: { id: Page; label: string; heading: string; detail: string }[] = [
  { id: 'home', label: '首页', heading: 'KMNZ ARCHIVE 2.0', detail: '非官方 KMNZ 资料与音乐档案站，正在重新设计。' },
  { id: 'members', label: '成员', heading: '成员资料', detail: 'LITA、TINA、NERO 与历代成员资料将在这里展示。' },
  { id: 'music', label: '音乐', heading: '音乐作品库', detail: '计划整合 YouTube 与 Spotify 官方嵌入，以及作品搜索与筛选。' },
  { id: 'history', label: '历程', heading: '发展历程', detail: 'KMNZ 的重要时间节点将在这里持续整理。' },
  { id: 'about', label: '关于', heading: '关于项目', detail: '这个站点是非官方粉丝作品，与 KMNZ 官方没有隶属关系。' },
]

export default function App() {
  const [activePage, setActivePage] = useState<Page>('home')
  const page = pages.find((item) => item.id === activePage) ?? pages[0]

  return (
    <div className="app">
      <header className="site-header">
        <a className="brand" href="#top" onClick={() => setActivePage('home')}>KMNZ<span>2.0</span></a>
        <nav aria-label="主导航">
          {pages.map((item) => (
            <button
              key={item.id}
              type="button"
              className={activePage === item.id ? 'nav-active' : ''}
              aria-current={activePage === item.id ? 'page' : undefined}
              onClick={() => setActivePage(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      <main id="top" className="main-content">
        <div className="eyebrow">MUSIC · MEMBERS · HISTORY</div>
        <h1>{page.heading}</h1>
        <p>{page.detail}</p>
        <div className="preview-panel">
          <span className="preview-label">DEVELOPMENT PREVIEW</span>
          <h2>欢迎来到新版 KMNZ</h2>
          <p>当前版本已经建立 React + TypeScript + Vite 基础工程。接下来会逐步迁移旧站内容，并实现跨页面常驻播放器。</p>
          <p className="preview-note">这里尚未接入任何真实音源，也不包含登录或注册功能。</p>
        </div>
      </main>

      <footer className="site-footer">KMNZ Archive · 非官方粉丝站</footer>
      <PlayerDock />
    </div>
  )
}

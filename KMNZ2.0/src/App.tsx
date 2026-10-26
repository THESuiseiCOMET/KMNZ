import { useEffect, useState } from 'react'
import Header from './components/Header'
import PlayerDock from './components/PlayerDock'
import { members } from './data/members'
import type { MusicEntry } from './data/music'
import About from './pages/About'
import History from './pages/History'
import Home from './pages/Home'
import MemberDetail from './pages/MemberDetail'
import Members from './pages/Members'
import Music from './pages/Music'
import type { Page, Section } from './types'

function getInitialTheme(): 'light' | 'dark' {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}
export default function App() {
  const [page, setPage] = useState<Page>('home')
  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme)
  const [currentMusic, setCurrentMusic] = useState<MusicEntry | null>(null)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try { localStorage.setItem('kmnzTheme', theme) } catch { /* unavailable */ }
  }, [theme])

  function navigate(next: Page) {
    setPage(next)
    window.scrollTo(0, 0)
  }
  const member = members.find((item) => page === 'member-' + item.id)
  const section: Section = member ? 'members' : page as Section

  return (
    <div className={(page === 'home' ? 'app is-home' : 'app') + (currentMusic ? ' with-music-player' : '')}>
      <a className="skip-link sr-only" href="#main-content">跳过到主要内容</a>
      <Header page={section} theme={theme} onNavigate={navigate} onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />
      <main id="main-content" className="container">
        {page === 'home' && <Home />}
        {page === 'members' && <Members onOpenMember={(id) => navigate(('member-' + id) as Page)} />}
        {page === 'history' && <History />}
        {page === 'about' && <About />}
        {page === 'music' && <Music selectedId={currentMusic?.id ?? null} onSelect={setCurrentMusic} />}
        {member && <MemberDetail member={member} onBack={() => navigate('members')} />}
      </main>
      <footer className="site-footer"><div className="container">© 2026 KMNHZ-China</div></footer>
      {currentMusic && <PlayerDock entry={currentMusic} onClose={() => setCurrentMusic(null)} />}
    </div>
  )
}

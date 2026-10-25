import { useEffect, useState } from 'react'
import Header from './components/Header'
import { members } from './data/members'
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
    <div className={page === 'home' ? 'app is-home' : 'app'}>
      <a className="skip-link sr-only" href="#main-content">跳过到主要内容</a>
      <Header page={section} theme={theme} onNavigate={navigate} onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />
      <main id="main-content" className="container">
        {page === 'home' && <Home />}
        {page === 'members' && <Members onOpenMember={(id) => navigate(('member-' + id) as Page)} />}
        {page === 'history' && <History />}
        {page === 'about' && <About />}
        {page === 'music' && <Music />}
        {member && <MemberDetail member={member} onBack={() => navigate('members')} />}
      </main>
      <footer className="site-footer"><div className="container">© 2025 KMNHZ-China</div></footer>
    </div>
  )
}

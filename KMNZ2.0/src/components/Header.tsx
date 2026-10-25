import { useState } from 'react'
import type { Section } from '../types'

interface HeaderProps {
  page: Section
  onNavigate: (next: Section) => void
  theme: 'light' | 'dark'
  onToggleTheme: () => void
}

const navigation: { page: Section; label: string }[] = [
  { page: 'home', label: '首页' },
  { page: 'members', label: '成员' },
  { page: 'history', label: '历程' },
  { page: 'about', label: '关于' },
  { page: 'music', label: '音乐' },
]

export default function Header({ page, onNavigate, theme, onToggleTheme }: HeaderProps) {
  const [open, setOpen] = useState(false)
  function navigate(next: Section) {
    onNavigate(next)
    setOpen(false)
  }
  return (
    <header className="site-header">
      <div className="container">
        <button className="site-title" type="button" onClick={() => navigate('home')}>KMNZ</button>
        <button
          className="nav-toggle"
          type="button"
          aria-controls="site-nav"
          aria-expanded={open}
          aria-label={open ? '关闭导航' : '打开导航'}
          onClick={() => setOpen(!open)}
        >☰</button>
        <nav id="site-nav" className="site-nav" aria-label="主导航" data-visible={open}>
          {navigation.map((item) => (
            <button
              key={item.page}
              type="button"
              className="nav-link"
              aria-current={page === item.page ? 'page' : undefined}
              onClick={() => navigate(item.page)}
            >{item.label}</button>
          ))}
          <button
            className="theme-toggle"
            type="button"
            aria-label={theme === 'dark' ? '切换到浅色主题' : '切换到深色主题'}
            title={theme === 'dark' ? '切换到浅色主题' : '切换到深色主题'}
            onClick={onToggleTheme}
          >{theme === 'dark' ? '🌙' : '☀️'}</button>
        </nav>
      </div>
    </header>
  )
}

import { useId, useRef, useState } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import { flushSync } from 'react-dom'
import FullscreenToggle from './FullscreenToggle'
import type { Section } from '../types'
import logoBlack from '../assets/images/KMNZLOGOB.webp'
import logoWhite from '../assets/images/KMNZLOGOW.webp'

interface HeaderProps {
  page: Section
  onNavigate: (next: Section) => void
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  onThemeSettled?: (theme: 'light' | 'dark') => void
  onOpenSettings?: () => void
  settingsOpen?: boolean
  settingsPanel?: ReactNode
  onHideNavigation?: () => void
  concealed?: boolean
}

const navigation: { page: Section; label: string }[] = [
  { page: 'home', label: 'HOME' },
  { page: 'music', label: 'MUSIC' },
  { page: 'members', label: 'MEMBERS' },
  { page: 'history', label: 'HISTORY' },
  { page: 'about', label: 'ABOUT' },
]

export default function Header({
                                 page,
                                 onNavigate,
                                 theme,
                                 onToggleTheme,
                                 onThemeSettled,
                                 onOpenSettings,
                                 settingsOpen = false,
                                 settingsPanel,
                                 onHideNavigation,
                                 concealed = false
                               }: HeaderProps) {
  const [open, setOpen] = useState(false)
  const [chalkMark, setChalkMark] = useState(0)
  const chalkFilterId = useId()
  const themeRequest = useRef(0)

  function navigate(next: Section) {
    if (next === page) setChalkMark(mark => mark + 1)
    onNavigate(next)
    setOpen(false)
  }

  // 从主题按钮的位置向外扩散切换主题
  function handleThemeChange(event: MouseEvent<HTMLButtonElement>) {
    delete document.documentElement.dataset.pageTransition
    delete document.documentElement.dataset.musicTransition
    const request = ++themeRequest.current
    const rect = event.currentTarget.getBoundingClientRect()

    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2

    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    function showPeek() {
      if (request === themeRequest.current) onThemeSettled?.(nextTheme)
    }

    function applyTheme() {
      document.documentElement.dataset.theme = nextTheme
      flushSync(() => {
        onToggleTheme()
      })
    }

    // 浏览器不支持动画或用户偏好减少动画时，直接切换
    if (
        !document.startViewTransition ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      applyTheme()
      showPeek()
      return
    }

    const transition = document.startViewTransition(applyTheme)
    void transition.finished.then(showPeek, showPeek)

    void transition.ready.then(() => {
      const radius = Math.hypot(
          Math.max(x, window.innerWidth - x),
          Math.max(y, window.innerHeight - y)
      )

      document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${radius}px at ${x}px ${y}px)`
            ]
          },
          {
            duration: 750,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            pseudoElement: '::view-transition-new(root)'
          }
      )
    }).catch(() => {
      // 不支持动画时，主题仍然可以正常切换
    })
  }

  return (
      <header className="site-header" inert={concealed} aria-hidden={concealed || undefined}>
        <div className="container">
          <button
              className="site-title site-logo-button"
              type="button"
              onClick={() => navigate('home')}
              aria-label="返回 KMNZ 首页"
              title="KMNZ 首页"
          >
            <img
                className="site-logo"
                src={theme === 'dark' ? logoWhite : logoBlack}
                alt="KMNZ"
                draggable={false}
            />
          </button>

          <div className="header-player-slot" />
          <button
              className="nav-toggle"
              type="button"
              aria-controls="site-nav"
              aria-expanded={open}
              aria-label={open ? '关闭导航' : '打开导航'}
              onClick={() => setOpen(!open)}
          >
            ☰
          </button>

          <nav
              id="site-nav"
              className="site-nav"
              aria-label="主导航"
              data-visible={open}
          >
            <div className="navigation-links">
              <div className="navigation-labels">
            {navigation.map((item) => (
                <button
                    key={item.page}
                    type="button"
                    className="nav-link"
                    aria-label={item.label}
                    data-nav-page={item.page}
                    aria-current={page === item.page ? 'page' : undefined}
                    onClick={() => navigate(item.page)}
                >
                  {page === item.page && <span key={item.page + '-' + chalkMark} className="nav-chalk-ring" aria-hidden="true">
                    <svg viewBox="0 0 100 44" preserveAspectRatio="none" focusable="false">
                      <defs>
                        <filter id={chalkFilterId} x="-10%" y="-30%" width="120%" height="160%">
                          <feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="2" seed="17" result="chalk-noise" />
                          <feColorMatrix in="chalk-noise" type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 1 0 0 0 .25" result="chalk-grain" />
                          <feComposite in="SourceGraphic" in2="chalk-grain" operator="in" />
                        </filter>
                      </defs>
                      <g filter={`url(#${chalkFilterId})`}>
                        <path className="nav-chalk-stroke" pathLength="1" d="M93 15C86 4 61 2 39 5C17 6 3 14 5 24C6 36 27 41 52 39C78 39 96 31 95 21C95 18 92 14 88 12" />
                        <path className="nav-chalk-stroke nav-chalk-echo" pathLength="1" d="M90 13C78 5 57 5 37 7C15 9 6 16 8 25C12 35 34 39 58 36C79 35 91 29 93 23" />
                      </g>
                    </svg>
                  </span>}
                  <span className="nav-street-label" data-label={item.label} aria-hidden="true">{item.label}</span>
                </button>
            ))}
              </div>
            </div>

            <div className="header-preferences">
            {/* 深浅色主题切换按钮 */}
            <button
                className="theme-toggle"
                type="button"
                aria-label={
                  theme === 'dark' ? '切换到浅色主题' : '切换到深色主题'
                }
                title={
                  theme === 'dark' ? '切换到浅色主题' : '切换到深色主题'
                }
                onClick={handleThemeChange}
            >
              <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
              >
                {theme === 'dark' ? (
                    // 空心月亮
                    <path d="M20.99 13A9 9 0 0 1 11 3.01 9 9 0 1 0 20.99 13Z" />
                ) : (
                    // 空心太阳
                    <>
                      <circle cx="12" cy="12" r="4" />
                      <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" />
                    </>
                )}
              </svg>
            </button>
          <FullscreenToggle />
          {onHideNavigation && <button type="button" className="navigation-toggle" aria-label="隐藏顶部导航栏" title="隐藏顶部导航栏" onClick={onHideNavigation}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 15 6-6 6 6" /></svg>
          </button>}
          <div className="header-settings">
          <button type="button" className="settings-toggle" aria-label="播放设置" title="播放设置" aria-expanded={settingsOpen} aria-controls="playback-settings" onClick={onOpenSettings}>
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" aria-hidden="true">
              <path d="m9 3-.5 2.1-1.8 1L4.6 5.5l-3 5.2 1.6 1.5v2.1l-1.6 1.4 3 5.2 2.1-.6 1.8 1L9 23h6l.5-2.1 1.8-1 2.1.6 3-5.2-1.6-1.4v-2.1l1.6-1.5-3-5.2-2.1.6-1.8-1L15 3Z" transform="translate(1 0) scale(.92)" />
              <circle cx="12" cy="12" r="3.1" />
            </svg>
          </button>
          {settingsPanel}
          </div>
            </div>
          </nav>
        </div>
      </header>
  )
}

import { useState } from 'react'
import type { MouseEvent } from 'react'
import { flushSync } from 'react-dom'
import type { Section } from '../types'
import logoBlack from '../assets/images/kmnz-logo-black.svg'
import logoWhite from '../assets/images/kmnz-logo-white.svg'

interface HeaderProps {
  page: Section
  onNavigate: (next: Section) => void
  theme: 'light' | 'dark'
  onToggleTheme: () => void
}

const navigation: { page: Section; label: string }[] = [
  { page: 'home', label: '首页' },
  { page: 'members', label: '成员' },
  { page: 'music', label: '音乐' },
  { page: 'history', label: '历程' },
  { page: 'about', label: '关于' },
]

export default function Header({
                                 page,
                                 onNavigate,
                                 theme,
                                 onToggleTheme
                               }: HeaderProps) {
  const [open, setOpen] = useState(false)

  function navigate(next: Section) {
    onNavigate(next)
    setOpen(false)
  }

  // 从主题按钮的位置向外扩散切换主题
  function handleThemeChange(event: MouseEvent<HTMLButtonElement>) {
    const rect = event.currentTarget.getBoundingClientRect()

    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2

    const nextTheme = theme === 'dark' ? 'light' : 'dark'

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
      return
    }

    const transition = document.startViewTransition(applyTheme)

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
      <header className="site-header">
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
            {navigation.map((item) => (
                <button
                    key={item.page}
                    type="button"
                    className="nav-link"
                    aria-current={page === item.page ? 'page' : undefined}
                    onClick={() => navigate(item.page)}
                >
                  {item.label}
                </button>
            ))}

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
          </nav>
        </div>
      </header>
  )
}
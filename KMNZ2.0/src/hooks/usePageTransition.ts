import { useCallback, useEffect, useRef } from 'react'
import { flushSync } from 'react-dom'
import type { Page } from '../types'
import type { MusicRoute } from '../lib/siteRoute'

export function usePageTransition() {
  const active = useRef<ViewTransition | null>(null)
  const request = useRef(0)

  useEffect(() => () => {
    request.current++
    active.current?.skipTransition()
    delete document.documentElement.dataset.pageTransition
    delete document.documentElement.dataset.musicTransition
  }, [])

  return useCallback((from: Page, to: Page, update: () => void, music?: { from: MusicRoute; to: MusicRoute }) => {
    const id = ++request.current
    active.current?.skipTransition()
    active.current = null
    const root = document.documentElement
    delete root.dataset.pageTransition
    delete root.dataset.musicTransition
    let committed = false
    const apply = () => {
      if (id !== request.current || committed) return
      committed = true
      flushSync(update)
    }
    const kind = from !== to ? 'page' : from === 'music' && music
      ? music.from.platform !== music.to.platform ? 'platform'
        : music.to.platform === 'spotify' && music.from.category !== music.to.category && !music.from.releaseSourceId && !music.to.releaseSourceId ? 'category' : null
      : null
    if (!kind || !document.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      apply()
      return
    }
    const selector = kind === 'page' ? '.navigation-links .nav-link[data-nav-page]'
      : kind === 'platform' ? '.music-platform-labels [data-segment-value]' : '.music-category-labels [data-segment-value]'
    const values = Array.from(document.querySelectorAll<HTMLButtonElement>(selector), button => kind === 'page' ? button.dataset.navPage : button.dataset.segmentValue)
    const section = (page: Page) => page.startsWith('member-') ? 'members' : page
    const before = values.indexOf(kind === 'page' ? section(from) : kind === 'platform' ? music!.from.platform : music!.from.category)
    const after = values.indexOf(kind === 'page' ? section(to) : kind === 'platform' ? music!.to.platform : music!.to.category)
    const direction = before >= 0 && after >= 0 && after < before || kind === 'page' && from.startsWith('member-') && to === 'members' ? 'backward' : 'forward'
    if (kind === 'page') root.dataset.pageTransition = direction
    else root.dataset.musicTransition = `${kind}-${direction}`
    const clear = () => {
      if (id !== request.current) return
      active.current = null
      delete root.dataset.pageTransition
      delete root.dataset.musicTransition
    }
    try {
      const transition = document.startViewTransition(apply)
      active.current = transition
      void transition.ready.catch(() => {})
      void transition.finished.then(clear, () => { apply(); clear() })
    } catch {
      apply()
      clear()
    }
  }, [])
}

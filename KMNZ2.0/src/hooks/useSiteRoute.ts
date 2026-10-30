import { useCallback, useEffect, useRef, useState } from 'react'
import { parseSiteRoute, siteRouteHash } from '../lib/siteRoute'
import type { MusicRoute, SiteRoute } from '../lib/siteRoute'
import type { Page } from '../types'

const scrollKey = 'kmnzRouteScroll'
function releasePanelChange(from: SiteRoute, to: SiteRoute): boolean {
  return from.page === 'music' && to.page === 'music'
    && from.music.platform === 'spotify' && to.music.platform === 'spotify'
    && from.music.releaseSourceId !== to.music.releaseSourceId
    && siteRouteHash({ ...from, music: { ...from.music, releaseSourceId: null } }) === siteRouteHash({ ...to, music: { ...to.music, releaseSourceId: null } })
}
function storedScroll(hash: string): number {
  try { const map = JSON.parse(sessionStorage.getItem(scrollKey) ?? '{}'); const value = map[hash]; return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0 } catch { return 0 }
}
function saveScroll(hash: string) {
  try {
    const raw = JSON.parse(sessionStorage.getItem(scrollKey) ?? '{}')
    const entries = Object.entries(raw && typeof raw === 'object' ? raw : {}).filter(([key]) => key !== hash).slice(-49)
    sessionStorage.setItem(scrollKey, JSON.stringify({ ...Object.fromEntries(entries), [hash]: window.scrollY }))
  } catch { /* unavailable */ }
}

export function useSiteRoute(releaseIds: ReadonlySet<string>, transition?: (from: Page, to: Page, update: () => void, music?: { from: MusicRoute; to: MusicRoute }) => void) {
  const [route, setRoute] = useState(() => parseSiteRoute(window.location.hash, releaseIds))
  const latest = useRef(route)
  latest.current = route
  const frame = useRef(0)
  const scrollToRoute = useCallback((hash: string) => {
    window.cancelAnimationFrame(frame.current)
    frame.current = window.requestAnimationFrame(() => window.scrollTo(0, storedScroll(hash)))
  }, [])
  const go = useCallback((next: SiteRoute, replace = false) => {
    const before = siteRouteHash(latest.current), hash = siteRouteHash(next)
    if (hash === before) {
      transition?.(latest.current.page, next.page, () => {}, { from: latest.current.music, to: next.music })
      return
    }
    saveScroll(before)
    const keepScroll = releasePanelChange(latest.current, next)
    if (keepScroll) window.cancelAnimationFrame(frame.current)
    const update = () => {
      const url = window.location.pathname + window.location.search + hash
      if (replace) window.history.replaceState(window.history.state, '', url)
      else window.history.pushState({ kmnzFrom: before }, '', url)
      latest.current = next
      setRoute(next)
      if (!replace && !keepScroll) { window.cancelAnimationFrame(frame.current); frame.current = window.requestAnimationFrame(() => window.scrollTo(0, 0)) }
    }
    if (transition) transition(latest.current.page, next.page, update, { from: latest.current.music, to: next.music })
    else update()
  }, [transition])

  useEffect(() => {
    const previous = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'
    const initial = siteRouteHash(latest.current)
    window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search + initial)
    scrollToRoute(initial)
    function changed() {
      const next = parseSiteRoute(window.location.hash, releaseIds)
      const hash = siteRouteHash(next), before = siteRouteHash(latest.current)
      if (hash === before) return
      saveScroll(before)
      if (next.page !== 'music') next.music = latest.current.music
      const keepScroll = releasePanelChange(latest.current, next)
      if (keepScroll) window.cancelAnimationFrame(frame.current)
      const update = () => {
        latest.current = next
        setRoute(next)
        if (hash !== window.location.hash) window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search + hash)
        if (!keepScroll) scrollToRoute(hash)
      }
      if (transition) transition(latest.current.page, next.page, update, { from: latest.current.music, to: next.music })
      else update()
    }
    function remember() { saveScroll(siteRouteHash(latest.current)) }
    window.addEventListener('hashchange', changed)
    window.addEventListener('popstate', changed)
    window.addEventListener('pagehide', remember)
    return () => {
      window.cancelAnimationFrame(frame.current)
      window.history.scrollRestoration = previous
      window.removeEventListener('hashchange', changed)
      window.removeEventListener('popstate', changed)
      window.removeEventListener('pagehide', remember)
    }
  }, [releaseIds, scrollToRoute, transition])

  const navigate = useCallback((page: Page) => {
    if (latest.current.page === page) {
      if (transition) transition(page, page, () => window.scrollTo(0, 0))
      else window.scrollTo(0, 0)
    }
    else go({ ...latest.current, page })
  }, [go, transition])
  const changeMusic = useCallback((music: MusicRoute, replace = false) => go({ page: 'music', music }, replace), [go])
  const backFromRelease = useCallback(() => {
    const current = latest.current
    const listing = { ...current, music: { ...current.music, releaseSourceId: null } }
    if (window.history.state?.kmnzFrom === siteRouteHash(listing)) window.history.back()
    else go(listing, true)
  }, [go])
  return { route, navigate, changeMusic, backFromRelease }
}

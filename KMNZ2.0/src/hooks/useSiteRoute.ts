import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { parseSiteRoute, siteRouteHash, readMusicMemory, saveMusicMemory } from '../lib/siteRoute'
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
  const [route, setRoute] = useState(() => {
    const initial = parseSiteRoute(window.location.hash, releaseIds)
    if (initial.page !== 'music') initial.music = readMusicMemory(releaseIds)?.route ?? initial.music
    return initial
  })
  const latest = useRef(route)
  latest.current = route
  const frame = useRef(0)
  const pendingScroll = useRef<{ hash: string; restore: boolean } | null>(null)
  const restoreScroll = useCallback((hash: string) => {
    window.scrollTo(0, storedScroll(hash))
    const memory = readMusicMemory(releaseIds)
    if (memory && siteRouteHash({ page: 'music', music: memory.route }) === hash && typeof document !== 'undefined') {
      const pane = document.querySelector('.music-release-pane')
      if (pane) pane.scrollTop = memory.panelScroll
    }
  }, [releaseIds])
  const scrollToRoute = useCallback((hash: string) => {
    window.cancelAnimationFrame(frame.current)
    frame.current = window.requestAnimationFrame(() => restoreScroll(hash))
  }, [restoreScroll])
  useLayoutEffect(() => {
    const pending = pendingScroll.current
    if (!pending || pending.hash !== siteRouteHash(route)) return
    pendingScroll.current = null
    window.cancelAnimationFrame(frame.current)
    if (pending.restore) restoreScroll(pending.hash)
    else window.scrollTo(0, 0)
  }, [route, restoreScroll])
  const go = useCallback((next: SiteRoute, replace = false, restore = false) => {
    const before = siteRouteHash(latest.current), hash = siteRouteHash(next)
    if (hash === before) {
      if (!replace) transition?.(latest.current.page, next.page, () => {}, { from: latest.current.music, to: next.music })
      return
    }
    saveScroll(before)
    if (latest.current.page === 'music') saveMusicMemory(latest.current.music)
    const keepScroll = releasePanelChange(latest.current, next)
    if (keepScroll) window.cancelAnimationFrame(frame.current)
    const update = () => {
      const url = window.location.pathname + window.location.search + hash
      if (replace) window.history.replaceState(window.history.state, '', url)
      else window.history.pushState({ kmnzFrom: before }, '', url)
      latest.current = next
      pendingScroll.current = !replace && !keepScroll ? { hash, restore } : null
      setRoute(next)
    }
    // Resolving the landing alias happens behind SHOWCASE, before any user navigation.
    const landingRedirect = replace && latest.current.page === 'home' && next.page === 'music'
    if (transition && !landingRedirect) transition(latest.current.page, next.page, update, { from: latest.current.music, to: next.music })
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
      if (latest.current.page === 'music') saveMusicMemory(latest.current.music)
      if (next.page !== 'music') next.music = latest.current.music
      const keepScroll = releasePanelChange(latest.current, next)
      if (keepScroll) window.cancelAnimationFrame(frame.current)
      const update = () => {
        latest.current = next
        pendingScroll.current = keepScroll ? null : { hash, restore: true }
        setRoute(next)
        if (hash !== window.location.hash) window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search + hash)
      }
      if (transition) transition(latest.current.page, next.page, update, { from: latest.current.music, to: next.music })
      else update()
    }
    function remember() { saveScroll(siteRouteHash(latest.current)); if (latest.current.page === 'music') saveMusicMemory(latest.current.music) }
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
    else go({ ...latest.current, page }, false, page === 'music')
  }, [go, transition])
  const changeMusic = useCallback((music: MusicRoute, replace = false) => go({ page: 'music', music: music.platform === 'spotify' ? {...music,category:'all'} : music }, replace), [go])
  const backFromRelease = useCallback(() => {
    const current = latest.current
    const listing = { ...current, music: { ...current.music, releaseSourceId: null } }
    if (window.history.state?.kmnzFrom === siteRouteHash(listing)) window.history.back()
    else go(listing, true)
  }, [go])
  return { route, navigate, changeMusic, backFromRelease }
}

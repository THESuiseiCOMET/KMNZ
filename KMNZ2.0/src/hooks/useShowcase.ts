import { useCallback, useEffect, useRef, useState } from 'react'
import { initialShowcasePhase, showcaseDuration, showcaseReducedDuration, showcaseSessionKey, showcaseStep } from '../lib/showcase'
import type { ShowcasePhase } from '../lib/showcase'

export function useShowcase(initialPage: string) {
  const [phase, setPhase] = useState<ShowcasePhase>(() => {
    let storage: Storage | undefined
    try { storage = window.sessionStorage } catch { /* unavailable */ }
    return initialShowcasePhase(initialPage, storage)
  })
  const latest = useRef(phase)
  const enterButton = useRef<HTMLButtonElement>(null)
  const returnButton = useRef<HTMLButtonElement>(null)
  const consoleFocus = useRef<HTMLElement | null>(null)
  const entered = useRef(false)
  const blocked = phase !== 'console'

  const change = useCallback((action: 'enter' | 'return' | 'finish') => {
    const next = showcaseStep(latest.current, action)
    if (next === latest.current) return
    if (action === 'return') consoleFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    if (action === 'enter') {
      entered.current = true
      try { window.sessionStorage.setItem(showcaseSessionKey, '1') } catch { /* unavailable */ }
    }
    latest.current = next
    setPhase(next)
  }, [])

  useEffect(() => {
    if (phase !== 'entering' && phase !== 'returning') return
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const timer = window.setTimeout(() => change('finish'), media.matches ? showcaseReducedDuration : showcaseDuration)
    const reduce = () => { if (media.matches) change('finish') }
    media.addEventListener('change', reduce)
    return () => { window.clearTimeout(timer); media.removeEventListener('change', reduce) }
  }, [phase, change])

  useEffect(() => {
    if (!blocked) return
    const root = document.documentElement
    const previous = root.style.overflow
    root.style.overflow = 'hidden'
    return () => { root.style.overflow = previous }
  }, [blocked])

  useEffect(() => {
    if (phase === 'showcase') enterButton.current?.focus({ preventScroll: true })
    if (phase === 'console' && consoleFocus.current) {
      const target = consoleFocus.current.isConnected ? consoleFocus.current : returnButton.current
      const visibleTarget = target?.getClientRects().length ? target : document.querySelector<HTMLButtonElement>('.nav-toggle')
      visibleTarget?.focus({ preventScroll: true })
      consoleFocus.current = null
    } else if (phase === 'console' && entered.current) {
      document.getElementById('main-content')?.focus({ preventScroll: true })
    }
    if (phase === 'console') entered.current = false
  }, [phase])

  const enter = useCallback(() => change('enter'), [change])
  const show = useCallback(() => change('return'), [change])
  const finish = useCallback(() => change('finish'), [change])
  return { phase, blocked, enterButton, returnButton, enter, show, finish }
}

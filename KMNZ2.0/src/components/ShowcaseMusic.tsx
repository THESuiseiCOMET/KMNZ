import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import type { ShowcasePhase } from '../lib/showcase'
import { createShowcaseAudio } from '../lib/showcaseAudio'
import { createShowcaseGroove } from '../lib/showcaseGroove'
const localMusic = import.meta.env.DEV ? '/__local-showcase/music.mp3' : null

// Headless ambient audio: play() respects the browser's normal autoplay policy.
export default function ShowcaseMusic({ phase, mediaActive, rootRef }: { phase: ShowcasePhase; mediaActive: boolean; rootRef: RefObject<HTMLElement | null> }) {
  const current = useRef({ phase, mediaActive }); current.current = { phase, mediaActive }
  const synchronize = useRef<(() => void) | null>(null)
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const audio = new Audio(); audio.preload = 'metadata'
    if (localMusic) audio.src = localMusic
    const clock = { now: () => performance.now(), request: (fn: (time: number) => void) => requestAnimationFrame(fn), cancel: (id: number) => cancelAnimationFrame(id) }
    const reduced = matchMedia('(prefers-reduced-motion: reduce)'), mobile = matchMedia('(max-width: 760px), (max-aspect-ratio: 1/1)')
    const groove = createShowcaseGroove(root, audio, clock)
    const player = createShowcaseAudio(audio, clock, () => {})
    player.restore(Boolean(localMusic))
    const sync = () => {
      const showing = current.current.phase === 'showcase' && !document.hidden
      player.context(showing, current.current.mediaActive || document.hidden)
      groove.context(showing, reduced.matches, mobile.matches)
    }
    const gesture = (event: Event) => {
      if (!event.isTrusted || !localMusic || current.current.phase !== 'showcase' || current.current.mediaActive || document.hidden) return
      const interactive = event.target instanceof Element && event.target.closest('button,a,input,select,textarea')
      // ENTER keeps its immediate navigation and never starts a one-frame music burst.
      if (event.type === 'pointerdown' && interactive) return
      if (event instanceof KeyboardEvent && (event.key === 'Enter' || event.key === ' ')) return
      player.retry()
    }
    synchronize.current = sync
    root.addEventListener('pointerdown', gesture, true); root.addEventListener('keydown', gesture, true)
    document.addEventListener('visibilitychange', sync); reduced.addEventListener('change', sync); mobile.addEventListener('change', sync)
    sync()
    return () => {
      synchronize.current = null
      root.removeEventListener('pointerdown', gesture, true); root.removeEventListener('keydown', gesture, true)
      document.removeEventListener('visibilitychange', sync); reduced.removeEventListener('change', sync); mobile.removeEventListener('change', sync)
      groove.dispose(); player.dispose(); audio.removeAttribute('src'); audio.load()
    }
  }, [rootRef])
  useEffect(() => { synchronize.current?.() }, [phase, mediaActive])
  return null
}

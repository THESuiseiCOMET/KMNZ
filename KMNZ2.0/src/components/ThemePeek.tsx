import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent } from 'react'
import neroImage from '../assets/images/NEROB.png'
import tinaImage from '../assets/images/TINAW.png'
import litaCloseImage from '../assets/images/LITACLOSE.png'
import litaOpenImage from '../assets/images/LITAOPEN.png'
import { initialPeek, peekReducer, peekEnterMs, peekHoldMs, peekLeaveMs, placeThemePeek, isThemePeekPoint, peekScrollMs, peekScrollTop } from '../lib/themePeek'

interface ThemePeekProps {
  id?: number
  theme: 'light' | 'dark'
  artwork?: 'close' | 'open'
  playerActive?: boolean
  onFinished: (id: number) => void
}

export default function ThemePeek({ id, theme, artwork, playerActive = false, onFinished }: ThemePeekProps) {
  const [state, dispatch] = useReducer(peekReducer, initialPeek)
  const [loadedArtwork, setLoadedArtwork] = useState<string | null>(null)
  const [placement, setPlacement] = useState(() => placeThemePeek({ width: window.innerWidth, height: window.innerHeight }))
  const buttonRef = useRef<HTMLButtonElement>(null)
  const pointerHeld = useRef(false)
  const leaveTimer = useRef<number | undefined>(undefined)
  const scrollFrame = useRef<number | undefined>(undefined)
  const imageKey = artwork ?? theme
  const image = artwork === 'close' ? litaCloseImage : artwork === 'open' ? litaOpenImage : theme === 'dark' ? neroImage : tinaImage
  const loaded = loadedArtwork === imageKey

  useEffect(() => {
    dispatch(id === undefined ? { type: 'cancel-auto' } : { type: 'auto', id })
  }, [id])

  const finishExit = useCallback(() => {
    dispatch({ type: 'left' })
    if (id !== undefined) onFinished(id)
  }, [id, onFinished])

  useEffect(() => {
    if (!loaded) return
    if (state.phase === 'entering') {
      const timer = window.setTimeout(() => dispatch({ type: 'entered' }), peekEnterMs + 40)
      return () => window.clearTimeout(timer)
    }
    if (state.phase === 'leaving') {
      const timer = window.setTimeout(finishExit, peekLeaveMs + 40)
      return () => window.clearTimeout(timer)
    }
    if (state.phase === 'visible' && !state.hovered && !state.focused && state.autoId !== null) {
      const autoId = state.autoId
      const timer = window.setTimeout(() => dispatch({ type: 'expire', id: autoId }), peekHoldMs)
      return () => window.clearTimeout(timer)
    }
  }, [loaded, state.phase, state.hovered, state.focused, state.autoId, finishExit])

  const holdPointer = useCallback(() => {
    window.clearTimeout(leaveTimer.current)
    leaveTimer.current = undefined
    if (pointerHeld.current) return
    pointerHeld.current = true
    dispatch({ type: 'hover', value: true })
  }, [])
  const releasePointer = useCallback(() => {
    if (!pointerHeld.current || leaveTimer.current !== undefined) return
    leaveTimer.current = window.setTimeout(() => {
      leaveTimer.current = undefined
      pointerHeld.current = false
      dispatch({ type: 'hover', value: false })
    }, 200)
  }, [])

  const containsPointer = useCallback((x: number, y: number) => {
    const button = buttonRef.current
    const host = button?.parentElement?.getBoundingClientRect()
    const image = button && host ? { left: host.left + button.offsetLeft, top: host.top + button.offsetTop,
      right: host.left + button.offsetLeft + button.offsetWidth, bottom: host.top + button.offsetTop + button.offsetHeight } : undefined
    const animatedImage = button?.dataset.loaded === 'true' && button.dataset.phase !== 'hidden' ? button.getBoundingClientRect() : undefined
    return isThemePeekPoint({ x, y }, { width: document.documentElement.clientWidth, height: window.innerHeight }, image, animatedImage)
  }, [])

  useEffect(() => {
    function track(event: globalThis.PointerEvent) {
      if (event.pointerType === 'touch') return
      if (containsPointer(event.clientX, event.clientY)) holdPointer()
      else releasePointer()
    }
    function leaveWindow(event: globalThis.PointerEvent) {
      if (event.relatedTarget === null) releasePointer()
    }
    window.addEventListener('pointermove', track, { passive: true })
    window.addEventListener('pointerout', leaveWindow, { passive: true })
    window.addEventListener('blur', releasePointer)
    return () => {
      window.clearTimeout(leaveTimer.current)
      window.removeEventListener('pointermove', track)
      window.removeEventListener('pointerout', leaveWindow)
      window.removeEventListener('blur', releasePointer)
    }
  }, [containsPointer, holdPointer, releasePointer])

  const stopScroll = useCallback(() => {
    if (scrollFrame.current !== undefined) window.cancelAnimationFrame(scrollFrame.current)
    scrollFrame.current = undefined
  }, [])
  useEffect(() => {
    function interruptKey(event: globalThis.KeyboardEvent) {
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) stopScroll()
    }
    window.addEventListener('wheel', stopScroll, { passive: true })
    window.addEventListener('touchstart', stopScroll, { passive: true })
    window.addEventListener('pointerdown', stopScroll, { passive: true })
    window.addEventListener('keydown', interruptKey)
    window.addEventListener('blur', stopScroll)
    return () => {
      stopScroll()
      window.removeEventListener('wheel', stopScroll)
      window.removeEventListener('touchstart', stopScroll)
      window.removeEventListener('pointerdown', stopScroll)
      window.removeEventListener('keydown', interruptKey)
      window.removeEventListener('blur', stopScroll)
    }
  }, [stopScroll])

  useEffect(() => {
    const panel = playerActive ? document.querySelector('.music-player-panel') : null
    function update() {
      const viewport = window.visualViewport
      setPlacement(placeThemePeek({ width: viewport?.width ?? window.innerWidth, height: viewport?.height ?? window.innerHeight }, panel?.getBoundingClientRect()))
    }
    update()
    const resize = new ResizeObserver(update)
    const changes = new MutationObserver(update)
    if (panel) { resize.observe(panel); changes.observe(panel, { attributes: true, attributeFilter: ['style'] }) }
    window.addEventListener('resize', update)
    window.visualViewport?.addEventListener('resize', update)
    return () => {
      resize.disconnect()
      changes.disconnect()
      window.removeEventListener('resize', update)
      window.visualViewport?.removeEventListener('resize', update)
    }
  }, [playerActive])

  function enter(event: PointerEvent<HTMLElement>) {
    if (event.pointerType === 'touch') return
    holdPointer()
  }
  function leave(event: PointerEvent<HTMLElement>) {
    if (!containsPointer(event.clientX, event.clientY)) releasePointer()
  }
  function toTop() {
    stopScroll()
    const start = window.scrollY
    if (start <= 0) return
    const startedAt = performance.now()
    function step(now: number) {
      const elapsed = now - startedAt
      window.scrollTo({ top: peekScrollTop(start, elapsed), behavior: 'instant' })
      if (elapsed < peekScrollMs) scrollFrame.current = window.requestAnimationFrame(step)
      else scrollFrame.current = undefined
    }
    scrollFrame.current = window.requestAnimationFrame(step)
  }

  const style = { '--theme-peek-right': placement.right + 'px', '--theme-peek-bottom': placement.bottom + 'px',
    '--theme-peek-size': placement.size + 'px', zIndex: placement.layer } as CSSProperties
  return <div className="theme-peek" data-theme={theme} style={style}>
    <button type="button" className="theme-peek-button" ref={buttonRef} data-phase={state.phase} data-loaded={loaded}
      aria-label="返回顶部" title="返回顶部" onClick={toTop}
      onPointerEnter={enter} onPointerLeave={leave}
      onFocus={event => dispatch({ type: 'focus', value: event.currentTarget.matches(':focus-visible') })}
      onBlur={() => dispatch({ type: 'focus', value: false })}
      onAnimationEnd={event => {
        if (event.target !== event.currentTarget) return
        if (state.phase === 'entering') dispatch({ type: 'entered' })
        else if (state.phase === 'leaving') finishExit()
      }}>
      <img key={imageKey} className="theme-peek-image" src={image} alt="" width="512" height="512"
        draggable={false} decoding="async" onLoad={() => setLoadedArtwork(imageKey)}
        onError={() => { pointerHeld.current = false; dispatch({ type: 'reset' }); if (id !== undefined) onFinished(id) }} />
    </button>
  </div>
}

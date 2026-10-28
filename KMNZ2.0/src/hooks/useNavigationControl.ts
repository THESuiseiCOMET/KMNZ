import { useEffect, useRef, useState } from 'react'
import { isNearNavigationControl, placeNavigationControl } from '../lib/navigationControl'
import type { NavigationRect } from '../lib/navigationControl'

export function useNavigationControl(hidden: boolean) {
  const [position, setPosition] = useState<NavigationRect>({ left: 0, top: 0, width: 36, height: 36 })
  const [near, setNear] = useState(false)
  const latest = useRef(position)
  const pointer = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const button = document.querySelector<HTMLElement>('.site-header .navigation-toggle')
    const header = document.querySelector<HTMLElement>('.site-header')
    if (!button || !header) return
    function measure() {
      const rect = button!.getBoundingClientRect()
      const viewport = { width: document.documentElement.clientWidth, height: window.innerHeight }
      const next = placeNavigationControl({ left: rect.left, top: rect.top, width: rect.width, height: rect.height }, header!.getBoundingClientRect(), hidden, viewport, latest.current)
      const previous = latest.current
      if (['left', 'top', 'width', 'height'].some(key => Math.abs(next[key as keyof NavigationRect] - previous[key as keyof NavigationRect]) > .1)) {
        latest.current = next
        setPosition(next)
      }
      const available = hidden || rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < viewport.height
      setNear(Boolean(available && pointer.current && isNearNavigationControl(pointer.current, latest.current, viewport)))
    }
    function track(event: PointerEvent) {
      if (event.pointerType === 'touch') return
      pointer.current = { x: event.clientX, y: event.clientY }
      measure()
    }
    function leave() { pointer.current = null; setNear(false) }
    function leaveWindow(event: PointerEvent) { if (event.relatedTarget === null) leave() }
    measure()
    const resize = new ResizeObserver(measure)
    resize.observe(button)
    const group = button.closest('.header-preferences')
    if (group) resize.observe(group)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, { passive: true })
    window.addEventListener('pointermove', track, { passive: true })
    window.addEventListener('pointerout', leaveWindow, { passive: true })
    window.addEventListener('blur', leave)
    return () => {
      resize.disconnect()
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure)
      window.removeEventListener('pointermove', track)
      window.removeEventListener('pointerout', leaveWindow)
      window.removeEventListener('blur', leave)
    }
  }, [hidden])
  return { position, near }
}

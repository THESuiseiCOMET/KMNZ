import { useEffect, useLayoutEffect, useRef } from 'react'

// Change layout once, then move the content visually instead of relaying out
// the page and resizing the visualizer canvas on every animation frame.
export function useNavigationMotion(hidden: boolean) {
  const previous = useRef(hidden)
  const running = useRef<{ element: HTMLElement; animation: Animation } | null>(null)

  useLayoutEffect(() => {
    if (previous.current === hidden) return
    previous.current = hidden
    const element = document.querySelector<HTMLElement>('.mv-visualizer')
      ?? document.querySelector<HTMLElement>('main.container')
    const header = document.querySelector<HTMLElement>('.site-header')
    if (!element || !header) return

    const style = window.getComputedStyle(element)
    const carry = running.current?.element === element && style.transform !== 'none'
      ? new DOMMatrixReadOnly(style.transform).m42 : 0
    running.current?.animation.cancel()
    running.current = null
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || style.display === 'none') return

    const offset = carry + header.getBoundingClientRect().height * (hidden ? 1 : -1)
    if (Math.abs(offset) < .1) return
    const animation = element.animate([
      { transform: `translateY(${offset}px)` },
      { transform: 'translateY(0)' },
    ], { duration: 550, easing: 'cubic-bezier(.22,1,.36,1)' })
    running.current = { element, animation }
    void animation.finished.then(() => {
      if (running.current?.animation === animation) running.current = null
    }, () => { /* rapid reversal cancels the previous motion */ })
  }, [hidden])

  useEffect(() => () => {
    running.current?.animation.cancel()
    running.current = null
  }, [])
}

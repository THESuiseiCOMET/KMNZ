import { useLayoutEffect, useRef, useState } from 'react'

interface NavigationIndicator { left: number; top: number; width: number; height: number }

export function useNavigationIndicator(activePage: string, menuOpen: boolean, activeSelector = '.nav-link[aria-current="page"]', buttonSelector = '.nav-link') {
  const linksRef = useRef<HTMLDivElement>(null)
  const [indicator, setIndicator] = useState<NavigationIndicator | null>(null)

  useLayoutEffect(() => {
    const links = linksRef.current
    if (!links) return
    function measure() {
      const active = links!.querySelector<HTMLButtonElement>(activeSelector)
      if (!active) { setIndicator(null); return }
      if (!active.offsetWidth || !active.offsetHeight) return
      const next = { left: active.offsetLeft, top: active.offsetTop, width: active.offsetWidth, height: active.offsetHeight }
      setIndicator(current => current && current.left === next.left && current.top === next.top && current.width === next.width && current.height === next.height ? current : next)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(links)
    links.querySelectorAll<HTMLButtonElement>(buttonSelector).forEach(button => observer.observe(button))
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [activePage, menuOpen, activeSelector, buttonSelector])

  return { linksRef, indicator }
}

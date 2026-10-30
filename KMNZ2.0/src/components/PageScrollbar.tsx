import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import { scrollbarGeometry, scrollFromThumb, scrollForKey } from '../lib/pageScrollbar'

export default function PageScrollbar() {
  const track = useRef<HTMLDivElement>(null)
  const thumb = useRef<HTMLSpanElement>(null)
  const drag = useRef<{ pointerId: number; offset: number } | null>(null)
  const [dragging, setDragging] = useState(false)
  const [metrics, setMetrics] = useState({ top: 0, viewport: 0, content: 0, track: 0 })
  const geometry = scrollbarGeometry(metrics.top, metrics.viewport, metrics.content, metrics.track)
  const latest = useRef(geometry)
  latest.current = geometry

  useEffect(() => {
    let frame: number | null = null
    function measure() {
      frame = null
      const viewport = window.innerHeight
      const next = { top: (document.scrollingElement ?? document.documentElement).scrollTop, viewport,
        content: document.documentElement.scrollHeight, track: track.current?.getBoundingClientRect().height || Math.max(0, viewport - 8) }
      setMetrics(previous => previous.top === next.top && previous.viewport === next.viewport && previous.content === next.content && previous.track === next.track ? previous : next)
    }
    function schedule() { if (frame === null) frame = window.requestAnimationFrame(measure) }
    const observer = new ResizeObserver(schedule)
    observer.observe(document.body)
    const root = document.getElementById('root')
    if (root) observer.observe(root)
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    schedule()
    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      drag.current = null
    }
  }, [])

  function start(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || !event.isPrimary) return
    event.preventDefault()
    event.currentTarget.focus({ preventScroll: true })
    const top = event.clientY - event.currentTarget.getBoundingClientRect().top
    const current = latest.current
    if (event.target === thumb.current) {
      drag.current = { pointerId: event.pointerId, offset: top - current.thumbTop }
      event.currentTarget.setPointerCapture(event.pointerId)
      setDragging(true)
    } else window.scrollTo({ top: scrollFromThumb(top - current.thumbHeight / 2, current.maximum, current.travel), behavior: 'auto' })
  }
  function move(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.pointerId !== event.pointerId) return
    event.preventDefault()
    const current = latest.current
    const top = event.clientY - event.currentTarget.getBoundingClientRect().top - drag.current.offset
    window.scrollTo({ top: scrollFromThumb(top, current.maximum, current.travel), behavior: 'auto' })
  }
  function stop(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.pointerId !== event.pointerId) return
    drag.current = null
    setDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }
  function key(event: KeyboardEvent<HTMLDivElement>) {
    const current = latest.current
    const next = scrollForKey(event.key, current.position, metrics.viewport, current.maximum)
    if (next === null) return
    event.preventDefault()
    window.scrollTo({ top: next, behavior: 'auto' })
  }
  return <div ref={track} className="page-scrollbar" role="scrollbar" aria-label="页面滚动" aria-controls="main-content" aria-orientation="vertical"
    aria-valuemin={0} aria-valuemax={Math.round(geometry.maximum)} aria-valuenow={Math.round(geometry.position)} tabIndex={0}
    hidden={geometry.maximum <= 0} data-dragging={dragging} onPointerDown={start} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} onLostPointerCapture={stop} onKeyDown={key}>
    <span ref={thumb} className="page-scrollbar-thumb" style={{ height: geometry.thumbHeight, transform: `translateY(${geometry.thumbTop}px)` }} />
  </div>
}

import { useEffect, useId, useRef, useState } from 'react'

export default function FullscreenToggle() {
  const [fullscreen, setFullscreen] = useState(() => typeof document !== 'undefined' && Boolean(document.fullscreenElement))
  const [error, setError] = useState('')
  const busy = useRef(false)
  const alive = useRef(false)
  const errorId = useId()

  useEffect(() => {
    alive.current = true
    function sync() { setFullscreen(Boolean(document.fullscreenElement)); setError('') }
    sync()
    document.addEventListener('fullscreenchange', sync)
    return () => { alive.current = false; document.removeEventListener('fullscreenchange', sync) }
  }, [])

  async function toggle() {
    if (busy.current) return
    busy.current = true
    setError('')
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else {
        if (document.fullscreenEnabled === false || !document.documentElement.requestFullscreen) throw new Error('fullscreen unavailable')
        await document.documentElement.requestFullscreen({ navigationUI: 'hide' })
      }
      if (alive.current) setFullscreen(Boolean(document.fullscreenElement))
    } catch {
      if (alive.current) setError('未能切换网页全屏，请重试。')
    } finally { busy.current = false }
  }

  const label = fullscreen ? '退出网页全屏' : '进入网页全屏'
  return <>
    <button type="button" className="fullscreen-toggle" onClick={toggle} aria-label={label} title={error || label}
      aria-pressed={fullscreen} aria-describedby={error ? errorId : undefined}>
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path className="fullscreen-corner-start" d="M10 5H5v5" />
        <path className="fullscreen-corner-end" d="M14 19h5v-5" />
      </svg>
    </button>
    {error && <span className="sr-only" id={errorId} role="alert">{error}</span>}
  </>
}

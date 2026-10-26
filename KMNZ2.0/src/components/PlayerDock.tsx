import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import type { MusicEntry } from '../data/music'
import { clampPlayerPosition } from '../lib/playerControls'
import type { PlayerPosition } from '../lib/playerControls'
import { useOfficialPlayer } from '../hooks/useOfficialPlayer'
import previousIcon from '../assets/icons/skip-back.svg'
import nextIcon from '../assets/icons/skip-forward.svg'
import loopIcon from '../assets/icons/repeat-1.svg'
import playIcon from '../assets/icons/play.svg'
import pauseIcon from '../assets/icons/pause.svg'
import gripIcon from '../assets/icons/grip-horizontal.svg'

interface PlayerDockProps {
  entry: MusicEntry
  onClose: () => void
  onSkip: (direction: -1 | 1) => void
}

function PlayerIcon({ source }: { source: string }) {
  const mask = `url("${source}")`
  return <span className="music-player-icon" style={{ maskImage: mask, WebkitMaskImage: mask }} aria-hidden="true" />
}

export default function PlayerDock({ entry, onClose, onSkip }: PlayerDockProps) {
  const [loop, setLoop] = useState(false)
  const [position, setPosition] = useState<PlayerPosition | null>(null)
  const [dragging, setDragging] = useState(false)
  const panelRef = useRef<HTMLElement>(null)
  const dragRef = useRef<{ pointerId: number; clientX: number; clientY: number; x: number; y: number } | null>(null)
  const { hostRef, ready, paused, togglePlayback } = useOfficialPlayer(entry, loop, () => onSkip(1))

  function constrain(next: PlayerPosition): PlayerPosition {
    const rect = panelRef.current?.getBoundingClientRect()
    if (!rect) return next
    const viewport = window.visualViewport
    return clampPlayerPosition(next, rect, {
      left: viewport?.offsetLeft ?? 0,
      top: viewport?.offsetTop ?? 0,
      width: viewport?.width ?? window.innerWidth,
      height: viewport?.height ?? window.innerHeight,
    })
  }

  useEffect(() => {
    function keepInView() {
      setPosition((current) => {
        if (!current) return current
        const next = constrain(current)
        return next.x === current.x && next.y === current.y ? current : next
      })
    }
    const observer = new ResizeObserver(keepInView)
    if (panelRef.current) observer.observe(panelRef.current)
    window.addEventListener('resize', keepInView)
    const viewport = window.visualViewport
    viewport?.addEventListener('resize', keepInView)
    viewport?.addEventListener('scroll', keepInView)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', keepInView)
      viewport?.removeEventListener('resize', keepInView)
      viewport?.removeEventListener('scroll', keepInView)
    }
  }, [])

  function startDrag(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0 || !event.isPrimary) return
    const rect = panelRef.current?.getBoundingClientRect()
    if (!rect) return
    event.preventDefault()
    event.currentTarget.focus({ preventScroll: true })
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, x: rect.left, y: rect.top }
    setDragging(true)
  }

  function moveDrag(event: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    setPosition(constrain({ x: drag.x + event.clientX - drag.clientX, y: drag.y + event.clientY - drag.clientY }))
  }

  function stopDrag(event: PointerEvent<HTMLButtonElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) return
    dragRef.current = null
    setDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  function moveWithKeyboard(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'Home') { event.preventDefault(); setPosition(null); return }
    const directions: Record<string, PlayerPosition> = {
      ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
      ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 },
    }
    const direction = directions[event.key]
    const rect = panelRef.current?.getBoundingClientRect()
    if (!direction || !rect) return
    event.preventDefault()
    const step = event.shiftKey ? 40 : 16
    setPosition(constrain({ x: rect.left + direction.x * step, y: rect.top + direction.y * step }))
  }

  return (
    <aside
      ref={panelRef}
      className={'music-player-panel' + (dragging ? ' is-dragging' : '')}
      aria-label="当前音乐播放器"
      style={position ? { left: position.x, top: position.y, right: 'auto', bottom: 'auto' } : undefined}
    >
      <div className="music-player-heading">
        <button
          type="button"
          className="music-player-drag-handle"
          aria-label="移动播放器"
          title={entry.title + ' · 拖动播放器'}
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={stopDrag}
          onPointerCancel={stopDrag}
          onLostPointerCapture={stopDrag}
          onKeyDown={moveWithKeyboard}
        >
          <PlayerIcon source={gripIcon} />
          <strong>{entry.title}</strong>
        </button>
        <div className="music-player-actions">
          <a href={entry.externalUrl} target="_blank" rel="noopener noreferrer" title="在官方平台打开">
            <span className="sr-only">在官方平台打开 {entry.title}</span>↗
          </a>
          <button type="button" onClick={onClose} aria-label="关闭播放器并停止播放" title="关闭播放器">×</button>
        </div>
      </div>
      <div className="music-player-controls" role="group" aria-label="播放控制">
        <button type="button" className="music-player-loop" onClick={() => setLoop(!loop)} aria-label={loop ? '关闭单曲循环' : '开启单曲循环'} title={ready ? (loop ? '关闭单曲循环' : '开启单曲循环') : '循环控制暂不可用'} aria-pressed={loop} disabled={!ready}><PlayerIcon source={loopIcon} /></button>
        <button type="button" onClick={() => onSkip(-1)} aria-label="上一首" title="上一首"><PlayerIcon source={previousIcon} /></button>
        <button type="button" className="music-player-toggle" onClick={togglePlayback} disabled={!ready} aria-label={paused ? '播放歌曲' : '暂停歌曲'} title={paused ? '播放' : '暂停'}><PlayerIcon source={paused ? playIcon : pauseIcon} /></button>
        <button type="button" onClick={() => onSkip(1)} aria-label="下一首" title="下一首"><PlayerIcon source={nextIcon} /></button>
      </div>
      <div className={entry.platform === 'youtube' ? 'music-player-frame youtube-frame' : 'music-player-frame spotify-frame'}>
        <div ref={hostRef} className="music-player-embed" />
      </div>
    </aside>
  )
}

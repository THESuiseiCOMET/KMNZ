import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import type { MusicEntry } from '../data/music'
import type { PlaybackMode, PlayerObservation } from '../types/playback'
import { clampPlayerPosition } from '../lib/playerControls'
import type { PlayerPosition } from '../lib/playerControls'
import { useOfficialPlayer } from '../hooks/useOfficialPlayer'
import { getMusicMetadata } from '../data/musicMetadata'
import MusicCover from './MusicCover'
import previousIcon from '../assets/icons/skip-back.svg'
import nextIcon from '../assets/icons/skip-forward.svg'
import loopIcon from '../assets/icons/repeat-1.svg'
import playIcon from '../assets/icons/play.svg'
import pauseIcon from '../assets/icons/pause.svg'
import volumeIcon from '../assets/icons/volume-2.svg'
import mutedIcon from '../assets/icons/volume-x.svg'

interface PlayerDockProps {
  entry: MusicEntry
  onClose: () => void
  onSkip: (direction: -1 | 1) => void
  requestId?: number
  mode?: PlaybackMode
  onModeChange?: (mode: PlaybackMode) => void
  canPrevious?: boolean
  canNext?: boolean
  onEnded?: (requestId: number, sourceId: string) => void
  onObservation?: (observation: PlayerObservation) => void
}

function PlayerIcon({ source }: { source: string }) {
  const mask = `url("${source}")`
  return <span className="music-player-icon" style={{ maskImage: mask, WebkitMaskImage: mask }} aria-hidden="true" />
}

export default function PlayerDock({ entry, onClose, onSkip, requestId = 0, mode = 'sequence', onModeChange, canPrevious = true, canNext = true, onEnded, onObservation }: PlayerDockProps) {
  const loop = mode === 'repeat-one'
  const [position, setPosition] = useState<PlayerPosition | null>(null)
  const [dragging, setDragging] = useState(false)
  const [volumeOpen, setVolumeOpen] = useState(false)
  const volumeId = useId()
  const volumeControlRef = useRef<HTMLDivElement>(null)
  const volumeButtonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  const dragRef = useRef<{ pointerId: number; clientX: number; clientY: number; x: number; y: number } | null>(null)
  const { hostRef, ready, paused, togglePlayback, volume, setVolume, adjustVolume, toggleMute, canChangeSource, canRepeat, error } = useOfficialPlayer(entry, loop, () => onSkip(1), { requestId, onEnded, onObservation })

  useEffect(() => {
    setVolumeOpen(false)
  }, [entry.platform])

  useEffect(() => {
    if (!volumeOpen) return
    function closeOutside(event: globalThis.PointerEvent) {
      if (event.target instanceof Node && !volumeControlRef.current?.contains(event.target)) setVolumeOpen(false)
    }
    function closeWithEscape(event: globalThis.KeyboardEvent) {
      if (event.key !== 'Escape') return
      setVolumeOpen(false)
      volumeButtonRef.current?.focus({ preventScroll: true })
    }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeWithEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', closeWithEscape)
    }
  }, [volumeOpen])

  useEffect(() => {
    const control = volumeControlRef.current
    if (!control || !ready) return
    function changeWithWheel(event: WheelEvent) {
      if (event.deltaY === 0 || event.ctrlKey) return
      event.preventDefault()
      adjustVolume(event.deltaY < 0 ? 5 : -5)
    }
    control.addEventListener('wheel', changeWithWheel, { passive: false })
    return () => control.removeEventListener('wheel', changeWithWheel)
  }, [entry.platform, ready, adjustVolume])

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
          <strong>{entry.title}</strong>
        </button>
        <div className="music-player-actions">
          <button type="button" onClick={onClose} aria-label="关闭播放器并停止播放" title="关闭播放器">×</button>
        </div>
      </div>
      <div className="music-player-controls" role="group" aria-label="播放控制">
        <button type="button" className="music-player-loop" onClick={() => onModeChange?.(loop ? 'sequence' : 'repeat-one')} aria-label={loop ? '关闭单曲循环' : '开启单曲循环'} title={ready && canRepeat ? (loop ? '关闭单曲循环' : '开启单曲循环') : '循环控制暂不可用'} aria-pressed={loop} disabled={!ready || !canRepeat}><PlayerIcon source={loopIcon} /></button>
        <button type="button" onClick={() => onSkip(-1)} aria-label="上一首" title="上一首" disabled={!canPrevious || !canChangeSource}><PlayerIcon source={previousIcon} /></button>
        <button type="button" className="music-player-toggle" onClick={togglePlayback} disabled={!ready} aria-label={paused ? '播放歌曲' : '暂停歌曲'} title={error ?? (paused ? '播放' : '暂停')}><PlayerIcon source={paused ? playIcon : pauseIcon} /></button>
        <button type="button" onClick={() => onSkip(1)} aria-label="下一首" title="下一首" disabled={!canNext || !canChangeSource}><PlayerIcon source={nextIcon} /></button>
        {entry.platform === 'youtube' && (
          <div className="music-player-volume" ref={volumeControlRef}>
            <button
              ref={volumeButtonRef}
              type="button"
              aria-label="音量控制"
              title={'音量 ' + volume + '%'}
              aria-expanded={volumeOpen}
              aria-controls={volumeId}
              disabled={!ready}
              onClick={() => setVolumeOpen(!volumeOpen)}
            ><PlayerIcon source={volume === 0 ? mutedIcon : volumeIcon} /></button>
            {volumeOpen && (
              <div id={volumeId} className="music-player-volume-popover" role="group" aria-label="音量">
                <button type="button" onClick={toggleMute} aria-label={volume === 0 ? '恢复音量' : '静音'} title={volume === 0 ? '恢复音量' : '静音'} aria-pressed={volume === 0}>
                  <PlayerIcon source={volume === 0 ? mutedIcon : volumeIcon} />
                </button>
                <input type="range" min="0" max="100" step="1" value={volume} onChange={(event) => setVolume(Number(event.target.value))} aria-label="音量" aria-valuetext={volume + '%'} />
                <output>{volume}%</output>
              </div>
            )}
          </div>
        )}
      </div>
      {entry.platform === 'spotify' && <div className="music-player-spotify-cover" role="img" aria-label={entry.title + ' 封面'}>
        <MusicCover entry={entry} metadata={getMusicMetadata(entry)} />
      </div>}
      <div className={entry.platform === 'youtube' ? 'music-player-frame youtube-frame' : 'music-player-frame spotify-frame'}>
        <div ref={hostRef} className="music-player-embed" />
      </div>
    </aside>
  )
}

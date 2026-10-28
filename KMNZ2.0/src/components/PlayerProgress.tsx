import { useRef, useState } from 'react'
import type { CSSProperties, PointerEvent } from 'react'
import { formatPlaybackTime } from '../lib/playerControls'

interface PlayerProgressProps {
  currentTime: number
  duration: number
  canSeek: boolean
  onSeek: (seconds: number) => boolean
}

export default function PlayerProgress({ currentTime, duration, canSeek, onSeek }: PlayerProgressProps) {
  const [preview, setPreview] = useState<number | null>(null)
  const drag = useRef<{ pointerId: number; value: number } | null>(null)
  const available = canSeek && Number.isFinite(duration) && duration > 0
  const value = available ? Math.max(0, Math.min(duration, preview ?? currentTime)) : 0
  const currentLabel = formatPlaybackTime(value)
  const durationLabel = duration > 0 ? formatPlaybackTime(duration) : '--:--'

  function cancel() {
    drag.current = null
    setPreview(null)
  }

  function commit(event: PointerEvent<HTMLInputElement>) {
    const pending = drag.current
    if (!pending || pending.pointerId !== event.pointerId) return
    if (available) onSeek(pending.value)
    cancel()
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  return <div className="music-player-progress" role="group" aria-label="播放进度">
    <span className="music-player-time">{currentLabel}</span>
    <input type="range" min="0" max={available ? duration : 1} step="0.1" value={value}
      aria-label="播放进度" aria-valuetext={currentLabel + ' / ' + durationLabel} disabled={!available}
      style={{ '--playback-progress': (available ? value / duration * 100 : 0) + '%' } as CSSProperties}
      onPointerDown={event => {
        if (!available) return
        drag.current = { pointerId: event.pointerId, value: Number(event.currentTarget.value) }
        setPreview(Number(event.currentTarget.value))
        event.currentTarget.setPointerCapture(event.pointerId)
      }}
      onChange={event => {
        if (!available) return
        const next = Number(event.target.value)
        if (drag.current) {
          drag.current.value = next
          setPreview(next)
        } else onSeek(next)
      }}
      onPointerUp={commit} onPointerCancel={cancel} onLostPointerCapture={cancel} onBlur={cancel}
      onKeyDown={event => { if (event.key === 'Escape') cancel() }}
    />
    <span className="music-player-time">{durationLabel}</span>
  </div>
}

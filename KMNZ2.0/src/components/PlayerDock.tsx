import { useEffect, useLayoutEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { MusicEntry } from '../data/music'
import type { PlaybackMode, PlayerObservation, PlaybackResume, PlayerCheckpoint } from '../types/playback'
import { useOfficialPlayer } from '../hooks/useOfficialPlayer'
import PlayerProgress from './PlayerProgress'
import previousIcon from '../assets/icons/skip-back.svg'
import nextIcon from '../assets/icons/skip-forward.svg'
import loopIcon from '../assets/icons/repeat-1.svg'
import playIcon from '../assets/icons/play.svg'
import pauseIcon from '../assets/icons/pause.svg'
import volumeIcon from '../assets/icons/volume-2.svg'
import mutedIcon from '../assets/icons/volume-x.svg'

interface PlayerDockProps {
  entry: MusicEntry
  onLocate?: () => void
  onClose: () => void
  onSkip: (direction: -1 | 1) => void
  requestId?: number
  mode?: PlaybackMode
  onModeChange?: (mode: PlaybackMode) => void
  canPrevious?: boolean
  canNext?: boolean
  onEnded?: (requestId: number, sourceId: string) => void
  onObservation?: (observation: PlayerObservation) => void
  onCheckpoint?: (checkpoint: PlayerCheckpoint) => void
  resume?: PlaybackResume
  videoFrosted?: boolean
}

function PlayerIcon({ source }: { source: string }) {
  const mask = `url("${source}")`
  return <span className="music-player-icon" style={{ maskImage: mask, WebkitMaskImage: mask }} aria-hidden="true" />
}

export default function PlayerDock({ entry, onLocate, onClose, onSkip, requestId = 0, mode = 'sequence', onModeChange, canPrevious = true, canNext = true, onEnded, onObservation, onCheckpoint, resume, videoFrosted = true }: PlayerDockProps) {
  const spotify = entry.platform === 'spotify', loop = mode === 'repeat-one'
  const [volumeOpen, setVolumeOpen] = useState(false), volumeId = useId()
  const volumeControlRef = useRef<HTMLDivElement>(null), volumeButtonRef = useRef<HTMLButtonElement>(null)
  const mediaMount = useRef<HTMLDivElement>(null)
  const [controlHost, setControlHost] = useState<Element | null>(null)
  // The provider owns this DOM node for the entire session; navigation never replaces it.
  const [embedHost] = useState<HTMLDivElement | null>(() => { if (typeof document === 'undefined') return null; const element = document.createElement('div'); element.className = 'music-player-embed'; return element })
  const { hostRef, ready, paused, togglePlayback, volume, setVolume, adjustVolume, toggleMute, canChangeSource, canRepeat, error, currentTime, duration, canSeek, seekTo } = useOfficialPlayer(entry, loop, () => onSkip(1), { requestId, onEnded, onObservation, onCheckpoint, resume })
  hostRef.current = embedHost
  useLayoutEffect(() => {
    if (!embedHost) return
    setControlHost(document.querySelector('.header-player-slot'))
    const mount = spotify ? document.querySelector('.header-media-slot') : mediaMount.current
    mount?.appendChild(embedHost)
    return () => { embedHost.remove() }
  }, [spotify, embedHost])

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
  }, [entry.platform, ready, adjustVolume, controlHost])

  const chrome = <div className="is-cinema cinema-player-chrome">
      <div className="music-player-controls" role="group" aria-label={entry.title + ' · 播放控制'}>
        {!spotify && <button type="button" className="music-player-loop" onClick={() => onModeChange?.(loop ? 'sequence' : 'repeat-one')} aria-label={loop ? '关闭单曲循环' : '开启单曲循环'} title={ready && canRepeat ? (loop ? '关闭单曲循环' : '开启单曲循环') : '循环控制暂不可用'} aria-pressed={loop} disabled={!ready || !canRepeat}><PlayerIcon source={loopIcon} /></button>}
        <div className="music-player-primary">
        <button type="button" onClick={() => onSkip(-1)} aria-label="上一首" title="上一首" disabled={!canPrevious || !canChangeSource}><PlayerIcon source={previousIcon} /></button>
        <button type="button" className="music-player-toggle" onClick={togglePlayback} disabled={!ready} aria-label={paused ? '播放歌曲' : '暂停歌曲'} title={error ?? (paused ? '播放' : '暂停')}><PlayerIcon source={paused ? playIcon : pauseIcon} /></button>
        <button type="button" onClick={() => onSkip(1)} aria-label="下一首" title="下一首" disabled={!canNext || !canChangeSource}><PlayerIcon source={nextIcon} /></button>
        </div>
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
        <button type="button" className="music-player-locate" onClick={onLocate} disabled={!onLocate} aria-label="定位当前播放" title="在曲库定位当前播放">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="6.5" /><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" /><path d="M12 2v4m0 12v4M2 12h4m12 0h4" /></svg>
        </button>
        <button type="button" className="music-player-close" onClick={onClose} aria-label="关闭播放器并停止播放" title="关闭播放器">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
        </button>
      </div>
      {entry.platform === 'youtube' && <PlayerProgress key={entry.id + ':' + requestId}
        currentTime={currentTime} duration={duration} canSeek={canSeek} onSeek={seekTo} />}
    </div>
  return <aside className={'music-player-panel is-cinema' + (videoFrosted ? ' is-video-frosted' : '')} aria-label="当前音乐播放器">
    {controlHost && createPortal(chrome, controlHost)}
    {!spotify && <div ref={mediaMount} className="music-player-frame youtube-frame" />}
    {!spotify && <div className="cinema-video-glass" aria-hidden="true" />}
  </aside>
}

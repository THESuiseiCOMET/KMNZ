import type { PlaybackPreferences } from '../lib/playbackPreferences'

interface PlaybackControlsProps {
  floatingOnly?: boolean
  settings: PlaybackPreferences
  onChange: (settings: PlaybackPreferences) => void
  visualizationEnabled?: boolean
  visualizationPending?: boolean
  visualizationError?: string | null
  onStartVisualization?: () => void
  onStopVisualization?: () => void
}

export default function PlaybackControls({ settings, onChange, floatingOnly = false, visualizationEnabled = false, visualizationPending = false, visualizationError, onStartVisualization, onStopVisualization }: PlaybackControlsProps) {
  const cinema = !floatingOnly && settings.presentation === 'cinema'
  const frosted = cinema ? settings.cinemaVideoFrosted : settings.floatingBackgroundFrosted
  const active = visualizationEnabled || visualizationPending
  const modeLabel = floatingOnly ? 'Spotify 使用悬窗播放' : cinema ? '切换到浮窗模式' : '切换到影院模式'
  const frostLabel = cinema ? '视频磨砂' : '背景磨砂'
  return <>
    <button type="button" className="playback-control" aria-label={modeLabel} title={modeLabel} aria-pressed={cinema} disabled={floatingOnly} onClick={floatingOnly ? undefined : () => onChange({ ...settings, presentation: cinema ? 'floating' : 'cinema' })}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="4" width="18" height="15" rx="2" />
        {cinema ? <path d="m10 8 5 3.5-5 3.5Z" /> : <rect x="12" y="11" width="7" height="6" rx="1" />}
      </svg>
    </button>
    <button type="button" className="playback-control" role="switch" aria-label={frostLabel} title={frostLabel} aria-checked={frosted} onClick={() => onChange({ ...settings, [cinema ? 'cinemaVideoFrosted' : 'floatingBackgroundFrosted']: !frosted })}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><path d="M5 7h14M3 12h18M5 17h14" /><path d="M8 4v16M16 4v16" opacity=".35" /></svg>
    </button>
    <span className="visualizer-control">
      <button type="button" className="playback-control" role="switch" aria-label="音频可视化" aria-checked={active} aria-busy={visualizationPending || undefined} title={visualizationPending ? '等待标签页共享，点击取消' : active ? '关闭音频可视化' : '开启音频可视化'} onClick={active ? onStopVisualization : onStartVisualization}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><path d="M4 10v4m4-8v12m4-15v18m4-15v12m4-8v4" /></svg>
      </button>
      {visualizationError && <span className="visualizer-error" role="alert">{visualizationError}</span>}
    </span>
  </>
}

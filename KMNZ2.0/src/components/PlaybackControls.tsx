import type { PlaybackPreferences } from '../lib/playbackPreferences'

interface PlaybackControlsProps {
  background?: 'video' | 'cover'
  settings: PlaybackPreferences
  onChange: (settings: PlaybackPreferences) => void
  visualizationVisible?: boolean
  visualizationEnabled?: boolean
  visualizationPending?: boolean
  visualizationError?: string | null
  onStartVisualization?: () => void
  onStopVisualization?: () => void
}

export default function PlaybackControls({ settings, onChange, background = 'video', visualizationVisible = true, visualizationEnabled = false, visualizationPending = false, visualizationError, onStartVisualization, onStopVisualization }: PlaybackControlsProps) {
  const cover = background === 'cover'
  const frosted = cover ? settings.coverFrosted : settings.videoFrosted
  const active = visualizationEnabled || visualizationPending
  const closeVisualization = active && visualizationVisible
  const visualizationLabel = active && !visualizationVisible ? '在 MV 显示音频可视化' : visualizationPending ? '等待标签页共享，点击取消' : active ? '关闭音频可视化' : '开启音频可视化'
  const frostLabel = cover ? '背景磨砂' : '视频磨砂'
  return <>
    <span className="visualizer-control">
      <button type="button" className="playback-control" role="switch" aria-label="音频可视化" aria-checked={active} aria-busy={visualizationPending || undefined} title={visualizationLabel} onClick={closeVisualization ? onStopVisualization : onStartVisualization}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><path d="M4 10v4m4-8v12m4-15v18m4-15v12m4-8v4" /></svg>
      </button>
      {visualizationError && <span className="visualizer-error" role="alert">{visualizationError}</span>}
    </span>
    <button type="button" className="playback-control" role="switch" aria-label={frostLabel} title={frostLabel} aria-checked={frosted} onClick={() => onChange({ ...settings, [cover ? 'coverFrosted' : 'videoFrosted']: !frosted })}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><path d="M5 7h14M3 12h18M5 17h14" /><path d="M8 4v16M16 4v16" opacity=".35" /></svg>
    </button>
  </>
}

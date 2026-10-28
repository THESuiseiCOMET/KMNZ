import { useEffect, useRef } from 'react'
import type { PlaybackPreferences } from '../lib/playbackPreferences'
import type { AudioInputDevice, VisualizationAudioSource } from '../lib/audioCapture'
import type { AudioSignal } from '../lib/audioSignal'

interface PlaybackSettingsProps {
  open: boolean
  settings: PlaybackPreferences
  onChange: (settings: PlaybackPreferences) => void
  onClose: () => void
  visualizationEnabled?: boolean
  visualizationPending?: boolean
  visualizationError?: string | null
  onStartVisualization?: () => void
  onStopVisualization?: () => void
  audioSource?: VisualizationAudioSource
  onAudioSourceChange?: (source: VisualizationAudioSource) => void
  audioInputs?: AudioInputDevice[]
  loadingInputs?: boolean
  inputError?: string | null
  onReadInputs?: () => void
  audioSignal?: AudioSignal | null
  onResumeAudio?: () => void
}

function SettingIcon({ kind }: { kind: 'cinema' | 'floating' | 'background' | 'video' | 'visualizer' | 'audio' }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind === 'cinema' && <><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8m-4-4v4" /></>}
    {kind === 'floating' && <><rect x="3" y="4" width="18" height="16" rx="2" /><rect x="12" y="11" width="7" height="6" rx="1" /></>}
    {kind === 'background' && <><rect x="3" y="3" width="18" height="18" rx="3" /><path d="m4 16 5-5 5 5 3-3 4 4M8 7h.01M16 6v3m-2-1.5h4" /></>}
    {kind === 'video' && <><path d="m16 9 5-3v12l-5-3" /><rect x="3" y="6" width="13" height="12" rx="2" /><path d="M6 9v6m4-6v6m3-6v6" /></>}
    {kind === 'visualizer' && <path d="M3 10v4m4-7v10m5-14v18m5-14v10m4-7v4" />}
    {kind === 'audio' && <><path d="M4 4v16m8-16v16m8-16v16" /><path d="M1 8h6m2 8h6m2-8h6" /></>}
  </svg>
}

export default function PlaybackSettings({ open, settings, onChange, onClose, visualizationEnabled = false, visualizationPending = false, visualizationError, onStartVisualization, onStopVisualization,
  audioSource = { kind: 'tab' }, onAudioSourceChange, audioInputs = [], loadingInputs = false, inputError, onReadInputs, audioSignal, onResumeAudio }: PlaybackSettingsProps) {
  const root = useRef<HTMLDivElement>(null)
  const audioDetails = useRef<HTMLDetailsElement>(null)
  useEffect(() => {
    if (!open) {
      if (audioDetails.current) audioDetails.current.open = false
      return
    }
    function outside(event: PointerEvent) {
      if (event.target instanceof Node && !root.current?.closest('.header-settings')?.contains(event.target)) onClose()
    }
    function escape(event: KeyboardEvent) {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      event.stopPropagation()
      onClose()
      root.current?.closest('.header-settings')?.querySelector<HTMLButtonElement>('.settings-toggle')?.focus({ preventScroll: true })
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', escape)
    }
  }, [open, onClose])
  useEffect(() => {
    if (open && (visualizationError || inputError) && audioDetails.current) audioDetails.current.open = true
  }, [open, visualizationError, inputError])

  const cinema = settings.presentation === 'cinema'
  const active = visualizationEnabled || visualizationPending
  return <div ref={root} id="playback-settings" className="playback-settings" data-open={open} aria-hidden={!open} inert={!open}>
    <div className="playback-settings-icons" role="group" aria-label="播放设置">
      <button type="button" className="playback-setting-icon" aria-label={cinema ? '切换到浮窗模式' : '切换到影院模式'} title={cinema ? '影院模式 · 点击切换浮窗' : '浮窗模式 · 点击切换影院'} aria-pressed={cinema}
        onClick={() => onChange({ ...settings, presentation: cinema ? 'floating' : 'cinema' })}><SettingIcon kind={cinema ? 'cinema' : 'floating'} /></button>
      <button type="button" className="playback-setting-icon" role="switch" aria-label="背景磨砂" title="背景磨砂" aria-checked={settings.frosted[settings.presentation]}
        onClick={() => onChange({ ...settings, frosted: { ...settings.frosted, [settings.presentation]: !settings.frosted[settings.presentation] } })}><SettingIcon kind="background" /></button>
      {cinema && <button type="button" className="playback-setting-icon" role="switch" aria-label="视频磨砂" title="视频磨砂" aria-checked={settings.cinemaVideoFrosted}
        onClick={() => onChange({ ...settings, cinemaVideoFrosted: !settings.cinemaVideoFrosted })}><SettingIcon kind="video" /></button>}
      <button type="button" className="playback-setting-icon" role="switch" aria-label="音频可视化" title={visualizationPending ? '取消连接音频' : '音频可视化'} aria-checked={active} aria-busy={visualizationPending} disabled={loadingInputs}
        onClick={() => { if (active) onStopVisualization?.(); else onStartVisualization?.() }}><SettingIcon kind="visualizer" /></button>
      <details ref={audioDetails} className="playback-audio-options">
        <summary className="playback-setting-icon" aria-label="音频来源" title="音频来源"><SettingIcon kind="audio" /></summary>
        <div className="playback-settings-audio-panel">
          <div className="playback-settings-visualizer">
      <label className="playback-settings-input">
        <span>音频来源</span>
        <select value={audioSource.kind} disabled={active || loadingInputs}
          onChange={event => onAudioSourceChange?.(event.target.value === 'input' ? { kind: 'input', deviceId: '' } : { kind: 'tab' })}>
          <option value="tab">标签页共享</option>
          <option value="input">音频输入（立体声混音）</option>
        </select>
      </label>
      {audioSource.kind === 'input' && <div className="playback-settings-input-devices">
        <button type="button" onClick={onReadInputs} disabled={visualizationEnabled || visualizationPending || loadingInputs}>{loadingInputs ? '读取设备中…' : '读取输入设备'}</button>
        <label className="playback-settings-input">
          <span>输入设备</span>
          <select value={audioSource.deviceId} disabled={visualizationEnabled || visualizationPending || loadingInputs || !audioInputs.length}
            onChange={event => onAudioSourceChange?.({ kind: 'input', deviceId: event.target.value })}>
            <option value="">选择输入设备</option>
            {audioInputs.map(device => <option key={device.deviceId} value={device.deviceId}>{device.label}</option>)}
          </select>
        </label>
        <p>首次授权会短暂访问默认输入以读取设备名称，随后立即关闭。请选择立体声混音或虚拟音频设备。</p>
        {inputError && <p role="alert">{inputError}</p>}
      </div>}
      {visualizationPending && <p role="status">{audioSource.kind === 'input' ? '连接音频输入…' : '等待音频共享…'}</p>}
      {visualizationEnabled && audioSignal && <div className="audio-input-signal">
        <div className="audio-input-level">
          <span>输入电平</span>
          <meter aria-label="音频输入电平" min={-90} max={0} value={Math.max(-90, audioSignal.decibels)} />
          <output>{audioSignal.decibels <= -90 ? '−∞' : audioSignal.decibels.toFixed(0)} dBFS</output>
        </div>
        <p role="status">{{ waiting: '等待音频信号', receiving: '正在接收音频', silent: '未收到有效音频', muted: '输入设备暂未提供声音', suspended: '音频分析已暂停' }[audioSignal.status]}</p>
        {audioSignal.status === 'silent' && audioSource.kind === 'input' && <p>立体声混音只能接收对应声卡的输出。使用 USB／蓝牙／HDMI 耳机时，请检查音频路由。</p>}
        {audioSignal.status === 'suspended' && <button type="button" onClick={onResumeAudio}>恢复音频分析</button>}
      </div>}
      <p>{audioSource.kind === 'tab' ? '选择当前标签页，并勾选共享标签页音频。' : '仅分析所选输入，不播放或上传采集到的声音。'}</p>
      {visualizationError && <p role="alert">{visualizationError}</p>}
          </div>
        </div>
      </details>
    </div>
  </div>
}

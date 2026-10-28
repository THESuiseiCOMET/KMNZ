import { useEffect, useId, useRef } from 'react'
import type { PlaybackPreferences, PlayerPresentation } from '../lib/playbackPreferences'
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

export default function PlaybackSettings({ open, settings, onChange, onClose, visualizationEnabled = false, visualizationPending = false, visualizationError, onStartVisualization, onStopVisualization,
  audioSource = { kind: 'tab' }, onAudioSourceChange, audioInputs = [], loadingInputs = false, inputError, onReadInputs, audioSignal, onResumeAudio }: PlaybackSettingsProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal()
    else if (!open && dialog.current?.open) dialog.current.close()
  }, [open])

  function choose(presentation: PlayerPresentation) { onChange({ ...settings, presentation }) }
  return <dialog ref={dialog} className="playback-settings" aria-labelledby={titleId}
    onCancel={onClose} onClose={onClose} onClick={event => { if (event.target === event.currentTarget) onClose() }}>
    <div className="playback-settings-heading">
      <h2 id={titleId}>播放设置</h2>
      <button type="button" className="playback-settings-close" onClick={onClose} aria-label="关闭播放设置">×</button>
    </div>
    <fieldset className="playback-settings-modes">
      <legend>播放模式</legend>
      {([['floating', '浮窗模式'], ['cinema', '影院模式']] as const).map(([value, label]) => <label key={value}>
        <input type="radio" name="player-presentation" value={value} checked={settings.presentation === value} onChange={() => choose(value)} />
        <span>{label}</span>
      </label>)}
    </fieldset>
    <label className="playback-settings-frosted">
      <span>背景磨砂</span>
      <input type="checkbox" role="switch" checked={settings.frosted[settings.presentation]}
        onChange={event => onChange({ ...settings, frosted: { ...settings.frosted, [settings.presentation]: event.target.checked } })} />
    </label>
    {settings.presentation === 'cinema' && <label className="playback-settings-frosted">
      <span>视频磨砂</span>
      <input type="checkbox" role="switch" checked={settings.cinemaVideoFrosted}
        onChange={event => onChange({ ...settings, cinemaVideoFrosted: event.target.checked })} />
    </label>}
    <div className="playback-settings-visualizer">
      <label className="playback-settings-frosted">
        <span>音频可视化</span>
        <input type="checkbox" role="switch" checked={visualizationEnabled || visualizationPending} disabled={loadingInputs}
          onChange={event => { if (event.target.checked) onStartVisualization?.(); else onStopVisualization?.() }} />
      </label>
      <label className="playback-settings-input">
        <span>音频来源</span>
        <select value={audioSource.kind} disabled={visualizationEnabled || visualizationPending || loadingInputs}
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
  </dialog>
}

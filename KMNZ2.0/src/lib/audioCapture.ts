export interface AudioCaptureSession {
  analyser: AnalyserNode
  sampleRate: number
  sourceKind: VisualizationAudioSource['kind']
  getState(): { context: AudioContextState; muted: boolean }
  resume(): Promise<void>
  onEnded(callback: () => void): void
  stop(): void
}

export type VisualizationAudioSource = { kind: 'tab' } | { kind: 'input'; deviceId: string }
export interface AudioInputDevice { deviceId: string; label: string }

interface AnalysisEnvironment {
  createContext(): AudioContext
  audioStream(tracks: MediaStreamTrack[]): MediaStream
}
interface CaptureEnvironment extends AnalysisEnvironment {
  getDisplayMedia(options: DisplayMediaStreamOptions): Promise<MediaStream>
}
interface AudioInputEnvironment extends AnalysisEnvironment {
  getUserMedia(options: MediaStreamConstraints): Promise<MediaStream>
  enumerateDevices(): Promise<MediaDeviceInfo[]>
}

export function browserCaptureEnvironment(): CaptureEnvironment {
  if (!navigator.mediaDevices?.getDisplayMedia || typeof AudioContext === 'undefined') {
    throw new Error('当前浏览器不支持标签页音频共享，请使用桌面版 Chrome 或 Edge。')
  }
  return {
    getDisplayMedia: options => navigator.mediaDevices.getDisplayMedia(options),
    createContext: () => new AudioContext(),
    audioStream: tracks => new MediaStream(tracks),
  }
}

function browserAudioInputEnvironment(): AudioInputEnvironment {
  if (!navigator.mediaDevices?.getUserMedia || !navigator.mediaDevices.enumerateDevices || typeof AudioContext === 'undefined') {
    throw new Error('当前浏览器不支持音频输入，请使用 HTTPS 或本机预览。')
  }
  return {
    getUserMedia: options => navigator.mediaDevices.getUserMedia(options),
    enumerateDevices: () => navigator.mediaDevices.enumerateDevices(),
    createContext: () => new AudioContext(),
    audioStream: tracks => new MediaStream(tracks),
  }
}

export async function readAudioInputs(environment: AudioInputEnvironment = browserAudioInputEnvironment()): Promise<AudioInputDevice[]> {
  let devices = await environment.enumerateDevices()
  if (!devices.some(device => device.kind === 'audioinput' && device.label && !['default', 'communications'].includes(device.deviceId))) {
    const temporary = await environment.getUserMedia({ audio: true, video: false })
    try { devices = await environment.enumerateDevices() }
    finally { temporary.getTracks().forEach(track => track.stop()) }
  }
  const seen = new Set<string>()
  return devices.filter(device => {
    if (device.kind !== 'audioinput' || !device.deviceId || ['default', 'communications'].includes(device.deviceId) || seen.has(device.deviceId)) return false
    seen.add(device.deviceId)
    return true
  }).map((device, index) => ({ deviceId: device.deviceId, label: device.label || `音频输入 ${index + 1}` }))
}

export async function captureTabAudio(environment: CaptureEnvironment = browserCaptureEnvironment()): Promise<AudioCaptureSession> {
  const options = {
    video: { displaySurface: 'browser' },
    audio: { suppressLocalAudioPlayback: false },
    preferCurrentTab: true,
    selfBrowserSurface: 'include',
    systemAudio: 'exclude',
    surfaceSwitching: 'exclude',
  } as DisplayMediaStreamOptions
  const stream = await environment.getDisplayMedia(options)
  return analyseStream(stream, environment, { kind: 'tab' })
}

export async function captureInputAudio(deviceId: string, environment: AudioInputEnvironment = browserAudioInputEnvironment()): Promise<AudioCaptureSession> {
  if (!deviceId.trim() || ['default', 'communications'].includes(deviceId)) throw new Error('请明确选择立体声混音或虚拟音频设备。')
  const stream = await environment.getUserMedia({
    video: false,
    audio: { deviceId: { exact: deviceId }, echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  })
  return analyseStream(stream, environment, { kind: 'input', deviceId })
}

async function analyseStream(stream: MediaStream, environment: AnalysisEnvironment, selected: VisualizationAudioSource): Promise<AudioCaptureSession> {
  let context: AudioContext | undefined
  let source: MediaStreamAudioSourceNode | undefined
  let analyser: AnalyserNode | undefined
  let stopped = false
  let ended: (() => void) | undefined
  const tracks = stream.getTracks()
  const stop = () => {
    if (stopped) return
    stopped = true
    tracks.forEach(track => { track.removeEventListener('ended', handleEnded); if (track.readyState !== 'ended') track.stop() })
    source?.disconnect()
    analyser?.disconnect()
    if (context && context.state !== 'closed') void context.close().catch(() => {})
  }
  function handleEnded() { if (stopped) return; stop(); ended?.() }
  try {
    if (selected.kind === 'tab') {
      const surface = stream.getVideoTracks()[0]?.getSettings().displaySurface
      if (surface && surface !== 'browser') throw new Error('请选择当前浏览器标签页，不要共享整个屏幕或窗口。')
    }
    const audio = stream.getAudioTracks().filter(track => track.readyState === 'live')
    if (!audio.length) throw new Error(selected.kind === 'tab' ? '没有取得音轨。请选择当前标签页，并勾选共享标签页音频。' : '所选输入没有可用音轨，请重新选择音频设备。')
    const actualDevice = audio[0].getSettings().deviceId
    if (selected.kind === 'input' && actualDevice && actualDevice !== selected.deviceId) throw new Error('音频输入设备不匹配，请重新选择。')
    context = environment.createContext()
    analyser = context.createAnalyser()
    analyser.fftSize = 2048
    analyser.smoothingTimeConstant = .55
    analyser.minDecibels = -85
    analyser.maxDecibels = -20
    source = context.createMediaStreamSource(environment.audioStream(audio))
    source.connect(analyser)
    await context.resume()
    if (tracks.some(track => track.readyState !== 'live')) throw new Error(selected.kind === 'tab' ? '音频共享已结束，请重新开启。' : '音频输入已断开，请重新选择设备。')
    // Keep only audio: visible tab capture forces Chromium's fullscreen-within-tab.
    if (selected.kind === 'tab') stream.getVideoTracks().forEach(track => track.stop())
    audio.forEach(track => track.addEventListener('ended', handleEnded))
    return {
      analyser, sampleRate: context.sampleRate, sourceKind: selected.kind,
      getState: () => ({ context: context!.state, muted: audio.some(track => track.muted) }),
      async resume() { if (!stopped && context!.state !== 'closed') await context!.resume() },
      onEnded(callback) { ended = callback }, stop,
    }
  } catch (error) { stop(); throw error }
}

export function captureErrorMessage(error: unknown, source: VisualizationAudioSource['kind'] = 'tab'): string {
  const name = error instanceof Error ? error.name : ''
  if (source === 'input') {
    if (name === 'NotAllowedError' || name === 'AbortError') return '未获得音频输入权限，请允许访问后重试。'
    if (name === 'NotFoundError' || name === 'OverconstrainedError') return '所选输入不可用，请启用立体声混音后刷新设备列表。'
    if (name === 'NotReadableError') return '无法读取所选输入，请检查设备是否被其他程序独占。'
  }
  if (name === 'NotAllowedError' || name === 'AbortError') return '未开启音频共享，可重新选择当前标签页。'
  if (name === 'NotReadableError') return '无法读取标签页音频，请检查浏览器的共享设置。'
  return error instanceof Error ? error.message : '无法取得标签页音频。'
}

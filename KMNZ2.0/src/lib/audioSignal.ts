import type { AudioCaptureSession } from './audioCapture'
import { audioLevel, audioSignalThreshold } from './audioGeometry'

export interface AudioSignal {
  status: 'waiting' | 'receiving' | 'silent' | 'muted' | 'suspended'
  decibels: number
}

interface SignalClock {
  now(): number
  repeat(callback: () => void): () => void
}

export function monitorAudioSignal(session: AudioCaptureSession, update: (signal: AudioSignal) => void, clock: SignalClock = {
  now: () => performance.now(),
  repeat(callback) { const timer = window.setInterval(callback, 120); return () => window.clearInterval(timer) },
}): () => void {
  const waveform = new Float32Array(session.analyser.fftSize)
  const started = clock.now()
  let lastSignal: number | null = null
  function sample() {
    const state = session.getState()
    if (state.context !== 'running' || state.muted) {
      lastSignal = null
      update({ status: state.context !== 'running' ? 'suspended' : 'muted', decibels: -100 })
      return
    }
    session.analyser.getFloatTimeDomainData(waveform)
    const { rms, decibels } = audioLevel(waveform, 'float')
    const now = clock.now()
    if (rms >= audioSignalThreshold) lastSignal = now
    update({ status: lastSignal !== null && now - lastSignal < 800 ? 'receiving' : now - started < 3000 ? 'waiting' : 'silent', decibels })
  }
  sample()
  return clock.repeat(sample)
}

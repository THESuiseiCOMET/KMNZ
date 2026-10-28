export interface AudioPoint { x: number; y: number }
export interface AudioShape {
  rms: number
  bass: number
  ring: AudioPoint[]
}

export const audioSignalThreshold = .0003

export function audioLevel(waveform: ArrayLike<number>, format: 'byte' | 'float' = 'byte') {
  if (!waveform.length) return { rms: 0, peak: 0, mean: 0, decibels: -100 }
  const sample = (i: number) => {
    const value = format === 'float' ? waveform[i] : ((waveform[i] ?? 128) - 128) / 128
    return Number.isFinite(value) ? Math.max(-1, Math.min(1, value)) : 0
  }
  let mean = 0
  for (let i = 0; i < waveform.length; i++) mean += sample(i)
  mean /= waveform.length
  let power = 0, peak = 0
  for (let i = 0; i < waveform.length; i++) {
    const value = sample(i) - mean
    power += value ** 2
    peak = Math.max(peak, Math.abs(value))
  }
  const rms = Math.sqrt(power / waveform.length)
  return { rms, peak, mean, decibels: Math.max(-100, Math.min(0, 20 * Math.log10(Math.max(rms, 1e-5)))) }
}

export function audioShape(spectrum: ArrayLike<number>, waveform: ArrayLike<number>, sampleRate: number, format: 'byte' | 'float' = 'byte'): AudioShape {
  if (!spectrum.length || !waveform.length || !Number.isFinite(sampleRate) || sampleRate <= 0) return { rms: 0, bass: 0, ring: [] }
  const { rms, mean } = audioLevel(waveform, format)
  const sample = (i: number) => {
    const value = format === 'float' ? waveform[i % waveform.length] : ((waveform[i % waveform.length] ?? 128) - 128) / 128
    return (Number.isFinite(value) ? Math.max(-1, Math.min(1, value)) : 0) - mean
  }
  if (rms < audioSignalThreshold) return { rms, bass: 0, ring: [] }
  const bin = (hz: number) => Math.min(spectrum.length - 1, Math.max(0, Math.floor(hz / (sampleRate / 2) * spectrum.length)))
  const level = (i: number) => Math.max(0, Math.min(1, (spectrum[i] ?? 0) / 255))
  let bass = 0
  const end = bin(180)
  for (let i = bin(35); i <= end; i++) bass += level(i)
  bass /= Math.max(1, end - bin(35) + 1)
  const ring: AudioPoint[] = []
  for (let i = 0; i < 256; i++) {
    const angle = i / 256 * Math.PI * 2 - Math.PI / 2
    const hz = 40 * (Math.min(16000, sampleRate / 2) / 40) ** (i / 255)
    const radius = 1 + bass * .14 + level(bin(hz)) ** 1.8 * .55 + Math.abs(sample(i * 4)) * .12
    ring.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius })
  }
  return { rms, bass, ring }
}

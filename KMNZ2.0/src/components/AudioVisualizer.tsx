import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import type { AudioCaptureSession } from '../lib/audioCapture'
import { audioShape, audioSignalThreshold } from '../lib/audioGeometry'
import { createTempoDetector, defaultRotationSpeed, smoothRotationSpeed, tempoRotationSpeed } from '../lib/audioTempo'
import logoBlack from '../assets/images/KMNZLOGOB.webp'
import logoWhite from '../assets/images/KMNZLOGOW.webp'

const rotationKey = 'kmnzVisualizerRotation:v1'
let rememberedAngle = 0

function readAngle() {
  try {
    const stored = window.sessionStorage.getItem(rotationKey)
    const angle = stored === null ? rememberedAngle : Number(stored)
    if (Number.isFinite(angle)) rememberedAngle = ((angle % 360) + 360) % 360
  } catch { /* unavailable */ }
  return rememberedAngle
}

function saveAngle(angle: number) {
  rememberedAngle = ((angle % 360) + 360) % 360
  try { window.sessionStorage.setItem(rotationKey, String(rememberedAngle)) } catch { /* unavailable */ }
}

interface AudioVisualizerProps {
  session: AudioCaptureSession | null
  theme: 'light' | 'dark'
  tempoReadoutRef?: RefObject<HTMLOutputElement | null>
}

export default function AudioVisualizer({ session, theme, tempoReadoutRef }: AudioVisualizerProps) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const logo = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const element = canvas.current
    const context = element?.getContext('2d')
    if (!element || !context) return
    const frequency = new Uint8Array(session?.analyser.frequencyBinCount ?? 0)
    const waveform = new Float32Array(session?.analyser.fftSize ?? 0)
    const tempo = createTempoDetector()
    let rotationSpeed = defaultRotationSpeed
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    let width = 0, height = 0, scale = 1, raf = 0, angle = readAngle(), last: number | null = null
    function resize() {
      const rect = element!.getBoundingClientRect()
      width = rect.width; height = rect.height
      scale = Math.min(window.devicePixelRatio || 1, 2)
      element!.width = Math.round(width * scale); element!.height = Math.round(height * scale)
      if (logo.current) logo.current.style.width = Math.min(Math.min(width, height) * .50, 380) + 'px'
    }
    if (logo.current) logo.current.style.transform = `rotate(${angle}deg)`
    const persist = () => saveAngle(angle)
    window.addEventListener('pagehide', persist)
    const observer = new ResizeObserver(resize)
    observer.observe(element)
    resize()
    function draw(time: number) {
      session?.analyser.getByteFrequencyData(frequency)
      session?.analyser.getFloatTimeDomainData(waveform)
      const shape = session ? audioShape(frequency, waveform, session.sampleRate, 'float') : null
      const state = session?.getState()
      const signal = shape && shape.rms >= audioSignalThreshold && state?.context === 'running' && !state.muted
      const bpm = tempo.update(time, shape?.rms ?? 0, shape?.bass ?? 0, state?.context === 'running' && !state.muted, frequency, session?.sampleRate)
      const label = bpm === null ? 'BPM —' : `≈ ${Math.round(bpm)} BPM`
      if (tempoReadoutRef?.current && tempoReadoutRef.current.textContent !== label) tempoReadoutRef.current.textContent = label
      const elapsed = last === null ? 0 : Math.max(0, Math.min(time - last, 50))
      rotationSpeed = smoothRotationSpeed(rotationSpeed, tempoRotationSpeed(bpm), elapsed)
      if (!reduced.matches) angle = (angle + elapsed * rotationSpeed / 1000) % 360
      if (logo.current) logo.current.style.transform = `rotate(${angle}deg)`
      last = time
      context!.setTransform(scale, 0, 0, scale, 0, 0)
      context!.clearRect(0, 0, width, height)
      const radius = Math.min(width, height) * .325
      context!.translate(width / 2, height / 2)
      context!.rotate(angle * Math.PI / 180)
      context!.strokeStyle = theme === 'dark' ? '#f0efeb' : '#171717'
      context!.lineJoin = 'round'
      const strength = reduced.matches ? .65 : 1
      context!.globalAlpha = .99 * strength
      context!.lineWidth = 4
      context!.beginPath()
      if (signal && shape?.ring.length) {
        shape.ring.forEach((point, index) => {
          const x = point.x * radius, y = point.y * radius
          if (index === 0) context!.moveTo(x, y); else context!.lineTo(x, y)
        })
        context!.closePath()
      } else context!.arc(0, 0, radius, 0, Math.PI * 2)
      context!.stroke()
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => {
      persist()
      window.removeEventListener('pagehide', persist)
      cancelAnimationFrame(raf)
      observer.disconnect()
    }
  }, [session, theme, tempoReadoutRef])

  return <section className="audio-visualizer" aria-label="音频可视化">
    <canvas ref={canvas} aria-hidden="true" />
    <div className="audio-visualizer-logo"><img ref={logo} src={theme === 'dark' ? logoWhite : logoBlack} alt="" draggable={false} /></div>
  </section>
}

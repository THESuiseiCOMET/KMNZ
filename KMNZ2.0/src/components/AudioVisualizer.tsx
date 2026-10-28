import { useEffect, useRef } from 'react'
import type { AudioCaptureSession } from '../lib/audioCapture'
import { audioShape, audioSignalThreshold } from '../lib/audioGeometry'
import logoBlack from '../assets/images/kmnz-logo-black.svg'
import logoWhite from '../assets/images/kmnz-logo-white.svg'

interface AudioVisualizerProps {
  session: AudioCaptureSession
  theme: 'light' | 'dark'
}

export default function AudioVisualizer({ session, theme }: AudioVisualizerProps) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const logo = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const element = canvas.current
    const context = element?.getContext('2d')
    if (!element || !context) return
    const frequency = new Uint8Array(session.analyser.frequencyBinCount)
    const waveform = new Float32Array(session.analyser.fftSize)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    let width = 0, height = 0, scale = 1, raf = 0, angle = 0, last = 0
    function resize() {
      const rect = element!.getBoundingClientRect()
      width = rect.width; height = rect.height
      scale = Math.min(window.devicePixelRatio || 1, 2)
      element!.width = Math.round(width * scale); element!.height = Math.round(height * scale)
      if (logo.current) logo.current.style.width = Math.min(Math.min(width, height) * .35, 380) + 'px'
    }
    const observer = new ResizeObserver(resize)
    observer.observe(element)
    resize()
    function draw(time: number) {
      session.analyser.getByteFrequencyData(frequency)
      session.analyser.getFloatTimeDomainData(waveform)
      const shape = audioShape(frequency, waveform, session.sampleRate, 'float')
      const state = session.getState()
      const signal = shape.rms >= audioSignalThreshold && state.context === 'running' && !state.muted
      context!.setTransform(scale, 0, 0, scale, 0, 0)
      context!.clearRect(0, 0, width, height)
      const radius = Math.min(width, height) * .235
      context!.translate(width / 2, height / 2)
      context!.strokeStyle = theme === 'dark' ? '#f0efeb' : '#171717'
      context!.lineJoin = 'round'
      const strength = reduced.matches ? .65 : 1
      if (signal && shape.ring.length) {
        context!.globalAlpha = .78 * strength
        context!.lineWidth = 1.5
        context!.beginPath()
        shape.ring.forEach((point, index) => {
          const x = point.x * radius, y = point.y * radius
          if (index === 0) context!.moveTo(x, y); else context!.lineTo(x, y)
        })
        context!.closePath()
        context!.stroke()
      }
      if (signal && !reduced.matches && last) angle += Math.min(time - last, 50) * .0024
      if (logo.current) logo.current.style.transform = `rotate(${angle}deg)`
      last = time
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(raf); observer.disconnect() }
  }, [session, theme])

  return <section className="audio-visualizer" aria-label="音频可视化">
    <canvas ref={canvas} aria-hidden="true" />
    <div className="audio-visualizer-logo"><img ref={logo} src={theme === 'dark' ? logoWhite : logoBlack} alt="" draggable={false} /></div>
  </section>
}

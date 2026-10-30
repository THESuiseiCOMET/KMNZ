import { useCallback, useEffect, useRef, useState } from 'react'
import { captureErrorMessage, captureTabAudio } from '../lib/audioCapture'
import type { AudioCaptureSession } from '../lib/audioCapture'
import { monitorAudioSignal } from '../lib/audioSignal'
import type { AudioSignal } from '../lib/audioSignal'

export function useAudioVisualizer() {
  const [session, setSession] = useState<AudioCaptureSession | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [signal, setSignal] = useState<AudioSignal | null>(null)
  const current = useRef<AudioCaptureSession | null>(null)
  const request = useRef(0)
  const busy = useRef(false)
  const stop = useCallback(() => {
    ++request.current
    current.current?.stop()
    current.current = null
    busy.current = false
    setSession(null)
    setSignal(null)
    setPending(false)
    setError(null)
  }, [])
  useEffect(() => {
    if (!session) return
    return monitorAudioSignal(session, setSignal)
  }, [session])
  const resume = useCallback(async () => {
    try { await current.current?.resume(); setError(null) }
    catch { setError('无法恢复音频分析，请关闭后重新开启。') }
  }, [])
  const start = useCallback(async () => {
    if (busy.current || current.current) return false
    busy.current = true
    const id = ++request.current
    setPending(true)
    setError(null)
    try {
      const next = await captureTabAudio()
      if (id !== request.current) { next.stop(); return false }
      current.current = next
      next.onEnded(stop)
      setSession(next)
      return true
    } catch (reason) {
      if (id === request.current) {
        const cancelled = reason instanceof Error && (reason.name === 'NotAllowedError' || reason.name === 'AbortError')
        setError(cancelled ? null : captureErrorMessage(reason, 'tab'))
      }
      return false
    } finally {
      if (id === request.current) { busy.current = false; setPending(false) }
    }
  }, [stop])
  useEffect(() => () => { ++request.current; current.current?.stop() }, [])
  return { session, pending, error, start, stop, signal, resume }
}

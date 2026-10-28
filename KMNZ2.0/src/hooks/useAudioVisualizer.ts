import { useCallback, useEffect, useRef, useState } from 'react'
import { captureErrorMessage, captureInputAudio, captureTabAudio, readAudioInputs } from '../lib/audioCapture'
import type { AudioCaptureSession, AudioInputDevice, VisualizationAudioSource } from '../lib/audioCapture'
import { monitorAudioSignal } from '../lib/audioSignal'
import type { AudioSignal } from '../lib/audioSignal'

export function useAudioVisualizer() {
  const [session, setSession] = useState<AudioCaptureSession | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [signal, setSignal] = useState<AudioSignal | null>(null)
  const [inputs, setInputs] = useState<AudioInputDevice[]>([])
  const [loadingInputs, setLoadingInputs] = useState(false)
  const [inputError, setInputError] = useState<string | null>(null)
  const current = useRef<AudioCaptureSession | null>(null)
  const request = useRef(0)
  const busy = useRef(false)
  const inputRequest = useRef(0)
  const readingInputs = useRef(false)
  const stop = useCallback(() => {
    ++request.current
    ++inputRequest.current
    current.current?.stop()
    current.current = null
    busy.current = false
    setSession(null)
    setSignal(null)
    setPending(false)
    readingInputs.current = false
    setLoadingInputs(false)
  }, [])
  useEffect(() => {
    if (!session) return
    return monitorAudioSignal(session, setSignal)
  }, [session])
  const resume = useCallback(async () => {
    try { await current.current?.resume(); setError(null) }
    catch { setError('无法恢复音频分析，请关闭后重新开启。') }
  }, [])
  const start = useCallback(async (source: VisualizationAudioSource = { kind: 'tab' }) => {
    if (busy.current || current.current || readingInputs.current) return false
    busy.current = true
    const id = ++request.current
    setPending(true)
    setError(null)
    try {
      const next = source.kind === 'tab' ? await captureTabAudio() : await captureInputAudio(source.deviceId)
      if (id !== request.current) { next.stop(); return false }
      current.current = next
      next.onEnded(() => { stop(); setError(source.kind === 'tab' ? '音频共享已结束。' : '音频输入已断开，请重新选择设备。') })
      setSession(next)
      return true
    } catch (reason) {
      if (id === request.current) setError(captureErrorMessage(reason, source.kind))
      return false
    } finally {
      if (id === request.current) { busy.current = false; setPending(false) }
    }
  }, [stop])
  const refreshInputs = useCallback(async () => {
    if (readingInputs.current || busy.current || current.current) return
    readingInputs.current = true
    const id = ++inputRequest.current
    setLoadingInputs(true)
    setInputError(null)
    try {
      const next = await readAudioInputs()
      if (id !== inputRequest.current) return
      setInputs(next)
      if (!next.length) setInputError('未发现可用输入，请在 Windows 中启用立体声混音后刷新。')
    } catch (reason) {
      if (id === inputRequest.current) { setInputs([]); setInputError(captureErrorMessage(reason, 'input')) }
    } finally {
      if (id === inputRequest.current) { readingInputs.current = false; setLoadingInputs(false) }
    }
  }, [])
  useEffect(() => () => { ++request.current; ++inputRequest.current; current.current?.stop() }, [])
  return { session, pending, error, start, stop, inputs, loadingInputs, inputError, refreshInputs, signal, resume }
}

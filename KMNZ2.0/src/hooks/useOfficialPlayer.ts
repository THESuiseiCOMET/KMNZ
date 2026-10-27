import { useCallback, useEffect, useRef, useState } from 'react'
import { getEmbedUrl } from '../data/music'
import type { MusicEntry } from '../data/music'
import { loadSpotifyApi, loadYouTubeApi } from '../lib/playerApi'
import type { PlayerObservation } from '../types/playback'

interface PlayerAdapter {
  play(): void
  pause(): void
  select(entry: MusicEntry, requestId: number): void
  setVolume?(volume: number): void
  destroy(): void
}

interface VolumeSettings { value: number; previous: number }
const volumeKey = 'kmnzPlayerVolume'

function readVolume(): VolumeSettings {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(volumeKey) ?? 'null')
    if (saved && typeof saved === 'object' && 'value' in saved && 'previous' in saved
      && typeof saved.value === 'number' && Number.isFinite(saved.value)
      && typeof saved.previous === 'number' && Number.isFinite(saved.previous)) {
      return {
        value: Math.max(0, Math.min(100, Math.round(saved.value))),
        previous: Math.max(1, Math.min(100, Math.round(saved.previous))),
      }
    }
  } catch { /* unavailable */ }
  return { value: 70, previous: 70 }
}

function createFrame(entry: MusicEntry): HTMLIFrameElement {
  const frame = document.createElement('iframe')
  const url = new URL(getEmbedUrl(entry))
  if (entry.platform === 'youtube') {
    url.searchParams.set('enablejsapi', '1')
    url.searchParams.set('origin', window.location.origin)
    url.searchParams.set('controls', '0')
  }
  frame.src = url.toString()
  frame.title = entry.title + ' · ' + entry.platform + ' 播放器'
  frame.allow = 'autoplay; encrypted-media; clipboard-write; fullscreen; picture-in-picture'
  frame.referrerPolicy = 'strict-origin-when-cross-origin'
  frame.allowFullscreen = true
  return frame
}

export interface OfficialPlayerOptions {
  requestId: number
  onEnded?: (requestId: number, sourceId: string) => void
  onObservation?: (observation: PlayerObservation) => void
}

export function useOfficialPlayer(entry: MusicEntry, loop: boolean, onNext: () => void, options?: OfficialPlayerOptions) {
  const hostRef = useRef<HTMLDivElement>(null)
  const adapterRef = useRef<PlayerAdapter | null>(null)
  const settings = useRef({ entry, loop, onNext, options })
  const initFailed = useRef(false)
  const [retryVersion, setRetryVersion] = useState(0)
  const [canChangeSource, setCanChangeSource] = useState(false)
  const [canRepeat, setCanRepeat] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const [ready, setReady] = useState(false)
  const [paused, setPaused] = useState(true)
  const [volumeSettings, setVolumeSettings] = useState(readVolume)
  const volumeRef = useRef(volumeSettings)
  const volumeChangedAt = useRef(0)

  const updateVolume = useCallback((value: number, apply = true) => {
    if (!Number.isFinite(value)) return
    const volume = Math.max(0, Math.min(100, Math.round(value)))
    const current = volumeRef.current
    if (apply) {
      volumeChangedAt.current = Date.now()
      adapterRef.current?.setVolume?.(volume)
    }
    const next = { value: volume, previous: volume > 0 ? volume : current.previous }
    if (next.value === current.value && next.previous === current.previous) return
    volumeRef.current = next
    setVolumeSettings(next)
  }, [])

  const setVolume = useCallback((value: number) => updateVolume(value), [updateVolume])
  const adjustVolume = useCallback((delta: number) => updateVolume(volumeRef.current.value + delta), [updateVolume])
  const toggleMute = useCallback(() => {
    const current = volumeRef.current
    updateVolume(current.value === 0 ? current.previous : 0)
  }, [updateVolume])

  useEffect(() => {
    try { localStorage.setItem(volumeKey, JSON.stringify(volumeSettings)) } catch { /* unavailable */ }
  }, [volumeSettings])

  settings.current = { entry, loop, onNext, options }

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const platform = settings.current.entry.platform
    let cancelled = false
    let volumeTimer: number | undefined
    let active = { entry: settings.current.entry, requestId: settings.current.options?.requestId ?? 0 }
    initFailed.current = false
    setReady(false)
    setPaused(true)
    setCanChangeSource(false)
    setCanRepeat(false)
    setError(undefined)
    function report(status: PlayerObservation['status'], extra: Partial<PlayerObservation> = {}) {
      if (!cancelled) settings.current.options?.onObservation?.({ requestId: active.requestId, sourceId: active.entry.id, status, ...extra })
    }
    function failure(message: string, initialization = false) {
      if (cancelled) return
      if (initialization) active = { entry: settings.current.entry, requestId: settings.current.options?.requestId ?? 0 }
      initFailed.current = initialization
      setError(message)
      setPaused(true)
      report('error', { error: message, ...(initialization ? { canLoad: false } : {}) })
    }
    const target = platform === 'youtube' ? createFrame(active.entry) : document.createElement('div')
    host.replaceChildren(target)
    if (platform === 'youtube') {
      void loadYouTubeApi().then(api => {
        if (cancelled) return
        let initialized = false
        let armed = false
        let ended = false
        let lastRequest: string | undefined
        const matches = () => {
          try { return new URL(player.getVideoUrl()).searchParams.get('v') === active.entry.platformId } catch { return false }
        }
        function select(next: MusicEntry, requestId: number) {
          if (cancelled || !initialized || lastRequest === next.id + ':' + requestId) return
          active = { entry: next, requestId }
          lastRequest = next.id + ':' + requestId
          armed = false
          ended = false
          setError(undefined)
          setPaused(true)
          report('loading', { canLoad: true })
          try {
            if (!matches()) player.loadVideoById(next.platformId)
            else {
              if (player.getPlayerState() === 0) player.seekTo(0, true)
              player.playVideo()
              if (player.getPlayerState() === 1) {
                armed = true
                setPaused(false)
                report('playing', { uri: player.getVideoUrl() })
              }
            }
          } catch { failure('YouTube 加载失败，可重新选择曲目重试') }
        }
        const player = new api.Player(target as HTMLIFrameElement, {
          events: {
            onReady: event => {
              if (cancelled) return
              initialized = true
              const volume = volumeRef.current.value
              event.target.setVolume(volume)
              if (volume === 0) event.target.mute()
              else event.target.unMute()
              volumeTimer = window.setInterval(() => {
                if (!cancelled && Date.now() - volumeChangedAt.current >= 1000) {
                  updateVolume(event.target.isMuted() ? 0 : event.target.getVolume(), false)
                }
              }, 1000)
              setReady(true)
              setCanChangeSource(true)
              setCanRepeat(true)
              select(settings.current.entry, settings.current.options?.requestId ?? 0)
            },
            onStateChange: event => {
              if (cancelled || !matches() || player.getPlayerState() !== event.data) return
              if (event.data === 1) {
                armed = true
                ended = false
                setPaused(false)
                setError(undefined)
                report('playing', { canLoad: true, uri: player.getVideoUrl() })
              } else if (event.data === 2 || event.data === 5) {
                setPaused(true)
                report('paused', { uri: player.getVideoUrl() })
              } else if (event.data === 0 && armed && !ended) {
                ended = true
                armed = false
                setPaused(true)
                const callback = settings.current.options?.onEnded
                if (callback) callback(active.requestId, active.entry.id)
                else if (settings.current.loop) { player.seekTo(0, true); player.playVideo() }
                else settings.current.onNext()
              }
            },
            onError: event => { if (!cancelled && matches()) failure('YouTube 视频不可用（' + event.data + '），可重试或切换曲目') },
            onAutoplayBlocked: () => {
              if (!cancelled) { setPaused(true); report('paused') }
            },
          },
        })
        adapterRef.current = {
          select,
          play: () => player.playVideo(), pause: () => player.pauseVideo(),
          setVolume: volume => { player.setVolume(volume); if (volume === 0) player.mute(); else player.unMute() },
          destroy: () => player.destroy(),
        }
      }).catch(() => { if (!cancelled) { setReady(false); failure('YouTube 控制接口不可用，请使用官方窗口或重新选择曲目', true) } })
    } else {
      void loadSpotifyApi().then(api => {
        if (cancelled) return
        const initial = settings.current.entry
        api.createController(target, { uri: 'spotify:' + initial.kind + ':' + initial.platformId, width: '100%', height: 152 }, controller => {
          if (cancelled) { controller.destroy(); return }
          let initialized = false
          let lastRequest: string | undefined
          let loadedUri = 'spotify:' + initial.kind + ':' + initial.platformId
          let confirmed = false
          const canLoad = typeof controller.loadEntity === 'function' || typeof controller.loadUri === 'function'
          const requestedUri = () => 'spotify:' + active.entry.kind + ':' + active.entry.platformId
          const accepted = (uri: string | undefined) => Boolean(uri && (uri === requestedUri()
            || active.entry.kind === 'album' && /^spotify:track:[A-Za-z0-9]{22}$/.test(uri)))
          function select(next: MusicEntry, requestId: number) {
            if (cancelled || !initialized || lastRequest === next.id + ':' + requestId) return
            active = { entry: next, requestId }
            lastRequest = next.id + ':' + requestId
            confirmed = false
            setPaused(true)
            setError(undefined)
            report('loading', { canLoad })
            const uri = requestedUri()
            if (uri !== loadedUri && !canLoad) { failure('Spotify 不支持远程切换，请使用官方播放条'); return }
            try {
              if (uri !== loadedUri) {
                if (controller.loadEntity) controller.loadEntity(uri)
                else controller.loadUri!(uri)
                loadedUri = uri
              }
              controller.play()
            } catch { failure('Spotify 播放请求失败，请使用官方播放条') }
          }
          adapterRef.current = { select, play: () => controller.play(), pause: () => controller.pause(), destroy: () => controller.destroy() }
          controller.addListener('ready', () => {
            if (cancelled || initialized) return
            initialized = true
            setReady(true)
            setCanChangeSource(canLoad)
            select(settings.current.entry, settings.current.options?.requestId ?? 0)
          })
          controller.addListener('playback_started', event => {
            if (cancelled || !accepted(event.data.playingURI)) return
            confirmed = true
            setPaused(false)
            setError(undefined)
            report('playing', { canLoad, uri: event.data.playingURI })
          })
          controller.addListener('playback_update', event => {
            if (cancelled) return
            const state = event.data
            if (!accepted(state.playingURI)) {
              if (confirmed && state.playingURI) {
                setError('Spotify 已切换到其他内容，请使用官方播放条')
                setPaused(state.isPaused)
                report('error', { uri: state.playingURI, error: 'Spotify 已切换到其他内容，请使用官方播放条' })
              }
              return
            }
            confirmed = true
            setError(undefined)
            const stopped = state.isPaused || !state.isBuffering && Number.isFinite(state.duration) && state.duration > 0
              && Number.isFinite(state.position) && state.position >= state.duration
            setPaused(stopped)
            report(stopped ? 'paused' : state.isBuffering ? 'loading' : 'playing', { canLoad, uri: state.playingURI })
          })
        })
      }).catch(() => {
        if (cancelled) return
        host.replaceChildren(createFrame(settings.current.entry))
        setReady(false)
        failure('Spotify 控制接口不可用，请使用官方播放条或重新选择曲目', true)
      })
    }
    return () => {
      cancelled = true
      window.clearInterval(volumeTimer)
      adapterRef.current?.destroy()
      adapterRef.current = null
      host.replaceChildren()
    }
  }, [entry.platform, retryVersion])

  useEffect(() => {
    if (adapterRef.current) adapterRef.current.select(entry, options?.requestId ?? 0)
    else if (initFailed.current) { initFailed.current = false; setRetryVersion(value => value + 1) }
  }, [entry.id, entry.platformId, options?.requestId])

  function togglePlayback() {
    if (!ready) return
    try { if (paused) adapterRef.current?.play(); else adapterRef.current?.pause() } catch { setError('播放控制失败，请使用官方窗口') }
  }

  return { hostRef, ready, paused, togglePlayback, volume: volumeSettings.value, setVolume, adjustVolume, toggleMute, canChangeSource, canRepeat, error }
}

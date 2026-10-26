import { useEffect, useRef, useState } from 'react'
import { getEmbedUrl } from '../data/music'
import type { MusicEntry } from '../data/music'
import { loadSpotifyApi, loadYouTubeApi } from '../lib/playerApi'
import { playbackFinished } from '../lib/playerControls'

interface PlayerAdapter {
  play(): void
  pause(): void
  restart(): void
  setLoop(enabled: boolean): void
  destroy(): void
}

function createFrame(entry: MusicEntry): HTMLIFrameElement {
  const frame = document.createElement('iframe')
  const url = new URL(getEmbedUrl(entry))
  if (entry.platform === 'youtube') {
    url.searchParams.set('enablejsapi', '1')
    url.searchParams.set('origin', window.location.origin)
  }
  frame.src = url.toString()
  frame.title = entry.title + ' · ' + entry.platform + ' 播放器'
  frame.allow = 'autoplay; encrypted-media; clipboard-write; fullscreen; picture-in-picture'
  frame.referrerPolicy = 'strict-origin-when-cross-origin'
  frame.allowFullscreen = true
  return frame
}

export function useOfficialPlayer(entry: MusicEntry, loop: boolean, onNext: () => void) {
  const hostRef = useRef<HTMLDivElement>(null)
  const adapterRef = useRef<PlayerAdapter | null>(null)
  const settings = useRef({ loop, onNext })
  const [ready, setReady] = useState(false)
  const [paused, setPaused] = useState(true)

  useEffect(() => {
    settings.current = { loop, onNext }
    adapterRef.current?.setLoop(loop)
  }, [loop, onNext])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let cancelled = false
    let endTimer: number | undefined
    setReady(false)
    setPaused(true)
    const frame = createFrame(entry)
    host.replaceChildren(frame)
    function finish() {
      if (cancelled) return
      if (settings.current.loop) adapterRef.current?.restart()
      else settings.current.onNext()
    }
    if (entry.platform === 'youtube') {
      void loadYouTubeApi().then((api) => {
        if (cancelled) return
        const player = new api.Player(frame, {
          events: {
            onReady: (event) => {
              if (cancelled) return
              setReady(true)
              setPaused(event.target.getPlayerState() !== 1)
            },
            onStateChange: (event) => {
              if (cancelled) return
              if (event.data === 1) setPaused(false)
              if (event.data === 0 || event.data === 2 || event.data === 5) setPaused(true)
              if (event.data === 0) finish()
            },
          },
        })
        adapterRef.current = {
          play: () => player.playVideo(),
          pause: () => player.pauseVideo(),
          restart: () => { player.seekTo(0, true); player.playVideo() },
          setLoop: () => {},
          destroy: () => player.destroy(),
        }
      }).catch(() => { if (!cancelled) setReady(false) })
    } else {
      void loadSpotifyApi().then((api) => {
        if (cancelled) return
        const target = document.createElement('div')
        host.replaceChildren(target)
        api.createController(target, { uri: 'spotify:' + entry.kind + ':' + entry.platformId, width: '100%', height: 352 }, (controller) => {
          if (cancelled) { controller.destroy(); return }
          let playingUri: string | undefined
          let repeatUri: string | undefined
          let hasPlayed = false
          let ended = false
          let pendingReplay: string | undefined
          adapterRef.current = {
            play: () => controller.play(),
            pause: () => controller.pause(),
            restart: () => {
              const uri = repeatUri ?? playingUri
              if (uri && uri !== playingUri) {
                pendingReplay = uri
                controller.pause()
                controller.loadUri(uri)
              } else {
                controller.seek(0)
                controller.play()
              }
            },
            setLoop: (enabled) => { repeatUri = enabled ? (repeatUri ?? playingUri) : undefined },
            destroy: () => controller.destroy(),
          }
          controller.addListener('ready', () => {
            if (cancelled) return
            setReady(true)
          })
          controller.addListener('playback_started', (event) => {
            if (cancelled) return
            window.clearTimeout(endTimer)
            if (settings.current.loop && repeatUri && event.data.playingURI !== repeatUri) {
              playingUri = event.data.playingURI
              adapterRef.current?.restart()
              return
            }
            playingUri = event.data.playingURI
            setPaused(false)
            if (settings.current.loop) repeatUri ??= playingUri
            hasPlayed = true
            ended = false
          })
          controller.addListener('playback_update', (event) => {
            if (cancelled) return
            const state = event.data
            playingUri = state.playingURI ?? playingUri
            if (pendingReplay && state.playingURI === pendingReplay && state.duration > 0 && state.position < 1000) {
              pendingReplay = undefined
              controller.play()
            }
            if (!state.isPaused && !state.isBuffering && state.position > 0) hasPlayed = true
            if (hasPlayed) setPaused(state.isPaused)
            if (settings.current.loop) repeatUri ??= playingUri
            if (state.position < state.duration - 1000) ended = false
            if (!ended && playbackFinished(state, hasPlayed)) {
              ended = true
              window.clearTimeout(endTimer)
              endTimer = window.setTimeout(finish, 500)
            }
          })
        })
      }).catch(() => {
        if (cancelled) return
        host.replaceChildren(createFrame(entry))
        setReady(false)
      })
    }
    return () => {
      cancelled = true
      window.clearTimeout(endTimer)
      adapterRef.current?.destroy()
      adapterRef.current = null
      host.replaceChildren()
    }
  }, [entry])

  function togglePlayback() {
    if (!ready) return
    if (paused) adapterRef.current?.play()
    else adapterRef.current?.pause()
  }

  return { hostRef, ready, paused, togglePlayback }
}

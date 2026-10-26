export interface YouTubePlayer {
  playVideo(): void
  pauseVideo(): void
  getPlayerState(): number
  seekTo(seconds: number, allowSeekAhead: boolean): void
  destroy(): void
}

interface YouTubeEvent { target: YouTubePlayer; data?: number }
export interface YouTubeApi {
  Player: new (frame: HTMLIFrameElement, options: {
    events: { onReady(event: YouTubeEvent): void; onStateChange(event: YouTubeEvent): void }
  }) => YouTubePlayer
}

export interface SpotifyPlayback {
  playingURI?: string
  isPaused: boolean
  isBuffering: boolean
  duration: number
  position: number
}
export interface SpotifyController {
  play(): void
  pause(): void
  seek(seconds: number): void
  loadUri(uri: string): void
  destroy(): void
  addListener(event: 'ready', listener: () => void): void
  addListener(event: 'playback_started', listener: (event: { data: { playingURI: string } }) => void): void
  addListener(event: 'playback_update', listener: (event: { data: SpotifyPlayback }) => void): void
}
export interface SpotifyApi {
  createController(element: HTMLElement, options: { uri: string; width: string; height: number }, callback: (controller: SpotifyController) => void): void
}
type PlayerWindow = Window & {
  YT?: YouTubeApi
  onYouTubeIframeAPIReady?: () => void
  onSpotifyIframeApiReady?: (api: SpotifyApi) => void
}
let youtubePromise: Promise<YouTubeApi> | undefined
let spotifyPromise: Promise<SpotifyApi> | undefined

export function loadYouTubeApi(): Promise<YouTubeApi> {
  const playerWindow = window as PlayerWindow
  if (playerWindow.YT?.Player) return Promise.resolve(playerWindow.YT)
  if (!youtubePromise) {
    youtubePromise = new Promise<YouTubeApi>((resolve, reject) => {
      const previous = playerWindow.onYouTubeIframeAPIReady
      const script = document.createElement('script')
      const fail = () => {
        window.clearTimeout(timeout)
        script.remove()
        reject(new Error('YouTube API unavailable'))
      }
      const timeout = window.setTimeout(fail, 15000)
      playerWindow.onYouTubeIframeAPIReady = () => {
        window.clearTimeout(timeout)
        try { previous?.() } finally {
          if (playerWindow.YT?.Player) resolve(playerWindow.YT)
          else fail()
        }
      }
      script.src = 'https://www.youtube.com/iframe_api'
      script.async = true
      script.onerror = fail
      document.head.append(script)
    }).catch((error: unknown) => {
      youtubePromise = undefined
      throw error
    })
  }
  return youtubePromise
}

export function loadSpotifyApi(): Promise<SpotifyApi> {
  const playerWindow = window as PlayerWindow
  if (!spotifyPromise) {
    spotifyPromise = new Promise<SpotifyApi>((resolve, reject) => {
      const previous = playerWindow.onSpotifyIframeApiReady
      const script = document.createElement('script')
      const fail = () => {
        window.clearTimeout(timeout)
        script.remove()
        reject(new Error('Spotify API unavailable'))
      }
      const timeout = window.setTimeout(fail, 15000)
      playerWindow.onSpotifyIframeApiReady = (api) => {
        window.clearTimeout(timeout)
        try { previous?.(api) } finally { resolve(api) }
      }
      script.src = 'https://open.spotify.com/embed/iframe-api/v1'
      script.async = true
      script.onerror = fail
      document.head.append(script)
    }).catch((error: unknown) => {
      spotifyPromise = undefined
      throw error
    })
  }
  return spotifyPromise
}

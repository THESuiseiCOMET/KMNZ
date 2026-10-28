import type { MusicPlatform } from './music'

export interface QueueItem {
  key: string
  sourceId: string
  platform: MusicPlatform
  songId?: string
  releaseId?: string
  discNumber?: number
  trackNumber?: number
}

export interface QueueOrigin {
  kind: 'list' | 'search' | 'album' | 'native-collection'
  platform: MusicPlatform
  query?: string
  releaseId?: string
}

export interface PlaybackSelection {
  items: QueueItem[]
  index: number
  origin: QueueOrigin
}

export type PlaybackMode = 'sequence' | 'repeat-one'
export type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error'

export interface PlayerCheckpoint { sourceId: string; requestId: number; seconds: number; duration: number; paused: boolean }
export interface PlaybackResume { sourceId: string; requestId: number; seconds: number; autoplay: boolean }

export interface PlayerObservation {
  requestId: number
  sourceId: string
  status: Exclude<PlaybackStatus, 'idle' | 'ended'>
  canLoad?: boolean
  uri?: string
  error?: string
}

export interface PlaybackQueue extends PlaybackSelection {
  requestId: number
  mode: PlaybackMode
  status: PlaybackStatus
  canLoad: boolean
  observedUri?: string
  error?: string
}

export type QueueAction = { type: 'select'; selection: PlaybackSelection }
  | { type: 'move'; direction: -1 | 1 }
  | { type: 'ended'; requestId: number; sourceId: string }
  | { type: 'observe'; observation: PlayerObservation }
  | { type: 'mode'; mode: PlaybackMode }
  | { type: 'close' }

export type MusicPlatform = 'youtube' | 'spotify'
export type MediaKind = 'mv' | 'track' | 'album'
export type MusicEra = 'new' | 'classic'

export interface MusicEntry {
  id: string
  title: string
  subtitle: string
  artist: string
  year: number
  platform: MusicPlatform
  kind: MediaKind
  era: MusicEra
  platformId: string
  externalUrl: string
}

export interface Song {
  id: string
  title: string
  artist: string
  version: {
    kind: 'unspecified' | 'original' | 'remix' | 'live' | 'remaster' | 'other'
    label?: string
    relatedSongId?: string
  }
}

export interface ReleaseTrack {
  songId: string
  discNumber: number
  trackNumber: number
  sourceIds: string[]
}

export interface MusicRelease {
  id: string
  title: string
  artist: string
  kind: 'album' | 'ep' | 'single' | 'compilation' | 'unknown'
  tracklistStatus: 'unknown' | 'partial' | 'complete'
  tracks: ReleaseTrack[]
}

export type SourceTarget = { type: 'song'; songId: string; releaseId?: string }
  | { type: 'release'; releaseId: string }

interface SourceFields {
  id: string
  listed?: boolean
  platformId: string
  externalUrl: string
  display: { subtitle: string; year: number; era: MusicEra }
}

export type MusicSource = SourceFields & (
  { platform: 'youtube'; kind: 'mv'; target: Extract<SourceTarget, { type: 'song' }> }
  | { platform: 'spotify'; kind: 'track'; target: Extract<SourceTarget, { type: 'song' }> }
  | { platform: 'spotify'; kind: 'album'; target: Extract<SourceTarget, { type: 'release' }> }
)

export interface MusicLibrary {
  schemaVersion: 1
  songs: Song[]
  releases: MusicRelease[]
  sources: MusicSource[]
}
